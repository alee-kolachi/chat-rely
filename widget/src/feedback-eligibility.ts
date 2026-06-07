/** Skip thumbs on tool-wait / placeholder assistant lines (not substantive replies). */

const TOOL_WAIT_EXACT = new Set(
  [
    "Let me search the store for that.",
    "Let me look up your order.",
    "Let me check stock on that for you.",
    "Let me pull up your account info.",
    "One moment while I look that up.",
    "Let me check our policies and site info.",
    "Let me grab the details on that item.",
    "Let me find similar items in the catalog.",
    "Let me connect you with our team.",
    "Searching the catalog…",
    "Looking up your order…",
    "Checking stock levels…",
    "Loading your account details…",
    "Checking store data…",
    "Searching our site and help content…",
  ].map((line) => line.toLowerCase())
);

export function isAssistantFeedbackEligible(
  text: string,
  opts?: { hasProducts?: boolean; hasProductDetail?: boolean }
): boolean {
  if (opts?.hasProducts || opts?.hasProductDetail) return true;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (TOOL_WAIT_EXACT.has(lower)) return false;
  if (lower.includes("share your name and email")) return false;
  if (trimmed.length <= 120) {
    if (lower.startsWith("let me ")) return false;
    if (lower.startsWith("one moment")) return false;
    if (lower.startsWith("searching ")) return false;
    if (lower.startsWith("checking ")) return false;
    if (lower.startsWith("loading ")) return false;
    if (lower.includes("looking for")) return false;
  }
  return true;
}
