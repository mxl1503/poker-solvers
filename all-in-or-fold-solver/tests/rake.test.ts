import { describe, it, expect } from "vitest";
import { applyRake } from "../src/engine/rake";
import { RakeConfig, SidePot, DEFAULT_RAKE } from "../src/engine/types";

function pot(amount: number, eligible: number[]): SidePot {
  return { amount, eligiblePlayerIndices: eligible };
}

function cfg(overrides: Partial<RakeConfig> = {}): RakeConfig {
  return { ...DEFAULT_RAKE, ...overrides };
}

describe("applyRake", () => {
  it("no rake mode returns pots unchanged", () => {
    const pots = [pot(100, [0, 1])];
    const result = applyRake(pots, cfg({ mode: "none" }));
    expect(result.totalRake).toBe(0);
    expect(result.pots[0].amount).toBe(100);
  });

  it("percent rake on total pot", () => {
    const pots = [pot(100, [0, 1])];
    const result = applyRake(pots, cfg({ mode: "percent", percent: 0.05, perPot: false }));
    expect(result.totalRake).toBe(5);
    expect(result.pots[0].amount).toBeCloseTo(95);
  });

  it("percent with cap", () => {
    const pots = [pot(1000, [0, 1])];
    const result = applyRake(pots, cfg({ mode: "percent_cap", percent: 0.05, cap: 10, perPot: false }));
    expect(result.totalRake).toBe(10);
    expect(result.pots[0].amount).toBeCloseTo(990);
  });

  it("percent cap not reached", () => {
    const pots = [pot(100, [0, 1])];
    const result = applyRake(pots, cfg({ mode: "percent_cap", percent: 0.05, cap: 10, perPot: false }));
    expect(result.totalRake).toBe(5);
    expect(result.pots[0].amount).toBeCloseTo(95);
  });

  it("fixed drop", () => {
    const pots = [pot(200, [0, 1])];
    const result = applyRake(pots, cfg({ mode: "fixed", fixedDrop: 3, perPot: false }));
    expect(result.totalRake).toBe(3);
    expect(result.pots[0].amount).toBeCloseTo(197);
  });

  it("threshold: pot below threshold pays no rake", () => {
    const pots = [pot(5, [0, 1])];
    const result = applyRake(pots, cfg({ mode: "threshold", percent: 0.1, minPotThreshold: 20, perPot: false }));
    expect(result.totalRake).toBe(0);
    expect(result.pots[0].amount).toBe(5);
  });

  it("threshold: pot above threshold pays rake", () => {
    const pots = [pot(100, [0, 1])];
    const result = applyRake(pots, cfg({ mode: "threshold", percent: 0.1, cap: 5, minPotThreshold: 20, perPot: false }));
    expect(result.totalRake).toBe(5);
    expect(result.pots[0].amount).toBeCloseTo(95);
  });

  it("no flop no drop with rakePreflop=false means no rake", () => {
    const pots = [pot(100, [0, 1])];
    const result = applyRake(pots, cfg({ mode: "percent", percent: 0.05, noFlopNoDrop: true, rakePreflop: false }));
    expect(result.totalRake).toBe(0);
  });

  it("no flop no drop with rakePreflop=true means rake applies", () => {
    const pots = [pot(100, [0, 1])];
    const result = applyRake(pots, cfg({ mode: "percent", percent: 0.05, noFlopNoDrop: true, rakePreflop: true }));
    expect(result.totalRake).toBe(5);
  });

  it("perPot rakes each side pot independently", () => {
    const pots = [pot(60, [0, 1, 2]), pot(40, [1, 2])];
    const result = applyRake(pots, cfg({ mode: "percent", percent: 0.1, perPot: true }));
    expect(result.totalRake).toBeCloseTo(10);
    expect(result.pots[0].amount).toBeCloseTo(54);
    expect(result.pots[1].amount).toBeCloseTo(36);
  });

  it("total pot rake distributes proportionally across side pots", () => {
    const pots = [pot(60, [0, 1, 2]), pot(40, [1, 2])];
    const result = applyRake(pots, cfg({ mode: "percent", percent: 0.1, perPot: false }));
    expect(result.totalRake).toBeCloseTo(10);
    // 60% of 90 = 54, 40% of 90 = 36
    expect(result.pots[0].amount).toBeCloseTo(54);
    expect(result.pots[1].amount).toBeCloseTo(36);
  });
});
