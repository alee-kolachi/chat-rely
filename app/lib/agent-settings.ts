/**
 * Shared types and merge helper for the Agent Settings tabs.
 *
 * The backend stores appearance / tone / behavior / rate-limit knobs inside
 * `agents.behavior_settings` (a JSONB column). `PATCH /api/v1/agents/{id}`
 * replaces that column wholesale, so every settings tab MUST merge new keys
 * with the agent's existing `behavior_settings` before sending — otherwise
 * saving on one tab would silently wipe values configured on another.
 */

export type AgentTone = "Friendly" | "Professional" | "Concise";

export type WidgetPosition = "bottom_right" | "bottom_left";

export type AgentRateLimit = {
  max_messages?: number;
  window_seconds?: number;
  limit_message?: string;
};

export type AgentBehaviorSettings = {
  tone?: AgentTone | string;
  tone_description?: string;
  brand_color?: string;
  widget_position?: WidgetPosition;
  greeting_message?: string;
  language?: string;
  rate_limit?: AgentRateLimit;
  creativity?: number;
  agent_type?: string;
} & Record<string, unknown>;

export const TONE_OPTIONS: readonly AgentTone[] = ["Friendly", "Professional", "Concise"] as const;

export const BRAND_COLOR_SWATCHES: readonly string[] = [
  "#000000",
  "#FB923C",
  "#F472B6",
  "#3B82F6",
  "#10B981",
  "#6366F1",
] as const;

export const LANGUAGE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
];

/**
 * Shallow merge `partial` into a copy of `prev`. Intended for the
 * top level of `behavior_settings` only; nested objects (like `rate_limit`)
 * should be merged by callers when they want field-level partial updates.
 */
export function mergeBehaviorSettings(
  prev: Record<string, unknown> | null | undefined,
  partial: AgentBehaviorSettings
): Record<string, unknown> {
  const base = (prev && typeof prev === "object" ? prev : {}) as Record<string, unknown>;
  return { ...base, ...partial };
}

/**
 * Read a string field from an agent's behavior_settings, returning `""` for
 * missing/non-string values.
 */
export function readBehaviorString(
  behavior: Record<string, unknown> | null | undefined,
  key: string
): string {
  const v = behavior?.[key];
  return typeof v === "string" ? v : "";
}

/** Read a nested rate_limit object with safe defaults. */
export function readRateLimit(
  behavior: Record<string, unknown> | null | undefined
): { max_messages: number; window_seconds: number; limit_message: string } {
  const raw = behavior?.["rate_limit"];
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const max = Number(obj.max_messages);
  const win = Number(obj.window_seconds);
  const msg = typeof obj.limit_message === "string" ? obj.limit_message : "";
  return {
    max_messages: Number.isFinite(max) && max > 0 ? max : 20,
    window_seconds: Number.isFinite(win) && win > 0 ? win : 60,
    limit_message: msg || "Too many messages. Please try again in a bit.",
  };
}

/** Normalise hex input into a 6-char uppercase string (no `#`). Empty if invalid. */
export function normaliseHex(input: string): string {
  return (input || "").replace(/[^0-9A-Fa-f]/g, "").toUpperCase().slice(0, 6);
}

/** Format a hex string (with or without `#`) as `#RRGGBB`, or `null` if invalid. */
export function formatHex(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = normaliseHex(String(input).startsWith("#") ? String(input).slice(1) : String(input));
  return cleaned.length === 6 ? `#${cleaned}` : null;
}

export type AgentReliabilityRecord = {
  agent_id: string;
  user_id: string;
  min_retrieval_similarity: number;
  inactivity_timeout_minutes: number;
  max_unresolved_turns_before_escalation: number;
  fallback_message: string;
};
