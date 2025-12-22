"""
AI Services Module for AccrediFy
Handles all interactions with Google Gemini API
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

logger = logging.getLogger(__name__)


def get_gemini_client():
    """Initialize and return Gemini client"""
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        logger.warning("GEMINI_API_KEY not set")
        return None
    
    if not GEMINI_AVAILABLE:
        logger.warning("google-generativeai package not installed")
        return None
    
    genai.configure(api_key=api_key)
    return genai


def get_pro_model():
    """Get the pro model for complex tasks"""
    client = get_gemini_client()
    if not client:
        return None
    return client.GenerativeModel('gemini-1.5-pro')


def get_flash_model():
    """Get the flash model for faster, simpler tasks"""
    client = get_gemini_client()
    if not client:
        return None
    return client.GenerativeModel('gemini-1.5-flash')


def analyze_checklist(indicators: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Analyze and enrich checklist indicators using AI.
    
    Args:
        indicators: List of indicator data to analyze
        
    Returns:
        Enriched indicator data with AI suggestions
    """
    model = get_pro_model()
    if not model:
        # Return indicators with default enrichment
        return [{
            **ind,
            'description': ind.get('description', '') or f"Compliance requirement for {ind.get('indicator', 'this item')}",
            'frequency': ind.get('frequency') or 'One-time',
            'score': ind.get('score', 10)
        } for ind in indicators]
    
    try:
        prompt = f"""You are a compliance expert. Analyze these compliance indicators and enrich them with:
1. A detailed description if missing
2. Suggested frequency (One-time, Daily, Weekly, Monthly, Quarterly, Annually)
3. A compliance score (1-100) based on importance

Indicators to analyze:
{json.dumps(indicators, indent=2)}

Return a JSON array with the same structure but enriched with 'description', 'frequency', and 'score' fields.
Only return valid JSON, no markdown formatting."""

        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Clean up potential markdown formatting
        if result_text.startswith('```'):
            result_text = result_text.split('\n', 1)[1]
            result_text = result_text.rsplit('```', 1)[0]
        
        return json.loads(result_text)
    except Exception as e:
        logger.error(f"Error in analyze_checklist: {e}")
        return indicators


