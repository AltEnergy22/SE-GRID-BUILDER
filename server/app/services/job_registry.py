import uuid
import asyncio
from typing import Dict, Any, Optional

# Global job registry
jobs: Dict[str, Dict[str, Any]] = {}

def create_job() -> str:
    """Create a new job and return its ID."""
    jid = uuid.uuid4().hex
    jobs[jid] = {
        "progress": 0,
        "total": 0,
        "results": None,
        "status": "running"
    }
    return jid

def set_progress(jid: str, done: int, total: int) -> None:
    """Update job progress."""
    if jid in jobs:
        jobs[jid]["progress"] = done
        jobs[jid]["total"] = total

def set_results(jid: str, results: Any) -> None:
    """Set job results and mark as completed."""
    if jid in jobs:
        jobs[jid]["results"] = results
        jobs[jid]["status"] = "completed"

def get(jid: str) -> Optional[Dict[str, Any]]:
    """Get job information by ID."""
    return jobs.get(jid)

def cleanup_job(jid: str) -> None:
    """Remove job from registry."""
    if jid in jobs:
        del jobs[jid] 