// 0G Private Computer client over the OpenAI-compatible Router. Server-only;
// needs ZEROG_API_KEY. We request TEE verification on every call and pin the
// trust tier so the request is never silently served by a standard provider.

import type { VerificationStatus, ZeroGTrace } from "@/lib/shared/types";

const DEFAULT_BASE_URL = "https://router-api.0g.ai/v1";
// glm-5.2 has no TEE provider, so the pinned "verified" tier would 503 on it.
const DEFAULT_MODEL = "glm-5.3";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  content: string;
  trace: ZeroGTrace;
}

interface RouterResponse {
  id?: string;
  model?: string;
  choices?: { message?: { content?: string | null } }[];
  x_0g_trace?: {
    request_id?: string;
    provider?: string;
    tee_verified?: boolean | null;
  };
}

export class ZeroGError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    /** Router request ID when one came back, for support tickets and the log. */
    readonly requestId: string | null = null,
  ) {
    super(message);
  }
}

function verificationFrom(teeVerified: boolean | null | undefined): VerificationStatus {
  // true: signature validated. false: signature present but invalid, treat the
  // output as untrusted. null/absent: no verification came back.
  if (teeVerified === true) return "verified";
  if (teeVerified === false) return "failed";
  return "unverified";
}

export function zeroGModel(): string {
  return process.env.ZEROG_MODEL || DEFAULT_MODEL;
}

type ErrorBody = RouterResponse & { error?: { message?: string; code?: string } };

async function post(
  baseUrl: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  timeoutMs = 45_000,
): Promise<{ res: Response; text: string; json: ErrorBody }> {
  let res: Response;
  let text: string;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    text = await res.text();
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    throw new ZeroGError(
      timedOut ? `0G did not respond within ${timeoutMs / 1000}s` : `0G request failed: ${String(err)}`,
      null,
    );
  }
  try {
    return { res, text, json: JSON.parse(text) };
  } catch {
    throw new ZeroGError(`0G returned non-JSON (${res.status}): ${text.slice(0, 200)}`, res.status);
  }
}

export async function chat(
  messages: ChatMessage[],
  opts: { json?: boolean; timeoutMs?: number } = {},
): Promise<ChatResult> {
  const apiKey = process.env.ZEROG_API_KEY;
  if (!apiKey) throw new Error("ZEROG_API_KEY is not set");
  const baseUrl = process.env.ZEROG_BASE_URL || DEFAULT_BASE_URL;
  const model = zeroGModel();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  // "verified" admits TeeML and TeeTLS providers; "private" is TeeML only.
  // Set ZEROG_TRUST_MODE=standard to drop the pin if no provider is available.
  const trustMode = process.env.ZEROG_TRUST_MODE || "verified";
  if (trustMode !== "standard") headers["X-0G-Provider-Trust-Mode"] = trustMode;

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0,
    verify_tee: true,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  let { res, text, json } = await post(baseUrl, headers, body, opts.timeoutMs);
  // Not every model supports response_format; the prompt asks for JSON anyway.
  if (res.status === 400 && body.response_format) {
    delete body.response_format;
    ({ res, text, json } = await post(baseUrl, headers, body, opts.timeoutMs));
  }

  const requestId = json.x_0g_trace?.request_id ?? null;
  if (!res.ok) {
    const reason = json.error?.code ?? json.error?.message ?? text.slice(0, 200);
    throw new ZeroGError(`0G ${res.status}: ${reason}`, res.status, requestId);
  }

  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new ZeroGError("0G returned an empty completion", res.status, requestId);

  return {
    content,
    trace: {
      model: json.model ?? model,
      // The Router trace ID is the one the docs say to quote; fall back to
      // the completion id so we always record something 0G returned.
      requestId: requestId ?? json.id ?? "",
      chatId: res.headers.get("ZG-Res-Key") ?? json.id ?? null,
      providerAddress: json.x_0g_trace?.provider ?? null,
      verificationStatus: verificationFrom(json.x_0g_trace?.tee_verified),
    },
  };
}
