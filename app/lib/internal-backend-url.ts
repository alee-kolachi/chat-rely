/** Base URL for server-side / middleware calls to FastAPI (rewrites do not apply). */
export function getInternalBackendBaseUrl(): string {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.API_PROXY_TARGET ||
    "http://127.0.0.1:8000"
  )
    .trim()
    .replace(/\/$/, "");
}
