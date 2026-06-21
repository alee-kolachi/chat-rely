"use client";

import type { FormEvent, RefObject } from "react";
import { DemoWidgetColumn } from "@/components/demo/demo-widget-column";
import { PitchPanel } from "@/components/demo/pitch-panel";
import { SplitLayout } from "@/components/demo/split-layout";
import type { DemoChatMessage } from "@/lib/demo-chat-message";
import type { DemoStoreMeta } from "@/lib/demo-store-meta";
import type { ProductCard } from "@/lib/product-card";

export function DemoStoreView({
  store,
  messages,
  isSending,
  input,
  onInputChange,
  onSend,
  onPromptSelect,
  sendDisabled,
  composerDisabled,
  composerPlaceholder,
  composerError,
  messageInputRef,
  messagesScrollRef,
  onProductSelect,
  previewMode = false,
}: {
  store: DemoStoreMeta;
  messages: DemoChatMessage[];
  isSending: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: (event: FormEvent) => void;
  onPromptSelect: (prompt: string) => void;
  sendDisabled: boolean;
  composerDisabled?: boolean;
  composerPlaceholder: string;
  composerError?: string | null;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  messagesScrollRef: RefObject<HTMLDivElement | null>;
  onProductSelect?: (product: ProductCard) => void;
  previewMode?: boolean;
}) {
  return (
    <SplitLayout
      pitch={<PitchPanel store={store} previewMode={previewMode} />}
      widget={
        <DemoWidgetColumn
          store={store}
          messages={messages}
          isSending={isSending}
          input={input}
          onInputChange={onInputChange}
          onSend={onSend}
          onPromptSelect={onPromptSelect}
          sendDisabled={sendDisabled}
          composerDisabled={composerDisabled}
          composerPlaceholder={composerPlaceholder}
          composerError={composerError}
          messageInputRef={messageInputRef}
          messagesScrollRef={messagesScrollRef}
          onProductSelect={onProductSelect}
        />
      }
    />
  );
}
