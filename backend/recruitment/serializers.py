from rest_framework import serializers

from .models import JobPosting


class JobPostingSerializer(serializers.ModelSerializer):
    hire_type_label = serializers.CharField(source="get_hire_type_display", read_only=True)

    class Meta:
        model = JobPosting
        fields = [
            "id", "title", "hire_type", "hire_type_label", "requirements",
            "created_at", "updated_at", "created_by", "updated_by",
        ]
        read_only_fields = ["created_at", "updated_at", "created_by", "updated_by"]
        extra_kwargs = {
            "title": {"error_messages": {"blank": "募集職種を入力してください", "required": "募集職種を入力してください",
                                          "max_length": "募集職種は100文字以内で入力してください"}},
            "requirements": {"error_messages": {"blank": "募集要項を入力してください", "required": "募集要項を入力してください",
                                                 "max_length": "募集要項は2000文字以内で入力してください"}},
        }