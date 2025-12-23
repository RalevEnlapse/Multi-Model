import { OpenAI } from "openai";
import {
  setDefaultOpenAIClient,
  setOpenAIAPI,
  setTracingDisabled,
} from "@openai/agents";

/**
 * Initializes OpenAI Agents SDK defaults.
 *
 * Supports:
 * - custom base URL (OPENAI_BASE_URL)
 * - custom API key (OPENAI_API_KEY)
 * - switching API mode (OPENAI_API_MODE = 'responses' | 'chat_completions')
 * - disabling tracing (OPENAI_AGENTS_DISABLE_TRACING=1)
 *
 * NOTE: must be called server-side before the first agent run.
 */
let initialized = false;

export function initOpenAI(): void {
  // In dev, Next can keep the module hot-reloaded; always re-apply configuration
  // so env changes and API mode changes take effect.
  const isDev = process.env.NODE_ENV !== "production";
  if (initialized && !isDev) return;
  initialized = true;

  // Optional: disable Agents SDK tracing exporter to avoid noisy [non-fatal] logs.
  // Useful if your environment blocks outbound tracing or you don't use it.
  if (process.env.OPENAI_AGENTS_DISABLE_TRACING === "1") {
    setTracingDisabled(true);
  }

  const apiKey = process.env.OPENAI_API_KEY;

  // Prefer env var, fall back to the Velocity gateway used by this project.
  const baseURL =
    process.env.OPENAI_BASE_URL?.trim() || "https://chat.velocity.online/api";

  // Some gateways (like Velocity) require an explicit model name.
  // If unset, OpenAI JS/Agents SDK may send a default model that the gateway doesn't serve.
  const defaultModel = process.env.OPENAI_MODEL?.trim();

  // Minimal diagnostics to validate runtime configuration without leaking secrets.
  // (This helps distinguish: missing env, truncated token, wrong baseURL, etc.)
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(
      `[openai:init] baseURL=${baseURL} apiKeyPresent=${Boolean(apiKey)} apiKeyLen=${apiKey?.length ?? 0} mode=${process.env.OPENAI_API_MODE ?? "(default)"} model=${defaultModel ?? "(default)"} tracingDisabled=${process.env.OPENAI_AGENTS_DISABLE_TRACING === "1"}`
    );
  }

  const isVelocityGateway = new URL(baseURL).host === "chat.velocity.online";

  // Decide Agents SDK API mode before the first run.
  // The Velocity gateway returns 405 for the Responses API (/responses), so default
  // to chat_completions unless the user explicitly overrides OPENAI_API_MODE.
  const mode = process.env.OPENAI_API_MODE;
  if (mode === "chat_completions") {
    setOpenAIAPI("chat_completions");
  } else if (mode === "responses") {
    setOpenAIAPI("responses");
  } else if (isVelocityGateway) {
    setOpenAIAPI("chat_completions");
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(
        "[openai:init] Detected Velocity gateway; defaulting OPENAI_API_MODE=chat_completions"
      );
    }
  }

  // Apply a default model for the Agents SDK if provided.
  // (Fixes gateways that return {"detail":"Model not found"} when model is omitted or mismatched.)
  if (defaultModel) {
    try {
      (globalThis as typeof globalThis & { __OPENAI_AGENTS_DEFAULT_MODEL__?: string }).__OPENAI_AGENTS_DEFAULT_MODEL__ =
        defaultModel;
    } catch {
      // ignore
    }
  }

  // Add a wrapper around fetch so we can see which upstream call returns HTTP 405.
  // (The Agents SDK internally calls OpenAI via the provided OpenAI client.)
  const client = new OpenAI({
    apiKey,
    baseURL,
    fetch: async (input, init) => {
      const method = (init?.method ?? "GET").toUpperCase();
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : input instanceof URL
              ? input.toString()
              : String(input);

      const started = Date.now();
      const res = await fetch(input, init);
      const ms = Date.now() - started;

      if (!res.ok || process.env.OPENAI_DEBUG_HTTP === "1") {
        let bodyPreview = "";
        try {
          const ct = res.headers.get("content-type") ?? "";
          if (ct.includes("application/json") || ct.includes("text/")) {
            bodyPreview = (await res.clone().text()).slice(0, 600);
          }
        } catch {
          // ignore
        }

        // eslint-disable-next-line no-console
        console.warn(
          `[openai:http] ${method} ${url} -> ${res.status} (${ms}ms) ${bodyPreview ? `body=${bodyPreview}` : ""}`
        );
      }

      return res;
    },
  });

  setDefaultOpenAIClient(client);
}
