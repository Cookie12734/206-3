"""
SALT / BE-04 募集要項の登録・編集API 用モデル

根拠: 『26_テーブル設計書.xlsx』(2026/11/17改訂)
  - companies / staff / openings / staff_openings / rule_versions のみを定義する。
  - テーブルは既存SQL (db/init) が正本のため managed = False。
    Django の migrate で作成・変更しない。
  - 主キーは BIGINT GENERATED ALWAYS AS IDENTITY (DB側で採番)。
"""
from django.db import models


class Company(models.Model):
    """企業テーブル (companies) ― テナントの親。登録は運営スクリプトのみ。"""

    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "companies"

    def __str__(self):
        return f"{self.code}: {self.name}"


class Staff(models.Model):
    """採用担当者テーブル (staff)"""

    class Role(models.TextChoices):
        ADMIN = "admin", "admin"
        RECRUITER = "recruiter", "recruiter"
        VIEWER = "viewer", "viewer"

    company = models.ForeignKey(
        Company, on_delete=models.DO_NOTHING, db_column="company_id",
        related_name="staff_members",
    )
    name = models.CharField(max_length=50)
    email = models.CharField(max_length=100, unique=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.RECRUITER)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = "staff"

    def __str__(self):
        return f"{self.name} <{self.email}>"


class Opening(models.Model):
    """募集テーブル (openings)"""

    class HireType(models.TextChoices):
        GRADUATE = "graduate", "graduate"
        CAREER = "career", "career"

    class Status(models.TextChoices):
        OPEN = "open", "open"
        CLOSED = "closed", "closed"

    company = models.ForeignKey(
        Company, on_delete=models.DO_NOTHING, db_column="company_id",
        related_name="openings",
    )
    code = models.CharField(max_length=40)
    job_title = models.CharField(max_length=100)
    hire_type = models.CharField(max_length=12, choices=HireType.choices)
    contact_info = models.CharField(max_length=255)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.CLOSED)
    recruitment_year = models.SmallIntegerField()

    class Meta:
        managed = False
        db_table = "openings"

    def __str__(self):
        return f"{self.code}: {self.job_title}"


class StaffOpening(models.Model):
    """担当募集テーブル (staff_openings) ― recruiter の操作範囲を決める。"""

    company = models.ForeignKey(
        Company, on_delete=models.DO_NOTHING, db_column="company_id",
        related_name="staff_openings",
    )
    staff = models.ForeignKey(
        Staff, on_delete=models.DO_NOTHING, db_column="staff_id",
        related_name="staff_openings",
    )
    opening = models.ForeignKey(
        Opening, on_delete=models.DO_NOTHING, db_column="opening_id",
        related_name="staff_openings",
    )

    class Meta:
        managed = False
        db_table = "staff_openings"


class RuleVersion(models.Model):
    """評価基準版テーブル (rule_versions)

    募集要項 (requirements) はこのテーブルの版で管理する。
    「編集」= 既存行の上書きではなく、新しい版の追加。
    版に紐づく項目 (rule_items) は RuleItem を参照。
    必須条件は BE-05、評価軸・配点は BE-06 が担当する。
    """

    company = models.ForeignKey(
        Company, on_delete=models.DO_NOTHING, db_column="company_id",
        related_name="rule_versions",
    )
    opening = models.ForeignKey(
        Opening, on_delete=models.DO_NOTHING, db_column="opening_id",
        related_name="rule_versions",
    )
    version_no = models.IntegerField()
    version_label = models.CharField(max_length=20)
    requirements = models.CharField(max_length=2000)
    saved_by = models.ForeignKey(
        Staff, on_delete=models.DO_NOTHING, db_column="saved_by",
        related_name="saved_rule_versions",
    )
    saved_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = "rule_versions"

    def __str__(self):
        return f"opening={self.opening_id} {self.version_label} (no={self.version_no})"


class RuleItem(models.Model):
    """評価基準項目テーブル (rule_items)

    1つの基準版の中に、必須条件 (item_type=required) と
    加点項目 (item_type=score) が同居する。別テーブルではない。
    必須条件 (BE-05): max_points は NULL。
    加点項目 (BE-06): max_points が必須で、版内の合計は100。
    """

    class ItemType(models.TextChoices):
        REQUIRED = "required", "required"
        SCORE = "score", "score"

    company = models.ForeignKey(
        Company, on_delete=models.DO_NOTHING, db_column="company_id",
        related_name="rule_items",
    )
    rule_version = models.ForeignKey(
        RuleVersion, on_delete=models.DO_NOTHING, db_column="rule_version_id",
        related_name="items",
    )
    item_code = models.CharField(max_length=40)
    item_name = models.CharField(max_length=100)
    item_type = models.CharField(max_length=10, choices=ItemType.choices)
    condition_text = models.TextField()
    max_points = models.IntegerField(null=True, blank=True)
    sort_order = models.IntegerField()

    class Meta:
        managed = False
        db_table = "rule_items"

    def __str__(self):
        return f"{self.item_code} ({self.item_type})"
