"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * CommonMark only starts a list after a blank line; models often emit single newlines
 * or inline “: - **Item**” patterns. Light normalisation improves rendering without
 * changing the model.
 */
function normalizeAssistantMarkdown(source: string): string {
  return (
    source
      // “including: - **Foo**” → paragraph break before list
      .replace(/([:.;!?])\s+(- \*\*)/g, "$1\n\n$2")
      // newline + bullet/number → treat as new block
      .replace(/([^\n])\n([-*] |\d+\.\s)/gm, "$1\n\n$2")
  );
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0 [&:first-child]:mt-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 marker:text-ds-on-surface-variant last:mb-0 [&:first-child]:mt-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 marker:font-medium marker:text-ds-on-surface-variant last:mb-0 [&:first-child]:mt-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed [&>p]:mb-1 [&>p:last-child]:mb-0">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ds-on-surface">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-ds-primary font-medium underline decoration-ds-primary/35 underline-offset-2 hover:decoration-black"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => (
    <h3 className="text-ds-on-surface mt-3 mb-1.5 text-[15px] font-semibold tracking-tight first:mt-0">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="text-ds-on-surface mt-3 mb-1.5 text-sm font-semibold tracking-tight first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h3 className="text-ds-on-surface mt-2 mb-1 text-sm font-semibold tracking-tight first:mt-0">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-ds-primary/50 text-ds-on-surface-variant mb-2 border-l-2 pl-3 italic last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-ds-outline my-3" />,
  pre: ({ children }) => (
    <pre className="border-ds-outline mb-2 max-w-full overflow-x-auto rounded-ds-md border bg-ds-sidebar/80 p-3 text-[13px] leading-relaxed last:mb-0">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const isFenced = /language-/.test(className ?? "");
    if (isFenced) {
      return <code className={cn("block font-mono whitespace-pre text-ds-on-surface", className)}>{children}</code>;
    }
    return (
      <code className="rounded bg-ds-sidebar/90 px-1 py-0.5 font-mono text-[0.85em] text-ds-on-surface">{children}</code>
    );
  },
  table: ({ children }) => (
    <div className="my-2 max-w-full overflow-x-auto">
      <table className="w-full min-w-[12rem] border-collapse border border-ds-outline text-left text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-ds-sidebar/70">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-ds-outline/70 border-b last:border-b-0">{children}</tr>,
  th: ({ children }) => <th className="border-ds-outline border-r px-2 py-1.5 font-semibold last:border-r-0">{children}</th>,
  td: ({ children }) => <td className="border-ds-outline/60 border-r px-2 py-1.5 align-top last:border-r-0">{children}</td>,
  del: ({ children }) => <del className="text-ds-on-surface-variant">{children}</del>,
  input: ({ type, checked, className }) => {
    if (type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={Boolean(checked)}
          disabled
          className={cn("border-ds-outline text-ds-primary mr-2 mt-0.5 align-top opacity-100", className)}
          aria-hidden
        />
      );
    }
    return null;
  },
};

export function AssistantMarkdown({ children, className }: { children: string; className?: string }) {
  const source = normalizeAssistantMarkdown(children);
  return (
    <div className={cn("assistant-markdown min-w-0 [&_a]:break-words [&_code]:break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
