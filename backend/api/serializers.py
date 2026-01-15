from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Project, Indicator, Evidence, DriveConfig, UserProfile, UserRole


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
    reviewed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Evidence
        fields = [
            'id', 'indicator', 'date_uploaded', 'type', 'file_name', 
            'file_url', 'content', 'drive_file_id', 'drive_view_link', 
            'drive_name', 'drive_mime_type', 'drive_web_view_link',
            'drive_parent_folder_id', 'attachment_provider', 'attachment_status',
            'sync_status', 'file_size', 'review_state', 'review_reason',
            'reviewed_by', 'reviewed_at', 'reviewed_by_name'
        ]
        read_only_fields = ['id', 'date_uploaded', 'reviewed_by', 'reviewed_at']
    
    def get_reviewed_by_name(self, obj):
        """Get reviewer username"""
        if obj.reviewed_by:
            return obj.reviewed_by.username
        return None
    
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
    evidence_state = serializers.SerializerMethodField()
    
    class Meta:
        model = Indicator
        fields = [
            'id', 'project', 'section', 'standard', 'indicator', 
            'description', 'score', 'responsible_person', 'frequency', 
            'assignee', 'status', 'notes', 'last_updated', 'form_schema',
            'ai_analysis', 'ai_categorization', 'is_ai_completed', 
            'is_human_verified', 'evidence', 'evidence_type', 'evidence_state'
        ]
        read_only_fields = ['id', 'evidence', 'evidence_state']
    
    def get_evidence_state(self, obj):
        """Get computed evidence state"""
        return obj.get_evidence_state()
    
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
            'ai_categorization', 'is_ai_completed', 'is_human_verified',
            'evidence_type'
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


# Authentication serializers
class UserSerializer(CamelCaseModelSerializer):
    """Serializer for user representation"""
    role = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_staff']
        read_only_fields = ['id', 'is_staff']
    
    def get_role(self, obj):
        """Get user role from profile"""
        if hasattr(obj, 'profile'):
            return obj.profile.role
        return UserRole.MEMBER


class UserRegistrationSerializer(serializers.Serializer):
    """Serializer for user registration"""
    username = serializers.CharField(max_length=150, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)
    first_name = serializers.CharField(max_length=30, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=UserRole.choices, default=UserRole.MEMBER, required=False)
    
    def validate(self, attrs):
        """Validate that passwords match"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs
    
    def validate_username(self, value):
        """Validate username is unique"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value
    
    def validate_email(self, value):
        """Validate email is unique"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def create(self, validated_data):
        """Create user and profile"""
        validated_data.pop('password_confirm')
        role = validated_data.pop('role', UserRole.MEMBER)
        password = validated_data.pop('password')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=password,
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        
        # Create user profile with role
        UserProfile.objects.create(user=user, role=role)
        
        return user


class LoginSerializer(TokenObtainPairSerializer):
    """Custom login serializer that extends JWT token serializer"""
    
    def validate(self, attrs):
        """Add user data to token response"""
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change"""
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        """Validate that new passwords match"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "New passwords do not match."})
        return attrs
    
    def validate_old_password(self, value):
        """Validate old password is correct"""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value
