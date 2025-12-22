import uuid

from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Project, Indicator, Evidence, ComplianceStatus
from .serializers import (
    ProjectSerializer, ProjectCreateSerializer,
    IndicatorSerializer, EvidenceSerializer,
    AnalyzeChecklistInputSerializer, AnalyzeCategorizationInputSerializer,
    AskAssistantInputSerializer, ReportSummaryInputSerializer,
    ConvertDocumentInputSerializer, ComplianceGuideInputSerializer,
    AnalyzeTasksInputSerializer
)
from . import ai_services


class ProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for Project CRUD operations"""
    queryset = Project.objects.prefetch_related(
        'indicators',
        'indicators__evidence'
    ).all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProjectCreateSerializer
        return ProjectSerializer
    
    def list(self, request, *args, **kwargs):
        """List all projects with indicators and evidence"""
        queryset = self.get_queryset()
        serializer = ProjectSerializer(queryset, many=True)
        return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """Create a new project with optional indicators"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def partial_update(self, request, *args, **kwargs):
        """Partially update a project"""
        instance = self.get_object()
        serializer = ProjectSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class IndicatorViewSet(viewsets.ModelViewSet):
    """ViewSet for Indicator operations"""
    queryset = Indicator.objects.prefetch_related('evidence').all()
    serializer_class = IndicatorSerializer
    
    def get_queryset(self):
        """Allow filtering by project"""
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset
    
    def partial_update(self, request, *args, **kwargs):
        """Partially update an indicator"""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def quick_log(self, request, pk=None):
        """Quick log action - sets status to Compliant and updates timestamp"""
        indicator = self.get_object()
        indicator.status = ComplianceStatus.COMPLIANT
        indicator.last_updated = timezone.now()
        indicator.save()
        serializer = self.get_serializer(indicator)
        return Response(serializer.data)


class EvidenceViewSet(viewsets.ModelViewSet):
    """ViewSet for Evidence operations"""
    queryset = Evidence.objects.all()
    serializer_class = EvidenceSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    def get_queryset(self):
        """Allow filtering by indicator"""
        queryset = super().get_queryset()
        indicator_id = self.request.query_params.get('indicator')
        if indicator_id:
            queryset = queryset.filter(indicator_id=indicator_id)
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create evidence - handles file uploads and notes"""
        data = request.data.copy()
        
        # Handle file upload
        if 'file' in request.FILES:
            file = request.FILES['file']
            file_name = file.name
            file_size = file.size
            
            # Save file
            file_path = f'evidence/{uuid.uuid4()}_{file_name}'
            saved_path = default_storage.save(file_path, ContentFile(file.read()))
            
            data['file_name'] = file_name
            data['file_url'] = saved_path
            data['file_size'] = f"{file_size / 1024 / 1024:.2f} MB" if file_size > 1024 * 1024 else f"{file_size / 1024:.2f} KB"
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# AI Service Endpoints

@api_view(['POST'])
def analyze_checklist(request):
    """Analyze and enrich checklist indicators using AI"""
    serializer = AnalyzeChecklistInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid input', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    indicators = serializer.validated_data['indicators']
    result = ai_services.analyze_checklist(indicators)
    return Response({'indicators': result})


@api_view(['POST'])
def analyze_categorization(request):
    """Categorize indicators by AI manageability"""
    serializer = AnalyzeCategorizationInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid input', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    indicators = serializer.validated_data['indicators']
    result = ai_services.analyze_categorization(indicators)
    return Response(result)


@api_view(['POST'])
def ask_assistant(request):
    """Get AI assistant response for compliance questions"""
    serializer = AskAssistantInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid input', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    query = serializer.validated_data['query']
    indicators = serializer.validated_data.get('indicators', [])
    result = ai_services.ask_assistant(query, indicators)
    return Response({'response': result})


@api_view(['POST'])
def report_summary(request):
    """Generate an AI-powered report summary"""
    serializer = ReportSummaryInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid input', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    indicators = serializer.validated_data['indicators']
    result = ai_services.generate_report_summary(indicators)
    return Response({'summary': result})


@api_view(['POST'])
def convert_document(request):
    """Convert document text to CSV format"""
    serializer = ConvertDocumentInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid input', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    document_text = serializer.validated_data['document_text']
    result = ai_services.convert_document_to_csv(document_text)
    return Response({'csv_content': result})


@api_view(['POST'])
def compliance_guide(request):
    """Generate a compliance guide/SOP for an indicator"""
    serializer = ComplianceGuideInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid input', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    indicator = serializer.validated_data['indicator']
    result = ai_services.generate_compliance_guide(indicator)
    return Response({'guide': result})


@api_view(['POST'])
def analyze_tasks(request):
    """Analyze indicators and provide AI suggestions"""
    serializer = AnalyzeTasksInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid input', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    indicators = serializer.validated_data['indicators']
    result = ai_services.analyze_tasks(indicators)
    return Response(result)


@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    return Response({
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'version': '1.0.0'
    })
