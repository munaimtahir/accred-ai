"""
Unit tests for models.
"""
import pytest
from django.contrib.auth.models import User
from api.models import (
    Project, Indicator, Evidence, UserProfile, UserRole,
    ComplianceStatus, Frequency, EvidenceType
)


@pytest.mark.django_db
class TestUserProfile:
    """Tests for UserProfile model"""
    
    def test_create_user_profile(self):
        """Test creating a user profile"""
        user = User.objects.create_user(username='test', email='test@test.com')
        profile = UserProfile.objects.create(user=user, role=UserRole.MEMBER)
        
        assert profile.user == user
        assert profile.role == UserRole.MEMBER
        assert not profile.is_admin
        assert not profile.is_project_manager
    
    def test_admin_profile(self):
        """Test admin profile properties"""
        user = User.objects.create_user(username='admin', email='admin@test.com')
        profile = UserProfile.objects.create(user=user, role=UserRole.ADMIN)
        
        assert profile.is_admin
        assert profile.is_project_manager  # Admin is also project manager
    
    def test_project_manager_profile(self):
        """Test project manager profile properties"""
        user = User.objects.create_user(username='pm', email='pm@test.com')
        profile = UserProfile.objects.create(user=user, role=UserRole.PROJECT_MANAGER)
        
        assert profile.is_project_manager
        assert not profile.is_admin


@pytest.mark.django_db
class TestProject:
    """Tests for Project model"""
    
    def test_create_project(self, regular_user):
        """Test creating a project"""
        project = Project.objects.create(
            name='Test Project',
            description='Test Description',
            owner=regular_user
        )
        
        assert project.name == 'Test Project'
        assert project.owner == regular_user
        assert str(project) == 'Test Project'
    
    def test_project_members(self, regular_user, project_manager):
        """Test adding members to project"""
        project = Project.objects.create(
            name='Test Project',
            owner=regular_user
        )
        project.members.add(project_manager)
        
        assert project_manager in project.members.all()
        assert project.members.count() == 1


@pytest.mark.django_db
class TestIndicator:
    """Tests for Indicator model"""
    
    def test_create_indicator(self, project):
        """Test creating an indicator"""
        indicator = Indicator.objects.create(
            project=project,
            section='Quality Management',
            standard='QM-001',
            indicator='Test Indicator',
            description='Test Description',
            status=ComplianceStatus.NOT_STARTED
        )
        
        assert indicator.project == project
        assert indicator.section == 'Quality Management'
        assert indicator.status == ComplianceStatus.NOT_STARTED
        assert str(indicator) == 'QM-001: Test Indicator'
    
    def test_indicator_defaults(self, project):
        """Test indicator default values"""
        indicator = Indicator.objects.create(
            project=project,
            section='Test',
            standard='TEST-001',
            indicator='Test'
        )
        
        assert indicator.status == ComplianceStatus.NOT_STARTED
        assert indicator.score == 10
        assert not indicator.is_ai_completed
        assert not indicator.is_human_verified


@pytest.mark.django_db
class TestEvidence:
    """Tests for Evidence model"""
    
    def test_create_evidence_note(self, indicator):
        """Test creating note evidence"""
        evidence = Evidence.objects.create(
            indicator=indicator,
            type=EvidenceType.NOTE,
            content='Test note content'
        )
        
        assert evidence.indicator == indicator
        assert evidence.type == EvidenceType.NOTE
        assert evidence.content == 'Test note content'
        assert str(evidence) == 'note: Note'
    
    def test_create_evidence_document(self, indicator):
        """Test creating document evidence"""
        evidence = Evidence.objects.create(
            indicator=indicator,
            type=EvidenceType.DOCUMENT,
            file_name='test.pdf',
            file_url='/media/test.pdf'
        )
        
        assert evidence.type == EvidenceType.DOCUMENT
        assert evidence.file_name == 'test.pdf'
        assert str(evidence) == 'document: test.pdf'

