"use client";

import { useRef } from "react";
import { DemoStoreView } from "@/components/demo/demo-store-view";
import type { DemoChatMessage } from "@/lib/demo-chat-message";
import type { DemoStoreMeta } from "@/lib/demo-store-meta";
import { DEMO_SHOPIFY_INSTALL_URL } from "@/lib/demo-constants";

const MOCK_STORE: DemoStoreMeta = {
  displayName: "Acme Coffee",
  logoUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=128&h=128&fit=crop",
  storeUrl: "https://acme-coffee.example.com",
  productCount: 42,
  brandColorHex: "#6f4e37",
  topProducts: [
    {
      handle: "ethiopian-yirgacheffe",
      title: "Ethiopian Yirgacheffe",
      url: "https://example.com/products/ethiopian-yirgacheffe",
      image_url:
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop",
      price: "$18.00",
    },
    {
      handle: "colombian-single-origin",
      title: "Colombian Single Origin",
      url: "https://example.com/products/colombian-single-origin",
      image_url:
        "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&h=400&fit=crop",
      price: "$16.00",
    },
    {
      handle: "house-espresso-blend",
      title: "House Espresso Blend",
      url: "https://example.com/products/house-espresso-blend",
      image_url:
        "https://images.unsplash.com/photo-1514432324607-09f9f591a087?w=400&h=400&fit=crop",
      price: "$15.00",
    },
    {
      handle: "cold-brew-kit",
      title: "Cold Brew Kit",
      url: "https://example.com/products/cold-brew-kit",
      image_url:
        "https://images.unsplash.com/photo-1511920170033-f8396924c10f?w=400&h=400&fit=crop",
      price: "$28.00",
    },
  ],
  suggestedPrompts: [
    "Hello, how can you help me?",
    "Do you have the Ethiopian Yirgacheffe?",
    "What's your return policy?",
  ],
  installUrl: DEMO_SHOPIFY_INSTALL_URL,
  limitationLine:
    "This demo runs on Acme Coffee's public catalog. Connect your store to unlock live inventory and order tracking.",
};

const MOCK_MESSAGES: DemoChatMessage[] = [
  {
    from: "user",
    text: "Do you have the Ethiopian Yirgacheffe?",
  },
  {
    from: "assistant",
    text: "Yes. Here are a few options from our catalog:",
    streamPhase: "done",
    products: MOCK_STORE.topProducts.slice(0, 2),
  },
  {
    from: "user",
    text: "What's your return policy?",
  },
  {
    from: "assistant",
    text: "Unworn items can be returned within 30 days. Start a return from your order confirmation email or contact us with your order number.",
    streamPhase: "done",
  },
];

export default function DemoPreviewPage() {
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

  return (
    <DemoStoreView
      store={MOCK_STORE}
      messages={MOCK_MESSAGES}
      isSending={false}
      input=""
      onInputChange={() => {}}
      onSend={(event) => event.preventDefault()}
      onPromptSelect={() => {}}
      sendDisabled
      composerDisabled
      composerPlaceholder="Design preview — chat disabled"
      messageInputRef={messageInputRef}
      messagesScrollRef={messagesScrollRef}
      previewMode
    />
  );
}
