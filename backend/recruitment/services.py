"""
SALT / BE-04 募集要項の登録・編集API ― サービス層

仕様の根拠:
  - テーブル設計書: openings / rule_versions の定義、桁数、制約
  - 画面設計書 S04「評価基準設定」: 募集職種 必須・100文字以内、
    募集要項 必須・2000文字以内、保存で新しい版を作る
  - 設計補足 No.26 / 29 / 31: 企業分離。company_id は認証済み staff から
    サーバー側で決め、クライアント指定値は信用しない

BE-04 の範囲外 (別タスク):
  - rule_items (評価軸・配点・段階基準) の保存・合計100点検証 → BE-06
  - operation_logs への記録 → ログ系タスク。必要になったら保存処理の
    トランザクション内にフックを追加する
"""
from __future__ import annotations

from dataclasses import dataclass

from django.db import connection, transaction
from django.utils import timezone
from django.utils.translation import gettext as _

from .models import Company, Opening, RuleItem, RuleVersion, Staff, StaffOpening


class ServiceError(Exception):
    """HTTP層で status / code に変換する業務エラー基底クラス。"""

    status = 400
    code = "bad_request"


class ValidationError(ServiceError):
    status = 400
    code = "validation_error"


class PermissionDeniedError(ServiceError):
    status = 403
    code = "permission_denied"


class NotFoundError(ServiceError):
    status = 404
    code = "not_found"


class ConflictError(ServiceError):
    status = 409
    code = "conflict"


# ---------------------------------------------------------------------------
# 入力 (views が JSON から組み立てる)
# ---------------------------------------------------------------------------

@dataclass
class OpeningInput:
    code: str | None = None            # 登録時のみ必須
    job_title: str | None = None
    hire_type: str | None = None        # 登録時のみ必須
    contact_info: str | None = None
    recruitment_year: int | None = None  # 登録時のみ必須
    requirements: str | None = None     # 募集要項 (登録・編集とも必須)
    version_label: str | None = None    # 省略時は "v{version_no}" を自動付与


# ---------------------------------------------------------------------------
# テナント / 権限
# ---------------------------------------------------------------------------

def set_tenant_context_in_tx(company_id: int) -> None:
    """RLS用セッション変数 app.company_id をトランザクションローカルに設定する。

    必ず transaction.atomic() の内側で呼ぶこと。
    set_config(..., true) を使うため、トランザクション終了で自動的に消え、
    接続プール再利用時に別企業へ漏れない。
    PostgreSQL 以外 (テスト用 SQLite 等) では RLS が無いので何もしない。
    """
    if connection.vendor != "postgresql":
        return
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT set_config('app.company_id', %s, true)", [str(company_id)]
        )


def verify_company_and_staff(staff: Staff) -> Company:
    """操作者の所属企業が有効で、担当者自身も有効かを確認する。"""
    if staff is None or not staff.is_active:
        raise PermissionDeniedError(_("担当者が無効です。"))
    company = Company.objects.filter(pk=staff.company_id).first()
    if company is None:
        raise PermissionDeniedError(_("所属企業が見つかりません。"))
    if not company.is_active:
        # 企業利用停止中は業務テーブルを一切操作させない (RLS側でも遮断される)
        raise PermissionDeniedError(_("企業が利用停止中です。"))
    return company


def assert_can_view_opening(staff: Staff, opening: Opening) -> None:
    if opening.company_id != staff.company_id:
        raise NotFoundError(_("募集が見つかりません。"))
    if staff.role == Staff.Role.RECRUITER:
        assigned = StaffOpening.objects.filter(
            company_id=staff.company_id, staff_id=staff.pk, opening_id=opening.pk
        ).exists()
        if not assigned:
            raise NotFoundError(_("募集が見つかりません。"))


def assert_can_edit_opening(staff: Staff, opening: Opening) -> None:
    """編集権限: viewer は不可。admin は自社内可。recruiter は担当募集のみ可。

    他社の募集は「存在しない」ものとして扱い、情報漏えいを避ける。
    """
    assert_can_view_opening(staff, opening)
    if staff.role == Staff.Role.VIEWER:
        raise PermissionDeniedError(_("閲覧専用アカウントは編集できません。"))


# ---------------------------------------------------------------------------
# バリデーション (DBの NOT NULL は空白文字を弾けないため、アプリ側で検証する)
# ---------------------------------------------------------------------------

