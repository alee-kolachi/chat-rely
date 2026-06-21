"use client";

import {
  useLayoutEffect,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { WidgetSendIcon } from "@/components/chat/widget-send-icon";
import { DEMO_ACCENT_HEX } from "@/lib/demo-constants";
import { cn } from "@/lib/utils";

function resizeComposer(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  const lineHeight = 20;
  const maxHeight = lineHeight * 3 + 16;
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  textarea.dataset.lines = textarea.scrollHeight > lineHeight + 20 ? "multi" : "single";
}

export function DemoComposer({
  value,
  onChange,
  onSend,
  disabled,
  sendDisabled,
  placeholder,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: (event: FormEvent) => void;
  disabled?: boolean;
  sendDisabled?: boolean;
  placeholder: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (el) resizeComposer(el);
  }, [inputRef, placeholder, value, disabled]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (sendDisabled || disabled) return;
    e.currentTarget.form?.requestSubmit();
  };

  return (
    <form onSubmit={onSend} className="flex items-end gap-2">
      <div
        className={cn(
          "flex min-h-[44px] flex-1 items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-1.5",
          "transition-[border-color,box-shadow] focus-within:border-indigo-300 focus-within:shadow-[0_0_0_3px_rgba(79,70,229,0.12)]",
          "has-[textarea[data-lines='multi']]:items-end has-[textarea[data-lines='multi']]:rounded-xl has-[textarea[data-lines='multi']]:py-2",
        )}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-9 min-w-0 flex-1 resize-none border-0 bg-transparent py-1.5 text-[14px] leading-5 text-neutral-900 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={sendDisabled || disabled}
          aria-label="Send message"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
          style={{ backgroundColor: DEMO_ACCENT_HEX }}
        >
          <WidgetSendIcon className="size-4" />
        </button>
      </div>
    </form>
  );
}
