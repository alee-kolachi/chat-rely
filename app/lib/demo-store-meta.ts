import type { ProductCard } from "@/lib/product-card";
import { sanitizeDemoLogoUrl } from "@/lib/demo-store-logo";
import type { WelcomeScreenSocialLink } from "@/lib/agent-settings";

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
  welcomeScreen: DemoWelcomeScreen;
};

export type DemoWelcomeScreen = {
  enabled: boolean;
  headline: string;
  headlineColor: string;
  description: string;
  buttonLabel: string;
  socialLinks: [WelcomeScreenSocialLink, WelcomeScreenSocialLink];
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
  welcome_screen_enabled?: boolean;
  welcome_screen_headline?: string;
  welcome_screen_headline_color?: string | null;
  welcome_screen_description?: string;
  welcome_screen_button_label?: string;
  welcome_screen_social_links?: Array<{ label: string; url: string }>;
};

export type DemoCatalogLoadResponse = {
  product_count: number;
  top_products: ProductCard[];
  suggested_prompts: string[];
  catalog_ready: boolean;
};

function demoWelcomeSocialLinks(
  links: Array<{ label: string; url: string }> | undefined,
): [WelcomeScreenSocialLink, WelcomeScreenSocialLink] {
  const empty: WelcomeScreenSocialLink = { label: "", url: "" };
  const first = links?.[0];
  const second = links?.[1];
  return [
    first?.url?.trim()
      ? { label: first.label.trim() || "Visit our website", url: first.url.trim() }
      : empty,
    second?.url?.trim()
      ? { label: second.label.trim() || "Follow us on Instagram", url: second.url.trim() }
      : empty,
  ];
}

function demoWelcomeScreenFromConfig(config: DemoPublicConfigResponse): DemoWelcomeScreen {
  return {
    enabled: config.welcome_screen_enabled !== false,
    headline: config.welcome_screen_headline?.trim() || "How can we help?",
    headlineColor: config.welcome_screen_headline_color?.trim() || "#FFFFFF",
    description:
      config.welcome_screen_description?.trim() ||
      "Ask about orders, products, or store policies.",
    buttonLabel: config.welcome_screen_button_label?.trim() || "Chat with us",
    socialLinks: demoWelcomeSocialLinks(config.welcome_screen_social_links),
  };
}

export function mergeCatalogIntoStoreMeta(
  store: DemoStoreMeta,
  catalog: DemoCatalogLoadResponse,
): DemoStoreMeta {
  return {
    ...store,
    productCount: catalog.product_count,
    topProducts: catalog.top_products ?? [],
    suggestedPrompts: catalog.suggested_prompts ?? store.suggestedPrompts,
  };
}

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
    welcomeScreen: demoWelcomeScreenFromConfig(config),
  };
}
