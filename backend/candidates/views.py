"""
SALT / BE-13 候補者一覧API ― HTTP層

認証は recruitment と同じ前提: 認証タスク側が request.staff に
認証済み Staff をセットする想定。無ければセッションの staff_id から
復元し、どちらも無ければ 401 を返す。
company_id はリクエストからは受け取らない (staff の所属企業を使う)。
"""
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from recruitment.models import Staff
from recruitment.services import ServiceError

from . import services


def _get_authenticated_staff(request) -> Staff | None:
    staff = getattr(request, "staff", None) or getattr(request, "current_staff", None)
    if isinstance(staff, Staff) and staff.is_active:
        return staff
    staff_id = request.session.get("staff_id") if hasattr(request, "session") else None
    if staff_id:
        found = Staff.objects.filter(pk=staff_id, is_active=True).first()
        if found is not None:
            return found
    return None


def _error(exc: ServiceError) -> JsonResponse:
    return JsonResponse(
        {"error": {"code": exc.code, "message": str(exc)}}, status=exc.status
    )


def _parse_int(request, name: str, default: int) -> int:
    raw = request.GET.get(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _parse_float(request, name: str) -> float | None:
    raw = request.GET.get(name)
    if raw is None or raw == "":
        return None
    try:
        return float(raw)
    except ValueError:
        return None


@require_GET
def candidate_list_view(request, opening_id: int):
    """GET: 募集に紐づく候補者一覧 + サマリー (画面S01)

    BE-14: クエリパラメータで検索・絞り込み・並べ替え
      keyword (氏名・受付番号・スキル), status, decision, required,
      score_min, score_max, sort (score_desc/score_asc/applied_desc/applied_asc)
    """
    staff = _get_authenticated_staff(request)
    if staff is None:
        return JsonResponse(
            {"error": {"code": "unauthenticated", "message": "ログインが必要です。"}},
            status=401,
        )
    try:
        result = services.list_candidates_for_staff(
            staff,
            opening_id,
            page=_parse_int(request, "page", 1),
            page_size=_parse_int(request, "page_size", 20),
            keyword=request.GET.get("keyword") or None,
            status=request.GET.get("status") or None,
            decision=request.GET.get("decision") or None,
            required=request.GET.get("required") or None,
            score_min=_parse_float(request, "score_min"),
            score_max=_parse_float(request, "score_max"),
            sort=request.GET.get("sort") or "score_desc",
        )
    except ServiceError as exc:
        return _error(exc)
    return JsonResponse(result, json_dumps_params={"ensure_ascii": False})
