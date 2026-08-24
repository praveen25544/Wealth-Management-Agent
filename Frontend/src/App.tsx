import { FormEvent, ReactNode, useState } from "react";
import {
  Activity,
  Bitcoin,
  Landmark,
  Loader2,
  ShieldAlert,
  Sparkles,
  Wallet
} from "lucide-react";
import { optimizePortfolio } from "./api/optimize";
import { TelemetryTerminal } from "./components/TelemetryTerminal";
import type { AgentExecutionResponse } from "./types";

const LOCAL_LOOP_LOGS = [
  "[UI] optimize cycle armed",
  "[NET] POST http://localhost:8080/api/wealth/optimize",
  "[WAIT] awaiting Gemini tool loop"
];

export default function App() {
  const [clientProfileContext, setClientProfileContext] = useState(
    "Corporate treasury desk: 36-month horizon, liquidity covenant, no leverage."
  );
  const [currentCryptoAllocation, setCurrentCryptoAllocation] = useState(250_000);
  const [currentEquityAllocation, setCurrentEquityAllocation] = useState(1_200_000);
  const [currentCashAllocation, setCurrentCashAllocation] = useState(400_000);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentExecutionResponse | null>(null);
  const [loopLogs, setLoopLogs] = useState<string[]>([]);

  async function onOptimize(event: FormEvent) {
    event.preventDefault();
    setRunning(true);
    setError(null);
    setResult(null);
    setLoopLogs(LOCAL_LOOP_LOGS);

    try {
      const payload = {
        clientProfileContext,
        currentCryptoAllocation,
        currentEquityAllocation,
        currentCashAllocation
      };
      const response = await optimizePortfolio(payload);
      setResult(response);
      setLoopLogs([...LOCAL_LOOP_LOGS, ...response.agentTraceLogs, "[UI] payload hydrated"]);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unknown orchestration failure";
      setError(message);
      setLoopLogs([...LOCAL_LOOP_LOGS, `[ERROR] ${message}`]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(232,121,249,0.12),_transparent_40%)]" />
      <main className="relative mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-cyan-400/20 pb-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-400">
              Production mesh · port 8080
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold text-white md:text-4xl">
              Sovereign Wealth AI Core
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Autonomous portfolio rebalancer targeting 10% crypto / 60% equity / 30% cash with isolation-risk calculus.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-fuchsia-400/40 bg-slate-900/70 px-4 py-2 text-fuchsia-300">
            <Activity size={16} />
            <span className="font-mono text-xs">gemini-1.5-flash</span>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-5">
          <form
            onSubmit={onOptimize}
            className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2"
          >
            <label className="block text-xs uppercase tracking-widest text-slate-400">
              Client profile context
              <textarea
                className="mt-2 h-28 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-cyan-100 outline-none focus:border-cyan-400"
                value={clientProfileContext}
                onChange={(e) => setClientProfileContext(e.target.value)}
                required
              />
            </label>

            <NumericField
              icon={<Bitcoin size={16} />}
              label="Crypto allocation"
              value={currentCryptoAllocation}
              onChange={setCurrentCryptoAllocation}
            />
            <NumericField
              icon={<Landmark size={16} />}
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

            <button
              type="submit"
              disabled={running}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/50 bg-cyan-500/10 py-3 font-display text-sm uppercase tracking-widest text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {running ? "Executing agent loop" : "Run autonomous optimize"}
            </button>
          </form>

          <div className="space-y-4 lg:col-span-3">
            <TelemetryTerminal logs={loopLogs} running={running} />

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-rose-200">
                <ShieldAlert size={18} />
                <p className="font-mono text-sm">{error}</p>
              </div>
            )}

            <article className="rounded-xl border border-fuchsia-400/25 bg-slate-900/60 p-5">
              <h2 className="mb-3 font-display text-sm uppercase tracking-[0.25em] text-fuchsia-300">
                Structured recommendation
              </h2>
              <pre className="whitespace-pre-wrap font-mono text-sm leading-6 text-slate-200">
                {result?.structuredRecommendation ?? "Awaiting first successful cycle."}
              </pre>
            </article>
          </div>
        </div>
      </main>
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
    <label className="block text-xs uppercase tracking-widest text-slate-400">
      <span className="mb-2 flex items-center gap-2 text-slate-300">
        {icon}
        {label}
      </span>
      <input
        type="number"
        min={0}
        step="0.01"
        required
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-cyan-100 outline-none focus:border-cyan-400"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
