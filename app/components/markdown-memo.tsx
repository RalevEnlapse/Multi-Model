"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import MermaidBlock from "./mermaid-block";

export type MarkdownMemoProps = {
  markdown: string;
};

export default function MarkdownMemo({ markdown }: MarkdownMemoProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const raw = String(children ?? "");
          const lang = (className || "").replace("language-", "").toLowerCase();

          if (lang === "mermaid") {
            return <MermaidBlock code={raw} />;
          }

          return (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
