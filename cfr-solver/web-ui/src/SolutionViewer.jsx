import { useState, useMemo, useCallback } from "react";
import HandMatrix from "./HandMatrix";
import { aggregateStrategies, getActionColor } from "./hands";

function NodeBreadcrumbs({ path, onNavigate }) {
  return (
    <div className="flex items-center gap-1 flex-wrap text-sm">
      {path.map((entry, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-zinc-600">&#9656;</span>}
          <button
            onClick={() => onNavigate(i)}
            className={`px-2 py-0.5 rounded transition-colors ${
              i === path.length - 1
                ? "bg-emerald-600/20 text-emerald-400 font-medium"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            {entry.label}
          </button>
        </span>
      ))}
    </div>
  );
}

function ActionButtons({ actions, children, onSelect }) {
  return (
    <div className="space-y-2">
      <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
        Actions
      </span>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, i) => {
          const childNode = children[i];
          const isTerminal = childNode?.terminal;
          const terminalLabel = isTerminal
            ? childNode.isFold
              ? ` (${childNode.player === 0 ? "OOP" : "IP"} wins)`
              : " (showdown)"
            : "";

          return (
            <button
              key={action}
              onClick={() => !isTerminal && onSelect(i)}
              disabled={isTerminal}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                isTerminal
                  ? "border-zinc-800 text-zinc-600 cursor-not-allowed"
                  : "border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 cursor-pointer"
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: getActionColor(i), opacity: isTerminal ? 0.3 : 1 }}
              />
              {action}
              {terminalLabel && (
                <span className="text-[10px] text-zinc-600">{terminalLabel}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AggregateBar({ actions, aggregated }) {
  const totals = useMemo(() => {
    const sums = new Array(actions.length).fill(0);
    let count = 0;
    for (const freqs of Object.values(aggregated)) {
      count++;
      for (let i = 0; i < freqs.length; i++) sums[i] += freqs[i];
    }
    return count > 0 ? sums.map((s) => s / count) : sums;
  }, [actions, aggregated]);

  return (
    <div className="space-y-2">
      <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
        Aggregate Strategy
      </span>
      <div className="h-5 flex rounded-md overflow-hidden">
        {totals.map((freq, i) =>
          freq > 0.001 ? (
            <div
              key={i}
              style={{
                width: `${freq * 100}%`,
                backgroundColor: getActionColor(i),
              }}
              className="relative group"
            >
              {freq > 0.08 && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white/90 drop-shadow">
                  {(freq * 100).toFixed(0)}%
                </span>
              )}
            </div>
          ) : null,
        )}
      </div>
      <div className="space-y-1">
        {actions.map((action, i) => (
          <div key={action} className="flex items-center gap-2 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: getActionColor(i) }}
            />
            <span className="text-zinc-400 flex-1">{action}</span>
            <span className="text-zinc-300 tabular-nums">
              {(totals[i] * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SolutionViewer() {
  const [solution, setSolution] = useState(null);
  const [path, setPath] = useState([]);

  const loadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.nodes || !data.meta) {
        throw new Error("Invalid solution JSON format.");
      }
      setSolution(data);
      setPath([{ nodeId: 0, label: "Root" }]);
    } catch (err) {
      alert("Failed to load solution: " + err.message);
    }
  };

  const currentNode = useMemo(() => {
    if (!solution || path.length === 0) return null;
    const nodeId = path[path.length - 1].nodeId;
    return solution.nodes[nodeId] ?? null;
  }, [solution, path]);

  const childNodes = useMemo(() => {
    if (!currentNode || !solution) return [];
    return currentNode.children.map((id) => solution.nodes[id]);
  }, [currentNode, solution]);

  const aggregated = useMemo(() => {
    if (!currentNode?.strategy) return {};
    return aggregateStrategies(currentNode.strategy, currentNode.actions);
  }, [currentNode]);

  const navigateTo = useCallback(
    (pathIndex) => {
      setPath((prev) => prev.slice(0, pathIndex + 1));
    },
    [],
  );

  const selectAction = useCallback(
    (actionIndex) => {
      if (!currentNode) return;
      const childId = currentNode.children[actionIndex];
      const child = solution.nodes[childId];
      if (!child || child.terminal) return;
      const label = currentNode.actions[actionIndex];
      setPath((prev) => [...prev, { nodeId: childId, label }]);
    },
    [currentNode, solution],
  );

  if (!solution) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-zinc-200">
            Solution Viewer
          </h2>
          <p className="text-sm text-zinc-500 max-w-md">
            Load a JSON solution file generated by the river-node solver
            (use the <code className="text-emerald-400">--json</code> flag).
          </p>
        </div>
        <label className="px-6 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer">
          Load Solution File
          <input
            type="file"
            accept="application/json"
            onChange={loadFile}
            className="hidden"
          />
        </label>
      </div>
    );
  }

  const { meta } = solution;
  const player =
    currentNode?.player === 0 ? "OOP" : currentNode?.player === 1 ? "IP" : "—";

  return (
    <div className="space-y-4">
      {/* Meta header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="text-zinc-400">
              Board:{" "}
              <span className="text-zinc-100 font-medium">{meta.board}</span>
            </span>
            <span className="text-zinc-400">
              Pot:{" "}
              <span className="text-zinc-100 font-medium">{meta.pot} bb</span>
            </span>
            <span className="text-zinc-400">
              Stack:{" "}
              <span className="text-zinc-100 font-medium">{meta.stack} bb</span>
            </span>
            <span className="text-zinc-400">
              EV (OOP):{" "}
              <span className="text-emerald-400 font-medium">
                {meta.gameValueOop?.toFixed(4)} bb
              </span>
            </span>
            <span className="text-zinc-400">
              Iters:{" "}
              <span className="text-zinc-100 font-medium">
                {meta.iterations?.toLocaleString()}
              </span>
            </span>
          </div>
          <label className="px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer border border-zinc-700">
            Load Another
            <input
              type="file"
              accept="application/json"
              onChange={loadFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <NodeBreadcrumbs path={path} onNavigate={navigateTo} />
        {currentNode && !currentNode.terminal && (
          <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
            <span>
              Player:{" "}
              <span
                className={`font-medium ${player === "OOP" ? "text-cyan-400" : "text-amber-400"}`}
              >
                {player}
              </span>
            </span>
            <span>
              Pot:{" "}
              <span className="text-zinc-200">
                {currentNode.pot.toFixed(1)} bb
              </span>
            </span>
            <span>
              Stacks:{" "}
              <span className="text-zinc-200">
                {currentNode.stacks[0].toFixed(1)} /{" "}
                {currentNode.stacks[1].toFixed(1)} bb
              </span>
            </span>
          </div>
        )}
      </div>

      {currentNode && !currentNode.terminal && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Hand matrix */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-200">
              Strategy Matrix
            </h3>
            <HandMatrix
              aggregated={aggregated}
              actions={currentNode.actions}
            />
          </div>

          {/* Sidebar: actions + aggregate */}
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <ActionButtons
                actions={currentNode.actions}
                children={childNodes}
                onSelect={selectAction}
              />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <AggregateBar
                actions={currentNode.actions}
                aggregated={aggregated}
              />
            </div>
          </div>
        </div>
      )}

      {currentNode?.terminal && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center space-y-2">
          <div className="text-lg font-semibold text-zinc-200">
            {currentNode.isFold ? "Fold" : "Showdown"}
          </div>
          <div className="text-sm text-zinc-400">
            {currentNode.isFold
              ? `${currentNode.player === 0 ? "OOP" : "IP"} wins the pot (${currentNode.pot.toFixed(1)} bb)`
              : `Pot goes to showdown (${currentNode.pot.toFixed(1)} bb)`}
          </div>
          <button
            onClick={() => navigateTo(path.length - 2)}
            className="mt-2 px-4 py-1.5 rounded-lg text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            Go Back
          </button>
        </div>
      )}
    </div>
  );
}
