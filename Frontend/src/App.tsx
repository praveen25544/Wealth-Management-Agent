import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bitcoin,
  Building2,
  CircleDollarSign,
  Clock3,
  Gauge,
  Landmark,
  LineChart,
  Loader2,
  Play,
  ReceiptText,
  Server,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  Zap,
  type LucideIcon
} from "lucide-react";
import { getAgentHealth, optimizePortfolio } from "./api/optimize";
import { TelemetryTerminal } from "./components/TelemetryTerminal";
import {
  analyzePortfolio,
  formatMoney,
  formatPercent,
  formatSignedMoney,
  type AllocationSlice,
  type AssetKey,
  type BlotterOrder,
  type StressScenario
} from "./lib/portfolio";
import type { AgentExecutionResponse, AgentHealthResponse, UserPortfolioRequest } from "./types";

interface Preset {
  name: string;
  description: string;
  Icon: LucideIcon;
  clientProfileContext: string;
  currentCryptoAllocation: number;
  currentEquityAllocation: number;
  currentCashAllocation: number;
}

const LOCAL_LOOP_LOGS = [
  "[UI] optimize cycle armed",
  "[CALC] portfolio analytics hydrated",
  "[NET] POST /api/wealth/optimize"
];

const DEFAULT_PRESET: Preset = {
  name: "Treasury stable",
  description: "covenant focused",
  Icon: ShieldCheck,
  clientProfileContext:
    "Corporate treasury desk: 36-month horizon, liquidity covenant, no leverage.",
  currentCryptoAllocation: 250000,
  currentEquityAllocation: 1200000,
  currentCashAllocation: 400000
};

const PRESETS: Preset[] = [
  DEFAULT_PRESET,
  {
    name: "Growth mandate",
    description: "risk-on sleeve",
    Icon: TrendingUp,
    clientProfileContext:
      "Founder office: 60-month horizon, moderate drawdown tolerance, staged liquidity needs.",
    currentCryptoAllocation: 650000,
    currentEquityAllocation: 1850000,
    currentCashAllocation: 300000
  },
  {
    name: "Liquidity watch",
    description: "cash recovery",
    Icon: Landmark,
    clientProfileContext:
      "Family office liquidity review: 24-month horizon, pending capital calls, preserve cash buffer.",
    currentCryptoAllocation: 480000,
    currentEquityAllocation: 2100000,
    currentCashAllocation: 180000
  }
];

const ASSET_STYLES: Record<AssetKey, { bar: string; soft: string; text: string }> = {
  crypto: {
    bar: "bg-amber-500",
    soft: "bg-amber-50",
    text: "text-amber-700"
  },
  equity: {
    bar: "bg-emerald-500",
    soft: "bg-emerald-50",
    text: "text-emerald-700"
  },
  cash: {
    bar: "bg-sky-500",
    soft: "bg-sky-50",
    text: "text-sky-700"
  }
};

