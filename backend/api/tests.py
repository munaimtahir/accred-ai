"""
Tests for AccrediFy backend API
"""
from django.test import TestCase, Client
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from api.models import Project, Indicator, ComplianceStatus


class BasicURLTests(TestCase):
    """Test basic URL routing and responses"""
    
    def setUp(self):
        self.client = Client()
    
    def test_api_root_returns_404_or_200(self):
        """API root should return a valid response"""
        response = self.client.get('/api/')
        # Either 404 (no root endpoint) or 200 (if root endpoint exists)
        self.assertIn(response.status_code, [200, 404])
    
    def test_admin_login_page_loads(self):
        """Django admin login page should be accessible"""
        response = self.client.get('/admin/login/')
        self.assertEqual(response.status_code, 200)


class ProjectAPITests(APITestCase):
    """Test Project API endpoints"""
    
    def test_list_projects_empty(self):
        """Should return empty list when no projects exist"""
        response = self.client.get('/api/projects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), [])
    
    def test_create_project(self):
        """Should successfully create a project"""
        data = {
            'name': 'Test Project',
            'description': 'Test Description',
            'indicators': []
        }
        response = self.client.post('/api/projects/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Test Project')
        self.assertIn('id', response.data)
    
    def test_list_projects_with_data(self):
        """Should return list of projects"""
        # Create a project
        Project.objects.create(
            name='Test Project',
            description='Test Description'
        )
        
        response = self.client.get('/api/projects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
    
    def test_get_project_detail(self):
        """Should return project details"""
        project = Project.objects.create(
            name='Test Project',
            description='Test Description'
        )
        
        response = self.client.get(f'/api/projects/{project.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Test Project')
    
    def test_update_project(self):
        """Should update project details"""
        project = Project.objects.create(
            name='Test Project',
            description='Test Description'
        )
        
        data = {'name': 'Updated Project'}
        response = self.client.patch(
            f'/api/projects/{project.id}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Project')
    
    def test_delete_project(self):
        """Should delete a project"""
        project = Project.objects.create(
            name='Test Project',
            description='Test Description'
        )
        
        response = self.client.delete(f'/api/projects/{project.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Project.objects.count(), 0)


class IndicatorAPITests(APITestCase):
    """Test Indicator API endpoints"""
    
    def setUp(self):
        self.project = Project.objects.create(
            name='Test Project',
            description='Test Description'
        )
    
    def test_create_indicator(self):
        """Should create an indicator"""
        self.indicator = Indicator.objects.create(
            project=self.project,
            section='Test Section',
            standard='TEST-001',
            indicator='Test Indicator',
            description='Test Description',
            status=ComplianceStatus.NOT_STARTED
        )
        self.assertEqual(self.indicator.status, ComplianceStatus.NOT_STARTED)
        self.assertEqual(self.indicator.project, self.project)
    
    def test_quick_log_indicator(self):
        """Should set indicator status to Compliant"""
        indicator = Indicator.objects.create(
            project=self.project,
            section='Test Section',
            standard='TEST-001',
            indicator='Test Indicator',
            description='Test Description',
            status=ComplianceStatus.NOT_STARTED
        )
        
        response = self.client.post(f'/api/indicators/{indicator.id}/quick_log/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ComplianceStatus.COMPLIANT)
    
    def test_update_indicator(self):
        """Should update indicator details"""
        indicator = Indicator.objects.create(
            project=self.project,
            section='Test Section',
            standard='TEST-001',
            indicator='Test Indicator',
            description='Test Description',
            status=ComplianceStatus.NOT_STARTED
        )
        
        data = {'status': ComplianceStatus.IN_PROGRESS}
        response = self.client.patch(
            f'/api/indicators/{indicator.id}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ComplianceStatus.IN_PROGRESS)


class SettingsTests(TestCase):
    """Test Django settings are correctly configured"""
    
    def test_static_url_exists(self):
        """STATIC_URL should be configured"""
        from django.conf import settings
        self.assertIsNotNone(settings.STATIC_URL)
        self.assertTrue(len(settings.STATIC_URL) > 0)
    
    def test_media_url_exists(self):
        """MEDIA_URL should be configured"""
        from django.conf import settings
        self.assertIsNotNone(settings.MEDIA_URL)
        self.assertTrue(len(settings.MEDIA_URL) > 0)

