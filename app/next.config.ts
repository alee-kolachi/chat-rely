import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** Where Next.js should forward browser `/api/v1/*` requests (FastAPI). Not exposed to the client. */
const apiProxyTarget = (
  process.env.API_PROXY_TARGET ||
  process.env.BACKEND_INTERNAL_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.18.80"],
  turbopack: {
    root: projectRoot,
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiProxyTarget}/api/v1/:path*` }];
  },
};

export default nextConfig;
