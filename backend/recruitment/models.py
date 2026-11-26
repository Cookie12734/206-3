from django.db import models
from django.conf import settings
from django.db import models
# Create your models here.
class HireType(models.TextChoices):
    NEW_GRAD = "NEW_GRAD", "新卒"
    MID_CAREER = "MID_CAREER", "中途"


class JobPosting(models.Model):
    """募集（募集職種と募集要項）"""
    title = models.CharField("募集職種", max_length=100)
    hire_type = models.CharField("採用区分", max_length=20, choices=HireType.choices)
    requirements = models.TextField("募集要項（求める人物像・要件）", max_length=2000)
    created_at = models.DateTimeField("作成日時", auto_now_add=True)
    updated_at = models.DateTimeField("更新日時", auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="登録者", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="+",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, verbose_name="最終更新者", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="+",
    )

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(fields=["title", "hire_type"], name="unique_job_title_per_hire_type"),
        ]

    def __str__(self):
        return f"{self.title}（{self.get_hire_type_display()}）"