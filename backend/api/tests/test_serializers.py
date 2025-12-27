"""
Unit tests for serializers.
"""
import pytest
from django.contrib.auth.models import User
from api.serializers import (
    UserSerializer, UserRegistrationSerializer, LoginSerializer,
    ProjectSerializer, IndicatorSerializer, EvidenceSerializer
)
from api.models import Project, Indicator, Evidence, UserProfile, UserRole, ComplianceStatus


@pytest.mark.django_db
class TestUserSerializer:
    """Tests for UserSerializer"""
    
    def test_serialize_user(self, regular_user):
        """Test serializing a user"""
        serializer = UserSerializer(regular_user)
        data = serializer.data
        
        assert data['username'] == 'testuser'
        assert data['email'] == 'testuser@test.com'
        assert 'role' in data


@pytest.mark.django_db
class TestUserRegistrationSerializer:
    """Tests for UserRegistrationSerializer"""
    
    def test_valid_registration(self):
        """Test valid user registration"""
        data = {
            'username': 'newuser',
            'email': 'newuser@test.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'role': UserRole.MEMBER
        }
        serializer = UserRegistrationSerializer(data=data)
        assert serializer.is_valid()
        
        user = serializer.save()
        assert user.username == 'newuser'
        assert hasattr(user, 'profile')
        assert user.profile.role == UserRole.MEMBER
    
    def test_password_mismatch(self):
        """Test password mismatch validation"""
        data = {
            'username': 'newuser',
            'email': 'newuser@test.com',
            'password': 'SecurePass123!',
            'password_confirm': 'DifferentPass123!'
        }
        serializer = UserRegistrationSerializer(data=data)
        assert not serializer.is_valid()
        assert 'password_confirm' in serializer.errors
    
    def test_duplicate_username(self):
        """Test duplicate username validation"""
        User.objects.create_user(username='existing', email='existing@test.com')
        data = {
            'username': 'existing',
            'email': 'new@test.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!'
        }
        serializer = UserRegistrationSerializer(data=data)
        assert not serializer.is_valid()
        assert 'username' in serializer.errors


@pytest.mark.django_db
class TestProjectSerializer:
    """Tests for ProjectSerializer"""
    
    def test_serialize_project(self, project):
        """Test serializing a project"""
        serializer = ProjectSerializer(project)
        data = serializer.data
        
        assert data['name'] == 'Test Project'
        assert 'id' in data
        assert 'createdAt' in data  # camelCase conversion
        assert 'indicators' in data


@pytest.mark.django_db
class TestIndicatorSerializer:
    """Tests for IndicatorSerializer"""
    
    def test_serialize_indicator(self, indicator):
        """Test serializing an indicator"""
        serializer = IndicatorSerializer(indicator)
        data = serializer.data
        
        assert data['section'] == 'Quality Management'
        assert data['standard'] == 'QM-001'
        assert 'id' in data
        assert 'project' in data


@pytest.mark.django_db
class TestEvidenceSerializer:
    """Tests for EvidenceSerializer"""
    
    def test_serialize_evidence(self, evidence):
        """Test serializing evidence"""
        serializer = EvidenceSerializer(evidence)
        data = serializer.data
        
        assert data['type'] == 'note'
        assert 'id' in data
        assert 'indicator' in data
        assert 'dateUploaded' in data  # camelCase conversion

