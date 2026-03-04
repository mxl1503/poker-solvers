import {
  Action,
  GameNode,
  PlayerState,
  PlayerStatus,
  Position,
  POSITIONS_BY_COUNT,
} from "./types";

let nextNodeId = 0;

export function resetNodeIds(): void {
  nextNodeId = 0;
}

export function createInitialNode(
  playerCount: 2 | 3 | 4,
  stacks: number[],
  sb: number,
  bb: number,
): GameNode {
  const positions = POSITIONS_BY_COUNT[playerCount];
  const players: PlayerState[] = positions.map((pos, i) => {
    let committed = 0;
    if (pos === "SB") committed = Math.min(sb, stacks[i]);
    if (pos === "BB") committed = Math.min(bb, stacks[i]);
    return {
      stack: stacks[i] - committed,
      committed,
      status: "active" as PlayerStatus,
      position: pos,
    };
  });

  const actingIndex = 0; // first player in position order acts first
  const node: GameNode = {
    id: nextNodeId++,
    players,
    actingPlayerIndex: actingIndex,
    actionHistory: [],
    sb,
    bb,
    isTerminal: false,
    children: [],
  };
  return node;
}

export function applyAction(parent: GameNode, action: Action): GameNode {
  const idx = parent.actingPlayerIndex!;
  const players = parent.players.map((p) => ({ ...p }));
  const history = [...parent.actionHistory, action];

  if (action === "fold") {
    players[idx].status = "folded";
  } else {
    // Jam: commit entire remaining stack
    players[idx].committed += players[idx].stack;
    players[idx].stack = 0;
    players[idx].status = "allin";
  }

  const activePlayers = players.filter((p) => p.status === "active");
  const nonFolded = players.filter((p) => p.status !== "folded");

  let isTerminal = false;
  let terminalType: "fold-win" | "showdown" | undefined;
  let winnerIndex: number | undefined;
  let actingPlayerIndex: number | null = null;

  if (nonFolded.length === 1) {
    // Everyone else folded
    isTerminal = true;
    terminalType = "fold-win";
    winnerIndex = players.findIndex((p) => p.status !== "folded");
  } else if (activePlayers.length === 0) {
    // Everyone has acted (all remaining are allin or folded)
    isTerminal = true;
    terminalType = "showdown";
  } else {
    // Find next active player
    let next = idx + 1;
    while (next < players.length) {
      if (players[next].status === "active") {
        actingPlayerIndex = next;
        break;
      }
      next++;
    }
    if (actingPlayerIndex === null) {
      // No more active players to act — all remaining are allin
      isTerminal = true;
      terminalType = "showdown";
    }
  }

  return {
    id: nextNodeId++,
    players,
    actingPlayerIndex,
    actionHistory: history,
    sb: parent.sb,
    bb: parent.bb,
    isTerminal,
    terminalType,
    winnerIndex,
    children: [],
  };
}
