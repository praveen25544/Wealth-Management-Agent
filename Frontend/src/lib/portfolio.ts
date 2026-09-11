import type { AgentExecutionResponse, UserPortfolioRequest } from "../types";

export type AssetKey = "crypto" | "equity" | "cash";
export type RiskBand = "Low" | "Moderate" | "Elevated" | "Critical";

export interface AllocationSlice {
  key: AssetKey;
  label: string;
  current: number;
  target: number;
  currentWeight: number;
  targetWeight: number;
  delta: number;
}

export interface StressScenario {
  name: string;
  impact: number;
  note: string;
}

export interface BlotterOrder {
  key: AssetKey;
  label: string;
  side: "BUY" | "SELL" | "HOLD";
  notional: number;
}

export interface PortfolioAnalysis {
  nav: number;
  allocationDrift: number;
  cashBufferGap: number;
  isolationRiskCoefficient: number;
  riskBand: RiskBand;
  confidenceScore: number;
  turnover: number;
  worstStressImpact: number;
  allocations: AllocationSlice[];
  blotter: BlotterOrder[];
  horizonPath: number[];
  stressScenarios: StressScenario[];
  nextActions: string[];
}

export const TARGET_WEIGHTS: Record<AssetKey, number> = {
  crypto: 0.1,
  equity: 0.6,
  cash: 0.3
};

const VOLATILITY: Record<AssetKey, number> = {
  crypto: 0.85,
  equity: 0.22,
  cash: 0.015
};

const ASSET_LABELS: Record<AssetKey, string> = {
  crypto: "Crypto",
  equity: "Equity",
  cash: "Cash"
};

const ASSET_ORDER: AssetKey[] = ["crypto", "equity", "cash"];

export function analyzePortfolio(payload: UserPortfolioRequest): PortfolioAnalysis {
  const values: Record<AssetKey, number> = {
    crypto: sanitizeNotional(payload.currentCryptoAllocation),
    equity: sanitizeNotional(payload.currentEquityAllocation),
    cash: sanitizeNotional(payload.currentCashAllocation)
  };

  const nav = values.crypto + values.equity + values.cash;
  const safeNav = nav > 0 ? nav : 1;

  const allocations = ASSET_ORDER.map((key) => {
    const currentWeight = nav > 0 ? values[key] / safeNav : 0;
    const target = TARGET_WEIGHTS[key] * nav;

    return {
      key,
      label: ASSET_LABELS[key],
      current: values[key],
      target,
      currentWeight,
      targetWeight: TARGET_WEIGHTS[key],
      delta: target - values[key]
    };
  });

  const weights: Record<AssetKey, number> = {
    crypto: nav > 0 ? values.crypto / safeNav : 0,
    equity: nav > 0 ? values.equity / safeNav : 0,
    cash: nav > 0 ? values.cash / safeNav : 0
  };
  const herfindahl =
    weights.crypto * weights.crypto +
    weights.equity * weights.equity +
    weights.cash * weights.cash;
  const varianceProxy =
    weights.crypto * weights.crypto * VOLATILITY.crypto * VOLATILITY.crypto +
    weights.equity * weights.equity * VOLATILITY.equity * VOLATILITY.equity +
    weights.cash * weights.cash * VOLATILITY.cash * VOLATILITY.cash;
  const systemicVolatility = Math.sqrt(varianceProxy);
  const cashDeficit = Math.max(0, TARGET_WEIGHTS.cash - weights.cash);
  const cryptoExcess = Math.max(0, weights.crypto - TARGET_WEIGHTS.crypto);
  const isolationPenalty = 1 + 2.4 * cashDeficit + 1.8 * cryptoExcess;
  const isolationRiskCoefficient = herfindahl * systemicVolatility * isolationPenalty;

  const allocationDrift =
    allocations.reduce(
      (sum, allocation) => sum + Math.abs(allocation.currentWeight - allocation.targetWeight),
      0
    ) / 2;
  const cashBufferGap = values.cash - TARGET_WEIGHTS.cash * nav;
  const confidenceScore = clamp(96 - allocationDrift * 90 - isolationRiskCoefficient * 160, 52, 96);
  const turnover = allocations.reduce((sum, allocation) => sum + Math.abs(allocation.delta), 0) / 2;
  const stressScenarios = buildStressScenarios(values, nav);
  const worstStressImpact = stressScenarios.reduce(
    (worst, scenario) => Math.min(worst, scenario.impact),
    0
  );

  return {
    nav,
    allocationDrift,
    cashBufferGap,
    isolationRiskCoefficient,
    riskBand: getRiskBand(isolationRiskCoefficient),
    confidenceScore,
    turnover,
    worstStressImpact,
    allocations,
    blotter: buildBlotter(allocations),
    horizonPath: buildHorizonPath(nav, weights),
    stressScenarios,
    nextActions: buildNextActions(allocations, cashBufferGap)
  };
}

