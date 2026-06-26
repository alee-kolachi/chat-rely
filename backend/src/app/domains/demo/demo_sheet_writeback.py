"""Write provision results back to the Google Sheet."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import structlog

from app.domains.demo.sheets_sync import _col, _load_sheets_service, _normalize_header

log = structlog.get_logger("demo.sheet_writeback")

_ELIGIBLE_HEADER = "eligible for demo"
_DEMO_LINK_HEADER = "demo link"
_DEMO_READY_DATE_HEADER = "demo ready date"


def _header_map(header_row: list[str]) -> dict[str, int]:
    out: dict[str, int] = {}
    for idx, cell in enumerate(header_row):
        key = _normalize_header(str(cell or ""))
        if key:
            out[key] = idx
    return out


def write_sheet_row_result(
    *,
    sheet_ref: dict[str, Any],
    result: dict[str, Any],
) -> None:
    """Update Eligible for demo, Demo Link, and optional ready date for one row."""
    tab_name = str(sheet_ref.get("tab_name") or "").strip()
    row_index = int(sheet_ref.get("row_index") or 0)
    if not tab_name or row_index < 2:
        log.warning("demo.sheet_writeback_skipped", reason="invalid_sheet_ref", sheet_ref=sheet_ref)
        return

    service, spreadsheet_id = _load_sheets_service()
    values_resp = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=spreadsheet_id, range=f"'{tab_name}'!1:1")
        .execute()
    )
    header_row = values_resp.get("values") or [[]]
    headers = _header_map([str(c) for c in (header_row[0] if header_row else [])])
    if _ELIGIBLE_HEADER not in headers:
        log.warning("demo.sheet_writeback_skipped", reason="missing_eligible_column", tab=tab_name)
        return

    status = str(result.get("status") or "failed")
    eligible_value = "Ready" if status == "ready" else status

    update_cols: list[int] = [headers[_ELIGIBLE_HEADER]]
    update_values: list[list[str]] = [[eligible_value]]

    if _DEMO_LINK_HEADER in headers:
        update_cols.append(headers[_DEMO_LINK_HEADER])
        update_values.append([str(result.get("url") or "")])

    if status == "ready" and _DEMO_READY_DATE_HEADER in headers:
        update_cols.append(headers[_DEMO_READY_DATE_HEADER])
        update_values.append([datetime.now(UTC).date().isoformat()])

    for col_idx, value in zip(update_cols, update_values, strict=False):
        service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=f"'{tab_name}'!{_col(col_idx)}{row_index}",
            valueInputOption="RAW",
            body={"values": [value]},
        ).execute()

    log.info(
        "demo.sheet_writeback_done",
        tab=tab_name,
        row=row_index,
        status=status,
        url=result.get("url"),
    )
