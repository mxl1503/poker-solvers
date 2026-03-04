import { GameNode, RakeConfig, SidePot } from "./types";
import { buildSidePots, totalPot } from "./sidePots";
import { applyRake } from "./rake";

export interface TerminalPayouts {
  payoffs: number[];   // net chip change per player (can be negative)
  sidePots: SidePot[];
  totalRake: number;
  potTotal: number;
}

/**
 * Compute payoffs at a fold-win terminal: the sole remaining player wins the pot minus rake.
 */
export function computeFoldWinPayoffs(node: GameNode, rakeConfig: RakeConfig): TerminalPayouts {
  const pots = buildSidePots(node.players);
  const { pots: rakedPots, totalRake } = applyRake(pots, rakeConfig);
  const potTotal = totalPot(node.players);

  const payoffs = node.players.map((p) => -p.committed);

  const winnerIdx = node.winnerIndex!;
  const totalWinnings = rakedPots.reduce((s, p) => s + p.amount, 0);
  payoffs[winnerIdx] += totalWinnings;

  return { payoffs, sidePots: rakedPots, totalRake, potTotal };
}

/**
 * Compute payoffs at a showdown terminal given equity shares per player per side pot.
 * equityShares[i] = player i's equity share (0-1) of pots they're eligible for.
 *
 * For the solver, equities are provided by the equity engine.
 * This function handles side-pot distribution and rake.
 */
export function computeShowdownPayoffs(
  node: GameNode,
  equityShares: number[],
  rakeConfig: RakeConfig,
): TerminalPayouts {
  const pots = buildSidePots(node.players);
  const { pots: rakedPots, totalRake } = applyRake(pots, rakeConfig);
  const potTotal = totalPot(node.players);

  const payoffs = node.players.map((p) => -p.committed);

  for (const pot of rakedPots) {
    const eligible = pot.eligiblePlayerIndices;
    const totalEq = eligible.reduce((s, i) => s + equityShares[i], 0);
    if (totalEq === 0) {
      // Split equally
      const share = pot.amount / eligible.length;
      for (const i of eligible) payoffs[i] += share;
    } else {
      for (const i of eligible) {
        payoffs[i] += pot.amount * (equityShares[i] / totalEq);
      }
    }
  }

  return { payoffs, sidePots: rakedPots, totalRake, potTotal };
}
