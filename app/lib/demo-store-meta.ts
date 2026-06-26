import type { ProductCard } from "@/lib/product-card";
import { sanitizeDemoLogoUrl } from "@/lib/demo-store-logo";

/** Store personalization payload for demo outreach pages. */
export type DemoStoreMeta = {
  displayName: string;
  logoUrl: string | null;
  storeUrl: string;
  productCount: number;
  brandColorHex: string | null;
  topProducts: ProductCard[];
  suggestedPrompts: string[];
  installUrl: string;
  limitationLine: string;
};

export type DemoPublicConfigResponse = {
  slug: string;
  status: string;
  display_name: string;
  logo_url: string | null;
  store_url: string;
  product_count: number;
  suggested_prompts: string[];
  top_products: ProductCard[];
  brand_color: string | null;
  install_url: string;
  demo_limitation_line: string;
  chat_available: boolean;
  limit_message: string | null;
};

export function demoConfigToStoreMeta(config: DemoPublicConfigResponse): DemoStoreMeta {
  return {
    displayName: config.display_name,
    logoUrl: sanitizeDemoLogoUrl(config.logo_url),
    storeUrl: config.store_url,
    productCount: config.product_count,
    brandColorHex: config.brand_color,
    topProducts: config.top_products ?? [],
    suggestedPrompts: config.suggested_prompts ?? [],
    installUrl: config.install_url,
    limitationLine: config.demo_limitation_line,
  };
}
