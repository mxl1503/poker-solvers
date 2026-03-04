interface Props {
  phase: "idle" | "equity" | "cfr" | "done";
  progress: number;
  iterations: number;
  exploitability: number;
}

export default function SolverStatus({ phase, progress, iterations, exploitability }: Props) {
  if (phase === "idle") return null;

  const phaseLabel = phase === "equity"
    ? "Computing equities"
    : phase === "cfr"
      ? "Running CFR"
      : "Solved";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">{phaseLabel}</span>
        <span className="text-zinc-500 tabular-nums">{progress.toFixed(0)}%</span>
      </div>

      {phase !== "done" && (
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              phase === "equity" ? "bg-blue-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}

      <div className="flex gap-4 text-[10px] text-zinc-500">
        {iterations > 0 && (
          <span>Iterations: <span className="text-zinc-300">{iterations.toLocaleString()}</span></span>
        )}
        {exploitability > 0 && (
          <span>Exploitability: <span className="text-zinc-300">{exploitability.toFixed(4)}</span></span>
        )}
      </div>
    </div>
  );
}
