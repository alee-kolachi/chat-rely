"""Human-readable progress lines for demo outreach (terminal + structured logs)."""

from __future__ import annotations

import sys
from typing import Any

import structlog

log = structlog.get_logger("demo.progress")

_STEP_LABELS: dict[str, str] = {
    "sheet.sync_start": "Checking Google Sheet for queued rows",
    "sheet.sync_idle": "No queued rows found",
    "sheet.row_start": "Starting store",
    "sheet.mark_processing": "Marked sheet row as Processing",
    "sheet.row_retry": "Retrying row stuck on Processing",
    "provision.start": "Provisioning demo",
    "provision.ingest": "Fetching storefront catalog and policies",
    "provision.ingest_done": "Storefront fetched",
    "provision.agent": "Creating demo agent",
    "provision.index_site": "Indexing store info pages",
    "provision.index_site_page": "Embedding store page",
    "provision.index_site_done": "Store page indexing complete",
    "provision.complete": "Demo ready for your review",
    "sheet.row_done": "Updated sheet row",
    "sheet.row_failed": "Row failed",
    "worker.tick_start": "Outreach worker tick started",
    "worker.tick_done": "Outreach worker tick finished",
}


def _format_fields(fields: dict[str, Any]) -> str:
    parts: list[str] = []
    for key in ("tab", "row", "store", "display_name", "slug", "url", "status", "batch", "batches", "products", "policies", "reason"):
        if key in fields and fields[key] not in (None, ""):
            parts.append(f"{key}={fields[key]}")
    return ", ".join(parts)


def demo_step(step: str, /, *, echo: bool = True, **fields: Any) -> None:
    """Emit one progress step (structured log + optional clean terminal line)."""
    label = _STEP_LABELS.get(step, step.replace("_", " "))
    log.info("demo.step", step=step, label=label, **fields)
    if not echo:
        return
    suffix = _format_fields(fields)
    line = f"[demo] {label}"
    if suffix:
        line = f"{line} — {suffix}"
    print(line, file=sys.stdout, flush=True)
