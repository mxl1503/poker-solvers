import { describe, it, expect } from "vitest";
import { computeFoldWinPayoffs, computeShowdownPayoffs } from "../src/engine/terminal";
import { GameNode, DEFAULT_RAKE, RakeConfig } from "../src/engine/types";

const noRake: RakeConfig = { ...DEFAULT_RAKE, mode: "none" };

function makeTerminalNode(
  committed: number[],
  statuses: ("active" | "folded" | "allin")[],
  winnerIndex?: number,
): GameNode {
  return {
    id: 0,
    players: committed.map((c, i) => ({
      stack: 0,
      committed: c,
      status: statuses[i],
      position: "BB" as const,
    })),
    actingPlayerIndex: null,
    actionHistory: [],
    sb: 0.5,
    bb: 1,
    isTerminal: true,
    terminalType: winnerIndex !== undefined ? "fold-win" : "showdown",
    winnerIndex,
    children: [],
  };
}

describe("computeFoldWinPayoffs", () => {
  it("HU: SB folds, BB wins SB+BB", () => {
    const node = makeTerminalNode([0.5, 1], ["folded", "active"], 1);
    const result = computeFoldWinPayoffs(node, noRake);
    expect(result.payoffs[0]).toBeCloseTo(-0.5);
    expect(result.payoffs[1]).toBeCloseTo(0.5);
    expect(result.potTotal).toBeCloseTo(1.5);
  });

  it("3-way: two fold, one wins", () => {
    const node = makeTerminalNode([20, 10, 1], ["folded", "folded", "active"], 2);
    const result = computeFoldWinPayoffs(node, noRake);
    expect(result.payoffs[0]).toBeCloseTo(-20);
    expect(result.payoffs[1]).toBeCloseTo(-10);
    expect(result.payoffs[2]).toBeCloseTo(30);
  });

  it("fold-win with rake", () => {
    const rake: RakeConfig = { ...DEFAULT_RAKE, mode: "percent", percent: 0.1, rakePreflop: true };
    const node = makeTerminalNode([50, 50], ["folded", "allin"], 1);
    const result = computeFoldWinPayoffs(node, rake);
    expect(result.totalRake).toBeCloseTo(10);
    expect(result.payoffs[1]).toBeCloseTo(40);
    expect(result.payoffs[0]).toBeCloseTo(-50);
  });
});

describe("computeShowdownPayoffs", () => {
  it("HU showdown even equity splits pot", () => {
    const node = makeTerminalNode([100, 100], ["allin", "allin"]);
    const result = computeShowdownPayoffs(node, [0.5, 0.5], noRake);
    expect(result.payoffs[0]).toBeCloseTo(0);
    expect(result.payoffs[1]).toBeCloseTo(0);
  });

  it("HU showdown 80/20 equity", () => {
    const node = makeTerminalNode([100, 100], ["allin", "allin"]);
    const result = computeShowdownPayoffs(node, [0.8, 0.2], noRake);
    expect(result.payoffs[0]).toBeCloseTo(60);
    expect(result.payoffs[1]).toBeCloseTo(-60);
  });

  it("unequal stacks with side pots", () => {
    const node = makeTerminalNode([50, 100], ["allin", "allin"]);
    // Player 0 has 100% equity
    const result = computeShowdownPayoffs(node, [1, 0], noRake);
    // Main pot: 100 (50+50) -> player 0 wins
    // Side pot: 50 -> only player 1 eligible
    expect(result.payoffs[0]).toBeCloseTo(50);
    expect(result.payoffs[1]).toBeCloseTo(-50);
  });

  it("3-way with side pots and equity", () => {
    const node = makeTerminalNode([30, 60, 100], ["allin", "allin", "allin"]);
    // Player 2 wins everything
    const result = computeShowdownPayoffs(node, [0, 0, 1], noRake);
    expect(result.payoffs[0]).toBeCloseTo(-30);
    expect(result.payoffs[1]).toBeCloseTo(-60);
    expect(result.payoffs[2]).toBeCloseTo(90);
  });

  it("showdown with rake", () => {
    const rake: RakeConfig = { ...DEFAULT_RAKE, mode: "percent", percent: 0.05, rakePreflop: true };
    const node = makeTerminalNode([100, 100], ["allin", "allin"]);
    const result = computeShowdownPayoffs(node, [1, 0], rake);
    // Pot = 200, rake = 10, net pot = 190
    expect(result.totalRake).toBeCloseTo(10);
    expect(result.payoffs[0]).toBeCloseTo(90);
    expect(result.payoffs[1]).toBeCloseTo(-100);
  });
});