def _require_text(value: str | None, field: str, max_length: int) -> str:
    if value is None or not str(value).strip():
        raise ValidationError(_("%(field)s は必須です。") % {"field": field})
    text = str(value).strip()
    if len(text) > max_length:
        raise ValidationError(
            _("%(field)s は %(max)d 文字以内で入力してください。")
            % {"field": field, "max": max_length}
        )
    return text


def _validate_requirements(value: str | None) -> str:
    # 画面 S04: 募集要項 必須・2000文字以内。テーブル定義 VARCHAR(2000) と一致。
    return _require_text(value, "募集要項", 2000)


def _validate_version_label(value: str | None, version_no: int) -> str:
    if value is None or not str(value).strip():
        # 設計書の例は v1.2 だが、版番号との対応は未定義のため、
        # 省略時は一意な単調表記 v{version_no} を使う。明示指定があればそれを優先。
        return f"v{version_no}"
    return _require_text(value, "版表示名", 20)


def validate_opening_fields(data: OpeningInput, *, creating: bool) -> dict:
    """募集本体の検証。creating=False (編集) では渡された項目だけ検証する。"""
    cleaned: dict = {}

    if creating or data.code is not None:
        cleaned["code"] = _require_text(data.code, "募集コード", 40)
    if creating or data.job_title is not None:
        cleaned["job_title"] = _require_text(data.job_title, "募集職種", 100)
    if creating or data.contact_info is not None:
        cleaned["contact_info"] = _require_text(data.contact_info, "問い合わせ先", 255)

    if creating or data.hire_type is not None:
        if data.hire_type not in Opening.HireType.values:
            raise ValidationError(_("採用区分は graduate か career を指定してください。"))
        cleaned["hire_type"] = data.hire_type

    if creating or data.recruitment_year is not None:
        year = data.recruitment_year
        if not isinstance(year, int) or isinstance(year, bool) or not (1000 <= year <= 9999):
            raise ValidationError(_("募集年度は西暦4桁で指定してください。"))
        cleaned["recruitment_year"] = year

    return cleaned


# ---------------------------------------------------------------------------
# 登録・編集・参照
# ---------------------------------------------------------------------------

def _next_version_no(opening: Opening) -> int:
    """版番号の採番。呼び出し側で opening 行をロックしている前提。"""
    latest = (
        RuleVersion.objects.filter(company_id=opening.company_id, opening_id=opening.pk)
        .order_by("-version_no")
        .first()
    )
    return 1 if latest is None else latest.version_no + 1


def _create_rule_version(staff: Staff, opening: Opening, data: OpeningInput) -> RuleVersion:
    version_no = _next_version_no(opening)
    return RuleVersion.objects.create(
        company_id=opening.company_id,
        opening_id=opening.pk,
        version_no=version_no,
        version_label=_validate_version_label(data.version_label, version_no),
        requirements=_validate_requirements(data.requirements),
        saved_by_id=staff.pk,
        saved_at=timezone.now(),
    )


@transaction.atomic
def create_opening_with_requirements(staff: Staff, data: OpeningInput) -> dict:
    """募集の新規登録 + 募集要項の初版 (version_no=1) を同一トランザクションで作る。

    権限: viewer は不可。recruiter が作った募集は、そのまま担当募集に割り当て、
    作成直後から自分で参照・編集できるようにする (admin は割当なしでも自社内可)。
    """
    company = verify_company_and_staff(staff)
    if staff.role == Staff.Role.VIEWER:
        raise PermissionDeniedError(_("閲覧専用アカウントは登録できません。"))
    set_tenant_context_in_tx(company.pk)

    cleaned = validate_opening_fields(data, creating=True)
    # 募集要項は募集本体より先に検証し、片方だけ保存される状態を作らない
    _validate_requirements(data.requirements)

    if Opening.objects.filter(company_id=company.pk, code=cleaned["code"]).exists():
        raise ConflictError(_("同じ募集コードが既に登録されています。"))

    opening = Opening.objects.create(
        company_id=company.pk, status=Opening.Status.CLOSED, **cleaned
    )
    if staff.role == Staff.Role.RECRUITER:
        StaffOpening.objects.create(
            company_id=company.pk, staff_id=staff.pk, opening_id=opening.pk
        )
    version = _create_rule_version(staff, opening, data)
    return serialize_opening_detail(opening, version)


