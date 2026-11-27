from django.urls import path

from . import views

app_name = "recruitment"

urlpatterns = [
    # 募集の一覧・登録 (登録時に募集要項の初版も作る)
    path("openings/", views.opening_list_create_view, name="opening_list_create"),
    # 募集の詳細・編集 (編集時に募集要項は新しい版として保存される)
    path(
        "openings/<int:opening_id>/",
        views.opening_detail_update_view,
        name="opening_detail_update",
    ),
    # 募集要項の版履歴
    path(
        "openings/<int:opening_id>/requirement-versions/",
        views.requirement_versions_view,
        name="requirement_versions",
    ),
    # BE-05: 必須条件の取得・保存 (保存時は新しい基準版を作る)
    path(
        "openings/<int:opening_id>/required-conditions/",
        views.required_conditions_view,
        name="required_conditions",
    ),
    # BE-06: 評価軸・最大点・段階基準の取得・保存 (保存時は新しい基準版を作る)
    path(
        "openings/<int:opening_id>/score-items/",
        views.score_items_view,
        name="score_items",
    ),
    # BE-07: 基準の版管理・出力・再利用
    path(
        "openings/<int:opening_id>/criteria-versions/",
        views.criteria_versions_view,
        name="criteria_versions",
    ),
    path(
        "openings/<int:opening_id>/criteria-versions/<int:version_no>/",
        views.criteria_version_detail_view,
        name="criteria_version_detail",
    ),
    path(
        "openings/<int:opening_id>/criteria-versions/<int:version_no>/export/",
        views.criteria_version_export_view,
        name="criteria_version_export",
    ),
    path(
        "openings/<int:opening_id>/criteria-reuse/",
        views.criteria_reuse_view,
        name="criteria_reuse",
    ),
    path(
        "openings/<int:opening_id>/criteria-import/",
        views.criteria_import_view,
        name="criteria_import",
    ),
]
