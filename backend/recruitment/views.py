"""
SALT / BE-04 募集要項の登録・編集API ― HTTP層 (Django標準のJSONビュー)

認証前提:
  認証タスク側で request.staff に認証済み Staff をセットする想定。
  無い場合はセッションの staff_id から復元する。どちらも無ければ 401。
  company_id はリクエストからは受け取らない (staff の所属企業を使う)。
"""
import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_http_methods

from . import services
from .models import Staff
from .services import (
    OpeningInput,
    RequiredConditionsInput,
    ScoreItemInput,
    ScoreItemsInput,
    ServiceError,
)


def _error(exc: ServiceError) -> JsonResponse:
    return JsonResponse(
        {"error": {"code": exc.code, "message": str(exc)}}, status=exc.status
    )


def _get_authenticated_staff(request) -> Staff | None:
    staff = getattr(request, "staff", None) or getattr(request, "current_staff", None)
    if staff is not None:
        return staff
    staff_id = request.session.get("staff_id") if hasattr(request, "session") else None
    if staff_id:
        return Staff.objects.filter(pk=staff_id, is_active=True).first()
    return None


def _parse_body(request) -> dict:
    if not request.body:
        return {}
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise services.ValidationError("リクエストボディがJSONではありません。")
    if not isinstance(data, dict):
        raise services.ValidationError("リクエストボディはJSONオブジェクトで指定してください。")
    return data


def _to_input(data: dict) -> OpeningInput:
    year = data.get("recruitment_year")
    if year is not None and not isinstance(year, int):
        # "2026" のような文字列は数値化できれば受け付ける。それ以外は検証で弾く。
        try:
            year = int(year)
        except (TypeError, ValueError):
            pass
    return OpeningInput(
        code=data.get("code"),
        job_title=data.get("job_title"),
        hire_type=data.get("hire_type"),
        contact_info=data.get("contact_info"),
        recruitment_year=year,
        requirements=data.get("requirements"),
        version_label=data.get("version_label"),
    )


def _handle(request, func, *, status=200):
    staff = _get_authenticated_staff(request)
    if staff is None:
        return JsonResponse(
            {"error": {"code": "unauthenticated", "message": "ログインが必要です。"}},
            status=401,
        )
    try:
        result = func(staff)
    except ServiceError as exc:
        return _error(exc)
    return JsonResponse(result, status=status, json_dumps_params={"ensure_ascii": False})


@csrf_protect
@require_http_methods(["GET", "POST"])
def opening_list_create_view(request):
    """GET: 募集一覧 / POST: 募集+募集要項(初版) の登録"""
    if request.method == "POST":
        try:
            data = _to_input(_parse_body(request))
        except ServiceError as exc:
            return _error(exc)
        return _handle(
            request,
            lambda staff: services.create_opening_with_requirements(staff, data),
            status=201,
        )
    return _handle(request, lambda staff: {"openings": services.list_openings_for_staff(staff)})


@csrf_protect
@require_http_methods(["GET", "PUT"])
def opening_detail_update_view(request, opening_id: int):
    """GET: 募集詳細 (最新の募集要項を含む) / PUT: 編集 (要項は新版として保存)"""
    if request.method == "PUT":
        try:
            data = _to_input(_parse_body(request))
        except ServiceError as exc:
            return _error(exc)
        return _handle(
            request,
            lambda staff: services.update_opening_and_requirements(staff, opening_id, data),
        )
    return _handle(
        request, lambda staff: services.get_opening_detail_for_staff(staff, opening_id)
    )


@csrf_protect
@require_http_methods(["GET", "PUT"])
def required_conditions_view(request, opening_id: int):
    """BE-05: GET: 最新版の必須条件 / PUT: 必須条件を保存 (新しい基準版を作る)"""
    if request.method == "PUT":
        try:
            body = _parse_body(request)
        except ServiceError as exc:
            return _error(exc)
        data = RequiredConditionsInput(
            required_experience_years=body.get("required_experience_years"),
            required_qualification=body.get("required_qualification"),
            version_label=body.get("version_label"),
        )
        return _handle(
            request,
            lambda staff: services.update_required_conditions(staff, opening_id, data),
        )
    return _handle(
        request,
        lambda staff: services.get_required_conditions_for_staff(staff, opening_id),
    )


@csrf_protect
@require_http_methods(["GET", "PUT"])
def score_items_view(request, opening_id: int):
    """BE-06: GET: 最新版の評価軸・配点 / PUT: 保存 (新しい基準版を作る)"""
    if request.method == "PUT":
        try:
            body = _parse_body(request)
        except ServiceError as exc:
            return _error(exc)
        raw_items = body.get("items")
        items = None
        if isinstance(raw_items, list):
            items = [
                ScoreItemInput(
                    item_code=i.get("item_code") if isinstance(i, dict) else None,
                    item_name=i.get("item_name") if isinstance(i, dict) else None,
                    max_points=i.get("max_points") if isinstance(i, dict) else None,
                    condition_text=i.get("condition_text") if isinstance(i, dict) else None,
                )
                for i in raw_items
            ]
        data = ScoreItemsInput(items=items, version_label=body.get("version_label"))
        return _handle(
            request,
            lambda staff: services.update_score_items(staff, opening_id, data),
        )
    return _handle(
        request, lambda staff: services.get_score_items_for_staff(staff, opening_id)
    )


@require_GET
def requirement_versions_view(request, opening_id: int):
    """GET: 募集要項の版履歴 (新しい順)"""
    return _handle(
        request,
        lambda staff: {
            "versions": services.list_requirement_versions_for_staff(staff, opening_id)
        },
    )
