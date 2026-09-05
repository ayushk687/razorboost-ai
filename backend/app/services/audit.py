from datetime import datetime
import uuid

audit_logs = []


def log_event(
    event_type: str,
    session_id: str | None = None,
    details: dict | None = None
):
    event = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "event_type": event_type,
        "session_id": session_id,
        "details": details or {}
    }

    audit_logs.append(event)

    return event


def get_audit_logs(session_id: str | None = None):
    if session_id:
        return [
            event
            for event in audit_logs
            if event["session_id"] == session_id
        ]

    return audit_logs