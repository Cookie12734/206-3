"""
SALT / BE-13 候補者一覧API ― サービス層

タスク BE-13「総合点・必須条件・評価状況・確認済み小計と要確認項目の返却」
(機能13、画面 S01 候補者一覧)

読み取り専用。データの流れ:
  applications → (response → survey_routes) で募集に紐づく
  最新の応募版 (submissions) → 最新の解析処理 (analysis_jobs、旧版を除く)
  → 評価 (evaluations) → 明細 (evaluation_items) / 最新の判断 (decisions)

評価状況 (status) の決め方:
  not_started  解析処理がまだ無い
  processing   解析が予約中・実行中 (完了したが評価が無い場合も含む)
  error        最新の解析処理が失敗
  needs_review 評価に未評価・要確認の項目が残っている
  evaluated    評価が確定している

検索・絞り込み・並べ替えの条件指定は BE-14 の範囲。ここでの並びは
画面S01の注記「算出済みはスコア順」に従い、総合点がある候補者を
点数順に先に並べ、それ以外は応募日時の新しい順とする。
"""
from decimal import Decimal

from django.db import transaction

from recruitment import services as core
from recruitment.models import Opening
from recruitment.services import NotFoundError

from .models import (
    AnalysisJob,
    Application,
    Decision,
    Evaluation,
    EvaluationItem,
    Submission,
)

MAX_PAGE_SIZE = 100


def _to_float(value: Decimal | None) -> float | None:
    return float(value) if value is not None else None


def _latest_submission(company_id: int, application_id: int) -> Submission | None:
    return (
        Submission.objects.filter(company_id=company_id, application_id=application_id)
        .order_by("-version_no", "-id")
        .first()
    )


def _latest_job(company_id: int, submission_id: int) -> AnalysisJob | None:
    return (
        AnalysisJob.objects.filter(company_id=company_id, submission_id=submission_id)
        .exclude(status=AnalysisJob.Status.OBSOLETE)
        .order_by("-id")
        .first()
    )


def _evaluation_for_job(company_id: int, job_id: int) -> Evaluation | None:
    return (
        Evaluation.objects.filter(company_id=company_id, job_id=job_id)
        .order_by("-id")
        .first()
    )


def _latest_decision(company_id: int, application_id: int) -> Decision | None:
    return (
        Decision.objects.filter(company_id=company_id, application_id=application_id)
        .order_by("-decided_at", "-id")
        .first()
    )


def _build_row(company_id: int, application: Application) -> dict:
    submission = _latest_submission(company_id, application.pk)
    job = _latest_job(company_id, submission.pk) if submission else None
    evaluation = _evaluation_for_job(company_id, job.pk) if job else None
    decision = _latest_decision(company_id, application.pk)

    items = []
    if evaluation is not None:
        items = list(
            EvaluationItem.objects.filter(
                company_id=company_id, evaluation_id=evaluation.pk
            )
            .select_related("rule_item")
            .order_by("rule_item__sort_order", "id")
        )

    needs_review_items = []
    confirmed_subtotal = Decimal("0")
    required_verdicts = []
    for item in items:
        rule_item = item.rule_item
        if rule_item.item_type == "score":
            if item.grade is None:
                needs_review_items.append(
                    {
                        "item_code": rule_item.item_code,
                        "item_name": rule_item.item_name,
                        "kind": "unevaluated",
                    }
                )
            elif item.points is not None:
                confirmed_subtotal += item.points
        else:  # required
            required_verdicts.append(item.verdict)
            if item.verdict != EvaluationItem.Verdict.YES:
                needs_review_items.append(
                    {
                        "item_code": rule_item.item_code,
                        "item_name": rule_item.item_name,
                        "kind": "verdict_unknown"
                        if item.verdict != EvaluationItem.Verdict.NO
                        else "verdict_no",
                    }
                )

    if not required_verdicts:
        required_summary = None
    elif EvaluationItem.Verdict.NO in required_verdicts:
        required_summary = "no"
    elif all(v == EvaluationItem.Verdict.YES for v in required_verdicts):
        required_summary = "yes"
    else:
        required_summary = "unknown"

    if job is None:
        status = "not_started"
    elif job.status == AnalysisJob.Status.FAILED:
        status = "error"
    elif job.status in (AnalysisJob.Status.QUEUED, AnalysisJob.Status.RUNNING):
        status = "processing"
    elif evaluation is None:
        status = "processing"
    elif evaluation.status == Evaluation.Status.INCOMPLETE or needs_review_items:
        status = "needs_review"
    else:
        status = "evaluated"

    return {
        "application_id": application.pk,
        "receipt_no": application.receipt_no,
        "full_name": submission.full_name if submission else None,
        "email": submission.email if submission else None,
        "applied_at": application.created_at.isoformat()
        if application.created_at
        else None,
        "submission_version_no": submission.version_no if submission else None,
        "submitted_at": submission.submitted_at.isoformat()
        if submission and submission.submitted_at
        else None,
        "status": status,
        "job_status": job.status if job else None,
        "evaluation_status": evaluation.status if evaluation else None,
        "keywords": evaluation.keywords if evaluation else None,
        "rank": None,
        "total_score": _to_float(evaluation.total_score) if evaluation else None,
        "confirmed_subtotal": float(confirmed_subtotal) if evaluation else None,
        "required_summary": required_summary,
        "needs_review_items": needs_review_items,
        "decision": decision.decision if decision else None,
        "_sort_score": evaluation.total_score if evaluation else None,
        "_sort_created": application.created_at,
    }


