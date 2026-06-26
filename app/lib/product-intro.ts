/** Drop raw product list dumps; keep natural one-line intros from the model. */

function looksLikeProductListLine(line: string): boolean {
  const s = line.trim();
  if (!s) return false;
  if (s.startsWith("**") || s.startsWith("- ") || s.startsWith("![") || s.startsWith("|")) return true;
  if (s.includes(" - Price:") || s.includes("Price:")) return true;
  if (/^\d[.)]/.test(s)) return true;
  if (s.includes("$") && (s.includes("http://") || s.includes("https://") || s.includes("**"))) {
    if (s.includes("**")) return true;
    if (s.includes("[") && s.includes("](")) return false;
    return true;
  }
  return false;
}

function firstSentenceWithin(text: string, maxLen: number): string {
  for (const sep of [". ", "! ", "? "]) {
    const idx = text.indexOf(sep);
    if (idx > 10 && idx <= maxLen) return text.slice(0, idx + 1);
  }
  if (text.length <= maxLen) return text;
  const shortened = text.slice(0, 200).replace(/\s+\S*$/, "").trim();
  return shortened ? `${shortened}...` : text.slice(0, maxLen);
}

export function stripProductListDump(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return "";

  const introLines: string[] = [];
  for (const line of lines) {
    if (looksLikeProductListLine(line)) break;
    introLines.push(line);
  }

  const intro = introLines.join(" ").trim();
  if (intro && !looksLikeProductListLine(intro)) {
    if (intro.length <= 220) return intro;
    return firstSentenceWithin(intro, 220);
  }

  const first = lines[0] ?? trimmed;
  if (!looksLikeProductListLine(first)) {
    if (first.length <= 120) return first;
    return firstSentenceWithin(first, 120);
  }

  return "";
}

/** @deprecated Use stripProductListDump */
export function introTextForProductCards(text: string): string {
  return stripProductListDump(text);
}