@transaction.atomic
def update_opening_and_requirements(
    staff: Staff, opening_id: int, data: OpeningInput
) -> dict:
    """募集の編集。募集本体は更新し、募集要項は新しい版として追加保存する。

    募集要項を上書きしないのは、過去の評価がどの要項で判定されたかを
    遡れるようにするため (rule_versions の版管理)。
    """
    company = verify_company_and_staff(staff)
    set_tenant_context_in_tx(company.pk)

    opening = (
        Opening.objects.select_for_update()
        .filter(company_id=company.pk, pk=opening_id)
        .first()
    )
    if opening is None:
        raise NotFoundError(_("募集が見つかりません。"))
    assert_can_edit_opening(staff, opening)

    cleaned = validate_opening_fields(data, creating=False)
    _validate_requirements(data.requirements)

    if "code" in cleaned and cleaned["code"] != opening.code:
        duplicated = (
            Opening.objects.filter(company_id=company.pk, code=cleaned["code"])
            .exclude(pk=opening.pk)
            .exists()
        )
        if duplicated:
            raise ConflictError(_("同じ募集コードが既に登録されています。"))

    for field, value in cleaned.items():
        setattr(opening, field, value)
    if cleaned:
        opening.save(update_fields=list(cleaned.keys()))

    # 行ロック中なので、同時編集でも version_no は重複しない
    version = _create_rule_version(staff, opening, data)
    return serialize_opening_detail(opening, version)


@transaction.atomic
def list_openings_for_staff(staff: Staff) -> list[dict]:
    company = verify_company_and_staff(staff)
    set_tenant_context_in_tx(company.pk)

    openings = Opening.objects.filter(company_id=company.pk).order_by("code", "id")
    if staff.role == Staff.Role.RECRUITER:
        assigned_ids = StaffOpening.objects.filter(
            company_id=company.pk, staff_id=staff.pk
        ).values_list("opening_id", flat=True)
        openings = openings.filter(pk__in=assigned_ids)
    return [serialize_opening_summary(o) for o in openings]


@transaction.atomic
def get_opening_detail_for_staff(staff: Staff, opening_id: int) -> dict:
    company = verify_company_and_staff(staff)
    set_tenant_context_in_tx(company.pk)

    opening = Opening.objects.filter(company_id=company.pk, pk=opening_id).first()
    if opening is None:
        raise NotFoundError(_("募集が見つかりません。"))
    assert_can_view_opening(staff, opening)
    return serialize_opening_detail(opening, latest_rule_version(opening))


@transaction.atomic
def list_requirement_versions_for_staff(staff: Staff, opening_id: int) -> list[dict]:
    """募集要項の版履歴 (新しい順)。編集画面で過去版を確認するために使う。"""
    company = verify_company_and_staff(staff)
    set_tenant_context_in_tx(company.pk)

    opening = Opening.objects.filter(company_id=company.pk, pk=opening_id).first()
    if opening is None:
        raise NotFoundError(_("募集が見つかりません。"))
    assert_can_view_opening(staff, opening)
    versions = RuleVersion.objects.filter(
        company_id=company.pk, opening_id=opening.pk
    ).order_by("-version_no")
    return [serialize_rule_version(v) for v in versions]


def latest_rule_version(opening: Opening) -> RuleVersion | None:
    return (
        RuleVersion.objects.filter(company_id=opening.company_id, opening_id=opening.pk)
        .order_by("-version_no")
        .first()
    )


# ---------------------------------------------------------------------------
# シリアライズ
# ---------------------------------------------------------------------------

def serialize_rule_version(version: RuleVersion) -> dict:
    return {
        "id": version.pk,
        "version_no": version.version_no,
        "version_label": version.version_label,
        "requirements": version.requirements,
        "saved_by": version.saved_by_id,
        "saved_at": version.saved_at.isoformat() if version.saved_at else None,
    }


def serialize_opening_summary(opening: Opening) -> dict:
    return {
        "id": opening.pk,
        "code": opening.code,
        "job_title": opening.job_title,
        "hire_type": opening.hire_type,
        "status": opening.status,
        "recruitment_year": opening.recruitment_year,
    }


def serialize_opening_detail(
    opening: Opening, version: RuleVersion | None = None
) -> dict:
    if version is None:
        version = latest_rule_version(opening)
    detail = serialize_opening_summary(opening)
    detail.update(
        {
            "contact_info": opening.contact_info,
            "company_id": opening.company_id,
            "requirements": version.requirements if version else None,
            "current_version": serialize_rule_version(version) if version else None,
        }
    )
    return detail


