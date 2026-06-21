"""Google Sheets sync for demo outreach pipeline."""

from __future__ import annotations

import json
from typing import Any

import structlog
from google.oauth2 import service_account
from googleapiclient.discovery import build

from app.core.settings import get_settings
from app.db.session import get_session_factory
from app.domains.demo.provision import provision_demo_from_store_url

log = structlog.get_logger("demo.sheets_sync")

_ELIGIBLE_HEADER = "eligible for demo"
_STORE_LINK_HEADER = "store link"
_DEMO_LINK_HEADER = "demo link"
_DEMO_READY_DATE_HEADER = "demo ready date"
_PROCESSING = "Processing"
_YES_VALUES = {"yes", "y"}


def _normalize_header(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def _load_sheets_service():
    settings = get_settings()
    raw = (settings.google_sheets_service_account_json or "").strip()
    spreadsheet_id = (settings.google_sheets_spreadsheet_id or "").strip()
    if not raw or not spreadsheet_id:
        raise RuntimeError("Google Sheets is not configured")
    if raw.startswith("{"):
        info = json.loads(raw)
        creds = service_account.Credentials.from_service_account_info(
            info,
            scopes=["https://www.googleapis.com/auth/spreadsheets"],
        )
    else:
        creds = service_account.Credentials.from_service_account_file(
            raw,
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
    service, spreadsheet_id = _load_sheets_service()
    meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    stats = {"processed": 0, "ready": 0, "needs_review": 0, "failed": 0, "skipped": 0}

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
            eligible = eligible_raw.lower()
            if eligible not in _YES_VALUES:
                continue
            if eligible_raw in {"Ready", "needs_review", "failed", _PROCESSING}:
                stats["skipped"] += 1
                continue
            store_url = _cell(row, headers.get(_STORE_LINK_HEADER))
            if not store_url:
                stats["skipped"] += 1
                continue

            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"'{title}'!{_col(headers[_ELIGIBLE_HEADER])}{row_index}",
                valueInputOption="RAW",
                body={"values": [[_PROCESSING]]},
            ).execute()

            sheet_ref = {"tab_name": title, "row_index": row_index}
            sheet_snapshot = {
                k: _cell(row, idx) for k, idx in headers.items() if idx is not None
            }

            async with get_session_factory()() as db:
                result = await provision_demo_from_store_url(
                    db,
                    store_url=store_url,
                    sheet_ref=sheet_ref,
                    sheet_snapshot=sheet_snapshot,
                    run_qa=True,
                )

            status = str(result.get("status") or "failed")
            stats["processed"] += 1
            if status == "ready":
                stats["ready"] += 1
            elif status == "needs_review":
                stats["needs_review"] += 1
            else:
                stats["failed"] += 1

            updates: list[list[str]] = []
            update_cols: list[int] = []
            update_cols.append(headers[_ELIGIBLE_HEADER])
            updates.append(["Ready" if status == "ready" else status])

            if _DEMO_LINK_HEADER in headers:
                update_cols.append(headers[_DEMO_LINK_HEADER])
                updates.append([str(result.get("url") or "")])

            if status == "ready" and _DEMO_READY_DATE_HEADER in headers:
                from datetime import UTC, datetime

                update_cols.append(headers[_DEMO_READY_DATE_HEADER])
                updates.append([datetime.now(UTC).date().isoformat()])

            for col_idx, value in zip(update_cols, updates, strict=False):
                service.spreadsheets().values().update(
                    spreadsheetId=spreadsheet_id,
                    range=f"'{title}'!{_col(col_idx)}{row_index}",
                    valueInputOption="RAW",
                    body={"values": [value]},
                ).execute()

            log.info(
                "demo.sheet_row_processed",
                tab=title,
                row=row_index,
                status=status,
                url=result.get("url"),
            )

    return stats


def _col(index: int) -> str:
    n = index + 1
    letters = ""
    while n:
        n, rem = divmod(n - 1, 26)
        letters = chr(65 + rem) + letters
    return letters