def analyze_categorization(indicators: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    """
    Categorize indicators by AI manageability.
    
    Args:
        indicators: List of indicators to categorize
        
    Returns:
        Dictionary with three lists of indicator IDs
    """
    model = get_flash_model()
    
    result = {
        'ai_fully_manageable': [],
        'ai_assisted': [],
        'manual': []
    }
    
    if not model:
        # Default categorization based on keywords
        for ind in indicators:
            indicator_text = (ind.get('indicator', '') + ' ' + ind.get('description', '')).lower()
            ind_id = str(ind.get('id', ''))
            
            if any(kw in indicator_text for kw in ['document', 'sop', 'procedure', 'policy', 'record']):
                result['ai_fully_manageable'].append(ind_id)
            elif any(kw in indicator_text for kw in ['log', 'form', 'checklist', 'report']):
                result['ai_assisted'].append(ind_id)
            else:
                result['manual'].append(ind_id)
        return result
    
    try:
        prompt = f"""You are a compliance automation expert. Categorize these compliance indicators into three categories:

1. 'ai_fully_manageable': Tasks where AI can generate all required documentation (SOPs, policies, procedures)
2. 'ai_assisted': Tasks where AI can help (forms, templates, reminders) but humans need to provide data
3. 'manual': Tasks requiring physical action or human judgment

Indicators:
{json.dumps(indicators, indent=2)}

Return a JSON object with three arrays containing indicator IDs:
{{"ai_fully_manageable": ["id1", ...], "ai_assisted": ["id2", ...], "manual": ["id3", ...]}}
Only return valid JSON, no markdown."""

        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        if result_text.startswith('```'):
            result_text = result_text.split('\n', 1)[1]
            result_text = result_text.rsplit('```', 1)[0]
        
        return json.loads(result_text)
    except Exception as e:
        logger.error(f"Error in analyze_categorization: {e}")
        return result


def ask_assistant(query: str, indicators: Optional[List[Dict[str, Any]]] = None) -> str:
    """
    Get AI assistant response for compliance questions.
    
    Args:
        query: User's question
        indicators: Optional context of current indicators
        
    Returns:
        AI assistant response
    """
    model = get_flash_model()
    if not model:
        return "I'm sorry, but the AI assistant is not available at the moment. Please ensure the Gemini API key is configured correctly."
    
    try:
        context = ""
        if indicators:
            context = f"\n\nCurrent project indicators for context:\n{json.dumps(indicators[:10], indent=2)}"
        
        prompt = f"""You are an expert compliance assistant for laboratory accreditation and MSDS compliance.
You help lab directors, quality managers, and technicians understand and implement compliance requirements.

User question: {query}
{context}

Provide a helpful, accurate, and practical response. If the question is about a specific compliance requirement,
provide actionable steps. Format your response in a clear, readable manner."""

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Error in ask_assistant: {e}")
        return "I encountered an error processing your request. Please try again later."


def generate_report_summary(indicators: List[Dict[str, Any]]) -> str:
    """
    Generate an AI-powered summary of compliance status.
    
    Args:
        indicators: List of indicators to summarize
        
    Returns:
        Summary text
    """
    model = get_flash_model()
    
    # Calculate basic statistics
    total = len(indicators)
    compliant = sum(1 for i in indicators if i.get('status') == 'Compliant')
    non_compliant = sum(1 for i in indicators if i.get('status') == 'Non-Compliant')
    in_progress = sum(1 for i in indicators if i.get('status') == 'In Progress')
    not_started = sum(1 for i in indicators if i.get('status') == 'Not Started')
    
    basic_summary = f"""Compliance Overview:
- Total Indicators: {total}
- Compliant: {compliant} ({100*compliant//max(total,1)}%)
- Non-Compliant: {non_compliant} ({100*non_compliant//max(total,1)}%)
- In Progress: {in_progress} ({100*in_progress//max(total,1)}%)
- Not Started: {not_started} ({100*not_started//max(total,1)}%)"""

    if not model:
        return basic_summary
    
    try:
        prompt = f"""You are a compliance report analyst. Generate a professional executive summary for this compliance data:

Indicators:
{json.dumps(indicators, indent=2)}

Statistics:
{basic_summary}

Provide:
1. An executive summary paragraph
2. Key areas of concern
3. Recommended priorities
4. Overall compliance health assessment

Format as a professional report summary."""

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Error in generate_report_summary: {e}")
        return basic_summary


def convert_document_to_csv(document_text: str) -> str:
    """
    Convert unstructured document text to CSV format.
    
    Args:
        document_text: Raw text from document
        
    Returns:
        CSV formatted string
    """
    model = get_pro_model()
    if not model:
        # Return a basic template
        return "section,standard,indicator,description,score,frequency\nGeneral,GEN-001,Sample Indicator,Please configure AI to parse documents,10,One-time"
    
    try:
        prompt = f"""You are an expert at parsing compliance documents. Convert this document text into a CSV format with these columns:
section, standard, indicator, description, score, frequency

Document text:
{document_text}

Rules:
1. Extract each compliance requirement as a row
2. Section is the category/chapter
3. Standard is a unique code (create one if not provided)
4. Indicator is the requirement title
5. Description is the detailed requirement
6. Score should be 1-100 based on importance
7. Frequency should be one of: One-time, Daily, Weekly, Monthly, Quarterly, Annually

Return ONLY the CSV content with headers, no explanation."""

        response = model.generate_content(prompt)
        result = response.text.strip()
        
        # Clean up markdown if present
        if result.startswith('```'):
            result = result.split('\n', 1)[1]
            result = result.rsplit('```', 1)[0]
        
        return result
    except Exception as e:
        logger.error(f"Error in convert_document_to_csv: {e}")
        return "section,standard,indicator,description,score,frequency\nError,ERR-001,Conversion Error,Failed to convert document. Please try again.,10,One-time"


def generate_compliance_guide(indicator: Dict[str, Any]) -> str:
    """
    Generate a detailed compliance guide/SOP for an indicator.
    
    Args:
        indicator: The indicator to generate guide for
        
    Returns:
        Detailed guide text
    """
    model = get_pro_model()
    
    basic_guide = f"""# {indicator.get('indicator', 'Compliance Requirement')}

## Overview
{indicator.get('description', 'This compliance requirement needs to be addressed.')}

## Standard Reference
{indicator.get('standard', 'N/A')}

## Section
{indicator.get('section', 'General')}

## Frequency
{indicator.get('frequency', 'As needed')}

## Steps to Comply
1. Review the requirement details
2. Gather necessary documentation
3. Implement required procedures
4. Document compliance evidence
5. Review and verify completion

## Evidence Required
- Documentation of completion
- Relevant certifications or logs
- Verification signatures

## Responsible Party
{indicator.get('responsiblePerson', indicator.get('responsible_person', 'To be assigned'))}
"""

    if not model:
        return basic_guide
    
    try:
        prompt = f"""You are a compliance documentation expert. Generate a comprehensive Standard Operating Procedure (SOP) for this compliance indicator:

Indicator Details:
{json.dumps(indicator, indent=2)}

Create a professional SOP document that includes:
1. Title and Purpose
2. Scope
3. Responsibilities
4. Definitions
5. Procedure (step-by-step)
6. Required Documentation/Evidence
7. Frequency of Review
8. References

Format as a professional document with clear sections."""

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Error in generate_compliance_guide: {e}")
        return basic_guide


def analyze_tasks(indicators: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Analyze indicators and provide AI suggestions for actions.
    
    Args:
        indicators: List of indicators to analyze
        
    Returns:
        List of suggestions with indicator IDs
    """
    model = get_flash_model()
    
    # Default suggestions based on status
    default_suggestions = []
    for ind in indicators:
        status = ind.get('status', 'Not Started')
        suggestion = {
            'indicatorId': str(ind.get('id', '')),
            'isActionableByAI': False,
            'suggestion': ''
        }
        
        if status == 'Not Started':
            suggestion['suggestion'] = 'Begin by reviewing requirements and gathering necessary documentation.'
            suggestion['isActionableByAI'] = 'document' in ind.get('indicator', '').lower()
        elif status == 'In Progress':
            suggestion['suggestion'] = 'Continue working on this item. Consider uploading evidence of progress.'
        elif status == 'Non-Compliant':
            suggestion['suggestion'] = 'This item requires immediate attention. Review gaps and create action plan.'
            suggestion['isActionableByAI'] = True
        elif status == 'Compliant':
            suggestion['suggestion'] = 'Maintain compliance. Ensure evidence is current.'
        
        default_suggestions.append(suggestion)
    
    if not model:
        return default_suggestions
    
    try:
        prompt = f"""You are a compliance advisor. Analyze these indicators and provide specific actionable suggestions:

Indicators:
{json.dumps(indicators, indent=2)}

For each indicator, provide:
1. A specific, actionable suggestion
2. Whether AI can help automate this task

Return a JSON array with objects containing:
{{"indicatorId": "id", "suggestion": "specific action", "isActionableByAI": true/false}}

Only return valid JSON."""

        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        if result_text.startswith('```'):
            result_text = result_text.split('\n', 1)[1]
            result_text = result_text.rsplit('```', 1)[0]
        
        return json.loads(result_text)
    except Exception as e:
        logger.error(f"Error in analyze_tasks: {e}")
        return default_suggestions