# ---------------------------------------------------------------------------
# BE-05 必須条件の設定
#
# 根拠:
#   - タスク BE-05「必要資格・必要経験年数を構造化して保存する」(機能20)
#   - 画面 S04: 必要経験年数 (reqYears) / 必要資格 (reqQualification) は
#     ともに必須・入力欄サイズ100、必須条件として YES/NO 判定される
#   - テーブル設計書 rule_items: item_type=required の行として保存する
#     (必須条件専用テーブルはない)。condition_text に入力値を保存し、
#     max_points は加点項目のみのものなので NULL にする
#   - 名称一覧: MustCondition = rule_items の item_type=required 行
#
# item_code の設計判断 (資料に明記がないため要チーム確認):
#   加点項目の例示コード (skill / experience / qualification / ai_fit) と
#   基準版内で衝突しないよう、必須条件には接頭辞付きの
#   required_experience_years / required_qualification を使う。
# ---------------------------------------------------------------------------

REQUIRED_EXPERIENCE_CODE = "required_experience_years"
REQUIRED_QUALIFICATION_CODE = "required_qualification"

# (item_code, item_name, 入力フィールド名) ※ item_name は画面S04の表示名に合わせる
REQUIRED_CONDITION_FIELDS = (
    (REQUIRED_EXPERIENCE_CODE, "必要経験年数", "required_experience_years"),
    (REQUIRED_QUALIFICATION_CODE, "必要資格", "required_qualification"),
)


@dataclass
class RequiredConditionsInput:
    required_experience_years: str | None = None
    required_qualification: str | None = None
    version_label: str | None = None  # 省略時は "v{version_no}"


def validate_required_conditions(data: RequiredConditionsInput) -> dict:
    """必須条件の検証。画面S04: どちらも必須・100文字以内。"""
    return {
        "required_experience_years": _require_text(
            data.required_experience_years, "必要経験年数", 100
        ),
        "required_qualification": _require_text(
            data.required_qualification, "必要資格", 100
        ),
    }


def create_required_items(
    version: RuleVersion, cleaned: dict
) -> list[RuleItem]:
    """検証済みの必須条件を、基準版の rule_items (required) として作る。"""
    items = []
    for sort_order, (code, name, field) in enumerate(
        REQUIRED_CONDITION_FIELDS, start=1
    ):
        items.append(
            RuleItem.objects.create(
                company_id=version.company_id,
                rule_version_id=version.pk,
                item_code=code,
                item_name=name,
                item_type=RuleItem.ItemType.REQUIRED,
                condition_text=cleaned[field],
                max_points=None,
                sort_order=sort_order,
            )
        )
    return items


def serialize_required_conditions(version: RuleVersion | None) -> dict:
    """基準版の必須条件を、画面/API向けの構造化形式で返す。"""
    result = {
        "required_experience_years": None,
        "required_qualification": None,
        "items": [],
        "version_no": version.version_no if version else None,
        "version_label": version.version_label if version else None,
    }
    if version is None:
        return result
    items = RuleItem.objects.filter(
        company_id=version.company_id,
        rule_version_id=version.pk,
        item_type=RuleItem.ItemType.REQUIRED,
    ).order_by("sort_order", "id")
    field_by_code = {code: field for code, _name, field in REQUIRED_CONDITION_FIELDS}
    for item in items:
        result["items"].append(serialize_rule_item(item))
        field = field_by_code.get(item.item_code)
        if field:
            result[field] = item.condition_text
    return result


def serialize_rule_item(item: RuleItem) -> dict:
    return {
        "id": item.pk,
        "item_code": item.item_code,
        "item_name": item.item_name,
        "item_type": item.item_type,
        "condition_text": item.condition_text,
        "max_points": item.max_points,
        "sort_order": item.sort_order,
    }


@transaction.atomic
def get_required_conditions_for_staff(staff: Staff, opening_id: int) -> dict:
    company = verify_company_and_staff(staff)
    set_tenant_context_in_tx(company.pk)

    opening = Opening.objects.filter(company_id=company.pk, pk=opening_id).first()
    if opening is None:
        raise NotFoundError(_("募集が見つかりません。"))
    assert_can_view_opening(staff, opening)
    return serialize_required_conditions(latest_rule_version(opening))


