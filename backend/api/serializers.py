from rest_framework import serializers
from .models import Project, Indicator, Evidence, DriveConfig


def to_camel_case(snake_str):
    """Convert snake_case to camelCase"""
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])


def to_snake_case(camel_str):
    """Convert camelCase to snake_case"""
    result = []
    for char in camel_str:
        if char.isupper():
            result.append('_')
            result.append(char.lower())
        else:
            result.append(char)
    return ''.join(result)


class CamelCaseSerializer(serializers.Serializer):
    """Base serializer that converts between camelCase and snake_case"""
    
    def to_representation(self, instance):
        """Convert all field names to camelCase when serializing"""
        ret = super().to_representation(instance)
        return {to_camel_case(key): value for key, value in ret.items()}
    
    def to_internal_value(self, data):
        """Convert all field names from camelCase to snake_case when deserializing"""
        if isinstance(data, dict):
            data = {to_snake_case(key): value for key, value in data.items()}
        return super().to_internal_value(data)


class CamelCaseModelSerializer(serializers.ModelSerializer):
    """Model serializer that converts between camelCase and snake_case"""
    
    def to_representation(self, instance):
        """Convert all field names to camelCase when serializing"""
        ret = super().to_representation(instance)
        return {to_camel_case(key): value for key, value in ret.items()}
    
    def to_internal_value(self, data):
        """Convert all field names from camelCase to snake_case when deserializing"""
        if isinstance(data, dict):
            data = {to_snake_case(key): value for key, value in data.items()}
        return super().to_internal_value(data)


class EvidenceSerializer(CamelCaseModelSerializer):
    class Meta:
        model = Evidence
        fields = [
            'id', 'indicator', 'date_uploaded', 'type', 'file_name', 
            'file_url', 'content', 'drive_file_id', 'drive_view_link', 
            'sync_status', 'file_size'
        ]
        read_only_fields = ['id', 'date_uploaded']
    
    def to_internal_value(self, data):
        """Handle indicator field specially since it's a foreign key"""
        if isinstance(data, dict):
            # Convert camelCase to snake_case
            converted_data = {}
            for key, value in data.items():
                snake_key = to_snake_case(key)
                converted_data[snake_key] = value
            data = converted_data
        return super(serializers.ModelSerializer, self).to_internal_value(data)


class IndicatorSerializer(CamelCaseModelSerializer):
    evidence = EvidenceSerializer(many=True, read_only=True)
    
    class Meta:
        model = Indicator
        fields = [
            'id', 'project', 'section', 'standard', 'indicator', 
            'description', 'score', 'responsible_person', 'frequency', 
            'assignee', 'status', 'notes', 'last_updated', 'form_schema',
            'ai_analysis', 'ai_categorization', 'is_ai_completed', 
            'is_human_verified', 'evidence'
        ]
        read_only_fields = ['id', 'evidence']
    
    def to_internal_value(self, data):
        """Handle project field specially since it's a foreign key"""
        if isinstance(data, dict):
            # Convert camelCase to snake_case
            converted_data = {}
            for key, value in data.items():
                snake_key = to_snake_case(key)
                converted_data[snake_key] = value
            data = converted_data
        return super(serializers.ModelSerializer, self).to_internal_value(data)


class IndicatorCreateSerializer(CamelCaseModelSerializer):
    """Serializer for creating indicators within a project"""
    class Meta:
        model = Indicator
        fields = [
            'section', 'standard', 'indicator', 'description', 
            'score', 'responsible_person', 'frequency', 'assignee', 
            'status', 'notes', 'form_schema', 'ai_analysis', 
            'ai_categorization', 'is_ai_completed', 'is_human_verified'
        ]


class DriveConfigSerializer(CamelCaseModelSerializer):
    class Meta:
        model = DriveConfig
        fields = ['is_connected', 'account_name', 'root_folder_id', 'last_sync']


class ProjectSerializer(CamelCaseModelSerializer):
    indicators = IndicatorSerializer(many=True, read_only=True)
    drive_config = DriveConfigSerializer(read_only=True)
    
    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'created_at', 'indicators', 'drive_config']
        read_only_fields = ['id', 'created_at', 'indicators', 'drive_config']


class ProjectCreateSerializer(CamelCaseModelSerializer):
    """Serializer for creating projects with nested indicators"""
    indicators = IndicatorCreateSerializer(many=True, required=False)
    
    class Meta:
        model = Project
        fields = ['name', 'description', 'indicators']
    
    def create(self, validated_data):
        indicators_data = validated_data.pop('indicators', [])
        project = Project.objects.create(**validated_data)
        
        for indicator_data in indicators_data:
            Indicator.objects.create(project=project, **indicator_data)
        
        return project
    
    def to_representation(self, instance):
        """Return full project representation after creation"""
        return ProjectSerializer(instance).data


# AI-related serializers
class AnalyzeChecklistInputSerializer(serializers.Serializer):
    indicators = serializers.ListField(child=serializers.DictField())


class AnalyzeCategorizationInputSerializer(serializers.Serializer):
    indicators = serializers.ListField(child=serializers.DictField())


class AskAssistantInputSerializer(serializers.Serializer):
    query = serializers.CharField()
    indicators = serializers.ListField(child=serializers.DictField(), required=False)


class ReportSummaryInputSerializer(serializers.Serializer):
    indicators = serializers.ListField(child=serializers.DictField())


class ConvertDocumentInputSerializer(serializers.Serializer):
    document_text = serializers.CharField()


class ComplianceGuideInputSerializer(serializers.Serializer):
    indicator = serializers.DictField()


class AnalyzeTasksInputSerializer(serializers.Serializer):
    indicators = serializers.ListField(child=serializers.DictField())


class AnalyzeIndicatorExplanationsInputSerializer(serializers.Serializer):
    indicators = serializers.ListField(child=serializers.DictField())


class AnalyzeFrequencyGroupingInputSerializer(serializers.Serializer):
    indicators = serializers.ListField(child=serializers.DictField())
