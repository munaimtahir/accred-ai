# Generated manually for Phase 6: Evidence System Completion (Typed Evidence, Review Workflow, Guidance UX)

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0003_add_drive_fields_to_evidence'),
    ]

    operations = [
        # Add evidence_type to Indicator
        migrations.AddField(
            model_name='indicator',
            name='evidence_type',
            field=models.CharField(
                choices=[('text', 'Text-Based Evidence'), ('file', 'File-Based Evidence'), ('frequency', 'Frequency-Based Evidence')],
                default='text',
                help_text='Evidence model type for this indicator',
                max_length=20
            ),
        ),
        # Add review workflow fields to Evidence
        migrations.AddField(
            model_name='evidence',
            name='review_state',
            field=models.CharField(
                choices=[('draft', 'Draft'), ('under_review', 'Under Review'), ('accepted', 'Accepted'), ('rejected', 'Rejected')],
                default='draft',
                help_text='Current review state of this evidence',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='evidence',
            name='review_reason',
            field=models.TextField(blank=True, help_text='Reason for rejection (if rejected)', null=True),
        ),
        migrations.AddField(
            model_name='evidence',
            name='reviewed_by',
            field=models.ForeignKey(
                blank=True,
                help_text='User who reviewed this evidence',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='reviewed_evidence',
                to=settings.AUTH_USER_MODEL
            ),
        ),
        migrations.AddField(
            model_name='evidence',
            name='reviewed_at',
            field=models.DateTimeField(blank=True, help_text='Timestamp when evidence was reviewed', null=True),
        ),
        # Add index for review_state
        migrations.AddIndex(
            model_name='evidence',
            index=models.Index(fields=['review_state'], name='api_evidenc_review__idx'),
        ),
    ]