@transaction.atomic
def update_required_conditions(
    staff: Staff, opening_id: int, data: RequiredConditionsInput
) -> dict:
    """必須条件の保存 = 最新版を引き継いだ新しい基準版を作り、必須条件だけ差し替える。

    基準版は募集要項・必須条件・配点を同時に版管理する (テーブル一覧) ため、
    必須条件だけを別に上書きすると版の意味が壊れる。そこで:
      - requirements は最新版のものをそのまま引き継ぐ
      - 加点項目 (score) は最新版のものをそのままコピーする (BE-06の領域を消さない)
      - 必須条件 (required) は今回の入力で作り直す
    まだ基準版が1つも無い募集には保存できない (先に BE-04 で募集+要項を登録する)。
    """
    company = verify_company_and_staff(staff)
    set_tenant_context_in_tx(company.pk)

    opening = (
        Opening.objects.select_for_update()
        .filter(company_id=company.pk, pk=opening_id)
        .first()
    )
    if opening is None:
        raise NotFoundError(_("募集が見つかりません。"))
    assert_can_edit_opening(staff, opening)

    cleaned = validate_required_conditions(data)

    latest = latest_rule_version(opening)
    if latest is None:
        raise ConflictError(
            _("評価基準がまだ登録されていません。先に募集要項を登録してください。")
        )

    version_no = latest.version_no + 1
    new_version = RuleVersion.objects.create(
        company_id=company.pk,
        opening_id=opening.pk,
        version_no=version_no,
        version_label=_validate_version_label(data.version_label, version_no),
        requirements=latest.requirements,
        saved_by_id=staff.pk,
        saved_at=timezone.now(),
    )

    # 加点項目は引き継ぐ (必須条件は今回分を作り直すのでコピーしない)
    for item in RuleItem.objects.filter(
        company_id=company.pk,
        rule_version_id=latest.pk,
        item_type=RuleItem.ItemType.SCORE,
    ).order_by("sort_order", "id"):
        RuleItem.objects.create(
            company_id=company.pk,
            rule_version_id=new_version.pk,
            item_code=item.item_code,
            item_name=item.item_name,
            item_type=item.item_type,
            condition_text=item.condition_text,
            max_points=item.max_points,
            sort_order=item.sort_order,
        )

    create_required_items(new_version, cleaned)
    return serialize_required_conditions(new_version)


# ---------------------------------------------------------------------------
# BE-06 評価軸・最大点・段階基準の設定
#
# 根拠:
#   - タスク BE-06「軸ごとの最大点と0〜4の基準を保存。配点の検証、
#     同一募集には同一基準版を適用」(機能21・非機能10)
#   - 画面 S04: 加点項目は スキル一致率35・経験年数30・関連資格15・
#     AI適合度20 が初期値。配点は変更可能で、合計は100でなければならない。
#     不正・負数・合計100以外はエラー (イベント処理 No.2〜4)
#   - テーブル設計書 rule_items: item_type=score の行として保存する。
#     max_points は加点項目のみ必須・0〜100の整数・版内の合計は100。
#     段階基準 (0〜4の判定条件・尺度) の保存先は condition_text。
#   - 設計補足 No.9: 得点 = 最大配点 × 段階 ÷ 4 (例: 35×3÷4=26.25)
#
# 「同一募集には同一基準版を適用」は、募集ごとに最新版が1つに定まる
# 版管理 (BE-04/05 と共通) で担保する。評価側は最新版を参照すること。
# ---------------------------------------------------------------------------

# 画面S04の初期配点 (item_code, item_name, max_points)
DEFAULT_SCORE_ITEMS = (
    ("skill", "スキル一致率", 35),
    ("experience", "経験年数", 30),
    ("qualification", "関連資格", 15),
    ("ai_fit", "AI適合度", 20),
)


@dataclass
class ScoreItemInput:
    item_code: str | None = None
    item_name: str | None = None
    max_points: int | None = None
    condition_text: str | None = None  # 0〜4の段階基準 (判定条件・尺度)


@dataclass
class ScoreItemsInput:
    items: list | None = None  # list[ScoreItemInput]
    version_label: str | None = None


def _require_text_unlimited(value: str | None, field: str) -> str:
    if value is None or not str(value).strip():
        raise ValidationError(_("%(field)s は必須です。") % {"field": field})
    return str(value).strip()


