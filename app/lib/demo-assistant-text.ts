/** Clean demo assistant replies before markdown render (strip broken images, link dumps). */

export function sanitizeDemoAssistantMarkdown(source: string): string {
  let text = source.trim();
  if (!text) return "";

  text = text.replace(/!\[[^\]]*]\([^)]*\)/g, "");
  text = text.replace(/!\[[^\]\n]*/g, "");
  text = text.replace(/^\s*\[([^\]]+)\]\([^)]+\)\s*$/gm, "- $1");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}
