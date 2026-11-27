"""
BE-13 候補者一覧 サービス層テスト

models は managed=False のため、テストDBではテーブルが自動作成されない。
setUpClass で存在しないテーブルだけを作成する (recruitment のテストと同じ方式)。
"""
from decimal import Decimal

from django.db import connection
from django.test import TransactionTestCase
from django.utils import timezone

from recruitment import services as core
from recruitment.models import Company, Opening, RuleItem, RuleVersion, Staff

from . import services
from .models import (
    AnalysisJob,
    Application,
    Decision,
    Evaluation,
    EvaluationItem,
    Response,
    Submission,
    SurveyRoute,
)

RECRUITMENT_MODELS = None  # setUpClass 内で組み立てる


class CandidateListServiceTests(TransactionTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from recruitment import models as rm

        existing = set(connection.introspection.table_names())
        with connection.schema_editor() as editor:
            for model in (
                rm.Company, rm.Staff, rm.Opening, rm.StaffOpening,
                rm.RuleVersion, rm.RuleItem,
                SurveyRoute, Response, Application, Submission,
                AnalysisJob, Evaluation, EvaluationItem, Decision,
            ):
                if model._meta.db_table not in existing:
                    editor.create_model(model)

    def tearDown(self):
        # managed=False のテーブルはテスト後の自動flush対象外のため明示的に消す
        from recruitment.models import RuleItem, RuleVersion, StaffOpening

        Decision.objects.all().delete()
        EvaluationItem.objects.all().delete()
        Evaluation.objects.all().delete()
        AnalysisJob.objects.all().delete()
        Submission.objects.all().delete()
        Application.objects.all().delete()
        Response.objects.all().delete()
        SurveyRoute.objects.all().delete()
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
        self.admin = Staff.objects.create(
            company=self.company, name="管理者", email="admin@example.com",
            password_hash="x", role=Staff.Role.ADMIN, is_active=True,
        )
        self.recruiter = Staff.objects.create(
            company=self.company, name="担当者", email="rec@example.com",
            password_hash="x", role=Staff.Role.RECRUITER, is_active=True,
        )
        self.opening = Opening.objects.create(
            company=self.company, code="ENG-001", job_title="Webエンジニア",
            hire_type="career", contact_info="hr@example.com",
            status="open", recruitment_year=2026,
        )
        self.version = RuleVersion.objects.create(
            company=self.company, opening=self.opening, version_no=1,
            version_label="v1", requirements="要項", saved_by=self.admin,
            saved_at=timezone.now(),
        )
        self.req_item = RuleItem.objects.create(
            company=self.company, rule_version=self.version,
            item_code="required_experience_years", item_name="必要経験年数",
            item_type="required", condition_text="3年以上", sort_order=1,
        )
        self.score_items = {}
        for i, (code, name, pts) in enumerate(
            [("skill", "スキル一致率", 35), ("experience", "経験年数", 30),
             ("qualification", "関連資格", 15), ("ai_fit", "AI適合度", 20)],
            start=2,
        ):
            self.score_items[code] = RuleItem.objects.create(
                company=self.company, rule_version=self.version,
                item_code=code, item_name=name, item_type="score",
                condition_text="基準", max_points=pts, sort_order=i,
            )
        self.route = SurveyRoute.objects.create(
            company=self.company, survey_version_id=1, opening=self.opening
        )

    # --- データ作成ヘルパー -------------------------------------------

    def _application(self, receipt: str, name: str, days_ago: int = 0) -> Application:
        now = timezone.now() - timezone.timedelta(days=days_ago)
        response = Response.objects.create(
            company=self.company, route=self.route, email=f"{receipt}@example.com",
            wants_selection=True, answered_at=now, request_key=f"rk-{receipt}",
            entry_key=f"ek-{receipt}",
        )
        app = Application.objects.create(
            company=self.company, response=response, receipt_no=receipt,
            consented_at=now, access_hash="a" * 64, created_at=now,
            purge_status="active",
        )
        Submission.objects.create(
            company=self.company, application=app, version_no=1,
            full_name=name, email=f"{receipt}@example.com", phone="090-0000-0000",
            submitted_at=now, request_key=f"sk-{receipt}",
        )
        return app

    def _evaluate(self, app: Application, *, status="complete", total="86.25",
                  grades=None, verdict="yes", job_status="done"):
        submission = Submission.objects.filter(application=app).first()
        job = AnalysisJob.objects.create(
            company=self.company, submission=submission, job_type="analyze",
            input_revision=0, run_after=timezone.now(), status=job_status,
            attempts=1,
        )
        if job_status != "done":
            return job, None
        evaluation = Evaluation.objects.create(
            company=self.company, job=job, rule_version=self.version,
            status=status,
            total_score=Decimal(total) if total is not None else None,
            ai_status="evaluated", calculated_at=timezone.now(),
        )
        EvaluationItem.objects.create(
            company=self.company, evaluation=evaluation, rule_item=self.req_item,
            verdict=verdict, reason="確認済み",
        )
        grades = grades if grades is not None else {
            "skill": (3, "26.25"), "experience": (4, "30.00"),
            "qualification": (4, "15.00"), "ai_fit": (3, "15.00"),
        }
        for code, (grade, points) in grades.items():
            EvaluationItem.objects.create(
                company=self.company, evaluation=evaluation,
                rule_item=self.score_items[code], grade=grade,
                points=Decimal(points) if points is not None else None,
                reason="根拠あり",
            )
        return job, evaluation

    # --- テスト ---------------------------------------------------------

    def test_list_rows_summary_and_order(self):
        a = self._application("APP-001", "確定太郎", days_ago=3)
        _, ev = self._evaluate(a)
        Decision.objects.create(
            company=self.company, application=a, evaluation=ev,
            decision="advance", reason="良好", reviewed=True,
            decided_by=self.admin, decided_at=timezone.now(),
        )
        b = self._application("APP-002", "要確認花子", days_ago=2)
        self._evaluate(
            b, status="incomplete", total=None, verdict="unknown",
            grades={"skill": (3, "26.25"), "experience": (None, None),
                    "qualification": (4, "15.00"), "ai_fit": (3, "15.00")},
        )
        c = self._application("APP-003", "失敗次郎", days_ago=1)
        self._evaluate(c, job_status="failed")
        self._application("APP-004", "未解析三郎", days_ago=0)

        result = services.list_candidates_for_staff(self.admin, self.opening.pk)
        self.assertEqual(result["summary"]["total_count"], 4)
        self.assertEqual(result["summary"]["needs_review_count"], 1)
        self.assertEqual(result["summary"]["advance_count"], 1)
        self.assertEqual(result["summary"]["error_count"], 1)

        rows = {r["receipt_no"]: r for r in result["results"]}
        self.assertEqual(result["results"][0]["receipt_no"], "APP-001")  # スコア順で先頭
        self.assertEqual(rows["APP-001"]["status"], "evaluated")
        self.assertEqual(rows["APP-001"]["total_score"], 86.25)
        self.assertEqual(rows["APP-001"]["confirmed_subtotal"], 86.25)
        self.assertEqual(rows["APP-001"]["required_summary"], "yes")
        self.assertEqual(rows["APP-001"]["decision"], "advance")

        self.assertEqual(rows["APP-002"]["status"], "needs_review")
        self.assertIsNone(rows["APP-002"]["total_score"])
        self.assertEqual(rows["APP-002"]["confirmed_subtotal"], 56.25)
        self.assertEqual(rows["APP-002"]["required_summary"], "unknown")
        codes = {i["item_code"] for i in rows["APP-002"]["needs_review_items"]}
        self.assertEqual(codes, {"experience", "required_experience_years"})

        self.assertEqual(rows["APP-003"]["status"], "error")
        self.assertEqual(rows["APP-004"]["status"], "not_started")

    def test_pagination(self):
        for i in range(3):
            self._application(f"APP-10{i}", f"候補者{i}")
        page1 = services.list_candidates_for_staff(
            self.admin, self.opening.pk, page=1, page_size=2
        )
        page2 = services.list_candidates_for_staff(
            self.admin, self.opening.pk, page=2, page_size=2
        )
        self.assertEqual(page1["total"], 3)
        self.assertEqual(len(page1["results"]), 2)
        self.assertEqual(len(page2["results"]), 1)

    def test_recruiter_without_assignment_is_denied(self):
        # 担当外の募集は存在を隠すため NotFound (recruitment の権限仕様に合わせる)
        self._application("APP-001", "誰か")
        with self.assertRaises(core.NotFoundError):
            services.list_candidates_for_staff(self.recruiter, self.opening.pk)

    # --- BE-14 検索・絞り込み・並べ替え --------------------------------

    def _three_scored(self):
        """スコアの違う確定済み候補者3人 (キーワード付き)"""
        data = [
            ("APP-201", "高得点一郎", "90.00"),
            ("APP-202", "中得点二郎", "70.50"),
            ("APP-203", "低得点三郎", "50.25"),
        ]
        apps = []
        for i, (receipt, name, total) in enumerate(data):
            app = self._application(receipt, name, days_ago=i)
            _, ev = self._evaluate(app, total=total)
            ev.keywords = "Python, Django"
            ev.save()
            apps.append(app)
        return apps

    def test_be14_keyword_search(self):
        self._three_scored()
        by_name = services.list_candidates_for_staff(
            self.admin, self.opening.pk, keyword="高得点"
        )
        self.assertEqual([r["receipt_no"] for r in by_name["results"]], ["APP-201"])
        by_receipt = services.list_candidates_for_staff(
            self.admin, self.opening.pk, keyword="app-202"
        )
        self.assertEqual(by_receipt["total"], 1)
        by_skill = services.list_candidates_for_staff(
            self.admin, self.opening.pk, keyword="Django"
        )
        self.assertEqual(by_skill["total"], 3)  # 全員キーワードに含む
        # サマリーは絞り込み前の全体件数のまま
        self.assertEqual(by_name["summary"]["total_count"], 3)

    def test_be14_status_and_score_filters(self):
        self._three_scored()
        pending = self._application("APP-204", "未評価四郎")
        self._evaluate(
            pending, status="incomplete", total=None, verdict="unknown",
            grades={"skill": (3, "26.25"), "experience": (None, None),
                    "qualification": (4, "15.00"), "ai_fit": (3, "15.00")},
        )
        needs = services.list_candidates_for_staff(
            self.admin, self.opening.pk, status="needs_review"
        )
        self.assertEqual([r["receipt_no"] for r in needs["results"]], ["APP-204"])
        high = services.list_candidates_for_staff(
            self.admin, self.opening.pk, score_min=70
        )
        self.assertEqual(
            [r["receipt_no"] for r in high["results"]], ["APP-201", "APP-202"]
        )
        req = services.list_candidates_for_staff(
            self.admin, self.opening.pk, required="unknown"
        )
        self.assertEqual([r["receipt_no"] for r in req["results"]], ["APP-204"])
        with self.assertRaises(core.ValidationError):
            services.list_candidates_for_staff(
                self.admin, self.opening.pk, status="bogus"
            )

    def test_be14_sort_and_rank(self):
        self._three_scored()
        self._application("APP-204", "未評価四郎")  # スコアなし
        desc = services.list_candidates_for_staff(self.admin, self.opening.pk)
        self.assertEqual(
            [(r["receipt_no"], r["rank"]) for r in desc["results"]],
            [("APP-201", 1), ("APP-202", 2), ("APP-203", 3), ("APP-204", None)],
        )
        asc = services.list_candidates_for_staff(
            self.admin, self.opening.pk, sort="score_asc"
        )
        self.assertEqual(
            [r["receipt_no"] for r in asc["results"]],
            ["APP-203", "APP-202", "APP-201", "APP-204"],
        )
        applied = services.list_candidates_for_staff(
            self.admin, self.opening.pk, sort="applied_asc"
        )
        self.assertEqual(applied["results"][0]["receipt_no"], "APP-203")  # 最も古い応募
        self.assertIsNone(applied["results"][0]["rank"])  # 応募順では順位なし

    def test_other_opening_not_included(self):
        other = Opening.objects.create(
            company=self.company, code="ENG-002", job_title="別募集",
            hire_type="graduate", contact_info="hr@example.com",
            status="open", recruitment_year=2026,
        )
        self._application("APP-001", "対象")
        result = services.list_candidates_for_staff(self.admin, other.pk)
        self.assertEqual(result["total"], 0)
