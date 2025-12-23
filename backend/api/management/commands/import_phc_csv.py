"""
Import PHC checklist CSV into the database as a Project + Indicators.

Designed for demo/audit runs on a VPS (idempotent-ish, tolerant parsing).

Usage:
  python manage.py import_phc_csv /path/to/Final\ PHC\ list.csv --project-name "PHC Demo"
"""

from __future__ import annotations

import csv
import re
from pathlib import Path
from typing import Optional, Tuple

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from api.models import Evidence, EvidenceType, Frequency, Indicator, Project


def _clean(s: Optional[str]) -> str:
    return (s or "").strip()


def _parse_int(s: str, default: int) -> int:
    s = _clean(s)
    if not s:
        return default
    try:
        return int(float(s))
    except ValueError:
        return default


_FREQ_CANON = {
    "one time": Frequency.ONE_TIME,
    "one-time": Frequency.ONE_TIME,
    "onetime": Frequency.ONE_TIME,
    "daily": Frequency.DAILY,
    "weekly": Frequency.WEEKLY,
    "monthly": Frequency.MONTHLY,
    "quarterly": Frequency.QUARTERLY,
    "annually": Frequency.ANNUALLY,
    "annual": Frequency.ANNUALLY,
    "yearly": Frequency.ANNUALLY,
}


def _parse_frequency(raw: str) -> Optional[str]:
    raw = _clean(raw)
    if not raw:
        return None
    key = re.sub(r"\s+", " ", raw.lower()).strip()
    return _FREQ_CANON.get(key)


def _get_cols(row: dict) -> Tuple[str, str, str, str, str, str, str, str]:
    """
    Returns:
      section, standard, indicator, evidence_required, responsible_person,
      frequency, assigned_to, compliance_evidence, score
    """
    # The provided file uses these exact headers:
    # Section,Standard,Indicator,Evidence Required,Responsible Person,Frequency,Assigned to,Compliance Evidence,Score
    return (
        _clean(row.get("Section")),
        _clean(row.get("Standard")),
        _clean(row.get("Indicator")),
        _clean(row.get("Evidence Required")),
        _clean(row.get("Responsible Person")),
        _clean(row.get("Frequency")),
        _clean(row.get("Assigned to")),
        _clean(row.get("Compliance Evidence")),
        _clean(row.get("Score")),
    )


class Command(BaseCommand):
    help = "Import PHC checklist CSV as a demo Project + Indicators"

    def add_arguments(self, parser):
        parser.add_argument("csv_path", type=str, help="Path to PHC checklist CSV")
        parser.add_argument(
            "--project-name",
            type=str,
            default="PHC Laboratory Accreditation Checklist (Demo)",
            help="Project name to create/update",
        )
        parser.add_argument(
            "--project-description",
            type=str,
            default="Imported from PHC checklist CSV for demo/audit runs.",
            help="Project description",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Import only first N data rows (0 = no limit)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and report counts without writing to the DB",
        )
        parser.add_argument(
            "--create-evidence-notes",
            action="store_true",
            help='If "Compliance Evidence" is present, create Evidence(type="note") rows for it',
        )

    def handle(self, *args, **options):
        csv_path = Path(options["csv_path"]).expanduser()
        if not csv_path.exists():
            raise CommandError(f"CSV not found: {csv_path}")

        project_name = options["project_name"]
        project_description = options["project_description"]
        limit = int(options["limit"] or 0)
        dry_run = bool(options["dry_run"])
        create_evidence_notes = bool(options["create_evidence_notes"])

        self.stdout.write(f"Reading CSV: {csv_path}")

        created = 0
        updated = 0
        skipped = 0
        evidence_notes = 0

        with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            required_headers = {"Section", "Standard", "Indicator"}
            if not reader.fieldnames or not required_headers.issubset(set(reader.fieldnames)):
                raise CommandError(
                    f"CSV headers missing. Expected at least {sorted(required_headers)}; got {reader.fieldnames}"
                )

            rows = list(reader)
            if limit > 0:
                rows = rows[:limit]

        self.stdout.write(f"Parsed {len(rows)} data rows")

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run: no DB writes performed"))
            return

        with transaction.atomic():
            project, _ = Project.objects.get_or_create(
                name=project_name, defaults={"description": project_description}
            )
            if project.description != project_description:
                project.description = project_description
                project.save(update_fields=["description"])

            for idx, row in enumerate(rows, start=1):
                (
                    section,
                    standard,
                    indicator_text,
                    evidence_required,
                    responsible_person,
                    frequency_raw,
                    assigned_to,
                    compliance_evidence,
                    score_raw,
                ) = _get_cols(row)

                if not (section and standard and indicator_text):
                    skipped += 1
                    continue

                frequency = _parse_frequency(frequency_raw)
                score = _parse_int(score_raw, default=10)

                description_parts = []
                if evidence_required:
                    description_parts.append(f"Evidence Required: {evidence_required}")
                description = "\n".join(description_parts)

                notes_parts = []
                # Keep original text fields around for easy audit/review
                if compliance_evidence and not create_evidence_notes:
                    notes_parts.append(f"Compliance Evidence: {compliance_evidence}")
                notes = "\n".join(notes_parts) or None

                obj, was_created = Indicator.objects.get_or_create(
                    project=project,
                    section=section,
                    standard=standard,
                    indicator=indicator_text,
                    defaults={
                        "description": description,
                        "score": score,
                        "responsible_person": responsible_person or None,
                        "frequency": frequency,
                        "assignee": assigned_to or None,
                        "notes": notes,
                    },
                )

                if was_created:
                    created += 1
                else:
                    # Update selected fields if new data is present
                    changed_fields = []
                    if description and obj.description != description:
                        obj.description = description
                        changed_fields.append("description")
                    if score_raw and obj.score != score:
                        obj.score = score
                        changed_fields.append("score")
                    if responsible_person and obj.responsible_person != responsible_person:
                        obj.responsible_person = responsible_person
                        changed_fields.append("responsible_person")
                    if frequency and obj.frequency != frequency:
                        obj.frequency = frequency
                        changed_fields.append("frequency")
                    if assigned_to and obj.assignee != assigned_to:
                        obj.assignee = assigned_to
                        changed_fields.append("assignee")
                    if notes and obj.notes != notes:
                        obj.notes = notes
                        changed_fields.append("notes")
                    if changed_fields:
                        obj.save(update_fields=changed_fields)
                        updated += 1

                if create_evidence_notes and compliance_evidence:
                    # Create one note per row; idempotency via a simple "same content" check
                    content = f"Imported compliance evidence (row {idx}):\n{compliance_evidence}"
                    exists = Evidence.objects.filter(
                        indicator=obj,
                        type=EvidenceType.NOTE,
                        content=content,
                    ).exists()
                    if not exists:
                        Evidence.objects.create(
                            indicator=obj,
                            type=EvidenceType.NOTE,
                            file_name="Imported evidence note",
                            content=content,
                        )
                        evidence_notes += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Import complete. Project='{project_name}'. created={created} updated={updated} skipped={skipped} evidence_notes={evidence_notes}"
            )
        )


