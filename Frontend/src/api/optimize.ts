import type { AgentExecutionResponse, AgentHealthResponse, UserPortfolioRequest } from "../types";
import { buildLocalResponse } from "../lib/portfolio";

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080").replace(
  /\/$/,
  ""
);
const ENDPOINT = `${API_BASE_URL}/api/wealth/optimize`;
const HEALTH_ENDPOINT = `${API_BASE_URL}/api/wealth/health`;
const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 12000);
const REQUEST_TIMEOUT_MS = Number.isFinite(configuredTimeout)
  ? Math.max(2500, configuredTimeout)
  : 12000;

export async function getAgentHealth(): Promise<AgentHealthResponse> {
  const response = await fetchWithTimeout(HEALTH_ENDPOINT, {
    headers: {
      Accept: "application/json"
    }
  });
  const body = await readJson<AgentHealthResponse>(response);

  if (!response.ok) {
    throw new Error(`Health check failed with HTTP ${response.status}`);
  }

  return {
    status: body?.status ?? "ready",
    mode: body?.mode ?? "local-quant",
    model: body?.model ?? "deterministic-local-analyst",
    checkedAt: body?.checkedAt ?? new Date().toISOString()
  };
}

export async function optimizePortfolio(
  payload: UserPortfolioRequest
): Promise<AgentExecutionResponse> {
  let response: Response;
  try {
    response = await fetchWithTimeout(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (cause) {
    const reason = getNetworkFailureReason(cause);
    return buildLocalResponse(payload, reason);
  }

  const body = await readJson<AgentExecutionResponse>(response);
  if (!response.ok) {
    throw new Error(body?.structuredRecommendation || `HTTP ${response.status}`);
  }

  return {
    structuredRecommendation: body?.structuredRecommendation ?? "No recommendation returned.",
    agentTraceLogs: body?.agentTraceLogs ?? [],
    mode: body?.mode ?? "gemini-agent"
  };
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function readJson<T>(response: Response): Promise<Partial<T> | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as Partial<T>;
  } catch {
    return {
      structuredRecommendation: text,
      agentTraceLogs: [`[HTTP] Non-JSON response from optimizer: ${response.status}`]
    } as Partial<T>;
  }
}

function getNetworkFailureReason(cause: unknown) {
  if (cause instanceof DOMException && cause.name === "AbortError") {
    return `backend timeout after ${Math.round(REQUEST_TIMEOUT_MS / 1000)} seconds`;
  }

  if (cause instanceof Error) {
    return cause.message;
  }

  return "backend request failed";
}
