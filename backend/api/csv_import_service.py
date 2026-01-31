"""
CSV Import Service for bulk indicator imports (Ported).
"""
import csv
import io
import hashlib
from typing import Dict, List, Any
from django.db import transaction
from django.contrib.auth.models import User
from .models import Project, Indicator

class CSVImportResult:
    """Container for import results."""
    def __init__(self):
        self.sections_created = 0
        self.standards_created = 0 # Tracked but virtually
        self.indicators_created = 0
        self.indicators_updated = 0
        self.rows_skipped = 0
        self.errors = []
        self.unmatched_users = []
        self.indicators_processed = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            'sections_created': self.sections_created,
            'standards_created': self.standards_created,
            'indicators_created': self.indicators_created,
            'indicators_updated': self.indicators_updated,
            'rows_skipped': self.rows_skipped,
            'total_rows_processed': self.indicators_created + self.indicators_updated + self.rows_skipped,
            'errors': self.errors,
            'unmatched_users': list(set(self.unmatched_users)),
        }

class CSVImportService:
    """Service for importing indicators from CSV files."""
    
    REQUIRED_HEADERS = [
        'Section',
        'Standard',
        'Indicator',
    ]
    # Optional but recommended
    OPTIONAL_HEADERS = [
        'Evidence Required',
        'Responsible Person',
        'Frequency',
        'Assigned to',
        'Compliance Evidence',
        'Score'
    ]

    def __init__(self, project: Project):
        self.project = project
        self.result = CSVImportResult()

    def import_csv(self, csv_file, user=None) -> CSVImportResult:
        try:
            # Read and decode CSV file
            csv_content = csv_file.read()
            if isinstance(csv_content, bytes):
                csv_content = csv_content.decode('utf-8-sig') # Handle BOM
            
            csv_reader = csv.DictReader(io.StringIO(csv_content))
            
            # Basic validation
            if not self._validate_headers(csv_reader.fieldnames):
                self.result.errors.append({
                    'row': 0,
                    'error': f'Invalid CSV headers. Required: {", ".join(self.REQUIRED_HEADERS)}'
                })
                return self.result

            with transaction.atomic():
                for row_num, row in enumerate(csv_reader, start=2):
                    self._process_row(row, row_num)
            
            return self.result
            
        except Exception as e:
            self.result.errors.append({
                'row': 0,
                'error': f'Failed to process CSV file: {str(e)}'
            })
            return self.result

    def _validate_headers(self, headers: List[str]) -> bool:
        if not headers: return False
        # Flexible matching? For now strict on required
        return all(h in headers for h in self.REQUIRED_HEADERS)

    def _process_row(self, row: Dict[str, str], row_num: int):
        section_name = row.get('Section', '').strip()
        standard_name = row.get('Standard', '').strip()
        indicator_text = row.get('Indicator', '').strip()
        
        if not section_name or not standard_name or not indicator_text:
            self.result.rows_skipped += 1
            return

        # Generate Key
        indicator_key = Indicator.generate_indicator_key_static(
            self.project.id, section_name, standard_name, indicator_text
        )

        # Prepare defaults
        description = row.get('Description', '')
        evidence_required = row.get('Evidence Required', '')
        if evidence_required:
            if description:
                description += f"\n\nEvidence Required: {evidence_required}"
            else:
                description = f"Evidence Required: {evidence_required}"

        # Upsert
        indicator, created = Indicator.objects.update_or_create(
            indicator_key=indicator_key,
            defaults={
                'project': self.project,
                'section': section_name,
                'standard': standard_name,
                'indicator': indicator_text,
                'description': description,
                'responsible_person': row.get('Responsible Person', ''),
                'frequency': row.get('Frequency', ''),
                'assignee': row.get('Assigned to', ''),
                'notes': row.get('Compliance Evidence', ''),
                'score': self._parse_score(row.get('Score')),
            }
        )

        if created:
            self.result.indicators_created += 1
        else:
            self.result.indicators_updated += 1
        
        self.result.indicators_processed.append(indicator)

    def _parse_score(self, val):
        try:
            return int(val)
        except:
            return 10