def validate_score_items(data: ScoreItemsInput) -> list[dict]:
    """加点項目の検証。配点は各0〜100の整数、重複不可、合計ちょうど100。"""
    if not data.items:
        raise ValidationError(_("加点項目を1件以上指定してください。"))
    cleaned = []
    seen_codes = set()
    total = 0
    for i, item in enumerate(data.items, start=1):
        code = _require_text(item.item_code, f"項目コード({i}件目)", 40)
        if code in seen_codes:
            raise ValidationError(
                _("項目コード %(code)s が重複しています。") % {"code": code}
            )
        seen_codes.add(code)
        points = item.max_points
        if not isinstance(points, int) or isinstance(points, bool):
            raise ValidationError(
                _("%(name)s の最大配点は整数で指定してください。") % {"name": code}
            )
        if not (0 <= points <= 100):
            raise ValidationError(
                _("%(name)s の最大配点は0〜100で指定してください。") % {"name": code}
            )
        total += points
        cleaned.append(
            {
                "item_code": code,
                "item_name": _require_text(item.item_name, f"項目名({code})", 100),
                "max_points": points,
                # 段階基準が無いと評価側が0〜4を判定できないため必須にする。
                # condition_text は TEXT 型で桁数の指定がないため上限は設けない。
                "condition_text": _require_text_unlimited(
                    item.condition_text, f"段階基準({code})"
                ),
                "sort_order": i,
            }
        )
    if total != 100:
        raise ValidationError(
            _("配点の合計は100にしてください（現在 %(total)d 点）。")
            % {"total": total}
        )
    return cleaned


def create_score_items(version: RuleVersion, cleaned_items: list[dict]) -> list[RuleItem]:
    return [
        RuleItem.objects.create(
            company_id=version.company_id,
            rule_version_id=version.pk,
            item_type=RuleItem.ItemType.SCORE,
            **item,
        )
        for item in cleaned_items
    ]


def _copy_items(source: RuleVersion, target: RuleVersion, item_type: str) -> None:
    """基準版間で、指定区分の項目をそのまま引き継ぐ。"""
    for item in RuleItem.objects.filter(
        company_id=source.company_id, rule_version_id=source.pk, item_type=item_type
    ).order_by("sort_order", "id"):
        RuleItem.objects.create(
            company_id=target.company_id,
            rule_version_id=target.pk,
            item_code=item.item_code,
            item_name=item.item_name,
            item_type=item.item_type,
            condition_text=item.condition_text,
            max_points=item.max_points,
            sort_order=item.sort_order,
        )


def serialize_score_items(version: RuleVersion | None) -> dict:
    result = {
        "items": [],
        "total_points": 0,
        "version_no": version.version_no if version else None,
        "version_label": version.version_label if version else None,
    }
    if version is None:
        return result
    items = RuleItem.objects.filter(
        company_id=version.company_id,
        rule_version_id=version.pk,
        item_type=RuleItem.ItemType.SCORE,
    ).order_by("sort_order", "id")
    result["items"] = [serialize_rule_item(i) for i in items]
    result["total_points"] = sum(i.max_points or 0 for i in items)
    return result


@transaction.atomic
def get_score_items_for_staff(staff: Staff, opening_id: int) -> dict:
    company = verify_company_and_staff(staff)
    set_tenant_context_in_tx(company.pk)

    opening = Opening.objects.filter(company_id=company.pk, pk=opening_id).first()
    if opening is None:
        raise NotFoundError(_("募集が見つかりません。"))
    assert_can_view_opening(staff, opening)
    return serialize_score_items(latest_rule_version(opening))


@transaction.atomic
def update_score_items(staff: Staff, opening_id: int, data: ScoreItemsInput) -> dict:
    """評価軸・配点の保存 = 最新版を引き継いだ新しい基準版を作り、加点項目だけ差し替える。

    BE-05 の必須条件保存と同じ方式:
      - requirements は最新版から引き継ぐ
      - 必須条件 (required) は最新版からコピーして消さない
      - 加点項目 (score) は今回の入力で作り直す
    """
    company = verify_company_and_staff(staff)
    set_tenant_context_in_tx(company.pk)

    opening = (
        Opening.objects.select_for_update()
        .filter(company_id=company.pk, pk=opening_id)
        .first()
    )
    if opening is None:
        raise NotFoundError(_("募集が見つかりません。"))
    assert_can_edit_opening(staff, opening)

    cleaned = validate_score_items(data)

    latest = latest_rule_version(opening)
    if latest is None:
        raise ConflictError(
            _("評価基準がまだ登録されていません。先に募集要項を登録してください。")
        )

    version_no = latest.version_no + 1
    new_version = RuleVersion.objects.create(
        company_id=company.pk,
        opening_id=opening.pk,
        version_no=version_no,
        version_label=_validate_version_label(data.version_label, version_no),
        requirements=latest.requirements,
        saved_by_id=staff.pk,
        saved_at=timezone.now(),
    )
    _copy_items(latest, new_version, RuleItem.ItemType.REQUIRED)
    create_score_items(new_version, cleaned)
    return serialize_score_items(new_version)
