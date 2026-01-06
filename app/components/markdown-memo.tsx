"use client";

import type { ComponentProps } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import MermaidBlock from "./mermaid-block";

export type MarkdownMemoProps = {
  markdown: string;
};

const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/g;

type CodeProps = ComponentProps<"code"> & {
  inline?: boolean;
};

type TextProps = {
  children?: unknown;
};

export default function MarkdownMemo({ markdown }: MarkdownMemoProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }: CodeProps) {
          const raw = String(children ?? "");
          const lang = (className || "").replace("language-", "").toLowerCase();

          if (lang === "mermaid") {
            return <MermaidBlock code={raw} />;
          }

          return (
            <code className={className} {...props}>
              {children as any}
            </code>
          );
        },
        text({ children }: TextProps) {
          const value = String(children ?? "");

          // `RegExp.test()` with /g mutates lastIndex; reset after.
          const hasDate = ISO_DATE_RE.test(value);
          ISO_DATE_RE.lastIndex = 0;
          if (!hasDate) return <>{children as any}</>;

          const parts = value.split(ISO_DATE_RE);
          const matches = value.match(ISO_DATE_RE) ?? [];

          const out: Array<unknown> = [];
          for (let i = 0; i < parts.length; i++) {
            if (parts[i]) out.push(parts[i]);
            const m = matches[i];
            if (m) out.push(<span className="md-date" key={`d-${i}`}>{m}</span>);
          }

          return <>{out as any}</>;
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
