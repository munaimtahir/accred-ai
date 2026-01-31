from __future__ import annotations

import datetime
import decimal
import uuid
from typing import Any, Dict, Optional

from django.utils import timezone

from .models import AuditLog

SENSITIVE_KEYS = {
    "password",
    "token",
    "secret",
    "authorization",
    "cookie",
    "cookies",
    "session",
    "csrftoken",
    "csrf",
}


def _stringify(value: Any) -> Any:
    if isinstance(value, (uuid.UUID, datetime.date, datetime.datetime, decimal.Decimal)):
        return str(value)
    return value


def sanitize_payload(payload: Any) -> Any:
    if payload is None:
        return None
    if isinstance(payload, dict):
        cleaned: Dict[str, Any] = {}
        for key, value in payload.items():
            if key.lower() in SENSITIVE_KEYS:
                cleaned[key] = "[REDACTED]"
                continue
            cleaned[key] = sanitize_payload(value)
        return cleaned
    if isinstance(payload, (list, tuple)):
        return [sanitize_payload(item) for item in payload]
    return _stringify(payload)


def extract_request_meta(request) -> Dict[str, Optional[str]]:
    if not request:
        return {"ip_address": None, "user_agent": None}
    ip = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR")
    user_agent = request.META.get("HTTP_USER_AGENT")
    return {"ip_address": ip, "user_agent": user_agent}


def log_audit(
    *,
    actor,
    action: str,
    entity_type: str,
    entity_id: str,
    summary: str,
    before: Any = None,
    after: Any = None,
    metadata: Optional[Dict[str, Any]] = None,
    request=None,
) -> AuditLog:
    meta = extract_request_meta(request)
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        summary=summary,
        ip_address=meta.get("ip_address"),
        user_agent=meta.get("user_agent"),
        before=sanitize_payload(before),
        after=sanitize_payload(after),
        metadata=sanitize_payload(metadata or {}),
        timestamp=timezone.now(),
    )
