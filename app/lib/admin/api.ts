import "server-only";

import { getValidatedServerAuth } from "@/lib/supabase-server";

// Admin pages are server components; we fetch directly from the internal backend URL using the
// signed-in user's bearer token. Mirrors the bootstrap call already done in `(admin)/layout.tsx`.
function getAdminBackendBaseUrl(): string {
  const base = (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.API_PROXY_TARGET ||
    "http://127.0.0.1:8000"
  )
    .trim()
    .replace(/\/$/, "");
  return base;
}

export class AdminApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function adminFetch<T>(path: string): Promise<T> {
  const auth = await getValidatedServerAuth();
  if (!auth) {
    throw new AdminApiError("No active Supabase session", 401, "auth.no_session");
  }
  const url = `${getAdminBackendBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${auth.session.access_token}` },
      cache: "no-store",
    });
  } catch {
    throw new AdminApiError("Admin API is unreachable", 503, "admin.api_unreachable");
  }
  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
    const asRecord = payload as { error?: { message?: string; code?: string } } | null;
    throw new AdminApiError(
      asRecord?.error?.message ?? `Admin request failed (${res.status})`,
      res.status,
      asRecord?.error?.code
    );
  }
  return (await res.json()) as T;
}

function buildQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

// ---------- Types (mirror backend Pydantic DTOs) -------------------------------

export type AdminUserListItem = {
  id: string;
  email: string;
  full_name: string | null;
  signed_up_at: string;
  plan_slug: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  agents_count: number;
  conversations_mtd: number;
  last_activity_at: string | null;
  // Phase 3 costing (calendar month-to-date, USD).
  revenue_mtd_usd: number;
  llm_cost_mtd_usd: number;
  embedding_cost_mtd_usd: number;
  total_cost_mtd_usd: number;
  margin_mtd_usd: number;
  margin_pct_mtd: number | null;
};

