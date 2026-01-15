import uuid
from django.db import models
from django.contrib.auth.models import User


class UserRole(models.TextChoices):
    """User roles for role-based access control"""
    ADMIN = 'admin', 'Administrator'
    PROJECT_MANAGER = 'project_manager', 'Project Manager'
    MEMBER = 'member', 'Member'


class UserProfile(models.Model):
    """Extended user profile with role-based access control"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.MEMBER
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} ({self.role})"

    @property
    def is_admin(self):
        return self.role == UserRole.ADMIN

    @property
    def is_project_manager(self):
        return self.role == UserRole.PROJECT_MANAGER


class ComplianceStatus(models.TextChoices):
    NOT_STARTED = 'Not Started', 'Not Started'
    IN_PROGRESS = 'In Progress', 'In Progress'
    COMPLIANT = 'Compliant', 'Compliant'
    NON_COMPLIANT = 'Non-Compliant', 'Non-Compliant'
    NOT_APPLICABLE = 'Not Applicable', 'Not Applicable'


class Frequency(models.TextChoices):
    ONE_TIME = 'One-time', 'One-time'
    DAILY = 'Daily', 'Daily'
    WEEKLY = 'Weekly', 'Weekly'
    MONTHLY = 'Monthly', 'Monthly'
    QUARTERLY = 'Quarterly', 'Quarterly'
    ANNUALLY = 'Annually', 'Annually'


class EvidenceType(models.TextChoices):
    DOCUMENT = 'document', 'Document'
    IMAGE = 'image', 'Image'
    CERTIFICATE = 'certificate', 'Certificate'
    NOTE = 'note', 'Note'
    LINK = 'link', 'Link'


class AICategorization(models.TextChoices):
    AI_FULLY_MANAGEABLE = 'ai_fully_manageable', 'AI Fully Manageable'
    AI_ASSISTED = 'ai_assisted', 'AI Assisted'
    MANUAL = 'manual', 'Manual'


class SyncStatus(models.TextChoices):
    SYNCED = 'synced', 'Synced'
    PENDING = 'pending', 'Pending'
    ERROR = 'error', 'Error'


class AttachmentProvider(models.TextChoices):
    NONE = 'none', 'None'
    GDRIVE = 'gdrive', 'Google Drive'


class AttachmentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    LINKED = 'linked', 'Linked'


class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_projects',
        null=True,
        blank=True
    )
    members = models.ManyToManyField(
        User,
        related_name='member_projects',
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return self.name


class Indicator(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project, 
        on_delete=models.CASCADE, 
        related_name='indicators'
    )
    section = models.CharField(max_length=255)
    standard = models.CharField(max_length=255)
    indicator = models.CharField(max_length=500)
    description = models.TextField(blank=True, default='')
    score = models.IntegerField(default=10)
    responsible_person = models.CharField(max_length=255, blank=True, null=True)
    frequency = models.CharField(
        max_length=20, 
        choices=Frequency.choices, 
        blank=True, 
        null=True
    )
    assignee = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(
        max_length=20, 
        choices=ComplianceStatus.choices, 
        default=ComplianceStatus.NOT_STARTED
    )
    notes = models.TextField(blank=True, null=True)
    last_updated = models.DateTimeField(blank=True, null=True)
    form_schema = models.JSONField(blank=True, null=True)
    ai_analysis = models.JSONField(blank=True, null=True)
    ai_categorization = models.CharField(
        max_length=30, 
        choices=AICategorization.choices, 
        blank=True, 
        null=True
    )
    is_ai_completed = models.BooleanField(default=False)
    is_human_verified = models.BooleanField(default=False)

    class Meta:
        ordering = ['section', 'standard']
        indexes = [
            models.Index(fields=['project']),
            models.Index(fields=['status']),
            models.Index(fields=['frequency']),
            models.Index(fields=['ai_categorization']),
        ]

    def __str__(self):
        return f"{self.standard}: {self.indicator}"


class Evidence(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    indicator = models.ForeignKey(
        Indicator, 
        on_delete=models.CASCADE, 
        related_name='evidence'
    )
    date_uploaded = models.DateTimeField(auto_now_add=True)
    type = models.CharField(max_length=20, choices=EvidenceType.choices)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_url = models.CharField(max_length=500, blank=True, null=True)
    content = models.TextField(blank=True, null=True)
    drive_file_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    drive_view_link = models.CharField(max_length=500, blank=True, null=True)
    # New Drive fields for Phase 4
    drive_name = models.CharField(max_length=255, blank=True, null=True)
    drive_mime_type = models.CharField(max_length=100, blank=True, null=True)
    drive_web_view_link = models.CharField(max_length=500, blank=True, null=True)
    drive_parent_folder_id = models.CharField(max_length=255, blank=True, null=True)
    attachment_provider = models.CharField(
        max_length=20,
        choices=AttachmentProvider.choices,
        default=AttachmentProvider.NONE,
        blank=True
    )
    attachment_status = models.CharField(
        max_length=20,
        choices=AttachmentStatus.choices,
        blank=True,
        null=True
    )
    sync_status = models.CharField(
        max_length=20, 
        choices=SyncStatus.choices, 
        blank=True, 
        null=True
    )
    file_size = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        ordering = ['-date_uploaded']
        indexes = [
            models.Index(fields=['indicator']),
            models.Index(fields=['type']),
            models.Index(fields=['drive_file_id']),
        ]

    def __str__(self):
        return f"{self.type}: {self.file_name or 'Note'}"


class DriveConfig(models.Model):
    """Stubbed for future Google Drive integration"""
    project = models.OneToOneField(
        Project, 
        on_delete=models.CASCADE, 
        related_name='drive_config'
    )
    is_connected = models.BooleanField(default=False)
    account_name = models.CharField(max_length=255, blank=True, null=True)
    root_folder_id = models.CharField(max_length=255, blank=True, null=True)
    last_sync = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"DriveConfig for {self.project.name}"
