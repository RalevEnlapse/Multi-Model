"use client";

import { useEffect, useId, useMemo, useState } from "react";
import mermaid from "mermaid";

export type MermaidBlockProps = {
  code: string;
};

let mermaidInitialized = false;

type MermaidRenderResult =
  | string
  | {
      svg?: string;
      bindFunctions?: (element: Element) => void;
    };

function isErrorWithMessage(e: unknown): e is { message: string } {
  if (typeof e !== "object" || e === null) return false;
  if (!("message" in e)) return false;
  return typeof (e as { message?: unknown }).message === "string";
}

function initMermaidOnce() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "strict",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, \"Noto Sans\", \"Liberation Sans\", sans-serif",
    themeVariables: {
      background: "transparent",
      primaryTextColor: "#fafafa",
      lineColor: "#52525b",
      primaryColor: "#18181b",
      secondaryColor: "#09090b",
      tertiaryColor: "#0b0b0f",
    },
  });
  mermaidInitialized = true;
}

export default function MermaidBlock({ code }: MermaidBlockProps) {
  const id = useId();
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  const source = useMemo(() => code.trim(), [code]);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setError("");
      setSvg("");

      if (!source) return;

      try {
        initMermaidOnce();

        // mermaid.render returns an object in v10+; typings vary between builds.
        const result = (await (mermaid as unknown as { render: (id: string, code: string) => Promise<MermaidRenderResult> }).render(
          `mermaid-${id}`,
          source
        )) as MermaidRenderResult;

        const svgText: string | undefined = typeof result === "string" ? result : result.svg;

        if (!svgText) throw new Error("Mermaid did not return SVG output.");
        if (!cancelled) setSvg(svgText);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(isErrorWithMessage(e) ? e.message : "Failed to render mermaid diagram.");
        }
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [id, source]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">
        Mermaid render error: {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-xs text-zinc-400">
        Rendering diagram…
      </div>
    );
  }

  return (
    <div
      className="mermaid-diagram"
      // Mermaid returns SVG markup. With securityLevel=strict, it sanitizes.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
