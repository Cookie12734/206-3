"""
BE-04 サービス層テスト

models は managed=False (本番テーブルはSQLが正本) のため、テストDBでは
テーブルが自動作成されない。setUpClass で存在しないテーブルだけを作成する。
"""
from django.db import connection
from django.test import TransactionTestCase
from django.utils import timezone

from . import services
from .models import Company, Opening, RuleVersion, Staff
from .services import OpeningInput

MODELS = None  # 循環import回避のため setUpClass 内で組み立てる


class OpeningRequirementsServiceTests(TransactionTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from .models import Company as C
        from .models import Opening as O
        from .models import RuleItem as RI
        from .models import RuleVersion as R
        from .models import Staff as S
        from .models import StaffOpening as SO

        existing = set(connection.introspection.table_names())
        with connection.schema_editor() as editor:
            for model in (C, S, O, SO, R, RI):
                if model._meta.db_table not in existing:
                    editor.create_model(model)

    def tearDown(self):
        # managed=False のテーブルはテスト後の自動flush対象外のため明示的に消す
        from .models import StaffOpening

        from .models import RuleItem

        RuleItem.objects.all().delete()
        RuleVersion.objects.all().delete()
        StaffOpening.objects.all().delete()
        Opening.objects.all().delete()
        Staff.objects.all().delete()
        Company.objects.all().delete()

    def setUp(self):
        self.company = Company.objects.create(
            code="acme", name="Acme", is_active=True, created_at=timezone.now()
        )
        self.other_company = Company.objects.create(
            code="other", name="Other", is_active=True, created_at=timezone.now()
        )
        self.admin = Staff.objects.create(
            company=self.company, name="Admin", email="admin@example.com",
            password_hash="x", role=Staff.Role.ADMIN, is_active=True,
        )
        self.viewer = Staff.objects.create(
            company=self.company, name="Viewer", email="viewer@example.com",
            password_hash="x", role=Staff.Role.VIEWER, is_active=True,
        )

    def _valid_input(self, **overrides):
        data = dict(
            code="ENG26", job_title="エンジニア", hire_type="graduate",
            contact_info="jinji@example.com", recruitment_year=2026,
            requirements="求める人物像・要件の本文",
        )
        data.update(overrides)
        return OpeningInput(**data)

    def test_create_makes_opening_and_first_version(self):
        result = services.create_opening_with_requirements(self.admin, self._valid_input())
        self.assertEqual(result["code"], "ENG26")
        self.assertEqual(result["status"], "closed")  # 初期値は closed (設計書)
        self.assertEqual(result["requirements"], "求める人物像・要件の本文")
        self.assertEqual(result["current_version"]["version_no"], 1)

    def test_create_rejects_blank_and_too_long_requirements(self):
        with self.assertRaises(services.ValidationError):
            services.create_opening_with_requirements(
                self.admin, self._valid_input(requirements="   ")
            )
        with self.assertRaises(services.ValidationError):
            services.create_opening_with_requirements(
                self.admin, self._valid_input(requirements="あ" * 2001)
            )
        self.assertEqual(Opening.objects.count(), 0)

    def test_create_rejects_duplicate_code_in_same_company(self):
        services.create_opening_with_requirements(self.admin, self._valid_input())
        with self.assertRaises(services.ConflictError):
            services.create_opening_with_requirements(self.admin, self._valid_input())

    def test_update_adds_new_version_instead_of_overwriting(self):
        created = services.create_opening_with_requirements(self.admin, self._valid_input())
        updated = services.update_opening_and_requirements(
            self.admin, created["id"],
            OpeningInput(requirements="改定後の要項"),
        )
        self.assertEqual(updated["current_version"]["version_no"], 2)
        self.assertEqual(updated["requirements"], "改定後の要項")
        versions = services.list_requirement_versions_for_staff(self.admin, created["id"])
        self.assertEqual([v["version_no"] for v in versions], [2, 1])
        self.assertEqual(versions[1]["requirements"], "求める人物像・要件の本文")

    def test_viewer_cannot_create_or_edit(self):
        with self.assertRaises(services.PermissionDeniedError):
            services.create_opening_with_requirements(self.viewer, self._valid_input())
        created = services.create_opening_with_requirements(self.admin, self._valid_input())
        with self.assertRaises(services.PermissionDeniedError):
            services.update_opening_and_requirements(
                self.viewer, created["id"], OpeningInput(requirements="x")
            )

    def test_other_company_opening_is_not_found(self):
        created = services.create_opening_with_requirements(self.admin, self._valid_input())
        other_admin = Staff.objects.create(
            company=self.other_company, name="OtherAdmin", email="o@example.com",
            password_hash="x", role=Staff.Role.ADMIN, is_active=True,
        )
        with self.assertRaises(services.NotFoundError):
            services.get_opening_detail_for_staff(other_admin, created["id"])
        self.assertEqual(RuleVersion.objects.count(), 1)

    # --- BE-05 必須条件 -------------------------------------------------

    def _conditions(self, **overrides):
        data = dict(
            required_experience_years="3年以上",
            required_qualification="普通自動車第一種運転免許",
        )
        data.update(overrides)
        return services.RequiredConditionsInput(**data)

    def test_be05_save_creates_new_version_and_structured_items(self):
        created = services.create_opening_with_requirements(self.admin, self._valid_input())
        result = services.update_required_conditions(
            self.admin, created["id"], self._conditions()
        )
        self.assertEqual(result["version_no"], 2)
        self.assertEqual(result["required_experience_years"], "3年以上")
        self.assertEqual(result["required_qualification"], "普通自動車第一種運転免許")
        self.assertEqual(len(result["items"]), 2)
        for item in result["items"]:
            self.assertEqual(item["item_type"], "required")
            self.assertIsNone(item["max_points"])
        # 募集要項は最新版から引き継がれる
        detail = services.get_opening_detail_for_staff(self.admin, created["id"])
        self.assertEqual(detail["requirements"], "求める人物像・要件の本文")
        # GET でも同じ内容が返る
        fetched = services.get_required_conditions_for_staff(self.admin, created["id"])
        self.assertEqual(fetched["required_experience_years"], "3年以上")

    def test_be05_rejects_blank_and_too_long(self):
        created = services.create_opening_with_requirements(self.admin, self._valid_input())
        with self.assertRaises(services.ValidationError):
            services.update_required_conditions(
                self.admin, created["id"], self._conditions(required_qualification="  ")
            )
        with self.assertRaises(services.ValidationError):
            services.update_required_conditions(
                self.admin, created["id"],
                self._conditions(required_experience_years="あ" * 101),
            )
        self.assertEqual(RuleVersion.objects.count(), 1)  # 失敗時に版は増えない

    def test_be05_update_replaces_conditions_and_keeps_score_items(self):
        from .models import RuleItem

        created = services.create_opening_with_requirements(self.admin, self._valid_input())
        first = services.update_required_conditions(
            self.admin, created["id"], self._conditions()
        )
        # 最新版に加点項目がある状態を再現 (BE-06 の領域)
        latest = RuleVersion.objects.order_by("-version_no").first()
        RuleItem.objects.create(
            company=self.company, rule_version=latest, item_code="skill",
            item_name="スキル一致", item_type="score", condition_text="段階基準",
            max_points=35, sort_order=1,
        )
        second = services.update_required_conditions(
            self.admin, created["id"],
            self._conditions(required_experience_years="5年以上"),
        )
        self.assertEqual(second["version_no"], 3)
        self.assertEqual(second["required_experience_years"], "5年以上")
        new_latest = RuleVersion.objects.order_by("-version_no").first()
        codes = list(
            RuleItem.objects.filter(rule_version=new_latest)
            .order_by("item_code").values_list("item_code", flat=True)
        )
        # 必須条件は作り直され、加点項目はコピーされて残る (重複しない)
        self.assertEqual(
            codes, ["required_experience_years", "required_qualification", "skill"]
        )

    def test_be05_viewer_cannot_update(self):
        created = services.create_opening_with_requirements(self.admin, self._valid_input())
        with self.assertRaises(services.PermissionDeniedError):
            services.update_required_conditions(
                self.viewer, created["id"], self._conditions()
            )

    # --- BE-06 評価軸・配点 ---------------------------------------------

    def _score_input(self, points=(35, 30, 15, 20), **overrides):
        codes = ["skill", "experience", "qualification", "ai_fit"]
        names = ["スキル一致率", "経験年数", "関連資格", "AI適合度"]
        items = [
            services.ScoreItemInput(
                item_code=c, item_name=n, max_points=p,
                condition_text="4:十分 3:概ね 2:一部 1:不足 0:なし",
            )
            for c, n, p in zip(codes, names, points)
        ]
        data = dict(items=items)
        data.update(overrides)
        return services.ScoreItemsInput(**data)

    def test_be06_save_creates_new_version_with_total_100(self):
        created = services.create_opening_with_requirements(self.admin, self._valid_input())
        result = services.update_score_items(
            self.admin, created["id"], self._score_input()
        )
        self.assertEqual(result["version_no"], 2)
        self.assertEqual(result["total_points"], 100)
        self.assertEqual(
            [i["item_code"] for i in result["items"]],
            ["skill", "experience", "qualification", "ai_fit"],
        )
        self.assertTrue(all(i["item_type"] == "score" for i in result["items"]))
        fetched = services.get_score_items_for_staff(self.admin, created["id"])
        self.assertEqual(fetched["total_points"], 100)

    def test_be06_rejects_total_not_100_negative_and_duplicate(self):
        created = services.create_opening_with_requirements(self.admin, self._valid_input())
        with self.assertRaises(services.ValidationError):  # 合計99
            services.update_score_items(
                self.admin, created["id"], self._score_input(points=(35, 30, 15, 19))
            )
        with self.assertRaises(services.ValidationError):  # 負数を含む
            services.update_score_items(
                self.admin, created["id"], self._score_input(points=(-5, 40, 45, 20))
            )
        dup = self._score_input()
        dup.items[1].item_code = "skill"
        with self.assertRaises(services.ValidationError):  # item_code重複
            services.update_score_items(self.admin, created["id"], dup)
        blank = self._score_input()
        blank.items[0].condition_text = " "
        with self.assertRaises(services.ValidationError):  # 段階基準が空白
            services.update_score_items(self.admin, created["id"], blank)
        self.assertEqual(RuleVersion.objects.count(), 1)  # 失敗時に版は増えない

    def test_be06_preserves_required_conditions_and_requirements(self):
        created = services.create_opening_with_requirements(self.admin, self._valid_input())
        services.update_required_conditions(
            self.admin, created["id"], self._conditions()
        )
        result = services.update_score_items(
            self.admin, created["id"], self._score_input()
        )
        self.assertEqual(result["version_no"], 3)
        conditions = services.get_required_conditions_for_staff(self.admin, created["id"])
        self.assertEqual(conditions["required_experience_years"], "3年以上")
        detail = services.get_opening_detail_for_staff(self.admin, created["id"])
        self.assertEqual(detail["requirements"], "求める人物像・要件の本文")

    def test_be06_viewer_cannot_update(self):
        created = services.create_opening_with_requirements(self.admin, self._valid_input())
        with self.assertRaises(services.PermissionDeniedError):
            services.update_score_items(self.viewer, created["id"], self._score_input())
