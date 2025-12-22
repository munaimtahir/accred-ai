from django.contrib import admin
from .models import Project, Indicator, Evidence, DriveConfig


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'created_at', 'indicator_count']
    search_fields = ['name', 'description']
    list_filter = ['created_at']
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at']

    def indicator_count(self, obj):
        return obj.indicators.count()
    indicator_count.short_description = 'Indicators'


@admin.register(Indicator)
class IndicatorAdmin(admin.ModelAdmin):
    list_display = ['standard', 'indicator', 'section', 'status', 'score', 'frequency', 'project']
    list_filter = ['status', 'frequency', 'section', 'ai_categorization', 'is_ai_completed', 'is_human_verified']
    search_fields = ['standard', 'indicator', 'description', 'section']
    list_editable = ['status']
    ordering = ['project', 'section', 'standard']
    readonly_fields = ['id']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('project', 'section', 'standard', 'indicator', 'description', 'score')
        }),
        ('Assignment', {
            'fields': ('responsible_person', 'assignee', 'frequency')
        }),
        ('Status', {
            'fields': ('status', 'notes', 'last_updated')
        }),
        ('AI Features', {
            'fields': ('ai_categorization', 'is_ai_completed', 'is_human_verified', 'ai_analysis'),
            'classes': ('collapse',)
        }),
        ('Form Schema', {
            'fields': ('form_schema',),
            'classes': ('collapse',)
        }),
    )


@admin.register(Evidence)
class EvidenceAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'type', 'indicator', 'date_uploaded', 'file_size']
    list_filter = ['type', 'date_uploaded', 'sync_status']
    search_fields = ['file_name', 'content', 'indicator__indicator']
    ordering = ['-date_uploaded']
    readonly_fields = ['id', 'date_uploaded']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('indicator', 'type', 'file_name', 'file_size')
        }),
        ('Content', {
            'fields': ('file_url', 'content')
        }),
        ('Google Drive', {
            'fields': ('drive_file_id', 'drive_view_link', 'sync_status'),
            'classes': ('collapse',)
        }),
    )


@admin.register(DriveConfig)
class DriveConfigAdmin(admin.ModelAdmin):
    list_display = ['project', 'is_connected', 'account_name', 'last_sync']
    list_filter = ['is_connected']
    readonly_fields = ['last_sync']
