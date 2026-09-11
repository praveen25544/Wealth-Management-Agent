export interface UserPortfolioRequest {
  clientProfileContext: string;
  currentCryptoAllocation: number;
  currentEquityAllocation: number;
  currentCashAllocation: number;
}

export interface AgentExecutionResponse {
  structuredRecommendation: string;
  agentTraceLogs: string[];
  mode?: "gemini-agent" | "local-quant" | "browser-fallback";
}

export interface AgentHealthResponse {
  status: "ready" | string;
  mode: "gemini-agent" | "local-quant" | string;
  model: string;
  checkedAt: string;
}
