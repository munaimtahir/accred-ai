"""
Pytest fixtures for API tests.
"""
import pytest
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from api.models import Project, Indicator, Evidence, UserProfile, UserRole, ComplianceStatus, Frequency


@pytest.fixture
def admin_user(db):
    """Create an admin user"""
    user = User.objects.create_user(
        username='admin',
        email='admin@test.com',
        password='testpass123'
    )
    UserProfile.objects.create(user=user, role=UserRole.ADMIN)
    return user


@pytest.fixture
def regular_user(db):
    """Create a regular user"""
    user = User.objects.create_user(
        username='testuser',
        email='testuser@test.com',
        password='testpass123'
    )
    UserProfile.objects.create(user=user, role=UserRole.MEMBER)
    return user


@pytest.fixture
def project_manager(db):
    """Create a project manager user"""
    user = User.objects.create_user(
        username='pmuser',
        email='pm@test.com',
        password='testpass123'
    )
    UserProfile.objects.create(user=user, role=UserRole.PROJECT_MANAGER)
    return user


@pytest.fixture
def admin_token(admin_user):
    """Get JWT token for admin user"""
    refresh = RefreshToken.for_user(admin_user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


@pytest.fixture
def user_token(regular_user):
    """Get JWT token for regular user"""
    refresh = RefreshToken.for_user(regular_user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


@pytest.fixture
def pm_token(project_manager):
    """Get JWT token for project manager"""
    refresh = RefreshToken.for_user(project_manager)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


@pytest.fixture
def project(regular_user):
    """Create a test project"""
    project = Project.objects.create(
        name='Test Project',
        description='Test Description',
        owner=regular_user
    )
    project.members.add(regular_user)
    return project


@pytest.fixture
def indicator(project):
    """Create a test indicator"""
    return Indicator.objects.create(
        project=project,
        section='Quality Management',
        standard='QM-001',
        indicator='Test Indicator',
        description='Test Description',
        status=ComplianceStatus.NOT_STARTED,
        frequency=Frequency.MONTHLY
    )


@pytest.fixture
def evidence(indicator):
    """Create test evidence"""
    return Evidence.objects.create(
        indicator=indicator,
        type='note',
        content='Test evidence note',
        file_name='test_note.txt'
    )


@pytest.fixture
def api_client():
    """API client for making requests"""
    from rest_framework.test import APIClient
    return APIClient()

