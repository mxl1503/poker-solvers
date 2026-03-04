import { describe, it, expect } from "vitest";
import { computeHUEquityMatrix, computeMultiwayEquity } from "../src/engine/equity";
import { NUM_HAND_GROUPS, handGroupIndex } from "../src/engine/hands";

describe("computeHUEquityMatrix", () => {
  it("AA vs KK should be roughly 80-83%", () => {
    // AA = hand group at row=0, col=0 (pair on diagonal, A=row 0)
    const aaIdx = handGroupIndex(0, 0); // AA
    const kkIdx = handGroupIndex(1, 1); // KK

    const matrix = computeHUEquityMatrix(50);
    const aaEq = matrix[aaIdx * NUM_HAND_GROUPS + kkIdx];

    // AA vs KK should be ~81-82%, with low samples allow wider range
    expect(aaEq).toBeGreaterThan(0.65);
    expect(aaEq).toBeLessThan(0.95);
  });

  it("equity is symmetric: eq[i][j] + eq[j][i] ≈ 1", () => {
    const matrix = computeHUEquityMatrix(20);
    const i = handGroupIndex(0, 0); // AA
    const j = handGroupIndex(1, 1); // KK
    const sum = matrix[i * NUM_HAND_GROUPS + j] + matrix[j * NUM_HAND_GROUPS + i];
    expect(sum).toBeCloseTo(1, 1);
  });

  it("same hand vs same hand should be ~50/50", () => {
    const matrix = computeHUEquityMatrix(30);
    const aaIdx = handGroupIndex(0, 0);
    const eq = matrix[aaIdx * NUM_HAND_GROUPS + aaIdx];
    expect(eq).toBeGreaterThan(0.3);
    expect(eq).toBeLessThan(0.7);
  });
});

describe("computeMultiwayEquity", () => {
  it("three-way equity shares sum to ~1", () => {
    const aa = handGroupIndex(0, 0);
    const kk = handGroupIndex(1, 1);
    const qq = handGroupIndex(2, 2);
    const eqs = computeMultiwayEquity([aa, kk, qq], 200);
    const sum = eqs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 1);
  });

  it("AA has highest equity in AA vs KK vs QQ", () => {
    const aa = handGroupIndex(0, 0);
    const kk = handGroupIndex(1, 1);
    const qq = handGroupIndex(2, 2);
    const eqs = computeMultiwayEquity([aa, kk, qq], 500);
    expect(eqs[0]).toBeGreaterThan(eqs[1]);
    expect(eqs[0]).toBeGreaterThan(eqs[2]);
  });
});
