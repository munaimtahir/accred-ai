# Generated manually for Phase 4: Google Drive Evidence Linking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_project_members_project_owner_userprofile'),
    ]

    operations = [
        migrations.AddField(
            model_name='evidence',
            name='drive_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='evidence',
            name='drive_mime_type',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='evidence',
            name='drive_web_view_link',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='evidence',
            name='drive_parent_folder_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='evidence',
            name='attachment_provider',
            field=models.CharField(blank=True, choices=[('none', 'None'), ('gdrive', 'Google Drive')], default='none', max_length=20),
        ),
        migrations.AddField(
            model_name='evidence',
            name='attachment_status',
            field=models.CharField(blank=True, choices=[('pending', 'Pending'), ('linked', 'Linked')], max_length=20, null=True),
        ),
        migrations.AddIndex(
            model_name='evidence',
            index=models.Index(fields=['drive_file_id'], name='api_evidenc_drive_f_123abc_idx'),
        ),
    ]
