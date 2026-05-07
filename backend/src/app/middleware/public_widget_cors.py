"""CORS for embeddable widget API — any storefront origin, no credentials."""

from collections.abc import Awaitable, Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class PublicWidgetCORSMiddleware(BaseHTTPMiddleware):
    """Reflect ``Origin`` (or ``*``) for ``/api/v1/public/widget`` so third-party sites can call the API."""

    PREFIX = "/api/v1/public/widget"

    def _cors_headers(self, request: Request) -> dict[str, str]:
        origin = (request.headers.get("origin") or "").strip()
        allow = origin if origin else "*"
        headers: dict[str, str] = {
            "Access-Control-Allow-Origin": allow,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-ChatRely-Agent-Key",
            "Access-Control-Max-Age": "86400",
        }
        if origin:
            headers["Vary"] = "Origin"
        return headers

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        path = request.url.path
        if not path.startswith(self.PREFIX):
            return await call_next(request)

        if request.method == "OPTIONS":
            return Response(status_code=204, headers=self._cors_headers(request))

        response = await call_next(request)
        for k, v in self._cors_headers(request).items():
            response.headers[k] = v
        return response
