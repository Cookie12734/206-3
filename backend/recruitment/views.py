from django.shortcuts import render
from rest_framework import mixins, viewsets

from accounts.permissions import EditableExceptViewer

from .models import JobPosting
from .serializers import JobPostingSerializer
# Create your views here.



class JobPostingViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """募集要項の一覧・取得・登録・編集"""
    queryset = JobPosting.objects.all()
    serializer_class = JobPostingSerializer
    permission_classes = [EditableExceptViewer]

    def get_queryset(self):
        return JobPosting.objects.filter(company=self.request.user.company).order_by("id")

def perform_create(self, serializer):
    serializer.save(company=self.request.user.company)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)