"""
SALT / BE-13 候補者一覧API ― モデル定義

対象テーブル (テーブル設計書 2026/11/17):
  survey_routes / responses / applications / submissions /
  analysis_jobs / evaluations / evaluation_items / decisions

本番テーブルはSQLが正本のため managed=False。
企業分離は recruitment と同じ複合FK (company_id, id) の考え方で、
参照はすべて同一企業内に限定して辿る。
"""
from django.db import models

from recruitment.models import Company, Opening, RuleItem, RuleVersion, Staff


class SurveyRoute(models.Model):
    """アンケート対象募集 (survey_routes)。回答→募集の橋渡し。"""

    company = models.ForeignKey(
        Company, on_delete=models.DO_NOTHING, db_column="company_id",
        related_name="+",
    )
    survey_version_id = models.BigIntegerField()
    opening = models.ForeignKey(
        Opening, on_delete=models.DO_NOTHING, db_column="opening_id",
        related_name="+",
    )

    class Meta:
        managed = False
        db_table = "survey_routes"


class Response(models.Model):
    """アンケート回答 (responses)。1回答につき1応募。"""

    company = models.ForeignKey(
        Company, on_delete=models.DO_NOTHING, db_column="company_id",
        related_name="+",
    )
    route = models.ForeignKey(
        SurveyRoute, on_delete=models.DO_NOTHING, db_column="route_id",
        related_name="+",
    )
    email = models.EmailField(max_length=100)
    wants_selection = models.BooleanField()
    answered_at = models.DateTimeField()
    request_key = models.CharField(max_length=64)
    entry_key = models.CharField(max_length=64, null=True, blank=True)

    class Meta:
        managed = False
        db_table = "responses"


class Application(models.Model):
    """応募 (applications)。受付番号はシステム全体で一意。"""

    class PurgeStatus(models.TextChoices):
        ACTIVE = "active", "利用中"
        DELETING = "deleting", "破棄中"

    company = models.ForeignKey(
        Company, on_delete=models.DO_NOTHING, db_column="company_id",
        related_name="+",
    )
    response = models.ForeignKey(
        Response, on_delete=models.DO_NOTHING, db_column="response_id",
        related_name="+",
    )
    receipt_no = models.CharField(max_length=40)
    consented_at = models.DateTimeField()
    access_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField()
    purge_status = models.CharField(
        max_length=12, choices=PurgeStatus.choices, default=PurgeStatus.ACTIVE
    )

    class Meta:
        managed = False
        db_table = "applications"


class Submission(models.Model):
    """応募版 (submissions)。再送信ごとに版が増え、最大の版番号が最新。"""

    company = models.ForeignKey(
        Company, on_delete=models.DO_NOTHING, db_column="company_id",
        related_name="+",
    )
    application = models.ForeignKey(
        Application, on_delete=models.DO_NOTHING, db_column="application_id",
        related_name="+",
    )
    version_no = models.IntegerField()
    full_name = models.CharField(max_length=50)
    email = models.EmailField(max_length=100)
    phone = models.CharField(max_length=20)
    submitted_at = models.DateTimeField()
    request_key = models.CharField(max_length=64)

    class Meta:
        managed = False
        db_table = "submissions"


class AnalysisJob(models.Model):
    """解析処理 (analysis_jobs)。応募版に対する解析・再計算の実行単位。"""

    class Status(models.TextChoices):
        QUEUED = "queued", "予約"
        RUNNING = "running", "実行中"
        DONE = "done", "完了"
        FAILED = "failed", "失敗"
        OBSOLETE = "obsolete", "旧版"

    company = models.ForeignKey(
        Company, on_delete=models.DO_NOTHING, db_column="company_id",
        related_name="+",
    )
    submission = models.ForeignKey(
        Submission, on_delete=models.DO_NOTHING, db_column="submission_id",
        related_name="+",
    )
    job_type = models.CharField(max_length=12)
    input_revision = models.IntegerField(default=0)
    run_after = models.DateTimeField()
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.QUEUED
    )
    attempts = models.IntegerField(default=0)
    last_run_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    error_reason = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "analysis_jobs"


class Evaluation(models.Model):
    """評価結果 (evaluations)。処理1件につき1評価。"""

    class Status(models.TextChoices):
        COMPLETE = "complete", "得点確定"
        INCOMPLETE = "incomplete", "未評価の項目あり"

    company = models.ForeignKey(
        Company, on_delete=models.DO_NOTHING, db_column="company_id",
        related_name="+",
    )
    job = models.ForeignKey(
        AnalysisJob, on_delete=models.DO_NOTHING, db_column="job_id",
        related_name="+",
    )
    rule_version = models.ForeignKey(
        RuleVersion, on_delete=models.DO_NOTHING, db_column="rule_version_id",
        related_name="+",
    )
    status = models.CharField(max_length=12, choices=Status.choices)
    total_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ai_summary = models.TextField(null=True, blank=True)
    keywords = models.TextField(null=True, blank=True)
    ai_status = models.CharField(max_length=16)
    calculated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "evaluations"


class EvaluationItem(models.Model):
    """評価結果明細 (evaluation_items)。基準項目ごとの段階・得点・必須判定。"""

    class Verdict(models.TextChoices):
        YES = "yes", "充足"
        NO = "no", "未充足"
        UNKNOWN = "unknown", "要確認"

    company = models.ForeignKey(
        Company, on_delete=models.DO_NOTHING, db_column="company_id",
        related_name="+",
    )
    evaluation = models.ForeignKey(
        Evaluation, on_delete=models.DO_NOTHING, db_column="evaluation_id",
        related_name="+",
    )
    rule_item = models.ForeignKey(
        RuleItem, on_delete=models.DO_NOTHING, db_column="rule_item_id",
        related_name="+",
    )
    grade = models.IntegerField(null=True, blank=True)
    points = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    verdict = models.CharField(
        max_length=10, choices=Verdict.choices, null=True, blank=True
    )
    reason = models.TextField()
    document_id = models.BigIntegerField(null=True, blank=True)
    source_pages = models.CharField(max_length=40, null=True, blank=True)
    source_quote = models.TextField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "evaluation_items"


class Decision(models.Model):
    """選考判断履歴 (decisions)。同一応募の最新の判断が現在の状態。"""

    class Kind(models.TextChoices):
        ADVANCE = "advance", "次選考へ"
        HOLD = "hold", "保留"
        REJECT = "reject", "見送り"

    company = models.ForeignKey(
        Company, on_delete=models.DO_NOTHING, db_column="company_id",
        related_name="+",
    )
    application = models.ForeignKey(
        Application, on_delete=models.DO_NOTHING, db_column="application_id",
        related_name="+",
    )
    evaluation = models.ForeignKey(
        Evaluation, on_delete=models.DO_NOTHING, db_column="evaluation_id",
        related_name="+",
    )
    decision = models.CharField(max_length=12, choices=Kind.choices)
    reason = models.CharField(max_length=1000)
    reviewed = models.BooleanField()
    decided_by = models.ForeignKey(
        Staff, on_delete=models.DO_NOTHING, db_column="decided_by",
        related_name="+",
    )
    decided_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "decisions"
