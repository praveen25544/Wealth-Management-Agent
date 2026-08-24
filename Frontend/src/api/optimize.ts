import type { AgentExecutionResponse, UserPortfolioRequest } from "../types";

const ENDPOINT = "http://localhost:8080/api/wealth/optimize";

export async function optimizePortfolio(
  payload: UserPortfolioRequest
): Promise<AgentExecutionResponse> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = (await response.json()) as AgentExecutionResponse;
  if (!response.ok) {
    throw new Error(body.structuredRecommendation || `HTTP ${response.status}`);
  }
  return body;
}
