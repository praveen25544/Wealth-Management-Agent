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
    }, 90);

    return () => window.clearInterval(id);
  }, [logs]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [visibleCount, running]);

  const rendered = useMemo(() => logs.slice(0, visibleCount), [logs, visibleCount]);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-2 text-sky-300">
          <TerminalSquare size={16} />
          <span className="font-mono text-xs font-semibold">Telemetry / agent loop</span>
        </div>
        <span
          className={`h-2 w-2 rounded-full ${
            running ? "animate-pulse bg-emerald-400" : "bg-slate-500"
          }`}
        />
      </header>
      <div
        ref={scroller}
        className="scanlines h-[364px] overflow-auto px-4 py-3 font-mono text-xs leading-6 text-emerald-300"
      >
        {rendered.length === 0 && (
          <p className="text-slate-500">
            {running ? "> synchronizing orchestrator bus..." : "> idle - await optimize cycle"}
          </p>
        )}
        {rendered.map((line, index) => (
          <p key={`${index}-${line}`}>
            <span className="text-sky-300">sw-ai$</span> {line}
          </p>
        ))}
        {running && <p className="animate-pulse text-sky-300">_</p>}
      </div>
    </section>
  );
}
