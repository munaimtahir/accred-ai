from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'projects', views.ProjectViewSet)
router.register(r'indicators', views.IndicatorViewSet)
router.register(r'evidence', views.EvidenceViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # Authentication endpoints
    path('auth/register/', views.register, name='register'),
    path('auth/login/', views.login, name='login'),
    path('auth/logout/', views.logout, name='logout'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', views.me, name='me'),
    path('auth/change-password/', views.change_password, name='change-password'),
    
    # AI Service endpoints
    path('analyze-checklist/', views.analyze_checklist, name='analyze-checklist'),
    path('analyze-categorization/', views.analyze_categorization, name='analyze-categorization'),
    path('ask-assistant/', views.ask_assistant, name='ask-assistant'),
    path('report-summary/', views.report_summary, name='report-summary'),
    path('convert-document/', views.convert_document, name='convert-document'),
    path('compliance-guide/', views.compliance_guide, name='compliance-guide'),
    path('analyze-tasks/', views.analyze_tasks, name='analyze-tasks'),
    
    # Health check endpoints
    path('health/', views.health_check, name='health-check'),
    path('ready/', views.readiness_check, name='readiness-check'),
    path('live/', views.liveness_check, name='liveness-check'),
    path('metrics/', views.metrics, name='metrics'),
    
    # Secure media serving
    path('media/<path:file_path>', views.serve_media, name='serve-media'),
]
