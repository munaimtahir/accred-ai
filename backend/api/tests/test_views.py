"""
API integration tests for CRUD operations and permissions.
"""
import pytest
from rest_framework import status
from api.models import Project, Indicator, Evidence, ComplianceStatus


@pytest.mark.django_db
class TestProjectViewSet:
    """Tests for Project CRUD operations"""
    
    def test_list_projects_authenticated(self, api_client, user_token, project):
        """Test listing projects when authenticated"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        response = api_client.get('/api/projects/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
    
    def test_list_projects_unauthorized(self, api_client):
        """Test listing projects without authentication"""
        response = api_client.get('/api/projects/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_project(self, api_client, user_token):
        """Test creating a project"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        data = {
            'name': 'New Project',
            'description': 'New Description'
        }
        response = api_client.post('/api/projects/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'New Project'
        # Verify owner is set
        project = Project.objects.get(id=response.data['id'])
        assert project.owner.username == 'testuser'
    
    def test_update_own_project(self, api_client, user_token, project):
        """Test updating own project"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        data = {'name': 'Updated Project'}
        response = api_client.patch(f'/api/projects/{project.id}/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Updated Project'
    
    def test_delete_own_project(self, api_client, user_token, project):
        """Test deleting own project"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        response = api_client.delete(f'/api/projects/{project.id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Project.objects.filter(id=project.id).exists()


@pytest.mark.django_db
class TestIndicatorViewSet:
    """Tests for Indicator CRUD operations"""
    
    def test_list_indicators(self, api_client, user_token, indicator):
        """Test listing indicators"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        response = api_client.get('/api/indicators/')
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_update_indicator(self, api_client, user_token, indicator):
        """Test updating indicator"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        data = {'status': ComplianceStatus.COMPLIANT}
        response = api_client.patch(f'/api/indicators/{indicator.id}/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == ComplianceStatus.COMPLIANT
    
    def test_quick_log(self, api_client, user_token, indicator):
        """Test quick log endpoint"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        response = api_client.post(f'/api/indicators/{indicator.id}/quick_log/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == ComplianceStatus.COMPLIANT


@pytest.mark.django_db
class TestEvidenceViewSet:
    """Tests for Evidence CRUD operations"""
    
    def test_create_evidence_note(self, api_client, user_token, indicator):
        """Test creating note evidence"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        data = {
            'indicator': str(indicator.id),
            'type': 'note',
            'content': 'Test evidence note'
        }
        response = api_client.post('/api/evidence/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['type'] == 'note'
    
    def test_list_evidence(self, api_client, user_token, evidence):
        """Test listing evidence"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        response = api_client.get('/api/evidence/')
        
        assert response.status_code == status.HTTP_200_OK
    
    def test_delete_evidence(self, api_client, user_token, evidence):
        """Test deleting evidence"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        response = api_client.delete(f'/api/evidence/{evidence.id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
class TestPermissions:
    """Tests for permission checks"""
    
    def test_cannot_access_other_user_project(self, api_client, project, pm_token):
        """Test that user cannot access another user's project"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {pm_token["access"]}')
        response = api_client.get(f'/api/projects/{project.id}/')
        
        # Should return 404 (not found) or 403 (forbidden) depending on implementation
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
    
    def test_admin_can_access_all_projects(self, api_client, project, admin_token):
        """Test that admin can access all projects"""
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token["access"]}')
        response = api_client.get(f'/api/projects/{project.id}/')
        
        assert response.status_code == status.HTTP_200_OK

