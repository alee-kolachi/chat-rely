#!/usr/bin/env python3
"""Manually provision a demo outreach store."""

from __future__ import annotations

import argparse
import asyncio
import json

from app.db.engine import init_engine
from app.db.session import get_session_factory, init_session_factory
from app.core.settings import get_settings
from app.domains.demo.provision import provision_demo_from_store_url


async def main() -> None:
    parser = argparse.ArgumentParser(description="Provision a demo outreach store")
    parser.add_argument("--url", required=True, help="Shopify storefront URL")
    parser.add_argument("--skip-qa", action="store_true")
    args = parser.parse_args()

    settings = get_settings()
    init_engine(settings)
    init_session_factory()
    async with get_session_factory()() as db:
        result = await provision_demo_from_store_url(
            db,
            store_url=args.url,
            run_qa=not args.skip_qa,
        )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
