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

/** Discrete creativity levels stored in `behavior_settings.creativity` (maps to LLM temperature). */
export type CreativityLevel = 0 | 0.5 | 1;

export const CREATIVITY_BANDS: ReadonlyArray<{ value: CreativityLevel; label: string }> = [
  { value: 0, label: "Conservative" },
  { value: 0.5, label: "Balanced" },
  { value: 1, label: "Creative" },
] as const;

export function normalizeCreativity(raw: unknown): CreativityLevel {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseFloat(raw)
        : Number.NaN;
  if (n === 0 || n === 0.5 || n === 1) return n;
  if (!Number.isFinite(n)) return 0.5;
  const snapped = Math.round(n * 2) / 2;
  if (snapped <= 0) return 0;
  if (snapped >= 1) return 1;
  return 0.5;
}

export function creativityBandLabel(value: number): string {
  const match = CREATIVITY_BANDS.find((b) => b.value === normalizeCreativity(value));
  return match?.label ?? "Balanced";
}

/** Stored in `behavior_settings.agent_type`. Controls reply voice only, not tools or knowledge. */
export const AGENT_REPLY_STYLE_OPTIONS = [
  { value: "brand_support", label: "Default (recommended)" },
  { value: "general", label: "Neutral" },
  { value: "customer_support", label: "Calm resolver" },
  { value: "custom", label: "Write your own" },
] as const;

export type AgentReplyStyle = (typeof AGENT_REPLY_STYLE_OPTIONS)[number]["value"];

export const DEFAULT_AGENT_REPLY_STYLE: AgentReplyStyle = "brand_support";

export const AGENT_REPLY_STYLE_HINT =
  "Default: on-brand, warm shop replies. Neutral: balanced, less brand framing. Calm resolver: de-escalation, one question per turn, clear next steps. Write your own: your text replaces the preset voice block (grounding rules still apply). Every option uses the same tools, knowledge, and Shopify actions.";

export function normalizeAgentReplyStyle(raw: unknown): AgentReplyStyle {
  const key = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (AGENT_REPLY_STYLE_OPTIONS.some((t) => t.value === key)) {
    return key as AgentReplyStyle;
  }
  return DEFAULT_AGENT_REPLY_STYLE;
}

/** `agents.system_prompt` applies only when reply style is Write your own. */
export function agentSystemPromptForReplyStyle(
  agentType: string,
  systemPrompt: string
): string {
  return normalizeAgentReplyStyle(agentType) === "custom" ? systemPrompt.trim() : "";
}

export function agentSystemPromptFromAgent(
  agentType: unknown,
  storedSystemPrompt: string | null | undefined
): string {
  return agentSystemPromptForReplyStyle(
    normalizeAgentReplyStyle(agentType),
    storedSystemPrompt ?? ""
  );
}

export type AgentBehaviorSettings = {
  tone?: AgentTone | string;
  /** Merchant brand voice and sales playbook; injected into the agent system prompt at runtime. */
  tone_description?: string;
  brand_color?: string;
  widget_position?: WidgetPosition;
  greeting_message?: string;
  greeting_messages?: string[];
  welcome_screen_enabled?: boolean;
  welcome_screen_headline?: string;
  welcome_screen_headline_color?: string;
  welcome_screen_description?: string;
  welcome_screen_button_label?: string;
  language?: string;
  rate_limit?: AgentRateLimit;
  creativity?: CreativityLevel | number;
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

const WELCOME_MESSAGE_MAX = 500;

/** Default welcome bubbles when the merchant leaves welcome message blank. */
export function defaultWelcomeMessages(agentName: string | null | undefined): string[] {
  const name = (agentName ?? "").trim() || "Support";
  return [
    `Hey there! I'm ${name}, your support assistant. Let's find the best match for you.`,
    "Can I get your name and what you're looking for today?",
  ];
}

/** Joined default copy for textarea placeholders. */
export function defaultWelcomeMessage(agentName: string | null | undefined): string {
  return defaultWelcomeMessages(agentName).join("\n\n");
}

function readStoredGreetingMessages(
  behavior: Record<string, unknown> | null | undefined
): string[] | null {
  const raw = behavior?.greeting_messages;
  if (Array.isArray(raw)) {
    const msgs = raw
      .filter((line): line is string => typeof line === "string")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2);
    if (msgs.length) return msgs;
  }
  const legacy = readBehaviorString(behavior, "greeting_message").trim();
  if (legacy) return [legacy];
  return null;
}

/** Two welcome lines for settings forms (always returns a pair). */
export function welcomeMessagesForForm(
  behavior: Record<string, unknown> | null | undefined,
  agentName: string | null | undefined
): [string, string] {
  const defaults = defaultWelcomeMessages(agentName);
  const stored = readStoredGreetingMessages(behavior);
  if (!stored) return [defaults[0], defaults[1]];
  if (stored.length >= 2) return [stored[0], stored[1]];
  return [stored[0], defaults[1]];
}

