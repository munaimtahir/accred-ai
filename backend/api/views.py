import uuid
import mimetypes
import logging
from pathlib import Path

import os
from django.conf import settings
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.http import FileResponse, Http404
from django.contrib.auth.models import User
from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)

from .models import Project, Indicator, Evidence, ComplianceStatus, UserProfile
from .serializers import (
    ProjectSerializer, ProjectCreateSerializer,
    IndicatorSerializer, EvidenceSerializer,
    AnalyzeChecklistInputSerializer, AnalyzeCategorizationInputSerializer,
    AskAssistantInputSerializer, ReportSummaryInputSerializer,
    ConvertDocumentInputSerializer, ComplianceGuideInputSerializer,
    AnalyzeTasksInputSerializer, AnalyzeIndicatorExplanationsInputSerializer,
    AnalyzeFrequencyGroupingInputSerializer,
    UserSerializer, UserRegistrationSerializer, LoginSerializer, ChangePasswordSerializer
)
from .permissions import IsProjectOwnerOrReadOnly, IsProjectMember, IsAdmin
from . import ai_services


# Authentication Views
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """User registration endpoint"""
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """User login endpoint - returns JWT tokens"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """User logout endpoint - blacklists refresh token"""
    try:
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Get current user profile"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password"""
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for Project CRUD operations"""
    permission_classes = [IsProjectOwnerOrReadOnly]
    serializer_class = ProjectSerializer
    queryset = Project.objects.all()
    
    def get_queryset(self):
        """Filter projects to show only user's projects"""
        queryset = Project.objects.prefetch_related(
            'indicators',
            'indicators__evidence'
        ).all()
        
        # Admin can see all projects
        if hasattr(self.request.user, 'profile') and self.request.user.profile.is_admin:
            return queryset
        
        # Regular users see only their owned or member projects
        if self.request.user.is_authenticated:
            return queryset.filter(
                models.Q(owner=self.request.user) | 
                models.Q(members=self.request.user)
            ).distinct()
        
        return queryset.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProjectCreateSerializer
        return ProjectSerializer
    
    def perform_create(self, serializer):
        """Set the owner when creating a project"""
        serializer.save(owner=self.request.user)
    
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
    permission_classes = [IsProjectMember]
    queryset = Indicator.objects.prefetch_related('evidence').all()
    serializer_class = IndicatorSerializer
    
    def get_queryset(self):
        """Filter indicators to show only user's project indicators"""
        queryset = super().get_queryset()
        
        # Admin can see all indicators
        if hasattr(self.request.user, 'profile') and self.request.user.profile.is_admin:
            project_id = self.request.query_params.get('project')
            if project_id:
                queryset = queryset.filter(project_id=project_id)
            return queryset
        
        # Regular users see only indicators from their projects
        if self.request.user.is_authenticated:
            user_projects = Project.objects.filter(
                models.Q(owner=self.request.user) | 
                models.Q(members=self.request.user)
            ).distinct()
            queryset = queryset.filter(project__in=user_projects)
            
            project_id = self.request.query_params.get('project')
            if project_id:
                queryset = queryset.filter(project_id=project_id)
            return queryset
        
        return queryset.none()
    
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
    permission_classes = [IsProjectMember]
    queryset = Evidence.objects.all()
    serializer_class = EvidenceSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    def get_queryset(self):
        """Filter evidence to show only user's project evidence"""
        queryset = super().get_queryset()
        
        # Admin can see all evidence
        if hasattr(self.request.user, 'profile') and self.request.user.profile.is_admin:
            indicator_id = self.request.query_params.get('indicator')
            if indicator_id:
                queryset = queryset.filter(indicator_id=indicator_id)
            return queryset
        
        # Regular users see only evidence from their projects
        if self.request.user.is_authenticated:
            user_projects = Project.objects.filter(
                models.Q(owner=self.request.user) | 
                models.Q(members=self.request.user)
            ).distinct()
            queryset = queryset.filter(indicator__project__in=user_projects)
            
            indicator_id = self.request.query_params.get('indicator')
            if indicator_id:
                queryset = queryset.filter(indicator_id=indicator_id)
            return queryset
        
        return queryset.none()
    
    def create(self, request, *args, **kwargs):
        """Create evidence - handles file uploads and notes with validation"""
        data = request.data.copy()
        
        # Handle file upload
        if 'file' in request.FILES:
            file = request.FILES['file']
            file_name = file.name
            file_size = file.size
            
            # File size validation (10MB max)
            MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
            if file_size > MAX_FILE_SIZE:
                return Response(
                    {'error': f'File size exceeds maximum allowed size of {MAX_FILE_SIZE / 1024 / 1024}MB'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # File type validation
            ALLOWED_EXTENSIONS = {
                'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
                'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff',
                'txt', 'csv', 'rtf', 'odt', 'ods'
            }
            file_extension = file_name.split('.')[-1].lower() if '.' in file_name else ''
            if file_extension not in ALLOWED_EXTENSIONS:
                return Response(
                    {'error': f'File type not allowed. Allowed types: {", ".join(sorted(ALLOWED_EXTENSIONS))}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Content type validation (basic check)
            ALLOWED_MIME_TYPES = {
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff',
                'text/plain', 'text/csv', 'application/rtf',
                'application/vnd.oasis.opendocument.text',
                'application/vnd.oasis.opendocument.spreadsheet'
            }
            if hasattr(file, 'content_type') and file.content_type:
                if file.content_type not in ALLOWED_MIME_TYPES:
                    # Log warning but don't block (MIME types can be unreliable)
                    logger.warning(f"Unusual MIME type for file {file_name}: {file.content_type}")
            
            # Save file
            file_path = f'evidence/{uuid.uuid4()}_{file_name}'
            saved_path = default_storage.save(file_path, ContentFile(file.read()))
            
            data['file_name'] = file_name
            # Expose a URL path the frontend can open. Nginx proxies /media/* to /api/media/*.
            media_url = getattr(settings, 'MEDIA_URL', '/media/')
            if not media_url.endswith('/'):
                media_url += '/'
            data['file_url'] = f"{media_url}{saved_path}"
            data['file_size'] = f"{file_size / 1024 / 1024:.2f} MB" if file_size > 1024 * 1024 else f"{file_size / 1024:.2f} KB"
            
            # Log file upload
            logger.info(f"User {request.user.username} uploaded file: {file_name} ({file_size} bytes)")
        
        # Validate Drive fields: if drive_file_id provided, set attachment_status="linked"
        if data.get('drive_file_id'):
            data['attachment_status'] = 'linked'
            if not data.get('attachment_provider'):
                data['attachment_provider'] = 'gdrive'
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update evidence - handles Drive field validation"""
        instance = self.get_object()
        data = request.data.copy()
        
        # Validate Drive fields: if drive_file_id provided, set attachment_status="linked"
        if data.get('drive_file_id'):
            data['attachment_status'] = 'linked'
            if not data.get('attachment_provider'):
                data['attachment_provider'] = 'gdrive'
        
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


# AI Service Endpoints

@api_view(['POST'])
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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
@permission_classes([IsAuthenticated])
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_indicator_explanations(request):
    """Analyze indicators and provide explanations with required evidence"""
    serializer = AnalyzeIndicatorExplanationsInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid input', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

    indicators = serializer.validated_data['indicators']
    result = ai_services.analyze_indicator_explanations(indicators)
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_frequency_grouping(request):
    """Group indicators by compliance frequency"""
    serializer = AnalyzeFrequencyGroupingInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid input', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

    indicators = serializer.validated_data['indicators']
    result = ai_services.analyze_frequency_grouping(indicators)
    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Enhanced health check endpoint - checks database connectivity"""
    from django.db import connection
    
    health_status = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'version': '1.0.0',
        'checks': {}
    }
    
    # Check database connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status['checks']['database'] = 'healthy'
    except Exception as e:
        health_status['status'] = 'unhealthy'
        health_status['checks']['database'] = f'unhealthy: {str(e)}'
    
    # Check Gemini API (if configured)
    gemini_key = os.environ.get('GEMINI_API_KEY', '')
    if gemini_key:
        health_status['checks']['gemini_api'] = 'configured'
    else:
        health_status['checks']['gemini_api'] = 'not_configured'
    
    status_code = status.HTTP_200_OK if health_status['status'] == 'healthy' else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response(health_status, status=status_code)


@api_view(['GET'])
@permission_classes([AllowAny])
def readiness_check(request):
    """Readiness check - verifies app is ready to serve traffic"""
    from django.db import connection
    
    readiness_status = {
        'status': 'ready',
        'timestamp': timezone.now().isoformat(),
        'checks': {}
    }
    
    # Check database connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        readiness_status['checks']['database'] = 'ready'
    except Exception as e:
        readiness_status['status'] = 'not_ready'
        readiness_status['checks']['database'] = f'not_ready: {str(e)}'
    
    # Check if migrations are applied (basic check)
    try:
        from django.db.migrations.executor import MigrationExecutor
        executor = MigrationExecutor(connection)
        plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
        if plan:
            readiness_status['checks']['migrations'] = 'pending'
        else:
            readiness_status['checks']['migrations'] = 'applied'
    except Exception as e:
        readiness_status['checks']['migrations'] = f'unknown: {str(e)}'
    
    status_code = status.HTTP_200_OK if readiness_status['status'] == 'ready' else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response(readiness_status, status=status_code)


@api_view(['GET'])
@permission_classes([AllowAny])
def liveness_check(request):
    """Liveness check - basic check that app is running"""
    return Response({
        'status': 'alive',
        'timestamp': timezone.now().isoformat()
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def metrics(request):
    """Metrics endpoint for monitoring (basic implementation)"""
    from django.db import connection
    from django.core.cache import cache
    
    metrics_data = {
        'timestamp': timezone.now().isoformat(),
        'database': {
            'connections': len(connection.queries) if hasattr(connection, 'queries') else 0,
        },
        'cache': {
            'available': cache is not None,
        }
    }
    
    # Only allow admins to access metrics
    if hasattr(request.user, 'profile') and request.user.profile.is_admin:
        return Response(metrics_data, status=status.HTTP_200_OK)
    
    return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def serve_media(request, file_path):
    """
    Serve media files with authentication and authorization.
    This ensures that only authenticated users with proper permissions can access uploaded evidence files.
    """
    # Check if user has permission to access this specific evidence file
    try:
        # Find evidence by file path
        evidence = Evidence.objects.filter(file_url__contains=file_path).first()
        if not evidence:
            # Try to find by exact path match
            evidence = Evidence.objects.filter(file_url=f'media/{file_path}').first()
        
        if not evidence:
            logger.warning(f"Evidence file not found: {file_path}")
            raise Http404("File not found")
        
        # Check permissions using IsProjectMember
        permission = IsProjectMember()
        if not permission.has_object_permission(request, None, evidence):
            logger.warning(f"User {request.user.username} attempted to access unauthorized file: {file_path}")
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Log file access
        logger.info(f"User {request.user.username} accessed file: {file_path}")
    except Http404:
        raise
    except Exception as e:
        logger.error(f"Error checking evidence permissions: {str(e)}")
        raise Http404("File not found")
    
    try:
        # Sanitize file path to prevent directory traversal attacks
        # Resolve to absolute path and ensure it's within the media directory
        safe_file_path = Path(file_path).as_posix()
        
        # Check for directory traversal attempts
        if '..' in safe_file_path or safe_file_path.startswith('/'):
            logger.warning(f"Directory traversal attempt detected: {file_path}")
            raise Http404("Invalid file path")
        
        # Construct full path
        # `default_storage` is already rooted at MEDIA_ROOT, so do NOT prefix with "media/".
        full_path = safe_file_path
        
        # Verify file exists
        if not default_storage.exists(full_path):
            logger.info(f"File not found: {full_path}")
            raise Http404("File not found")
        
        # Open and serve the file
        file = default_storage.open(full_path, 'rb')
        
        # Determine content type
        content_type, _ = mimetypes.guess_type(safe_file_path)
        if content_type is None:
            content_type = 'application/octet-stream'
        
        response = FileResponse(file, content_type=content_type)
        
        # Set content disposition for proper filename
        filename = Path(safe_file_path).name
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        
        logger.info(f"Serving file: {full_path}")
        return response
        
    except Http404:
        # Re-raise Http404 with generic message
        raise
    except Exception as e:
        # Log detailed error but return generic message to client
        logger.error(f"Error serving file {file_path}: {str(e)}", exc_info=True)
        raise Http404("File not found")
