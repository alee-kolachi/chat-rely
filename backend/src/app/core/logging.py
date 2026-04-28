import json
import logging
import sys
from collections.abc import MutableMapping

import structlog


def setup_logging(log_level: str) -> None:
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.EventRenamer("message"),
        structlog.processors.JSONRenderer(serializer=json.dumps),
    ]

    structlog.configure(
        processors=processors,  # type: ignore[arg-type]
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )
    logging.basicConfig(format="%(message)s", level=log_level.upper(), stream=sys.stdout)


def bind_request_context(*, request_id: str, path: str, method: str) -> None:
    structlog.contextvars.bind_contextvars(request_id=request_id, path=path, method=method)


def clear_request_context() -> None:
    structlog.contextvars.clear_contextvars()


def normalize_log_data(extra: MutableMapping[str, object] | None = None) -> dict[str, object]:
    return dict(extra or {})

