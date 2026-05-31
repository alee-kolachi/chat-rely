export type ProductCard = {
  handle: string;
  title: string;
  url: string;
  image_url?: string | null;
  price?: string | null;
};

export type ProductDetail = ProductCard & {
  image_urls: string[];
};

export type ProductActionRequest = {
  type: "details" | "similar";
  handle: string;
  title?: string | null;
};

export function parseProductCards(value: unknown): ProductCard[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cards: ProductCard[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const handle = typeof row.handle === "string" ? row.handle.trim() : "";
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (!handle || !title || !url) continue;
    cards.push({
      handle,
      title,
      url,
      image_url: typeof row.image_url === "string" ? row.image_url : null,
      price: typeof row.price === "string" ? row.price : null,
    });
  }
  return cards.length > 0 ? cards : undefined;
}

export function parseProductDetail(value: unknown): ProductDetail | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as Record<string, unknown>;
  const handle = typeof row.handle === "string" ? row.handle.trim() : "";
  const title = typeof row.title === "string" ? row.title.trim() : "";
  const url = typeof row.url === "string" ? row.url.trim() : "";
  if (!handle || !title || !url) return undefined;
  const imageUrls: string[] = [];
  if (Array.isArray(row.image_urls)) {
    for (const item of row.image_urls) {
      if (typeof item === "string" && item.trim()) imageUrls.push(item.trim());
    }
  }
  return {
    handle,
    title,
    url,
    image_url: typeof row.image_url === "string" ? row.image_url : imageUrls[0] ?? null,
    price: typeof row.price === "string" ? row.price : null,
    image_urls: imageUrls,
  };
}

export function productActionUserMessage(action: ProductActionRequest): string {
  const label = (action.title || action.handle).trim();
  return action.type === "details" ? `Show details for ${label}` : `Show similar to ${label}`;
}
