from django.db import OperationalError, connection
from django.http import JsonResponse
from django.urls import include, path
from django.views.decorators.http import require_GET


@require_GET
def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except OperationalError:
        return JsonResponse({"status": "unavailable"}, status=503)

    return JsonResponse({"status": "ok"})


urlpatterns = [path("api/health/", health),
                path("api/", include("recruitment.urls")),
                path("api/", include("candidates.urls")),
                ]