export type AdminUserListResponse = {
  items: AdminUserListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type AdminSubscriptionSummary = {
  id: string;
  plan_slug: string;
  plan_name: string;
  monthly_price_cents: number;
  status: string;
  provider: string;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
};

export type AdminAgentSummary = {
  id: string;
  name: string;
  slug: string;
  model: string;
  status: string;
  conversations_total: number;
  conversations_mtd: number;
  created_at: string;
  archived_at: string | null;
};

export type AdminKnowledgeSummary = {
  by_kind: Record<string, number>;
  total_sources: number;
  total_chunks: number;
};

export type AdminUsageSnapshotSummary = {
  id: string;
  period_start: string;
  period_end: string;
  included_conversations: number;
  conversations_used: number;
  overage_conversations: number;
  estimated_overage_cents: number;
  projected_conversations: number;
  throttle_tier: string;
  included_premium_turns: number;
  premium_turns_used: number;
  last_computed_at: string | null;
};

export type AdminConversationListItem = {
  id: string;
  started_at: string;
  last_activity_at: string;
  status: string;
  channel: string;
  visitor_id: string;
  agent_id: string;
  agent_name: string;
  user_id: string;
  user_email: string;
  customer_message_count: number;
  assistant_message_count: number;
  tool_call_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  fallback_used: boolean;
  latest_message_preview: string | null;
  // Phase 3 — null when no priced LLM message exists in the conversation.
  cost_usd: number | null;
};

export type AdminConversationListResponse = {
  items: AdminConversationListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type AdminMessageDTO = {
  id: string;
  role: string;
  content: string;
  tool_name: string | null;
  tool_call_id: string | null;
  tool_call_payload: Record<string, unknown>;
  tool_result_payload: Record<string, unknown>;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Phase 3 — null when the message has no model or its model is missing from the env price map.
  cost_usd: number | null;
};

export type AdminConversationDetail = AdminConversationListItem & {
  closed_at: string | null;
  metadata: Record<string, unknown>;
  messages: AdminMessageDTO[];
  truncated: boolean;
  total_message_count: number;
  transcript_message_cap: number;
};

export type AdminUserDetail = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  signed_up_at: string;
  subscriptions: AdminSubscriptionSummary[];
  agents: AdminAgentSummary[];
  recent_conversations: AdminConversationListItem[];
  knowledge_summary: AdminKnowledgeSummary;
  recent_usage_snapshots: AdminUsageSnapshotSummary[];
  // Phase 3 — same MTD totals shown in the users list.
  revenue_mtd_usd: number;
  llm_cost_mtd_usd: number;
  embedding_cost_mtd_usd: number;
  total_cost_mtd_usd: number;
  margin_mtd_usd: number;
  margin_pct_mtd: number | null;
};

// ---------- Phase 3: Costing types ---------------------------------------------

export type AdminCostByModelRow = {
  model: string;
  input_tokens: number;
  output_tokens: number;
  embedding_tokens?: number;
  cost_usd: number;
  pct_of_total: number;
};

export type AdminCostByAgentRow = {
  agent_id: string;
  agent_name: string;
  llm_cost_usd: number;
  embedding_cost_usd: number;
  total_cost_usd: number;
  conversations: number;
  messages: number;
};

export type AdminMessageCostRow = {
  id: string;
  role: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number | null;
  created_at: string;
};

export type AdminCostKindRollup = {
  kind: string;
  cost_usd: number;
  count: number;
};

export type AdminCostPerTurnRollup = {
  turn_user_message_id: string;
  cost_usd: number;
  event_count: number;
};

export type AdminCostEventRow = {
  id: string;
  kind: string;
  provider_model: string | null;
  turn_user_message_id: string | null;
  input_tokens: number;
  output_tokens: number;
  embedding_tokens: number;
  cost_usd: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};


export type AdminConversationCost = {
  conversation_id: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number | null;
  by_model: AdminCostByModelRow[];
  messages: AdminMessageCostRow[];
  has_unknown_models: boolean;
  /** Present once backend migration is applied; treat as empty when absent. */
  cost_events?: AdminCostEventRow[];
  events_total_cost_usd?: number | null;
  has_unknown_event_pricing?: boolean;
  by_kind?: AdminCostKindRollup[];
  per_turn?: AdminCostPerTurnRollup[];
  customer_message_count?: number;
  avg_cost_per_customer_message_usd?: number | null;
};

export type AdminUserCosting = {
  user_id: string;
  email: string;
  period_label: string;
  revenue_usd: number;
  llm_cost_usd: number;
  embedding_cost_usd: number;
  total_cost_usd: number;
  margin_usd: number;
  margin_pct: number | null;
  by_agent: AdminCostByAgentRow[];
};

export type AdminCostingPeriod = {
  label: string;
  period_start: string;
  period_end: string;
  revenue_usd: number;
  llm_cost_usd: number;
  embedding_cost_usd: number;
  total_cost_usd: number;
  gross_margin_usd: number;
  gross_margin_pct: number | null;
};

export type AdminPlatformCosting = {
  period_label: string;
  current: AdminCostingPeriod;
  prior: AdminCostingPeriod;
  by_model: AdminCostByModelRow[];
  unknown_models: string[];
  embedding_model: string;
  embedding_model_priced: boolean;
  cached_at: string;
  cache_ttl_seconds: number;
};

export type AdminUserCostingRow = {
  user_id: string;
  email: string;
  plan_slug: string | null;
  plan_name: string | null;
  revenue_usd: number;
  llm_cost_usd: number;
  embedding_cost_usd: number;
  total_cost_usd: number;
  margin_usd: number;
  margin_pct: number | null;
};

export type AdminCostingLeaderboard = {
  metric: "worst_margin" | "top_spend";
  items: AdminUserCostingRow[];
  cached_at: string;
  cache_ttl_seconds: number;
};

// ---------- Helpers ------------------------------------------------------------

export type AdminUserSortBy =
  | "signed_up_at"
  | "last_activity_at"
  | "conversations_mtd"
  | "email"
  | "margin_mtd_usd"
  | "total_cost_mtd_usd"
  | "revenue_mtd_usd";

export type ListAdminUsersParams = {
  q?: string | null;
  sort_by?: AdminUserSortBy;
  sort_dir?: "asc" | "desc";
  page?: number;
  page_size?: number;
};

export async function listAdminUsers(
  params: ListAdminUsersParams = {}
): Promise<AdminUserListResponse> {
  const q = buildQuery({
    q: params.q ?? undefined,
    sort_by: params.sort_by,
    sort_dir: params.sort_dir,
    page: params.page,
    page_size: params.page_size,
  });
  return adminFetch<AdminUserListResponse>(`/api/v1/admin/users${q}`);
}

export async function getAdminUser(userId: string): Promise<AdminUserDetail> {
  return adminFetch<AdminUserDetail>(`/api/v1/admin/users/${encodeURIComponent(userId)}`);
}

export type ListAdminConversationsParams = {
  user_id?: string | null;
  user_email?: string | null;
  agent_id?: string | null;
  status?: string | null;
  channel?: string | null;
  visitor_id?: string | null;
  started_after?: string | null;
  started_before?: string | null;
  escalated?: boolean | null;
  fallback_used?: boolean | null;
  page?: number;
  page_size?: number;
};

export async function listAdminConversations(
  params: ListAdminConversationsParams = {}
): Promise<AdminConversationListResponse> {
  const q = buildQuery({
    user_id: params.user_id ?? undefined,
    user_email: params.user_email ?? undefined,
    agent_id: params.agent_id ?? undefined,
    status: params.status ?? undefined,
    channel: params.channel ?? undefined,
    visitor_id: params.visitor_id ?? undefined,
    started_after: params.started_after ?? undefined,
    started_before: params.started_before ?? undefined,
    escalated: params.escalated ?? undefined,
    fallback_used: params.fallback_used ?? undefined,
    page: params.page,
    page_size: params.page_size,
  });
  return adminFetch<AdminConversationListResponse>(`/api/v1/admin/conversations${q}`);
}

export async function getAdminConversation(
  conversationId: string
): Promise<AdminConversationDetail> {
  return adminFetch<AdminConversationDetail>(
    `/api/v1/admin/conversations/${encodeURIComponent(conversationId)}`
  );
}

// ---------- Phase 3: Costing helpers -------------------------------------------

export async function getPlatformCostingOverview(): Promise<AdminPlatformCosting> {
  return adminFetch<AdminPlatformCosting>("/api/v1/admin/costing/overview");
}

export type CostingLeaderboardMetric = "worst_margin" | "top_spend";

export async function getCostingLeaderboard(
  metric: CostingLeaderboardMetric,
  limit = 20
): Promise<AdminCostingLeaderboard> {
  const q = buildQuery({ metric, limit });
  return adminFetch<AdminCostingLeaderboard>(`/api/v1/admin/costing/leaderboard${q}`);
}

export async function getUserCosting(userId: string): Promise<AdminUserCosting> {
  return adminFetch<AdminUserCosting>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/costing`
  );
}

export async function getConversationCost(
  conversationId: string
): Promise<AdminConversationCost> {
  return adminFetch<AdminConversationCost>(
    `/api/v1/admin/conversations/${encodeURIComponent(conversationId)}/cost`
  );
}

// ---------- Phase 4: Operations types ------------------------------------------

export type AdminWorkerStatus = {
  indexing_last_success_at: string | null;
  indexing_last_attempt_at: string | null;
  indexing_queue_depth: number;
  maintenance_last_computed_at: string | null;
};

export type AdminStripeEventRow = {
  id: string;
  stripe_event_id: string;
  event_type: string;
  processed_at: string;
};

export type AdminIndexingJobRow = {
  id: string;
  user_id: string;
  user_email: string;
  agent_id: string;
  agent_name: string;
  knowledge_source_id: string;
  knowledge_source_title: string;
  status: string;
  attempt: number;
  triggered_by: string;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  created_at: string;
};

export type AdminOverviewKpis = {
  total_users: number;
  signups_today: number;
  signups_last_7d: number;
  active_subscriptions: number;
  mrr_usd: number;
  conversations_today: number;
  conversations_mtd: number;
  indexing_queue_depth: number;
  indexing_failed_24h: number;
};

export type AdminOverview = {
  kpis: AdminOverviewKpis;
  recent_signups: AdminUserListItem[];
  recent_conversations: AdminConversationListItem[];
  recent_stripe_events: AdminStripeEventRow[];
  recent_indexing_failures: AdminIndexingJobRow[];
  workers: AdminWorkerStatus;
  llm_cost_mtd_usd: number;
  embedding_cost_mtd_usd: number;
  revenue_mtd_usd: number;
  gross_margin_mtd_usd: number;
  gross_margin_mtd_pct: number | null;
  pricing_unknown_models: string[];
  embedding_model: string;
  embedding_model_priced: boolean;
};

// ----- Agents

export type AdminKnowledgeSourceRow = {
  id: string;
  user_id: string;
  user_email: string;
  agent_id: string;
  agent_name: string;
  type: string;
  title: string;
  status: string;
  source_url: string | null;
  last_indexed_at: string | null;
  error_message: string | null;
  chunks_count: number;
  chunks_total_tokens: number;
  created_at: string;
};

export type AdminAgentActionRow = {
  id: string;
  action_key: string;
  enabled: boolean;
  config: Record<string, unknown>;
  safety_policy: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AdminAgentListItem = {
  id: string;
  user_id: string;
  user_email: string;
  name: string;
  slug: string;
  status: string;
  model: string;
  conversations_total: number;
  conversations_mtd: number;
  knowledge_sources_count: number;
  actions_enabled_count: number;
  created_at: string;
  archived_at: string | null;
};

export type AdminAgentListResponse = {
  items: AdminAgentListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type AdminAgentDetail = AdminAgentListItem & {
  system_prompt: string;
  behavior_settings: Record<string, unknown>;
  public_key: string;
  knowledge_sources: AdminKnowledgeSourceRow[];
  actions: AdminAgentActionRow[];
  recent_conversations: AdminConversationListItem[];
};

export type AdminAgentSortBy =
  | "created_at"
  | "name"
  | "conversations_total"
  | "conversations_mtd"
  | "knowledge_sources_count";

// ----- Tickets

export type AdminTicketListItem = {
  id: string;
  user_id: string;
  user_email: string;
  agent_id: string;
  agent_name: string;
  conversation_id: string;
  status: string;
  priority: string;
  subject: string | null;
  customer_email: string | null;
  external_provider: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminTicketListResponse = {
  items: AdminTicketListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type AdminTicketDetail = AdminTicketListItem & {
  metadata: Record<string, unknown>;
  conversation: AdminConversationListItem;
};

// ----- Knowledge

export type AdminKnowledgeSourceListResponse = {
  items: AdminKnowledgeSourceRow[];
  total: number;
  page: number;
  page_size: number;
};

export type AdminKnowledgeChunkPreview = {
  id: string;
  chunk_index: number;
  token_count: number;
  content_preview: string;
  created_at: string;
};

export type AdminKnowledgeSourceDetail = AdminKnowledgeSourceRow & {
  storage_bucket: string | null;
  storage_path: string | null;
  metadata: Record<string, unknown>;
  recent_jobs: AdminIndexingJobRow[];
  sample_chunks: AdminKnowledgeChunkPreview[];
};

export type AdminIndexingJobListResponse = {
  items: AdminIndexingJobRow[];
  total: number;
  page: number;
  page_size: number;
};

// ----- Billing

export type AdminSubscriptionRow = {
  id: string;
  user_id: string;
  user_email: string;
  plan_id: string;
  plan_slug: string;
  plan_name: string;
  monthly_price_cents: number;
  status: string;
  provider: string;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
};

export type AdminSubscriptionListResponse = {
  items: AdminSubscriptionRow[];
  total: number;
  page: number;
  page_size: number;
};

export type AdminUsageSnapshotRow = {
  id: string;
  user_id: string;
  user_email: string;
  period_start: string;
  period_end: string;
  included_conversations: number;
  conversations_used: number;
  overage_conversations: number;
  estimated_overage_cents: number;
  projected_conversations: number;
  throttle_tier: string;
  included_premium_turns: number;
  premium_turns_used: number;
  last_computed_at: string | null;
};

export type AdminUsageSnapshotListResponse = {
  items: AdminUsageSnapshotRow[];
  total: number;
  page: number;
  page_size: number;
};

export type AdminStripeEventListResponse = {
  items: AdminStripeEventRow[];
  total: number;
  page: number;
  page_size: number;
};

// ----- Plans

export type AdminPlanRow = {
  id: string;
  slug: string;
  name: string;
  monthly_price_cents: number;
  included_conversations: number;
  overage_conversation_cents: number;
  max_agents: number;
  features: Record<string, unknown>;
  throttle_policy: Record<string, unknown>;
  is_active: boolean;
  public_on_pricing_page: boolean;
  sort_order: number;
  subscriptions_count: number;
  created_at: string;
};

export type AdminPlanListResponse = { items: AdminPlanRow[] };

// ----- System

export type AdminPricingStatus = {
  llm_input_models: string[];
  llm_output_models: string[];
  embedding_models: string[];
  embedding_active_model: string;
  embedding_active_model_priced: boolean;
  unknown_models_in_messages: string[];
};

export type AdminSystemHealth = {
  app_name: string;
  app_version: string;
  app_env: string;
  database_ready: boolean;
  database_latency_ms: number;
  workers: AdminWorkerStatus;
  pricing_configured: AdminPricingStatus;
};

// ---------- Phase 4: Helpers ---------------------------------------------------

export async function getAdminOverview(): Promise<AdminOverview> {
  return adminFetch<AdminOverview>("/api/v1/admin/overview");
}

export type ListAdminAgentsParams = {
  user_email?: string | null;
  user_id?: string | null;
  status?: string | null;
  model?: string | null;
  sort_by?: AdminAgentSortBy;
  sort_dir?: "asc" | "desc";
  page?: number;
  page_size?: number;
};

export async function listAdminAgents(
  params: ListAdminAgentsParams = {}
): Promise<AdminAgentListResponse> {
  const q = buildQuery({
    user_email: params.user_email ?? undefined,
    user_id: params.user_id ?? undefined,
    status: params.status ?? undefined,
    model: params.model ?? undefined,
    sort_by: params.sort_by,
    sort_dir: params.sort_dir,
    page: params.page,
    page_size: params.page_size,
  });
  return adminFetch<AdminAgentListResponse>(`/api/v1/admin/agents${q}`);
}

export async function getAdminAgent(agentId: string): Promise<AdminAgentDetail> {
  return adminFetch<AdminAgentDetail>(
    `/api/v1/admin/agents/${encodeURIComponent(agentId)}`
  );
}

export type ListAdminTicketsParams = {
  user_email?: string | null;
  agent_id?: string | null;
  status?: string | null;
  priority?: string | null;
  sort_by?: "updated_at" | "created_at" | "priority" | "status";
  sort_dir?: "asc" | "desc";
  page?: number;
  page_size?: number;
};

export async function listAdminTickets(
  params: ListAdminTicketsParams = {}
): Promise<AdminTicketListResponse> {
  const q = buildQuery({
    user_email: params.user_email ?? undefined,
    agent_id: params.agent_id ?? undefined,
    status: params.status ?? undefined,
    priority: params.priority ?? undefined,
    sort_by: params.sort_by,
    sort_dir: params.sort_dir,
    page: params.page,
    page_size: params.page_size,
  });
  return adminFetch<AdminTicketListResponse>(`/api/v1/admin/tickets${q}`);
}

export async function getAdminTicket(ticketId: string): Promise<AdminTicketDetail> {
  return adminFetch<AdminTicketDetail>(
    `/api/v1/admin/tickets/${encodeURIComponent(ticketId)}`
  );
}

export type ListAdminKnowledgeSourcesParams = {
  user_email?: string | null;
  agent_id?: string | null;
  type?: string | null;
  status?: string | null;
  page?: number;
  page_size?: number;
};

export async function listAdminKnowledgeSources(
  params: ListAdminKnowledgeSourcesParams = {}
): Promise<AdminKnowledgeSourceListResponse> {
  const q = buildQuery({
    user_email: params.user_email ?? undefined,
    agent_id: params.agent_id ?? undefined,
    type: params.type ?? undefined,
    status: params.status ?? undefined,
    page: params.page,
    page_size: params.page_size,
  });
  return adminFetch<AdminKnowledgeSourceListResponse>(
    `/api/v1/admin/knowledge/sources${q}`
  );
}

export async function getAdminKnowledgeSource(
  sourceId: string
): Promise<AdminKnowledgeSourceDetail> {
  return adminFetch<AdminKnowledgeSourceDetail>(
    `/api/v1/admin/knowledge/sources/${encodeURIComponent(sourceId)}`
  );
}

export type ListAdminIndexingJobsParams = {
  status?: string[] | null;
  user_email?: string | null;
  agent_id?: string | null;
  started_after?: string | null;
  started_before?: string | null;
  sort_by?: "created_at" | "started_at" | "finished_at" | "status";
  sort_dir?: "asc" | "desc";
  page?: number;
  page_size?: number;
};

export async function listAdminIndexingJobs(
  params: ListAdminIndexingJobsParams = {}
): Promise<AdminIndexingJobListResponse> {
  // FastAPI accepts repeated `?status=` for list params; manually append since `buildQuery`
  // assumes scalar values.
  const scalar = buildQuery({
    user_email: params.user_email ?? undefined,
    agent_id: params.agent_id ?? undefined,
    started_after: params.started_after ?? undefined,
    started_before: params.started_before ?? undefined,
    sort_by: params.sort_by,
    sort_dir: params.sort_dir,
    page: params.page,
    page_size: params.page_size,
  });
  const statusParts =
    params.status && params.status.length > 0
      ? params.status.map((s) => `status=${encodeURIComponent(s)}`)
      : [];
  let qs = scalar;
  if (statusParts.length > 0) {
    qs = qs ? `${qs}&${statusParts.join("&")}` : `?${statusParts.join("&")}`;
  }
  return adminFetch<AdminIndexingJobListResponse>(`/api/v1/admin/indexing/jobs${qs}`);
}

export type ListAdminSubscriptionsParams = {
  user_email?: string | null;
  plan_slug?: string | null;
  status?: string | null;
  page?: number;
  page_size?: number;
};

export async function listAdminSubscriptions(
  params: ListAdminSubscriptionsParams = {}
): Promise<AdminSubscriptionListResponse> {
  const q = buildQuery({
    user_email: params.user_email ?? undefined,
    plan_slug: params.plan_slug ?? undefined,
    status: params.status ?? undefined,
    page: params.page,
    page_size: params.page_size,
  });
  return adminFetch<AdminSubscriptionListResponse>(
    `/api/v1/admin/billing/subscriptions${q}`
  );
}

export type ListAdminUsageSnapshotsParams = {
  user_email?: string | null;
  throttle_tier?: string | null;
  period_start_after?: string | null;
  page?: number;
  page_size?: number;
};

export async function listAdminUsageSnapshots(
  params: ListAdminUsageSnapshotsParams = {}
): Promise<AdminUsageSnapshotListResponse> {
  const q = buildQuery({
    user_email: params.user_email ?? undefined,
    throttle_tier: params.throttle_tier ?? undefined,
    period_start_after: params.period_start_after ?? undefined,
    page: params.page,
    page_size: params.page_size,
  });
  return adminFetch<AdminUsageSnapshotListResponse>(
    `/api/v1/admin/billing/usage-snapshots${q}`
  );
}

export type ListAdminStripeEventsParams = {
  event_type?: string | null;
  processed_after?: string | null;
  page?: number;
  page_size?: number;
};

function normalizeAdminDatetimeFilter(value: string | null | undefined): string | undefined {
  const raw = (value ?? "").trim();
  if (!raw) return undefined;
  const isoLike = raw.includes("T") ? raw : `${raw}T00:00:00`;
  const parsed =
    isoLike.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(isoLike)
      ? new Date(isoLike)
      : new Date(`${isoLike}Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export async function listAdminStripeEvents(
  params: ListAdminStripeEventsParams = {}
): Promise<AdminStripeEventListResponse> {
  const q = buildQuery({
    event_type: params.event_type ?? undefined,
    processed_after: normalizeAdminDatetimeFilter(params.processed_after ?? undefined),
    page: params.page,
    page_size: params.page_size,
  });
  return adminFetch<AdminStripeEventListResponse>(
    `/api/v1/admin/billing/stripe-events${q}`
  );
}

export async function listAdminPlans(): Promise<AdminPlanListResponse> {
  return adminFetch<AdminPlanListResponse>("/api/v1/admin/plans");
}

export async function getAdminSystemHealth(): Promise<AdminSystemHealth> {
  return adminFetch<AdminSystemHealth>("/api/v1/admin/system/health");
}
