"""In-process signals for merchant conversation workspace refresh (no interval polling)."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from uuid import UUID

_waiters: dict[UUID, set[asyncio.Event]] = defaultdict(set)


def register_workspace_waiter(user_id: UUID) -> asyncio.Event:
    event = asyncio.Event()
    _waiters[user_id].add(event)
    return event


def unregister_workspace_waiter(user_id: UUID, event: asyncio.Event) -> None:
    waiters = _waiters.get(user_id)
    if not waiters:
        return
    waiters.discard(event)
    if not waiters:
        _waiters.pop(user_id, None)


def notify_conversation_workspace_changed(user_id: UUID) -> None:
    for event in list(_waiters.get(user_id, ())):
        event.set()
