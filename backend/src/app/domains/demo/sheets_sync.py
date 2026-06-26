"""Google Sheets sync for demo outreach pipeline."""

from __future__ import annotations

import json
from typing import Any

import structlog
from google.oauth2 import service_account
from googleapiclient.discovery import build

from app.core.settings import get_settings
from app.db.session import get_session_factory
from app.domains.demo.demo_provision_jobs import (
    enqueue_demo_provision_job,
    find_active_job_for_store,
)
from app.domains.demo.progress import demo_step
from app.domains.demo.repository import normalize_store_host

log = structlog.get_logger("demo.sheets_sync")

_ELIGIBLE_HEADER = "eligible for demo"
_STORE_LINK_HEADER = "store link"
_DEMO_LINK_HEADER = "demo link"
_DEMO_READY_DATE_HEADER = "demo ready date"
_PROCESSING = "Processing"
# Yes starts a run; Processing is retried when a prior run died mid-flight.
_QUEUE_VALUES = frozenset({"yes", "y", "processing"})


def _row_is_queued(eligible_raw: str) -> bool:
    return eligible_raw.lower() in _QUEUE_VALUES


def _normalize_header(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def _parse_service_account_config(raw: str) -> tuple[dict[str, Any] | None, str]:
    """Parse inline JSON or return a filesystem path for a service account key file."""
    value = (raw or "").strip()
    if not value:
        return None, ""
    # Render and some shells wrap the JSON in extra single/double quotes.
    for _ in range(3):
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
            value = value[1:-1].strip()
    if value.startswith("{"):
        return json.loads(value), ""
    return None, value


def _load_sheets_service():
    settings = get_settings()
    raw = (settings.google_sheets_service_account_json or "").strip()
    spreadsheet_id = (settings.google_sheets_spreadsheet_id or "").strip()
    if not raw or not spreadsheet_id:
        raise RuntimeError("Google Sheets is not configured")
    info, path = _parse_service_account_config(raw)
    if info is not None:
        creds = service_account.Credentials.from_service_account_info(
            info,
            scopes=["https://www.googleapis.com/auth/spreadsheets"],
        )
    else:
        creds = service_account.Credentials.from_service_account_file(
            path,
            scopes=["https://www.googleapis.com/auth/spreadsheets"],
        )
    service = build("sheets", "v4", credentials=creds, cache_discovery=False)
    return service, spreadsheet_id


def _header_map(header_row: list[str]) -> dict[str, int]:
    out: dict[str, int] = {}
    for idx, cell in enumerate(header_row):
        key = _normalize_header(str(cell or ""))
        if key:
            out[key] = idx
    return out


def _cell(row: list[str], idx: int | None) -> str:
    if idx is None or idx >= len(row):
        return ""
    return str(row[idx] or "").strip()


def _ensure_headers(
    service: Any,
    spreadsheet_id: str,
    sheet_title: str,
    header_row: list[str],
    headers: dict[str, int],
) -> dict[str, int]:
    updated = dict(headers)
    extended = list(header_row)
    changed = False
    for name in ("Eligible for demo", "Demo Link", "Demo Ready Date"):
        key = _normalize_header(name)
        if key not in updated:
            extended.append(name)
            updated[key] = len(extended) - 1
            changed = True
    if changed:
        service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=f"'{sheet_title}'!1:1",
            valueInputOption="RAW",
            body={"values": [extended]},
        ).execute()
    return updated


async def sync_demo_sheet_once() -> dict[str, int]:
    demo_step("sheet.sync_start")
    service, spreadsheet_id = _load_sheets_service()
    meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    stats = {"enqueued": 0, "skipped": 0, "already_active": 0}
    queued_rows = 0

    for sheet in meta.get("sheets") or []:
        props = sheet.get("properties") or {}
        title = str(props.get("title") or "")
        if not title:
            continue
        values_resp = (
            service.spreadsheets()
            .values()
            .get(spreadsheetId=spreadsheet_id, range=f"'{title}'!A:ZZ")
            .execute()
        )
        rows = values_resp.get("values") or []
        if not rows:
            continue
        headers = _header_map([str(c) for c in rows[0]])
        if _STORE_LINK_HEADER not in headers:
            continue
        headers = _ensure_headers(service, spreadsheet_id, title, rows[0], headers)

        for row_index, row in enumerate(rows[1:], start=2):
            eligible_raw = _cell(row, headers.get(_ELIGIBLE_HEADER))
            if not _row_is_queued(eligible_raw):
                continue
            store_url = _cell(row, headers.get(_STORE_LINK_HEADER))
            if not store_url:
                stats["skipped"] += 1
                log.info(
                    "demo.sheet_row_skipped",
                    tab=title,
                    row=row_index,
                    reason="missing_store_link",
                )
                continue

            queued_rows += 1
            demo_step(
                "sheet.row_start",
                tab=title,
                row=row_index,
                store=store_url,
            )

            if eligible_raw.lower() != "processing":
                service.spreadsheets().values().update(
                    spreadsheetId=spreadsheet_id,
                    range=f"'{title}'!{_col(headers[_ELIGIBLE_HEADER])}{row_index}",
                    valueInputOption="RAW",
                    body={"values": [[_PROCESSING]]},
                ).execute()
                demo_step("sheet.mark_processing", tab=title, row=row_index)
            else:
                demo_step("sheet.row_retry", tab=title, row=row_index)

            sheet_ref = {"tab_name": title, "row_index": row_index}
            sheet_snapshot = {
                k: _cell(row, idx) for k, idx in headers.items() if idx is not None
            }

            store_host = normalize_store_host(store_url)
            async with get_session_factory()() as db:
                active_job_id = await find_active_job_for_store(db, store_host)

            if active_job_id is not None:
                stats["already_active"] += 1
                demo_step(
                    "sheet.row_already_queued",
                    tab=title,
                    row=row_index,
                    store=store_url,
                    job_id=str(active_job_id),
                )
                continue

            try:
                async with get_session_factory()() as db:
                    job_id = await enqueue_demo_provision_job(
                        db,
                        store_url=store_url,
                        sheet_ref=sheet_ref,
                        sheet_snapshot=sheet_snapshot,
                    )
            except Exception:
                log.exception(
                    "demo.sheet_row_enqueue_failed",
                    tab=title,
                    row=row_index,
                    store_url=store_url,
                )
                demo_step(
                    "sheet.row_failed",
                    tab=title,
                    row=row_index,
                    store=store_url,
                    reason="enqueue_exception",
                )
                continue

            if job_id is None:
                stats["already_active"] += 1
                continue

            stats["enqueued"] += 1
            demo_step(
                "sheet.row_enqueued",
                tab=title,
                row=row_index,
                store=store_url,
                job_id=str(job_id),
            )
            log.info(
                "demo.sheet_row_enqueued",
                tab=title,
                row=row_index,
                job_id=str(job_id),
                store_url=store_url,
            )

    if queued_rows == 0:
        demo_step("sheet.sync_idle")
    return stats


def _col(index: int) -> str:
    n = index + 1
    letters = ""
    while n:
        n, rem = divmod(n - 1, 26)
        letters = chr(65 + rem) + letters
    return letters
