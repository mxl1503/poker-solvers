import { PlayerState, SidePot } from "./types";

/**
 * Build side pots from player committed amounts.
 * Only non-folded players are eligible for pots.
 * Folded players' committed chips go into the pot(s) but they can't win.
 */
export function buildSidePots(players: PlayerState[]): SidePot[] {
  // Collect contributions from all players (including folded ones contribute to pot)
  const entries = players.map((p, i) => ({
    index: i,
    committed: p.committed,
    folded: p.status === "folded",
  }));

  // Sort non-folded by committed ascending for layering
  const nonFolded = entries
    .filter((e) => !e.folded)
    .sort((a, b) => a.committed - b.committed);

  if (nonFolded.length === 0) return [];
  if (nonFolded.length === 1) {
    // Only one non-folded player, they get everything
    const total = entries.reduce((s, e) => s + e.committed, 0);
    return [{ amount: total, eligiblePlayerIndices: [nonFolded[0].index] }];
  }

  const pots: SidePot[] = [];
  let prevLevel = 0;

  for (let i = 0; i < nonFolded.length; i++) {
    const currentLevel = nonFolded[i].committed;
    if (currentLevel <= prevLevel) continue;

    const layerSize = currentLevel - prevLevel;
    let potAmount = 0;

    // Every player who committed at least currentLevel contributes layerSize
    // Players who committed less than currentLevel contribute what they can above prevLevel
    for (const e of entries) {
      const contribution = Math.min(e.committed, currentLevel) - Math.min(e.committed, prevLevel);
      potAmount += Math.max(0, contribution);
    }

    // Eligible = non-folded players who committed at least currentLevel
    const eligible = nonFolded
      .filter((e) => e.committed >= currentLevel)
      .map((e) => e.index);

    if (potAmount > 0 && eligible.length > 0) {
      pots.push({ amount: potAmount, eligiblePlayerIndices: eligible });
    }

    prevLevel = currentLevel;
  }

  return pots;
}

export function totalPot(players: PlayerState[]): number {
  return players.reduce((s, p) => s + p.committed, 0);
}
