import { createBrowserSupabaseClient } from "@/lib/supabase";

export const AGENT_WIDGET_LOGO_KEY = "widget_logo_url";

const AGENT_LOGOS_BUCKET = "agent-logos";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const ALLOWED_LOGO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function readAgentWidgetLogoUrl(
  behavior: Record<string, unknown> | null | undefined
): string | null {
  const raw = behavior?.[AGENT_WIDGET_LOGO_KEY];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

/** Custom upload wins; otherwise fall back to the indexed website favicon. */
export function resolveAgentLogoUrl(
  customLogoUrl: string | null | undefined,
  websiteFaviconUrl: string | null | undefined
): string | null {
  const custom = customLogoUrl?.trim();
  if (custom) return custom;
  const favicon = websiteFaviconUrl?.trim();
  return favicon || null;
}

function extensionForLogoFile(file: File): string {
  const type = file.type.toLowerCase();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "png";
}

export function agentLogoStoragePath(userId: string, agentId: string, file: File): string {
  return `${userId}/${agentId}/logo.${extensionForLogoFile(file)}`;
}

export function validateAgentLogoFile(file: File): string | null {
  if (!ALLOWED_LOGO_TYPES.has(file.type.toLowerCase())) {
    return "Use a JPG, PNG, WebP, or GIF image.";
  }
  if (file.size <= 0) return "Choose an image file.";
  if (file.size > MAX_LOGO_BYTES) return "Logo must be 2 MB or smaller.";
  return null;
}

export async function uploadAgentWidgetLogo(params: {
  userId: string;
  agentId: string;
  file: File;
}): Promise<string> {
  const validationError = validateAgentLogoFile(params.file);
  if (validationError) throw new Error(validationError);

  const supabase = createBrowserSupabaseClient();
  const path = agentLogoStoragePath(params.userId, params.agentId, params.file);
  const { error } = await supabase.storage.from(AGENT_LOGOS_BUCKET).upload(path, params.file, {
    upsert: true,
    contentType: params.file.type,
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message || "Logo upload failed");

  const { data } = supabase.storage.from(AGENT_LOGOS_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl?.trim();
  if (!publicUrl) throw new Error("Could not resolve logo URL after upload.");
  return publicUrl;
}

export async function deleteAgentWidgetLogoFiles(params: {
  userId: string;
  agentId: string;
}): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const prefix = `${params.userId}/${params.agentId}`;
  const { data, error: listError } = await supabase.storage.from(AGENT_LOGOS_BUCKET).list(prefix);
  if (listError) throw new Error(listError.message || "Could not list stored logos.");
  const names = (data ?? []).map((row) => row.name).filter(Boolean);
  if (names.length === 0) return;
  const paths = names.map((name) => `${prefix}/${name}`);
  const { error: removeError } = await supabase.storage.from(AGENT_LOGOS_BUCKET).remove(paths);
  if (removeError) throw new Error(removeError.message || "Could not remove stored logo.");
}
