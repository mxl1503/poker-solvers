import { GameConfig, GameNode, GameTree } from "../engine/types";
import { getNode } from "../engine/gameTree";
import { buildSidePots, totalPot } from "../engine/sidePots";
import { NAV_BTN_CLASS, SECTION_CARD_CLASS } from "./styles";

interface Props {
  tree: GameTree | null;
  currentPath: number[];
  currentNode: GameNode | null;
  config: GameConfig;
  onNavigateTo: (nodeId: number) => void;
  onNavigateBack: () => void;
  onNavigateRoot: () => void;
  onNavigateToDepth: (depth: number) => void;
}

function Breadcrumbs({
  tree,
  path,
  onNavigate,
}: {
  tree: GameTree;
  path: number[];
  onNavigate: (depth: number) => void;
}) {
  const labels: string[] = path.map((nodeId, i) => {
    if (i === 0) return "Root";
    const parent = getNode(tree, path[i - 1]);
    const edge = parent.children.find((c) => c.nodeId === nodeId);
    const actorPos = parent.players[parent.actingPlayerIndex!]?.position ?? "?";
    return `${actorPos} ${edge?.action === "jam" ? "Jam" : "Fold"}`;
  });

  return (
    <div className="flex items-center gap-1 flex-wrap text-sm">
      {labels.map((label, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-zinc-600">&#9656;</span>}
          <button
            onClick={() => onNavigate(i)}
            className={`px-2 py-0.5 rounded transition-colors ${
              i === labels.length - 1
                ? "bg-emerald-600/20 text-emerald-400 font-medium"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            {label}
          </button>
        </span>
      ))}
    </div>
  );
}

export default function NodeExplorer({
  tree,
  currentPath,
  currentNode,
  config,
  onNavigateTo,
  onNavigateBack,
  onNavigateRoot,
  onNavigateToDepth,
}: Props) {
  if (!tree || !currentNode) {
    return (
      <div className="p-6 text-center text-zinc-500 text-sm">
        No game tree. Configure and apply settings.
      </div>
    );
  }

  const pot = totalPot(currentNode.players);
  const sidePots = currentNode.isTerminal ? buildSidePots(currentNode.players) : [];
  const nonFolded = currentNode.players.filter((p) => p.status !== "folded");
  const effectiveStack = nonFolded.length >= 2
    ? Math.min(...nonFolded.map((p) => p.stack + p.committed))
    : 0;

  return (
    <div className="p-4 space-y-4">
      {/* Breadcrumbs */}
      <Breadcrumbs
        tree={tree}
        path={currentPath}
        onNavigate={(depth) => onNavigateToDepth(depth)}
      />

      {/* Nav buttons */}
      <div className="flex gap-2">
        <button
          onClick={onNavigateBack}
          disabled={currentPath.length <= 1}
          className={NAV_BTN_CLASS}
        >
          &#8592; Back
        </button>
        <button
          onClick={onNavigateRoot}
          disabled={currentPath.length <= 1}
          className={NAV_BTN_CLASS}
        >
          Root
        </button>
      </div>

      {/* Node summary */}
      <div className={`${SECTION_CARD_CLASS} p-4 space-y-3`}>
        {currentNode.isTerminal ? (
          <div className="text-center space-y-2">
            <div className="text-lg font-semibold text-zinc-200">
              {currentNode.terminalType === "fold-win" ? "Fold Win" : "Showdown"}
            </div>
            <div className="text-sm text-zinc-400">
              {currentNode.terminalType === "fold-win"
                ? `${currentNode.players[currentNode.winnerIndex!].position} wins ${pot.toFixed(1)} chips`
                : `Showdown for ${pot.toFixed(1)} chips`}
            </div>
            {sidePots.length > 1 && (
              <div className="text-xs text-zinc-500">
                Side pots: {sidePots.map((sp, i) =>
                  `Pot ${i + 1}: ${sp.amount.toFixed(1)} (${sp.eligiblePlayerIndices.map((j) => currentNode.players[j].position).join(", ")})`
                ).join(" | ")}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-zinc-400">
                Acting:{" "}
                <span className="text-emerald-400 font-semibold">
                  {currentNode.players[currentNode.actingPlayerIndex!].position}
                </span>
              </span>
              <span className="text-zinc-400">
                Pot: <span className="text-zinc-200 font-medium">{pot.toFixed(1)}</span>
              </span>
              {effectiveStack > 0 && (
                <span className="text-zinc-400">
                  Eff: <span className="text-zinc-200 font-medium">{effectiveStack.toFixed(1)}</span>
                </span>
              )}
            </div>

            {/* Player table */}
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="py-1 text-left font-medium">Pos</th>
                  <th className="py-1 text-left font-medium">Status</th>
                  <th className="py-1 text-right font-medium">Committed</th>
                  <th className="py-1 text-right font-medium">Stack</th>
                </tr>
              </thead>
              <tbody>
                {currentNode.players.map((p, i) => (
                  <tr
                    key={i}
                    className={`border-b border-zinc-800/50 ${
                      i === currentNode.actingPlayerIndex ? "text-emerald-300" : "text-zinc-300"
                    }`}
                  >
                    <td className="py-1.5 font-medium">{p.position}</td>
                    <td className="py-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          p.status === "active"
                            ? "bg-emerald-900/40 text-emerald-400"
                            : p.status === "allin"
                              ? "bg-red-900/40 text-red-400"
                              : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {p.status === "allin" ? "ALL-IN" : p.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{p.committed.toFixed(1)}</td>
                    <td className="py-1.5 text-right tabular-nums">{p.stack.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              {currentNode.children.map(({ action, nodeId }) => {
                const child = getNode(tree, nodeId);
                const isTerminal = child.isTerminal;
                return (
                  <button
                    key={action}
                    onClick={() => onNavigateTo(nodeId)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      action === "jam"
                        ? "bg-red-600/20 border border-red-600/40 text-red-400 hover:bg-red-600/30"
                        : "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {action === "jam" ? "Jam (All-In)" : "Fold"}
                    {isTerminal && (
                      <span className="block text-[10px] font-normal opacity-60 mt-0.5">
                        {child.terminalType === "fold-win"
                          ? `${child.players[child.winnerIndex!].position} wins`
                          : "Showdown"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