/** Stored custom welcome or agent-name default (what customers see). */
export function effectiveWelcomeMessages(
  behavior: Record<string, unknown> | null | undefined,
  agentName: string | null | undefined
): string[] {
  const defaults = defaultWelcomeMessages(agentName);
  const stored = readStoredGreetingMessages(behavior);
  if (!stored) return defaults;
  if (stored.length >= 2) {
    return stored.map((line) => line.slice(0, WELCOME_MESSAGE_MAX));
  }
  return [stored[0].slice(0, WELCOME_MESSAGE_MAX)];
}

export function greetingMessagesMatchDefault(
  messages: readonly string[],
  agentName: string | null | undefined
): boolean {
  const defaults = defaultWelcomeMessages(agentName);
  return (
    (messages[0]?.trim() || defaults[0]) === defaults[0] &&
    (messages[1]?.trim() || defaults[1]) === defaults[1]
  );
}

/** First welcome bubble (legacy single-bubble callers). */
export function effectiveWelcomeMessage(
  behavior: Record<string, unknown> | null | undefined,
  agentName: string | null | undefined
): string {
  return effectiveWelcomeMessages(behavior, agentName)[0] ?? "";
}

export { WELCOME_MESSAGE_MAX };

export const WELCOME_SCREEN_HEADLINE_MAX = 120;
export const WELCOME_SCREEN_DESCRIPTION_MAX = 200;
export const WELCOME_SCREEN_BUTTON_LABEL_MAX = 40;

export const DEFAULT_WELCOME_SCREEN_HEADLINE = "How can we help?";
export const DEFAULT_WELCOME_SCREEN_HEADLINE_COLOR = "#FFFFFF";
export const DEFAULT_WELCOME_SCREEN_DESCRIPTION =
  "Ask about orders, products, or store policies.";
export const DEFAULT_WELCOME_SCREEN_BUTTON_LABEL = "Chat with us";

export const WELCOME_SCREEN_SOCIAL_LABEL_MAX = 80;
export const WELCOME_SCREEN_SOCIAL_URL_MAX = 500;

export type WelcomeScreenSocialLink = {
  label: string;
  url: string;
};

export const DEFAULT_WELCOME_SCREEN_SOCIAL_LINKS: [WelcomeScreenSocialLink, WelcomeScreenSocialLink] = [
  { label: "Follow us on Instagram", url: "https://www.instagram.com/" },
  { label: "Follow us on TikTok", url: "https://www.tiktok.com/" },
];

export type WelcomeScreenSettings = {
  enabled: boolean;
  headline: string;
  headlineColor: string;
  description: string;
  buttonLabel: string;
  socialLinks: [WelcomeScreenSocialLink, WelcomeScreenSocialLink];
};

export function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function readWelcomeScreenEnabled(
  behavior: Record<string, unknown> | null | undefined
): boolean {
  const raw = behavior?.welcome_screen_enabled;
  return typeof raw === "boolean" ? raw : true;
}

function readWelcomeScreenSocialLinks(
  behavior: Record<string, unknown> | null | undefined
): [WelcomeScreenSocialLink, WelcomeScreenSocialLink] {
  const raw = behavior?.welcome_screen_social_links;
  const defaults = DEFAULT_WELCOME_SCREEN_SOCIAL_LINKS;
  if (!Array.isArray(raw)) return defaults;
  const normalize = (item: unknown, fallback: WelcomeScreenSocialLink): WelcomeScreenSocialLink => {
    if (!item || typeof item !== "object") return fallback;
    const row = item as Record<string, unknown>;
    const label = typeof row.label === "string" && row.label.trim() ? row.label.trim() : fallback.label;
    const url = typeof row.url === "string" ? row.url.trim() : "";
    return {
      label: label.slice(0, WELCOME_SCREEN_SOCIAL_LABEL_MAX),
      url: normalizeExternalUrl(url).slice(0, WELCOME_SCREEN_SOCIAL_URL_MAX),
    };
  };
  return [normalize(raw[0], defaults[0]), normalize(raw[1], defaults[1])];
}

export function socialLinksMatchDefault(
  links: readonly [WelcomeScreenSocialLink, WelcomeScreenSocialLink]
): boolean {
  return (
    links[0].label === DEFAULT_WELCOME_SCREEN_SOCIAL_LINKS[0].label &&
    links[0].url === DEFAULT_WELCOME_SCREEN_SOCIAL_LINKS[0].url &&
    links[1].label === DEFAULT_WELCOME_SCREEN_SOCIAL_LINKS[1].label &&
    links[1].url === DEFAULT_WELCOME_SCREEN_SOCIAL_LINKS[1].url
  );
}

