import { GameNode, GameTree, Action } from "./types";
import { createInitialNode, applyAction, resetNodeIds } from "./gameState";

export function buildGameTree(
  playerCount: 2 | 3 | 4,
  stacks: number[],
  sb: number,
  bb: number,
): GameTree {
  resetNodeIds();
  const nodes: GameNode[] = [];
  const root = createInitialNode(playerCount, stacks, sb, bb);
  nodes.push(root);

  function expand(node: GameNode): void {
    if (node.isTerminal) return;

    for (const action of ["fold", "jam"] as Action[]) {
      const child = applyAction(node, action);
      node.children.push({ action, nodeId: child.id });
      nodes.push(child);
      expand(child);
    }
  }

  expand(root);
  return { nodes, root: root.id, playerCount };
}

export function getNode(tree: GameTree, nodeId: number): GameNode {
  return tree.nodes[nodeId];
}

/**
 * Get the info set key for a node's acting player with a given hand group.
 * Format: "P{playerIndex}|{actionHistory}|h{handGroup}"
 */
export function infoSetKey(node: GameNode, handGroup: number): string {
  const historyStr = node.actionHistory.length > 0
    ? node.actionHistory.join(",")
    : "root";
  return `P${node.actingPlayerIndex}|${historyStr}|h${handGroup}`;
}
