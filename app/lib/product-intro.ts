/** Keep assistant copy to one intro line when product cards render in the UI. */
export function introTextForProductCards(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Here are a few options:";

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
    return "Here are a few options:";
  }

  return first;
}