export function resolveWelcomeScreenSettings(
  behavior: Record<string, unknown> | null | undefined
): WelcomeScreenSettings {
  const headline = readBehaviorString(behavior, "welcome_screen_headline").trim();
  const headlineColorRaw = readBehaviorString(behavior, "welcome_screen_headline_color").trim();
  const description = readBehaviorString(behavior, "welcome_screen_description").trim();
  const buttonLabel = readBehaviorString(behavior, "welcome_screen_button_label").trim();
  return {
    enabled: readWelcomeScreenEnabled(behavior),
    headline: headline || DEFAULT_WELCOME_SCREEN_HEADLINE,
    headlineColor: formatHex(headlineColorRaw) ?? DEFAULT_WELCOME_SCREEN_HEADLINE_COLOR,
    description: description || DEFAULT_WELCOME_SCREEN_DESCRIPTION,
    buttonLabel: buttonLabel || DEFAULT_WELCOME_SCREEN_BUTTON_LABEL,
    socialLinks: readWelcomeScreenSocialLinks(behavior),
  };
}

export function welcomeScreenSettingsForForm(
  behavior: Record<string, unknown> | null | undefined
): WelcomeScreenSettings {
  return resolveWelcomeScreenSettings(behavior);
}

export function welcomeScreenMatchesDefault(settings: WelcomeScreenSettings): boolean {
  return (
    settings.enabled &&
    settings.headline === DEFAULT_WELCOME_SCREEN_HEADLINE &&
    settings.description === DEFAULT_WELCOME_SCREEN_DESCRIPTION &&
    settings.buttonLabel === DEFAULT_WELCOME_SCREEN_BUTTON_LABEL
  );
}

function normalizeSocialLink(
  link: WelcomeScreenSocialLink,
  fallback: WelcomeScreenSocialLink
): WelcomeScreenSocialLink {
  return {
    label: (link.label.trim() || fallback.label).slice(0, WELCOME_SCREEN_SOCIAL_LABEL_MAX),
    url: normalizeExternalUrl(link.url).slice(0, WELCOME_SCREEN_SOCIAL_URL_MAX),
  };
}

export function normalizeWelcomeScreenSettings(settings: WelcomeScreenSettings): WelcomeScreenSettings {
  return {
    enabled: settings.enabled,
    headline: (settings.headline.trim() || DEFAULT_WELCOME_SCREEN_HEADLINE).slice(
      0,
      WELCOME_SCREEN_HEADLINE_MAX
    ),
    headlineColor: formatHex(settings.headlineColor) ?? DEFAULT_WELCOME_SCREEN_HEADLINE_COLOR,
    description: (settings.description.trim() || DEFAULT_WELCOME_SCREEN_DESCRIPTION).slice(
      0,
      WELCOME_SCREEN_DESCRIPTION_MAX
    ),
    buttonLabel: (settings.buttonLabel.trim() || DEFAULT_WELCOME_SCREEN_BUTTON_LABEL).slice(
      0,
      WELCOME_SCREEN_BUTTON_LABEL_MAX
    ),
    socialLinks: [
      normalizeSocialLink(settings.socialLinks[0], DEFAULT_WELCOME_SCREEN_SOCIAL_LINKS[0]),
      normalizeSocialLink(settings.socialLinks[1], DEFAULT_WELCOME_SCREEN_SOCIAL_LINKS[1]),
    ],
  };
}

/** Apply welcome screen fields onto a behavior_settings object (clears default values). */
export function applyWelcomeScreenToBehaviorRecord(
  record: Record<string, unknown>,
  settings: WelcomeScreenSettings
): void {
  const normalized = normalizeWelcomeScreenSettings(settings);
  record.welcome_screen_enabled = normalized.enabled;
  if (normalized.headline !== DEFAULT_WELCOME_SCREEN_HEADLINE) {
    record.welcome_screen_headline = normalized.headline;
  } else {
    delete record.welcome_screen_headline;
  }
  if (normalized.headlineColor !== DEFAULT_WELCOME_SCREEN_HEADLINE_COLOR) {
    record.welcome_screen_headline_color = normalized.headlineColor;
  } else {
    delete record.welcome_screen_headline_color;
  }
  if (normalized.description !== DEFAULT_WELCOME_SCREEN_DESCRIPTION) {
    record.welcome_screen_description = normalized.description;
  } else {
    delete record.welcome_screen_description;
  }
  if (normalized.buttonLabel !== DEFAULT_WELCOME_SCREEN_BUTTON_LABEL) {
    record.welcome_screen_button_label = normalized.buttonLabel;
  } else {
    delete record.welcome_screen_button_label;
  }
  if (normalized.enabled) {
    delete record.welcome_screen_enabled;
  }
  if (socialLinksMatchDefault(normalized.socialLinks)) {
    delete record.welcome_screen_social_links;
  } else {
    record.welcome_screen_social_links = normalized.socialLinks.map((link) => ({
      label: link.label,
      url: link.url,
    }));
  }
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
