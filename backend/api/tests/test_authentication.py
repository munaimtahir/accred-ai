"""
Tests for authentication endpoints.
"""
import pytest
from django.contrib.auth.models import User
from rest_framework import status
from api.models import UserProfile, UserRole


@pytest.mark.django_db
class TestRegistration:
    """Tests for user registration"""
    
    def test_register_user(self, api_client):
        """Test successful user registration"""
        data = {
            'username': 'newuser',
            'email': 'newuser@test.com',
            'password': 'SecurePass123!',
            'passwordConfirm': 'SecurePass123!',
            'role': UserRole.MEMBER
        }
        response = api_client.post('/api/auth/register/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'user' in response.data
        assert 'access_token' in response.data
        assert 'refresh_token' in response.data
        assert response.data['user']['username'] == 'newuser'
    
    def test_register_duplicate_username(self, api_client, regular_user):
        """Test registration with duplicate username"""
        data = {
            'username': 'testuser',  # Already exists
            'email': 'different@test.com',
            'password': 'SecurePass123!',
            'passwordConfirm': 'SecurePass123!'
        }
        response = api_client.post('/api/auth/register/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_register_password_mismatch(self, api_client):
        """Test registration with password mismatch"""
        data = {
            'username': 'newuser',
            'email': 'newuser@test.com',
            'password': 'SecurePass123!',
            'passwordConfirm': 'DifferentPass123!'
        }
        response = api_client.post('/api/auth/register/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestLogin:
    """Tests for user login"""
    
    def test_login_success(self, api_client, regular_user):
        """Test successful login"""
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = api_client.post('/api/auth/login/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert 'user' in response.data
    
    def test_login_invalid_credentials(self, api_client, regular_user):
        """Test login with invalid credentials"""
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        response = api_client.post('/api/auth/login/', data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_login_nonexistent_user(self, api_client):
        """Test login with nonexistent user"""
        data = {
            'username': 'nonexistent',
            'password': 'password123'
        }
        response = api_client.post('/api/auth/login/', data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestMe:
    """Tests for /api/auth/me/ endpoint"""
    
    def test_get_current_user(self, api_client, user_token):
        """Test getting current user info"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        response = api_client.get('/api/auth/me/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == 'testuser'
    
    def test_get_current_user_unauthorized(self, api_client):
        """Test getting current user without authentication"""
        response = api_client.get('/api/auth/me/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestChangePassword:
    """Tests for password change"""
    
    def test_change_password_success(self, api_client, regular_user, user_token):
        """Test successful password change"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        data = {
            'oldPassword': 'testpass123',
            'newPassword': 'NewSecurePass123!',
            'newPasswordConfirm': 'NewSecurePass123!'
        }
        response = api_client.post('/api/auth/change-password/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify new password works
        regular_user.refresh_from_db()
        assert regular_user.check_password('NewSecurePass123!')
    
    def test_change_password_wrong_old_password(self, api_client, user_token):
        """Test password change with wrong old password"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        data = {
            'oldPassword': 'wrongpassword',
            'newPassword': 'NewSecurePass123!',
            'newPasswordConfirm': 'NewSecurePass123!'
        }
        response = api_client.post('/api/auth/change-password/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestTokenRefresh:
    """Tests for token refresh"""
    
    def test_refresh_token(self, api_client, user_token):
        """Test refreshing access token"""
        data = {'refresh': user_token['refresh']}
        response = api_client.post('/api/auth/refresh/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data