SORT_ORDERS = ("score_desc", "score_asc", "applied_desc", "applied_asc")
CANDIDATE_STATUSES = ("not_started", "processing", "error", "needs_review", "evaluated")
REQUIRED_SUMMARIES = ("yes", "no", "unknown")


def _apply_filters(rows, *, keyword, status, decision, required, score_min, score_max):
    """BE-14: 検索・絞り込み。画面S01: キーワードは氏名・受付番号・スキルで検索。"""
    if keyword:
        kw = keyword.strip().lower()
        if len(kw) > 50:
            raise core.ValidationError("キーワードは50文字以内で指定してください。")
        rows = [
            r
            for r in rows
            if kw in (r["full_name"] or "").lower()
            or kw in r["receipt_no"].lower()
            or kw in (r["keywords"] or "").lower()
        ]
    if status is not None:
        if status not in CANDIDATE_STATUSES:
            raise core.ValidationError(f"status の値が不正です: {status}")
        rows = [r for r in rows if r["status"] == status]
    if decision is not None:
        if decision == "none":
            rows = [r for r in rows if r["decision"] is None]
        elif decision in Decision.Kind.values:
            rows = [r for r in rows if r["decision"] == decision]
        else:
            raise core.ValidationError(f"decision の値が不正です: {decision}")
    if required is not None:
        if required not in REQUIRED_SUMMARIES:
            raise core.ValidationError(f"required の値が不正です: {required}")
        rows = [r for r in rows if r["required_summary"] == required]
    if score_min is not None:
        rows = [
            r
            for r in rows
            if r["_sort_score"] is not None and float(r["_sort_score"]) >= score_min
        ]
    if score_max is not None:
        rows = [
            r
            for r in rows
            if r["_sort_score"] is not None and float(r["_sort_score"]) <= score_max
        ]
    return rows


def _apply_sort(rows, sort: str):
    """BE-14: 並べ替え。スコア順では算出済みを先に並べ、順位 (rank) を付ける。

    LOGIC-04 の考え方: 未評価のない候補者を総合点順に並べ、
    未評価がある候補者は要確認として区別する (rank は付けない)。
    """
    if sort not in SORT_ORDERS:
        raise core.ValidationError(f"sort の値が不正です: {sort}")
    if sort in ("score_desc", "score_asc"):
        sign = -1.0 if sort == "score_desc" else 1.0
        rows.sort(
            key=lambda r: (
                r["_sort_score"] is None,
                sign * float(r["_sort_score"]) if r["_sort_score"] is not None else 0.0,
                -r["_sort_created"].timestamp() if r["_sort_created"] else 0.0,
            )
        )
        rank = 0
        for r in rows:
            if r["_sort_score"] is not None:
                rank += 1
                r["rank"] = rank
    elif sort == "applied_desc":
        rows.sort(
            key=lambda r: -r["_sort_created"].timestamp() if r["_sort_created"] else 0.0
        )
    else:  # applied_asc
        rows.sort(
            key=lambda r: r["_sort_created"].timestamp() if r["_sort_created"] else 0.0
        )
    return rows


@transaction.atomic
def list_candidates_for_staff(
    staff,
    opening_id: int,
    page: int = 1,
    page_size: int = 20,
    *,
    keyword: str | None = None,
    status: str | None = None,
    decision: str | None = None,
    required: str | None = None,
    score_min: float | None = None,
    score_max: float | None = None,
    sort: str = "score_desc",
) -> dict:
    company = core.verify_company_and_staff(staff)
    core.set_tenant_context_in_tx(company.pk)

    opening = Opening.objects.filter(company_id=company.pk, pk=opening_id).first()
    if opening is None:
        raise NotFoundError("募集が見つかりません。")
    core.assert_can_view_opening(staff, opening)

    page = max(1, page)
    page_size = min(max(1, page_size), MAX_PAGE_SIZE)

    applications = Application.objects.filter(
        company_id=company.pk,
        response__route__opening_id=opening.pk,
        purge_status=Application.PurgeStatus.ACTIVE,
    ).order_by("id")
    rows = [_build_row(company.pk, a) for a in applications]

    # サマリーは絞り込み前の募集全体の件数 (画面S01上部の表示)
    summary = {
        "total_count": len(rows),
        "needs_review_count": sum(1 for r in rows if r["status"] == "needs_review"),
        "advance_count": sum(1 for r in rows if r["decision"] == Decision.Kind.ADVANCE),
        "error_count": sum(1 for r in rows if r["status"] == "error"),
        "processing_count": sum(1 for r in rows if r["status"] == "processing"),
    }

    rows = _apply_filters(
        rows,
        keyword=keyword,
        status=status,
        decision=decision,
        required=required,
        score_min=score_min,
        score_max=score_max,
    )
    rows = _apply_sort(rows, sort)
    for r in rows:
        r.pop("_sort_score")
        r.pop("_sort_created")

    total = len(rows)
    start = (page - 1) * page_size
    return {
        "opening": {
            "id": opening.pk,
            "code": opening.code,
            "job_title": opening.job_title,
            "hire_type": opening.hire_type,
        },
        "summary": summary,
        "page": page,
        "page_size": page_size,
        "total": total,
        "results": rows[start : start + page_size],
    }
