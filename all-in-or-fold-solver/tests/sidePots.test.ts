import { describe, it, expect } from "vitest";
import { buildSidePots, totalPot } from "../src/engine/sidePots";
import { PlayerState } from "../src/engine/types";

function p(committed: number, status: "active" | "folded" | "allin" = "allin"): PlayerState {
  return { stack: 0, committed, status, position: "BB" };
}

describe("buildSidePots", () => {
  it("two players equal stacks all-in", () => {
    const players = [p(100), p(100)];
    const pots = buildSidePots(players);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(200);
    expect(pots[0].eligiblePlayerIndices).toEqual([0, 1]);
  });

  it("two players unequal stacks", () => {
    const players = [p(50), p(100)];
    const pots = buildSidePots(players);
    expect(pots).toHaveLength(2);
    expect(pots[0].amount).toBe(100);
    expect(pots[0].eligiblePlayerIndices).toEqual([0, 1]);
    expect(pots[1].amount).toBe(50);
    expect(pots[1].eligiblePlayerIndices).toEqual([1]);
  });

  it("three players all different stacks", () => {
    const players = [p(30), p(60), p(100)];
    const pots = buildSidePots(players);
    expect(pots).toHaveLength(3);
    // Main pot: 30 * 3 = 90
    expect(pots[0].amount).toBe(90);
    expect(pots[0].eligiblePlayerIndices).toEqual([0, 1, 2]);
    // Side pot 1: (60-30) * 2 = 60
    expect(pots[1].amount).toBe(60);
    expect(pots[1].eligiblePlayerIndices).toEqual([1, 2]);
    // Side pot 2: (100-60) * 1 = 40
    expect(pots[2].amount).toBe(40);
    expect(pots[2].eligiblePlayerIndices).toEqual([2]);
  });

  it("handles folded players contributing to pot", () => {
    const players = [
      p(50, "folded"),
      p(100),
      p(100),
    ];
    const pots = buildSidePots(players);
    // Only players 1,2 are non-folded; both committed 100
    // Player 0 folded but contributed 50
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(250);
    expect(pots[0].eligiblePlayerIndices).toEqual([1, 2]);
  });

  it("folded player with less than smallest all-in", () => {
    const players = [
      p(20, "folded"),
      p(50),
      p(100),
    ];
    const pots = buildSidePots(players);
    expect(pots).toHaveLength(2);
    // Main pot: 20 (from folded) + 50 + 50 = 120
    expect(pots[0].amount).toBe(120);
    expect(pots[0].eligiblePlayerIndices).toEqual([1, 2]);
    // Side pot: 50 from player 2
    expect(pots[1].amount).toBe(50);
    expect(pots[1].eligiblePlayerIndices).toEqual([2]);
  });

  it("single non-folded player wins everything", () => {
    const players = [
      p(50, "folded"),
      p(30, "folded"),
      p(100),
    ];
    const pots = buildSidePots(players);
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(180);
    expect(pots[0].eligiblePlayerIndices).toEqual([2]);
  });

  it("four players with various stacks", () => {
    const players = [p(10), p(20), p(30), p(40)];
    const pots = buildSidePots(players);
    expect(pots).toHaveLength(4);
    expect(pots[0].amount).toBe(40);  // 10 * 4
    expect(pots[1].amount).toBe(30);  // 10 * 3
    expect(pots[2].amount).toBe(20);  // 10 * 2
    expect(pots[3].amount).toBe(10);  // 10 * 1
  });
});

describe("totalPot", () => {
  it("sums all committed amounts", () => {
    const players = [p(50), p(100), p(75)];
    expect(totalPot(players)).toBe(225);
  });
});
