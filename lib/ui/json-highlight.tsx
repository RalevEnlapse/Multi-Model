import React from "react";
import { classNames } from "./class-names";

function escapeHtml(s: string) {
  // Proper HTML escaping
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatJsonLike(value: unknown) {
  // If it's already a string, we show it as-is (could be JSON text or not).
  // Otherwise stringify as JSON so objects/arrays render as JSON.
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

type TokenType =
  | "whitespace"
  | "punct" // { } [ ] : ,
  | "string"
  | "number"
  | "literal" // true false null
  | "invalid";

type Token = { type: TokenType; text: string; isKey?: boolean };

function isWhitespace(ch: string) {
  return ch === " " || ch === "\n" || ch === "\r" || ch === "\t";
}

function tokenizeJson(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const push = (type: TokenType, start: number, end: number, extra?: Partial<Token>) => {
    tokens.push({ type, text: text.slice(start, end), ...extra });
  };

  const skipWhitespace = () => {
    const start = i;
    while (i < text.length && isWhitespace(text[i]!)) i++;
    if (i > start) push("whitespace", start, i);
  };

  while (i < text.length) {
    skipWhitespace();
    if (i >= text.length) break;

    const ch = text[i]!;

    // Punctuation
    if (ch === "{" || ch === "}" || ch === "[" || ch === "]" || ch === ":" || ch === ",") {
      push("punct", i, i + 1);
      i++;
      continue;
    }

    // String
    if (ch === '"') {
      const start = i;
      i++; // skip opening quote
      while (i < text.length) {
        const c = text[i]!;
        if (c === "\\") {
          // skip escape sequence
          i += 2;
          continue;
        }
        if (c === '"') {
          i++; // include closing quote
          break;
        }
        i++;
      }
      const end = i;

      // Determine if this string is a key: next non-ws char is ':'
      let j = end;
      while (j < text.length && isWhitespace(text[j]!)) j++;
      const isKey = j < text.length && text[j] === ":";

      push("string", start, end, { isKey });
      continue;
    }

    // Number (JSON number grammar)
    // -? (0|[1-9]\d*) (\.\d+)? ([eE][+-]?\d+)?
    if (ch === "-" || (ch >= "0" && ch <= "9")) {
      const start = i;

      if (text[i] === "-") i++;

      if (text[i] === "0") {
        i++;
      } else if (text[i] >= "1" && text[i] <= "9") {
        i++;
        while (i < text.length && text[i] >= "0" && text[i] <= "9") i++;
      } else {
        // not a valid number start
        push("invalid", start, start + 1);
        i = start + 1;
        continue;
      }

      if (text[i] === ".") {
        i++;
        if (!(text[i] >= "0" && text[i] <= "9")) {
          // invalid fraction
          push("invalid", start, i);
          continue;
        }
        while (i < text.length && text[i] >= "0" && text[i] <= "9") i++;
      }

      if (text[i] === "e" || text[i] === "E") {
        i++;
        if (text[i] === "+" || text[i] === "-") i++;
        if (!(text[i] >= "0" && text[i] <= "9")) {
          push("invalid", start, i);
          continue;
        }
        while (i < text.length && text[i] >= "0" && text[i] <= "9") i++;
      }

      push("number", start, i);
      continue;
    }

    // Literals
    if (text.startsWith("true", i)) {
      push("literal", i, i + 4);
      i += 4;
      continue;
    }
    if (text.startsWith("false", i)) {
      push("literal", i, i + 5);
      i += 5;
      continue;
    }
    if (text.startsWith("null", i)) {
      push("literal", i, i + 4);
      i += 4;
      continue;
    }

    // Anything else is invalid; consume one char so we don't loop forever
    push("invalid", i, i + 1);
    i++;
  }

  return tokens;
}

function renderHighlightedHtml(text: string) {
  const tokens = tokenizeJson(text);

  // Build safe HTML: escape all token text, then wrap with spans.
  return tokens
    .map((t) => {
      const safe = escapeHtml(t.text);

      switch (t.type) {
        case "whitespace":
          return safe;

        case "punct": {
          // Optional: distinguish braces/brackets if you want separate CSS classes.
          const ch = t.text;
          const cls =
            ch === "{" || ch === "}" ? "json-brace" : ch === "[" || ch === "]" ? "json-bracket" : "json-punct";
          return `<span class="${cls}">${safe}</span>`;
        }

        case "string": {
          // Highlight ISO dates like 2025-03-18 when they appear inside JSON strings.
          if (!t.isKey && /^"\d{4}-\d{2}-\d{2}"$/.test(t.text)) {
            return `<span class="json-date">${safe}</span>`;
          }
          return `<span class="${t.isKey ? "json-key" : "json-string"}">${safe}</span>`;
        }

        case "number":
          return `<span class="json-number">${safe}</span>`;

        case "literal":
          return `<span class="json-literal">${safe}</span>`;

        case "invalid":
          return `<span class="json-invalid">${safe}</span>`;

        default:
          return safe;
      }
    })
    .join("");
}

export function JsonHighlight({ value, className }: { value: unknown; className?: string }) {
  const text = formatJsonLike(value);

  // Avoid huge payload highlight work
  if (text.length > 250_000) {
    return <pre className={classNames("whitespace-pre-wrap break-words", className)}>{text}</pre>;
  }

  const html = renderHighlightedHtml(text);

  return (
    <pre
      className={classNames("whitespace-pre-wrap break-words", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}