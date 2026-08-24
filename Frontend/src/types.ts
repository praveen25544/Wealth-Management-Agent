export interface UserPortfolioRequest {
  clientProfileContext: string;
  currentCryptoAllocation: number;
  currentEquityAllocation: number;
  currentCashAllocation: number;
}

export interface AgentExecutionResponse {
  structuredRecommendation: string;
  agentTraceLogs: string[];
}
