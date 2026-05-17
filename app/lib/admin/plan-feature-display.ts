/** Parse plan `features` JSON for admin tables (aligned with merchant plan-entitlements). */

export function featureInt(features: Record<string, unknown>, key: string): number {
  const v = features[key];
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.trunc(v));
  return 0;
}

export function featureString(features: Record<string, unknown>, key: string): string | null {
  const v = features[key];
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

export function formatSmartResolution(used: number, included: number): string {
  if (included <= 0) return "—";
  return `${used.toLocaleString()} / ${included.toLocaleString()}`;
}

/** Training cap label from features (min of MB / KB caps, matching entitlements logic). */
export function formatTrainingStorageFromFeatures(features: Record<string, unknown>): string {
  const caps: number[] = [];
  const totalMb = features.max_total_knowledge_mb;
  if (typeof totalMb === "number" && totalMb > 0) caps.push(totalMb * 1024 * 1024);
  const kb = features.max_knowledge_storage_kb;
  if (typeof kb === "number" && kb > 0) caps.push(kb * 1024);
  if (caps.length === 0) return "—";
  const bytes = Math.min(...caps);
  if (bytes < 1024) return `${bytes} B`;
  const kbVal = bytes / 1024;
  if (kbVal < 1024) return `${kbVal < 10 ? kbVal.toFixed(1) : Math.round(kbVal)} KB`;
  const mb = kbVal / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function formatDisplayOverage(features: Record<string, unknown>): string {
  const raw = featureString(features, "pricing_display_overage_per_conversation_usd");
  if (!raw) return "—";
  const n = Number(raw);
  if (Number.isFinite(n)) return `$${n.toFixed(3)}`;
  return raw.startsWith("$") ? raw : `$${raw}`;
}
