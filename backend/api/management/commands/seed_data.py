"""
Management command to seed the database with sample data for development/demo purposes.
Usage: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from api.models import Project, Indicator, ComplianceStatus, Frequency


class Command(BaseCommand):
    help = 'Seeds the database with sample compliance data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding database with sample data...')

        # Create sample project
        project, created = Project.objects.get_or_create(
            name='ISO 15189 Laboratory Accreditation',
            defaults={
                'description': 'Complete compliance checklist for ISO 15189 laboratory accreditation standards covering quality management, technical requirements, and safety protocols.'
            }
        )

        if created:
            self.stdout.write(f'Created project: {project.name}')
        else:
            self.stdout.write(f'Project already exists: {project.name}')

        # Sample indicators
        sample_indicators = [
            {
                'section': 'Quality Management',
                'standard': 'QMS-001',
                'indicator': 'Quality Manual Documentation',
                'description': 'Establish and maintain a documented quality manual that includes the quality policy, organizational structure, and document control procedures.',
                'score': 15,
                'frequency': Frequency.ANNUALLY,
                'status': ComplianceStatus.COMPLIANT,
            },
            {
                'section': 'Quality Management',
                'standard': 'QMS-002',
                'indicator': 'Internal Audit Program',
                'description': 'Implement an internal audit program covering all aspects of the quality management system at planned intervals.',
                'score': 12,
                'frequency': Frequency.QUARTERLY,
                'status': ComplianceStatus.IN_PROGRESS,
            },
            {
                'section': 'Safety',
                'standard': 'SAF-001',
                'indicator': 'Safety Training Records',
                'description': 'Maintain records of safety training for all laboratory personnel including chemical handling, fire safety, and emergency procedures.',
                'score': 10,
                'frequency': Frequency.ANNUALLY,
                'status': ComplianceStatus.COMPLIANT,
            },
            {
                'section': 'Safety',
                'standard': 'SAF-002',
                'indicator': 'Chemical Spill Response SOP',
                'description': 'Document and maintain standard operating procedures for chemical spill response including roles, responsibilities, and cleanup procedures.',
                'score': 12,
                'frequency': Frequency.ONE_TIME,
                'status': ComplianceStatus.NOT_STARTED,
            },
            {
                'section': 'Equipment',
                'standard': 'EQP-001',
                'indicator': 'Equipment Calibration Log',
                'description': 'Maintain calibration records for all critical laboratory equipment including calibration dates, results, and next scheduled calibration.',
                'score': 15,
                'frequency': Frequency.MONTHLY,
                'status': ComplianceStatus.IN_PROGRESS,
                'form_schema': [
                    {'name': 'equipment_id', 'label': 'Equipment ID', 'type': 'text', 'required': True},
                    {'name': 'calibration_date', 'label': 'Calibration Date', 'type': 'date', 'required': True},
                    {'name': 'result', 'label': 'Result (Pass/Fail)', 'type': 'text', 'required': True},
                    {'name': 'technician', 'label': 'Technician Name', 'type': 'text', 'required': True},
                    {'name': 'notes', 'label': 'Notes', 'type': 'textarea', 'required': False},
                ]
            },
            {
                'section': 'Equipment',
                'standard': 'EQP-002',
                'indicator': 'Refrigerator Temperature Log',
                'description': 'Record and maintain daily temperature logs for all refrigerators and freezers used to store reagents and samples.',
                'score': 8,
                'frequency': Frequency.DAILY,
                'status': ComplianceStatus.NOT_STARTED,
                'form_schema': [
                    {'name': 'date', 'label': 'Date', 'type': 'date', 'required': True},
                    {'name': 'time', 'label': 'Time', 'type': 'text', 'required': True},
                    {'name': 'fridge_1_temp', 'label': 'Refrigerator 1 Temp (°C)', 'type': 'number', 'required': True},
                    {'name': 'fridge_2_temp', 'label': 'Refrigerator 2 Temp (°C)', 'type': 'number', 'required': True},
                    {'name': 'freezer_temp', 'label': 'Freezer Temp (°C)', 'type': 'number', 'required': True},
                    {'name': 'initials', 'label': 'Recorded By', 'type': 'text', 'required': True},
                ]
            },
            {
                'section': 'Personnel',
                'standard': 'PER-001',
                'indicator': 'Staff Competency Assessment',
                'description': 'Conduct and document annual competency assessments for all technical staff including evaluation of skills and knowledge.',
                'score': 10,
                'frequency': Frequency.ANNUALLY,
                'status': ComplianceStatus.NOT_STARTED,
            },
            {
                'section': 'Personnel',
                'standard': 'PER-002',
                'indicator': 'Job Descriptions',
                'description': 'Maintain current job descriptions for all positions including responsibilities, required qualifications, and reporting structure.',
                'score': 8,
                'frequency': Frequency.ONE_TIME,
                'status': ComplianceStatus.COMPLIANT,
            },
            {
                'section': 'Documentation',
                'standard': 'DOC-001',
                'indicator': 'Document Control Procedure',
                'description': 'Establish procedures for document creation, review, approval, distribution, and revision control.',
                'score': 12,
                'frequency': Frequency.ONE_TIME,
                'status': ComplianceStatus.IN_PROGRESS,
            },
            {
                'section': 'Documentation',
                'standard': 'DOC-002',
                'indicator': 'Record Retention Policy',
                'description': 'Define and document record retention periods and storage requirements for all types of laboratory records.',
                'score': 8,
                'frequency': Frequency.ONE_TIME,
                'status': ComplianceStatus.NOT_STARTED,
            },
            {
                'section': 'Pre-examination',
                'standard': 'PRE-001',
                'indicator': 'Sample Collection SOP',
                'description': 'Document procedures for sample collection, labeling, and transportation including patient identification requirements.',
                'score': 12,
                'frequency': Frequency.ONE_TIME,
                'status': ComplianceStatus.COMPLIANT,
            },
            {
                'section': 'Examination',
                'standard': 'EXM-001',
                'indicator': 'Test Validation Records',
                'description': 'Maintain validation records for all test methods including accuracy, precision, and reference range verification.',
                'score': 15,
                'frequency': Frequency.ONE_TIME,
                'status': ComplianceStatus.NOT_STARTED,
            },
            {
                'section': 'Examination',
                'standard': 'EXM-002',
                'indicator': 'Quality Control Log',
                'description': 'Record and review quality control results for all analytical procedures including corrective actions for out-of-range results.',
                'score': 15,
                'frequency': Frequency.DAILY,
                'status': ComplianceStatus.IN_PROGRESS,
                'form_schema': [
                    {'name': 'date', 'label': 'Date', 'type': 'date', 'required': True},
                    {'name': 'test_name', 'label': 'Test Name', 'type': 'text', 'required': True},
                    {'name': 'qc_level', 'label': 'QC Level', 'type': 'text', 'required': True},
                    {'name': 'result', 'label': 'Result', 'type': 'number', 'required': True},
                    {'name': 'acceptable_range', 'label': 'Acceptable Range', 'type': 'text', 'required': True},
                    {'name': 'status', 'label': 'Status (Pass/Fail)', 'type': 'text', 'required': True},
                ]
            },
            {
                'section': 'Post-examination',
                'standard': 'POST-001',
                'indicator': 'Result Reporting Procedure',
                'description': 'Document procedures for result verification, reporting, and critical value notification.',
                'score': 12,
                'frequency': Frequency.ONE_TIME,
                'status': ComplianceStatus.COMPLIANT,
            },
            {
                'section': 'Management Review',
                'standard': 'MGT-001',
                'indicator': 'Management Review Minutes',
                'description': 'Conduct and document management reviews at planned intervals to ensure continuing suitability and effectiveness of the QMS.',
                'score': 10,
                'frequency': Frequency.ANNUALLY,
                'status': ComplianceStatus.NOT_STARTED,
            },
        ]

        for ind_data in sample_indicators:
            form_schema = ind_data.pop('form_schema', None)
            indicator, created = Indicator.objects.get_or_create(
                project=project,
                standard=ind_data['standard'],
                defaults={
                    **ind_data,
                    'form_schema': form_schema,
                }
            )
            if created:
                self.stdout.write(f'  Created indicator: {indicator.standard} - {indicator.indicator}')

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully seeded database with {project.indicators.count()} indicators'))
        self.stdout.write(self.style.SUCCESS(f'You can now log in and view the project: {project.name}'))
