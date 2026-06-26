#!/usr/bin/env python3
"""Run one Google Sheets outreach sync (same as outreach_worker --once)."""

from __future__ import annotations

import asyncio
import json

from app.workers import outreach_worker


def main() -> None:
    outreach_worker._init_worker()
    stats = asyncio.run(outreach_worker._tick_and_log())
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
