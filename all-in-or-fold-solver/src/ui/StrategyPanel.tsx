import { useMemo } from "react";
import { GameNode, NodeStrategy, SolverResult } from "../engine/types";
import { NUM_HAND_GROUPS, getHandLabel, handGroupFromIndex } from "../engine/hands";
import HandMatrix from "./HandMatrix";
import SolverStatus from "./SolverStatus";
import { BTN_SMALL_CLASS, SECTION_CARD_CLASS } from "./styles";

interface Props {
  node: GameNode | null;
  strategy: NodeStrategy | null;
  solverPhase: "idle" | "equity" | "cfr" | "done";
  solverProgress: number;
  solverIterations: number;
  solverExploitability: number;
  fullResult?: SolverResult | null;
  errorMessage?: string | null;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StrategyPanel({
  node,
  strategy,
  solverPhase,
  solverProgress,
  solverIterations,
  solverExploitability,
  fullResult,
  errorMessage,
}: Props) {
  const jamFreqs: Record<string, number> = useMemo(() => {
    if (!strategy) return {};
    const result: Record<string, number> = {};
    for (let hg = 0; hg < NUM_HAND_GROUPS; hg++) {
      const { row, col } = handGroupFromIndex(hg);
      const label = getHandLabel(row, col);
      result[label] = strategy.jamFrequency[hg] ?? 0;
    }
    return result;
  }, [strategy]);

  const evData = useMemo(() => {
    if (!strategy) return [];
    const entries: { label: string; jam: number; evFold: number; evJam: number; evDiff: number }[] = [];
    for (let hg = 0; hg < NUM_HAND_GROUPS; hg++) {
      const { row, col } = handGroupFromIndex(hg);
      entries.push({
        label: getHandLabel(row, col),
        jam: strategy.jamFrequency[hg] ?? 0,
        evFold: strategy.evFold[hg] ?? 0,
        evJam: strategy.evJam[hg] ?? 0,
        evDiff: (strategy.evJam[hg] ?? 0) - (strategy.evFold[hg] ?? 0),
      });
    }
    entries.sort((a, b) => b.jam - a.jam);
    return entries;
  }, [strategy]);

  const aggJam = useMemo(() => {
    if (!strategy) return 0;
    let total = 0;
    let count = 0;
    for (let hg = 0; hg < NUM_HAND_GROUPS; hg++) {
      total += strategy.jamFrequency[hg] ?? 0;
      count++;
    }
    return count > 0 ? total / count : 0;
  }, [strategy]);

  if (!node) {
    return (
      <div className="p-6 text-center text-zinc-500 text-sm">
        Select a node to view strategy.
      </div>
    );
  }

  if (node.isTerminal) {
    return (
      <div className="p-6 text-center text-zinc-500 text-sm">
        Terminal node — no strategy to display.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <SolverStatus
        phase={solverPhase}
        progress={solverProgress}
        iterations={solverIterations}
        exploitability={solverExploitability}
      />

      {errorMessage && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-400">
          Solver error: {errorMessage}
        </div>
      )}

      {!strategy && solverPhase === "idle" && !errorMessage && (
        <div className="text-center text-zinc-500 text-sm py-6">
          Click <span className="text-emerald-400 font-medium">Solve</span> to compute strategies.
        </div>
      )}

      {!strategy && (solverPhase === "equity" || solverPhase === "cfr") && (
        <div className="text-center text-zinc-400 text-sm py-6 animate-pulse">
          Computing strategies...
        </div>
      )}

      {strategy && (
        <>
          {/* Export buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const data = evData.map((e) => ({
                  hand: e.label,
                  jamPct: +(e.jam * 100).toFixed(2),
                  evFold: +e.evFold.toFixed(4),
                  evJam: +e.evJam.toFixed(4),
                  evDiff: +e.evDiff.toFixed(4),
                }));
                downloadFile(JSON.stringify(data, null, 2), "strategy.json", "application/json");
              }}
              className={BTN_SMALL_CLASS}
            >
              Export JSON
            </button>
            <button
              onClick={() => {
                const header = "Hand,Jam%,EV(Fold),EV(Jam),Diff";
                const rows = evData.map((e) =>
                  `${e.label},${(e.jam * 100).toFixed(2)},${e.evFold.toFixed(4)},${e.evJam.toFixed(4)},${e.evDiff.toFixed(4)}`
                );
                downloadFile([header, ...rows].join("\n"), "strategy.csv", "text/csv");
              }}
              className={BTN_SMALL_CLASS}
            >
              Export CSV
            </button>
            {fullResult && (
              <button
                onClick={() => {
                  const obj = {
                    iterations: fullResult.iterations,
                    exploitability: fullResult.exploitability,
                    strategies: Object.fromEntries(fullResult.nodeStrategies),
                  };
                  downloadFile(JSON.stringify(obj, null, 2), "full_solution.json", "application/json");
                }}
                className={BTN_SMALL_CLASS}
              >
                Export Full Solution
              </button>
            )}
          </div>

          {/* Aggregate summary */}
          <div className={`${SECTION_CARD_CLASS} p-3 space-y-2`}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">
                {node.players[node.actingPlayerIndex!].position} Aggregate Jam
              </span>
              <span className="text-emerald-400 font-bold tabular-nums">
                {(aggJam * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-emerald-500 rounded-full transition-all"
                style={{ width: `${aggJam * 100}%` }}
              />
            </div>
          </div>

          {/* Hand matrix */}
          <div className={`${SECTION_CARD_CLASS} p-3`}>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Jam Frequency by Hand
            </h3>
            <HandMatrix jamFrequencies={jamFreqs} evData={strategy} />
          </div>

          {/* EV table */}
          <div className={`${SECTION_CARD_CLASS} p-3`}>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Per-Hand EV
            </h3>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900">
                  <tr className="text-zinc-500 border-b border-zinc-700">
                    <th className="py-1 text-left font-medium">Hand</th>
                    <th className="py-1 text-right font-medium">Jam%</th>
                    <th className="py-1 text-right font-medium">EV(Fold)</th>
                    <th className="py-1 text-right font-medium">EV(Jam)</th>
                    <th className="py-1 text-right font-medium">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {evData.map((e) => (
                    <tr key={e.label} className="border-b border-zinc-800/50 text-zinc-300">
                      <td className="py-1 font-medium">{e.label}</td>
                      <td className="py-1 text-right tabular-nums">
                        <span className={e.jam > 0.5 ? "text-emerald-400" : e.jam > 0 ? "text-amber-400" : "text-zinc-500"}>
                          {(e.jam * 100).toFixed(1)}
                        </span>
                      </td>
                      <td className="py-1 text-right tabular-nums">{e.evFold.toFixed(2)}</td>
                      <td className="py-1 text-right tabular-nums">{e.evJam.toFixed(2)}</td>
                      <td className={`py-1 text-right tabular-nums font-medium ${e.evDiff > 0 ? "text-emerald-400" : e.evDiff < 0 ? "text-red-400" : "text-zinc-500"}`}>
                        {e.evDiff > 0 ? "+" : ""}{e.evDiff.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
