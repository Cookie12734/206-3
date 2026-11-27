"""SALT / BE-13 候補者一覧API ― URL定義 (config 側で api/ の下に接続する)"""
from django.urls import path

from . import views

urlpatterns = [
    # BE-13: 候補者一覧 (画面S01)
    path(
        "openings/<int:opening_id>/candidates/",
        views.candidate_list_view,
        name="candidate_list",
    ),
]
