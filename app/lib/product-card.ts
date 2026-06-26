export type ProductCard = {
  handle: string;
  title: string;
  url: string;
  image_url?: string | null;
  price?: string | null;
};

export type ProductOption = {
  name: string;
  values: string[];
};

export type ProductVariant = {
  title: string;
  price?: string | null;
  sku?: string | null;
};

export type ProductDetail = ProductCard & {
  image_urls: string[];
  description?: string | null;
  description_points?: string[];
  vendor?: string | null;
  product_type?: string | null;
  sku?: string | null;
  options?: ProductOption[];
  variants?: ProductVariant[];
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
  const options: ProductOption[] = [];
  if (Array.isArray(row.options)) {
    for (const item of row.options) {
      if (!item || typeof item !== "object") continue;
      const opt = item as Record<string, unknown>;
      const name = typeof opt.name === "string" ? opt.name.trim() : "";
      if (!name || !Array.isArray(opt.values)) continue;
      const values = opt.values
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean);
      if (values.length > 0) options.push({ name, values });
    }
  }
  const variants: ProductVariant[] = [];
  if (Array.isArray(row.variants)) {
    for (const item of row.variants) {
      if (!item || typeof item !== "object") continue;
      const variant = item as Record<string, unknown>;
      const variantTitle = typeof variant.title === "string" ? variant.title.trim() : "";
      if (!variantTitle) continue;
      variants.push({
        title: variantTitle,
        price: typeof variant.price === "string" ? variant.price : null,
        sku: typeof variant.sku === "string" ? variant.sku : null,
      });
    }
  }
  const descriptionPoints: string[] = [];
  if (Array.isArray(row.description_points)) {
    for (const item of row.description_points) {
      if (typeof item === "string" && item.trim()) descriptionPoints.push(item.trim());
    }
  }
  return {
    handle,
    title,
    url,
    image_url: typeof row.image_url === "string" ? row.image_url : imageUrls[0] ?? null,
    price: typeof row.price === "string" ? row.price : null,
    image_urls: imageUrls,
    description: typeof row.description === "string" ? row.description : null,
    description_points: descriptionPoints.length > 0 ? descriptionPoints : undefined,
    vendor: typeof row.vendor === "string" ? row.vendor : null,
    product_type: typeof row.product_type === "string" ? row.product_type : null,
    sku: typeof row.sku === "string" ? row.sku : null,
    options: options.length > 0 ? options : undefined,
    variants: variants.length > 0 ? variants : undefined,
  };
}

export function productActionUserMessage(action: ProductActionRequest): string {
  const label = (action.title || action.handle).trim();
  return action.type === "details" ? `Show details for ${label}` : `Show similar to ${label}`;
}