export function buildLocalResponse(
  payload: UserPortfolioRequest,
  reason: string
): AgentExecutionResponse {
  const analysis = analyzePortfolio(payload);
  const timestamp = new Date().toISOString();

  return {
    mode: "browser-fallback",
    structuredRecommendation: buildRecommendation(payload, analysis, reason),
    agentTraceLogs: [
      `[${timestamp}] [OFFLINE] Backend unavailable; browser analyst fallback engaged`,
      `[${timestamp}] [CALC] isolationRiskCoefficient=${analysis.isolationRiskCoefficient.toFixed(6)}`,
      `[${timestamp}] [MATRIX] ${analysis.allocations
        .map((item) => `${item.key}Delta=${formatSignedMoney(item.delta)}`)
        .join(" | ")}`
    ]
  };
}

export function buildRecommendation(
  payload: UserPortfolioRequest,
  analysis: PortfolioAnalysis,
  reason: string
) {
  const allocationLines = analysis.allocations
    .map((item) => {
      const side = Math.abs(item.delta) < 1 ? "hold" : item.delta > 0 ? "buy" : "sell";
      return `- ${item.label}: ${side} ${formatMoney(Math.abs(item.delta))} to reach ${formatPercent(
        item.targetWeight
      )}`;
    })
    .join("\n");
  const stressLines = analysis.stressScenarios
    .map((scenario) => `- ${scenario.name}: ${formatSignedMoney(scenario.impact)} ${scenario.note}`)
    .join("\n");

  return `Sovereign allocation brief

Operating mode: browser fallback analyst
Fallback reason: ${reason}
Client profile: ${payload.clientProfileContext}

Portfolio snapshot
- NAV: ${formatMoney(analysis.nav)}
- Allocation drift: ${formatPercent(analysis.allocationDrift)}
- Cash buffer gap: ${formatSignedMoney(analysis.cashBufferGap)}
- Isolation risk coefficient: ${analysis.isolationRiskCoefficient.toFixed(6)} (${analysis.riskBand})
- Two-way turnover: ${formatMoney(analysis.turnover)}

Rebalance orders
${allocationLines}

Stress read-through
${stressLines}

Execution sequence
1. Confirm liquidity and covenant limits before any buy leg.
2. Execute negative deltas first to fund target cash.
3. Re-run the optimizer after execution fills settle.`;
}

export function formatMoney(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatSignedMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatMoney(Math.abs(value))}`;
}

export function formatPercent(value: number, digits = 1) {
  return `${((Number.isFinite(value) ? value : 0) * 100).toFixed(digits)}%`;
}

function buildStressScenarios(values: Record<AssetKey, number>, nav: number): StressScenario[] {
  if (nav <= 0) {
    return [
      { name: "Crypto shock", impact: 0, note: "no notional exposure" },
      { name: "Equity drawdown", impact: 0, note: "no notional exposure" },
      { name: "Liquidity squeeze", impact: 0, note: "no notional exposure" }
    ];
  }

  return [
    {
      name: "Crypto shock",
      impact: values.crypto * -0.32 + values.equity * -0.04,
      note: "32% digital-asset selloff with beta drag"
    },
    {
      name: "Equity drawdown",
      impact: values.equity * -0.14 + values.crypto * -0.08,
      note: "broad risk-off repricing"
    },
    {
      name: "Liquidity squeeze",
      impact: values.cash * -0.005 + values.crypto * -0.12 + values.equity * -0.06,
      note: "haircut on liquid reserve plus forced-risk discount"
    }
  ];
}

function buildBlotter(allocations: AllocationSlice[]): BlotterOrder[] {
  return allocations.map((allocation) => {
    const side =
      Math.abs(allocation.delta) < 1 ? "HOLD" : allocation.delta > 0 ? "BUY" : "SELL";
    return {
      key: allocation.key,
      label: allocation.label,
      side,
      notional: Math.abs(allocation.delta)
    };
  });
}

function buildHorizonPath(nav: number, weights: Record<AssetKey, number>) {
  if (nav <= 0) {
    return Array.from({ length: 24 }, () => 0);
  }

  const monthlyReturn =
    weights.crypto * 0.011 + weights.equity * 0.007 + weights.cash * 0.003;
  const monthlyVol =
    weights.crypto * 0.085 + weights.equity * 0.028 + weights.cash * 0.004;
  const points = [nav];

  for (let index = 1; index < 24; index += 1) {
    const shock = Math.sin(index * 1.37) * 0.55 + Math.cos(index * 0.41) * 0.45;
    const next = points[index - 1]! * (1 + monthlyReturn + shock * monthlyVol);
    points.push(Math.max(nav * 0.62, next));
  }

  return points;
}

function buildNextActions(allocations: AllocationSlice[], cashBufferGap: number) {
  const actions = allocations
    .filter((allocation) => Math.abs(allocation.delta) >= 1)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .map((allocation) => {
      const verb = allocation.delta > 0 ? "Buy" : "Sell";
      return `${verb} ${formatMoney(Math.abs(allocation.delta))} ${allocation.label.toLowerCase()}`;
    });

  if (cashBufferGap < 0) {
    actions.unshift(`Restore ${formatMoney(Math.abs(cashBufferGap))} cash buffer`);
  }

  return actions.slice(0, 4);
}

function getRiskBand(risk: number): RiskBand {
  if (risk < 0.035) {
    return "Low";
  }
  if (risk < 0.075) {
    return "Moderate";
  }
  if (risk < 0.14) {
    return "Elevated";
  }
  return "Critical";
}

function sanitizeNotional(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
