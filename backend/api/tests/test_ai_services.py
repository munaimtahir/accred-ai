"""
Tests for AI service endpoints with mocking.
"""
import pytest
from unittest.mock import patch, MagicMock
from rest_framework import status


@pytest.mark.django_db
class TestAIServiceEndpoints:
    """Tests for AI service endpoints"""
    
    @patch('api.ai_services.analyze_checklist')
    def test_analyze_checklist(self, mock_analyze, api_client, user_token):
        """Test analyze checklist endpoint"""
        mock_analyze.return_value = [{'id': '1', 'enriched': True}]
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        
        data = {'indicators': [{'id': '1', 'indicator': 'Test'}]}
        response = api_client.post('/api/analyze-checklist/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'indicators' in response.data
        mock_analyze.assert_called_once()
    
    @patch('api.ai_services.analyze_categorization')
    def test_analyze_categorization(self, mock_analyze, api_client, user_token):
        """Test analyze categorization endpoint"""
        mock_analyze.return_value = {'categories': []}
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        
        data = {'indicators': [{'id': '1'}]}
        response = api_client.post('/api/analyze-categorization/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        mock_analyze.assert_called_once()
    
    @patch('api.ai_services.ask_assistant')
    def test_ask_assistant(self, mock_ask, api_client, user_token):
        """Test ask assistant endpoint"""
        mock_ask.return_value = 'Test response'
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {user_token["access"]}')
        
        data = {'query': 'What is compliance?'}
        response = api_client.post('/api/ask-assistant/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'response' in response.data
        mock_ask.assert_called_once()
    
    def test_ai_endpoints_require_authentication(self, api_client):
        """Test that AI endpoints require authentication"""
        data = {'indicators': []}
        response = api_client.post('/api/analyze-checklist/', data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

