import { useEffect, useMemo, useRef, useState } from "react";
import { TerminalSquare } from "lucide-react";

interface TelemetryTerminalProps {
  logs: string[];
  running: boolean;
}

export function TelemetryTerminal({ logs, running }: TelemetryTerminalProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const scroller = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(0);
    if (logs.length === 0) {
      return;
    }
    let index = 0;
    const id = window.setInterval(() => {
      index += 1;
      setVisibleCount(index);
      if (index >= logs.length) {
        window.clearInterval(id);
      }
    }, 140);
    return () => window.clearInterval(id);
  }, [logs]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [visibleCount, running]);

  const rendered = useMemo(() => logs.slice(0, visibleCount), [logs, visibleCount]);

  return (
    <section className="overflow-hidden rounded-xl border border-cyan-400/30 bg-slate-950/80 shadow-neon">
      <header className="flex items-center justify-between border-b border-cyan-400/20 bg-slate-900/80 px-4 py-2">
        <div className="flex items-center gap-2 text-cyan-300">
          <TerminalSquare size={16} />
          <span className="font-mono text-xs tracking-[0.2em] uppercase">Telemetry / agent loop</span>
        </div>
        <span className={`h-2 w-2 rounded-full ${running ? "animate-pulse bg-lime-400" : "bg-slate-500"}`} />
      </header>
      <div
        ref={scroller}
        className="scanlines h-72 overflow-auto px-4 py-3 font-mono text-xs leading-6 text-lime-300"
      >
        {rendered.length === 0 && (
          <p className="text-slate-500">
            {running ? "> synchronizing orchestrator bus…" : "> idle — await optimize cycle"}
          </p>
        )}
        {rendered.map((line, i) => (
          <p key={`${i}-${line}`}>
            <span className="text-fuchsia-400">sw-ai$</span> {line}
          </p>
        ))}
        {running && <p className="animate-pulse text-cyan-400">_</p>}
      </div>
    </section>
  );
}
