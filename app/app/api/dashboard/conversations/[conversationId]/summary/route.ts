import type { NextRequest } from "next/server";
import { proxyBackendRequest } from "@/lib/proxy-backend-request";

export const maxDuration = 120;

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { conversationId } = await context.params;
  return proxyBackendRequest(request, `/api/v1/conversations/${conversationId}/summary`);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { conversationId } = await context.params;
  return proxyBackendRequest(request, `/api/v1/conversations/${conversationId}/summary`);
}
