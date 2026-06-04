/** Drop raw product list dumps; keep natural one-line intros from the model. */
export function stripProductListDump(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const first = lines[0] ?? trimmed;

  const looksLikeProductList =
    lines.length > 1 ||
    first.includes(" - Price:") ||
    first.includes("Price:") ||
    /^\*\*/.test(first) ||
    /^-\s/.test(first) ||
    /\$\d/.test(first);

  if (looksLikeProductList || first.length > 100) {
    return "";
  }

  return first;
}

/** @deprecated Use stripProductListDump */
export function introTextForProductCards(text: string): string {
  return stripProductListDump(text);
}
