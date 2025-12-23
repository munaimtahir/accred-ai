from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'projects', views.ProjectViewSet)
router.register(r'indicators', views.IndicatorViewSet)
router.register(r'evidence', views.EvidenceViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # AI Service endpoints
    path('analyze-checklist/', views.analyze_checklist, name='analyze-checklist'),
    path('analyze-categorization/', views.analyze_categorization, name='analyze-categorization'),
    path('analyze-indicator-explanations/', views.analyze_indicator_explanations, name='analyze-indicator-explanations'),
    path('analyze-frequency-grouping/', views.analyze_frequency_grouping, name='analyze-frequency-grouping'),
    path('ask-assistant/', views.ask_assistant, name='ask-assistant'),
    path('report-summary/', views.report_summary, name='report-summary'),
    path('convert-document/', views.convert_document, name='convert-document'),
    path('compliance-guide/', views.compliance_guide, name='compliance-guide'),
    path('analyze-tasks/', views.analyze_tasks, name='analyze-tasks'),
    
    # Health check
    path('health/', views.health_check, name='health-check'),
    
    # Secure media serving
    path('media/<path:file_path>', views.serve_media, name='serve-media'),
]
