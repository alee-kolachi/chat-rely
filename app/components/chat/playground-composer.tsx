"use client";

import { useLayoutEffect, type CSSProperties, type FormEvent, type KeyboardEvent, RefObject } from "react";
import { cn } from "@/lib/utils";
import { brandChromeClasses } from "@/lib/brand-chrome";
import { WidgetSendIcon } from "@/components/chat/widget-send-icon";

export const PLAYGROUND_COMPOSER_MAX_LINES = 3;

type Chrome = ReturnType<typeof brandChromeClasses>;

/** Matches live widget `.cr-composer-field` (12px radius). */
export const widgetComposerFieldClass = cn(
  "flex w-full min-h-11 items-end gap-1 rounded-[12px] border border-ds-outline bg-white px-2 py-1 pl-3 shadow-ds-sm",
  "transition-[border-color,box-shadow] duration-150",
  "focus-within:border-ds-primary focus-within:ring-2 focus-within:ring-ds-primary/20"
);

/** Matches live widget `.cr-send` (10px radius, 36px square). */
export const widgetComposerSendButtonClass = cn(
  "mb-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border-0 transition-opacity",
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
);

const inputClass = cn(
  "min-h-9 min-w-0 flex-1 resize-none border-0 bg-transparent py-2 pr-1",
  "text-sm leading-snug text-ds-on-surface outline-none",
  "placeholder:text-ds-on-surface-variant/70",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

/** Grow/shrink composer input between 1 and 3 lines, then scroll. */
export function resizePlaygroundComposer(textarea: HTMLTextAreaElement) {
  const style = getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(style.lineHeight) || 22;
  const padY = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
  const oneLineHeight = lineHeight + padY;
  const maxHeight = lineHeight * PLAYGROUND_COMPOSER_MAX_LINES + padY;

  textarea.style.height = "0px";
  const contentHeight = textarea.scrollHeight;
  const nextHeight = Math.min(Math.max(contentHeight, oneLineHeight), maxHeight);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
}

export function PlaygroundComposer({
  textareaRef,
  value,
  onChange,
  onSend,
  sendDisabled,
  disabled = false,
  placeholder,
  brandColorHex,
  hasBrand,
  chrome,
  shellStyle,
  submitType = "button",
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  onSend: (event: FormEvent) => void;
  sendDisabled: boolean;
  disabled?: boolean;
  placeholder: string;
  brandColorHex?: string | null;
  hasBrand: boolean;
  chrome: Chrome | null;
  shellStyle?: CSSProperties;
  submitType?: "button" | "submit";
}) {
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (el) resizePlaygroundComposer(el);
  }, [textareaRef, placeholder, value, disabled]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (sendDisabled || disabled) return;
    if (submitType === "submit") {
      e.currentTarget.form?.requestSubmit();
    } else {
      onSend(e as unknown as FormEvent);
    }
  };

  const textarea = (
    <textarea
      ref={textareaRef}
      rows={1}
      className={inputClass}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        onChange(e.target.value);
        resizePlaygroundComposer(e.target);
      }}
      onKeyDown={handleKeyDown}
    />
  );

  const sendButton = (
    <button
      type={submitType}
      disabled={sendDisabled || disabled}
      onClick={submitType === "button" ? (e) => onSend(e) : undefined}
      className={cn(
        widgetComposerSendButtonClass,
        hasBrand && chrome
          ? cn(chrome.fabIconClass, "cursor-pointer hover:opacity-90")
          : "cursor-pointer bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover"
      )}
      style={hasBrand && brandColorHex ? { backgroundColor: brandColorHex } : undefined}
      aria-label="Send"
    >
      <WidgetSendIcon className="size-4" />
    </button>
  );

  if (submitType === "submit") {
    return (
      <form className={cn(widgetComposerFieldClass, "gap-1")} style={shellStyle} onSubmit={onSend}>
        {textarea}
        {sendButton}
      </form>
    );
  }

  return (
    <div className={widgetComposerFieldClass} style={shellStyle}>
      {textarea}
      {sendButton}
    </div>
  );
}