export default function App() {
  const [clientProfileContext, setClientProfileContext] = useState(
    DEFAULT_PRESET.clientProfileContext
  );
  const [currentCryptoAllocation, setCurrentCryptoAllocation] = useState(
    DEFAULT_PRESET.currentCryptoAllocation
  );
  const [currentEquityAllocation, setCurrentEquityAllocation] = useState(
    DEFAULT_PRESET.currentEquityAllocation
  );
  const [currentCashAllocation, setCurrentCashAllocation] = useState(
    DEFAULT_PRESET.currentCashAllocation
  );
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentExecutionResponse | null>(null);
  const [loopLogs, setLoopLogs] = useState<string[]>([]);

  const request = useMemo<UserPortfolioRequest>(
    () => ({
      clientProfileContext,
      currentCryptoAllocation,
      currentEquityAllocation,
      currentCashAllocation
    }),
    [
      clientProfileContext,
      currentCashAllocation,
      currentCryptoAllocation,
      currentEquityAllocation
    ]
  );
  const analysis = useMemo(() => analyzePortfolio(request), [request]);
  const modeLabel = getModeLabel(result?.mode, Boolean(result));

  async function onOptimize(event: FormEvent) {
    event.preventDefault();

    if (analysis.nav <= 0) {
      setError("Portfolio notional must be greater than zero.");
      setResult(null);
      setLoopLogs(["[VALIDATION] portfolio notional must be greater than zero"]);
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);
    setLoopLogs([
      ...LOCAL_LOOP_LOGS,
      `[NAV] ${formatMoney(analysis.nav)} live notional`,
      `[RISK] coefficient=${analysis.isolationRiskCoefficient.toFixed(6)} band=${analysis.riskBand}`
    ]);

    try {
      const response = await optimizePortfolio(request);
      setResult(response);
      setLoopLogs([
        ...LOCAL_LOOP_LOGS,
        `[NAV] ${formatMoney(analysis.nav)} live notional`,
        ...response.agentTraceLogs,
        "[UI] recommendation rendered"
      ]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unknown orchestration failure";
      setError(message);
      setLoopLogs([...LOCAL_LOOP_LOGS, `[ERROR] ${message}`]);
    } finally {
      setRunning(false);
    }
  }

  function applyPreset(preset: Preset) {
    setClientProfileContext(preset.clientProfileContext);
    setCurrentCryptoAllocation(preset.currentCryptoAllocation);
    setCurrentEquityAllocation(preset.currentEquityAllocation);
    setCurrentCashAllocation(preset.currentCashAllocation);
    setError(null);
    setResult(null);
    setLoopLogs([`[PRESET] loaded ${preset.name}`]);
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                <Building2 size={14} />
                Sovereign desk
              </span>
              <span className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Activity size={14} />
                {modeLabel}
              </span>
            </div>
            <h1 className="text-3xl font-semibold text-slate-950 md:text-4xl">
              Wealth management agent
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Targeting 10% crypto, 60% equity, and 30% cash with local risk math and optional
              Gemini orchestration.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-right">
            <HeaderStat label="Target cash" value="30%" />
            <HeaderStat label="Risk model" value="HHI plus vol" />
            <HeaderStat label="Port" value="8080" />
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <form
              onSubmit={onOptimize}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Mandate input</h2>
                  <p className="text-xs text-slate-500">Portfolio and client constraints</p>
                </div>
                <Sparkles className="text-amber-500" size={18} />
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Client profile
                <textarea
                  className="mt-2 h-28 w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  value={clientProfileContext}
                  onChange={(event) => setClientProfileContext(event.target.value)}
                  required
                />
              </label>

              <div className="mt-4 space-y-3">
                <NumericField
                  icon={<Bitcoin size={16} />}
                  label="Crypto allocation"
                  value={currentCryptoAllocation}
                  onChange={setCurrentCryptoAllocation}
                />
                <NumericField
                  icon={<BarChart3 size={16} />}
                  label="Equity allocation"
                  value={currentEquityAllocation}
                  onChange={setCurrentEquityAllocation}
                />
                <NumericField
                  icon={<Wallet size={16} />}
                  label="Cash allocation"
                  value={currentCashAllocation}
                  onChange={setCurrentCashAllocation}
                />
              </div>

              <button
                type="submit"
                disabled={running}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {running ? <Loader2 className="animate-spin" size={17} /> : <Play size={17} />}
                {running ? "Running agent" : "Run optimize"}
              </button>
            </form>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-950">Mandate presets</h2>
                <BadgeCheck className="text-emerald-600" size={18} />
              </div>
              <div className="grid gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-sky-300 hover:bg-sky-50"
                  >
                    <span className="flex items-center gap-3">
                      <span className="rounded-md bg-slate-100 p-2 text-slate-700">
                        <preset.Icon size={16} />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">
                          {preset.name}
                        </span>
                        <span className="text-xs text-slate-500">{preset.description}</span>
                      </span>
                    </span>
                    <ArrowUpRight size={15} className="text-slate-400" />
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={<CircleDollarSign size={18} />}
                label="Net asset value"
                value={formatMoney(analysis.nav)}
                detail={`${analysis.allocations.length} allocation sleeves`}
                tone="emerald"
              />
              <MetricCard
                icon={<Target size={18} />}
                label="Allocation drift"
                value={formatPercent(analysis.allocationDrift)}
                detail="distance from target mix"
                tone="amber"
              />
              <MetricCard
                icon={<ShieldCheck size={18} />}
                label="Risk coefficient"
                value={analysis.isolationRiskCoefficient.toFixed(4)}
                detail={analysis.riskBand}
                tone={analysis.riskBand === "Critical" ? "rose" : "sky"}
              />
              <MetricCard
                icon={<Zap size={18} />}
                label="Confidence"
                value={`${Math.round(analysis.confidenceScore)}%`}
                detail="execution readiness"
                tone="violet"
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800">
                <AlertTriangle size={19} />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-5">
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
                <PanelHeader icon={<Target size={18} />} title="Target matrix" />
                <div className="mt-4 space-y-4">
                  {analysis.allocations.map((allocation) => (
                    <AllocationRow key={allocation.key} allocation={allocation} />
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
                <PanelHeader icon={<ShieldCheck size={18} />} title="Execution queue" />
                <div className="mt-4 space-y-3">
                  {analysis.nextActions.map((action, index) => (
                    <div
                      key={action}
                      className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-950 text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-800">{action}</span>
                    </div>
                  ))}
                  {analysis.nextActions.length === 0 && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700">
                      Portfolio is aligned with the target matrix.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {analysis.stressScenarios.map((scenario) => (
                <ScenarioCard key={scenario.name} scenario={scenario} nav={analysis.nav} />
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              <section className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-sm lg:col-span-3">
                <PanelHeader
                  icon={<Sparkles size={18} />}
                  title="Structured recommendation"
                  inverted
                />
                <pre className="mt-4 min-h-72 whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-900 p-4 font-mono text-xs leading-6 text-slate-200">
                  {result?.structuredRecommendation ?? "Awaiting first optimization cycle."}
                </pre>
              </section>

              <div className="lg:col-span-2">
                <TelemetryTerminal logs={loopLogs} running={running} />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function NumericField({
  icon,
  label,
  value,
  onChange
}: {
  icon: ReactNode;
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span className="mb-2 flex items-center gap-2">
        <span className="text-slate-500">{icon}</span>
        {label}
      </span>
      <input
        type="number"
        min={0}
        step="1000"
        required
        className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "emerald" | "amber" | "sky" | "rose" | "violet";
}) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    sky: "bg-sky-50 text-sky-700 border-sky-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100"
  }[tone];

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={`rounded-md border p-2 ${toneClasses}`}>{icon}</span>
        <span className="text-xs font-medium text-slate-500">{detail}</span>
      </div>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}

function PanelHeader({
  icon,
  title,
  inverted = false
}: {
  icon: ReactNode;
  title: string;
  inverted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className={inverted ? "text-sky-300" : "text-sky-600"}>{icon}</span>
        <h2 className={`text-sm font-semibold ${inverted ? "text-white" : "text-slate-950"}`}>
          {title}
        </h2>
      </div>
      <span
        className={`h-2 w-2 rounded-full ${inverted ? "bg-emerald-400" : "bg-emerald-500"}`}
      />
    </div>
  );
}

function AllocationRow({ allocation }: { allocation: AllocationSlice }) {
  const styles = ASSET_STYLES[allocation.key];
  const currentWidth = clampPercent(allocation.currentWeight * 100);
  const targetWidth = clampPercent(allocation.targetWeight * 100);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${styles.soft} ${styles.text}`}>
            {allocation.label}
          </span>
          <span className="text-sm font-semibold text-slate-900">
            {formatMoney(allocation.current)}
          </span>
        </div>
        <DeltaPill value={allocation.delta} />
      </div>
      <div className="relative h-8 rounded-md bg-slate-100">
        <div
          className={`absolute left-0 top-0 h-8 rounded-md ${styles.bar}`}
          style={{ width: `${currentWidth}%` }}
        />
        <div
          className="absolute top-0 h-8 w-px bg-slate-950"
          style={{ left: `${targetWidth}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-semibold text-slate-900 mix-blend-multiply">
          <span>{formatPercent(allocation.currentWeight)}</span>
          <span>target {formatPercent(allocation.targetWeight)}</span>
        </div>
      </div>
    </div>
  );
}

function DeltaPill({ value }: { value: number }) {
  const isBuy = value > 0;
  const isFlat = Math.abs(value) < 1;
  const Icon = isBuy ? ArrowUpRight : ArrowDownRight;
  const label = isFlat ? "Hold" : `${isBuy ? "Buy" : "Sell"} ${formatMoney(Math.abs(value))}`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
        isFlat
          ? "bg-slate-100 text-slate-600"
          : isBuy
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700"
      }`}
    >
      {!isFlat && <Icon size={14} />}
      {label}
    </span>
  );
}

function ScenarioCard({ scenario, nav }: { scenario: StressScenario; nav: number }) {
  const impactWeight = nav > 0 ? Math.abs(scenario.impact) / nav : 0;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">{scenario.name}</h3>
        <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
          {formatPercent(impactWeight)}
        </span>
      </div>
      <p className="text-2xl font-semibold text-rose-700">{formatSignedMoney(scenario.impact)}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{scenario.note}</p>
    </article>
  );
}

function getModeLabel(mode: AgentExecutionResponse["mode"], hasResult: boolean) {
  if (!hasResult) {
    return "Ready";
  }
  if (mode === "browser-fallback") {
    return "Browser fallback";
  }
  if (mode === "local-quant") {
    return "Local quant";
  }
  return "Gemini agent";
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}
