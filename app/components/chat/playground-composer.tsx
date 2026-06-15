"use client";

import { useLayoutEffect, type CSSProperties, type FormEvent, type KeyboardEvent, RefObject } from "react";
import { cn } from "@/lib/utils";
import { brandChromeClasses, parseBrandColorHex } from "@/lib/brand-chrome";
import { WidgetSendIcon } from "@/components/chat/widget-send-icon";

export const PLAYGROUND_COMPOSER_MAX_LINES = 3;

const WIDGET_COMPOSER_BORDER = "#e5e5e5";
const WIDGET_COMPOSER_ACCENT_FALLBACK = "#831C91";

type Chrome = ReturnType<typeof brandChromeClasses>;

/** Live widget `.cr-composer-field` (pill; multiline expands to 20px radius). */
export const widgetComposerFieldClass = cn(
  "flex w-full min-h-[44px] items-center gap-1.5 overflow-hidden rounded-full border py-1 pl-3.5 pr-1.5",
  "transition-[border-color,box-shadow,border-radius] duration-150",
  "focus-within:border-[color-mix(in_srgb,var(--cr-composer-accent,#831C91)_35%,#d1d5db)]",
  "focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--cr-composer-accent,#831C91)_14%,transparent)]",
  "has-[textarea[data-lines='multi']]:items-end has-[textarea[data-lines='multi']]:rounded-[20px] has-[textarea[data-lines='multi']]:py-1.5"
);

/** Live widget `.cr-input`. */
export const widgetComposerInputClass = cn(
  "min-h-9 min-w-0 flex-1 resize-none border-0 bg-transparent py-2 pr-1",
  "text-[13px] leading-[1.375] tracking-normal text-ds-on-surface outline-none",
  "placeholder:text-ds-on-surface-variant/70",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

/** Static preview placeholder matching `.cr-input` sizing. */
export const widgetComposerPlaceholderClass = cn(
  "min-h-9 flex-1 py-2 pr-1 text-[13px] leading-[1.375] tracking-normal text-ds-on-surface-variant/70"
);

/** Live widget `.cr-send` (34px circle). */
export const widgetComposerSendButtonClass = cn(
  "inline-flex size-[34px] shrink-0 items-center justify-center rounded-full border-0 p-0 text-white",
  "transition-opacity hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
);

export function widgetComposerAccentColor(brandColorHex?: string | null): string {
  return parseBrandColorHex(brandColorHex) ?? WIDGET_COMPOSER_ACCENT_FALLBACK;
}

export function widgetComposerFieldStyle(
  accentColor: string,
  composerBackground?: string,
): CSSProperties {
  return {
    backgroundColor: composerBackground ?? "#FFFFFF",
    borderColor: WIDGET_COMPOSER_BORDER,
    ["--cr-composer-accent" as string]: accentColor,
  };
}

/** Live widget send gradient (`--cr-header-bg` / accent). */
export function widgetComposerSendStyle(accentColor: string): CSSProperties {
  return {
    background: `linear-gradient(135deg, ${accentColor} 0%, color-mix(in srgb, ${accentColor} 76%, #000000) 100%)`,
  };
}

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
  textarea.dataset.lines = contentHeight > oneLineHeight + 2 ? "multi" : "1";
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
  sendAccentColor,
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
  /** Header/accent for send + focus ring; defaults to brand color. */
  sendAccentColor?: string | null;
}) {
  const accent = sendAccentColor ?? widgetComposerAccentColor(brandColorHex);
  const fieldStyle: CSSProperties = {
    ...widgetComposerFieldStyle(accent, shellStyle?.backgroundColor as string | undefined),
    ...shellStyle,
  };

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
      className={widgetComposerInputClass}
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
      className={widgetComposerSendButtonClass}
      style={widgetComposerSendStyle(accent)}
      aria-label="Send"
    >
      <WidgetSendIcon className="size-[18px]" />
    </button>
  );

  if (submitType === "submit") {
    return (
      <form className={widgetComposerFieldClass} style={fieldStyle} onSubmit={onSend}>
        {textarea}
        {sendButton}
      </form>
    );
  }

  return (
    <div className={widgetComposerFieldClass} style={fieldStyle}>
      {textarea}
      {sendButton}
    </div>
  );
}
