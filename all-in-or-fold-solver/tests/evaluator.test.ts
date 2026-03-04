import { describe, it, expect } from "vitest";
import { evaluate5, evaluate7, handCategory, CATEGORY_NAMES } from "../src/engine/evaluator";

// rank: 0=2, 1=3, ..., 8=T, 9=J, 10=Q, 11=K, 12=A
// suit: 0=c, 1=d, 2=h, 3=s

describe("evaluate5", () => {
  it("detects straight flush", () => {
    const hand: [number, number][] = [[8, 0], [9, 0], [10, 0], [11, 0], [12, 0]]; // T-A clubs
    const rank = evaluate5(hand);
    expect(handCategory(rank)).toBe(8);
  });

  it("detects four of a kind", () => {
    const hand: [number, number][] = [[12, 0], [12, 1], [12, 2], [12, 3], [0, 0]]; // AAAA2
    const rank = evaluate5(hand);
    expect(handCategory(rank)).toBe(7);
  });

  it("detects full house", () => {
    const hand: [number, number][] = [[12, 0], [12, 1], [12, 2], [11, 0], [11, 1]]; // AAAKK
    const rank = evaluate5(hand);
    expect(handCategory(rank)).toBe(6);
  });

  it("detects flush", () => {
    const hand: [number, number][] = [[12, 0], [10, 0], [7, 0], [3, 0], [1, 0]]; // A Q 9 5 3 clubs
    const rank = evaluate5(hand);
    expect(handCategory(rank)).toBe(5);
  });

  it("detects straight", () => {
    const hand: [number, number][] = [[4, 0], [5, 1], [6, 2], [7, 3], [8, 0]]; // 6-T
    const rank = evaluate5(hand);
    expect(handCategory(rank)).toBe(4);
  });

  it("detects wheel (A-5 straight)", () => {
    const hand: [number, number][] = [[12, 0], [0, 1], [1, 2], [2, 3], [3, 0]]; // A 2 3 4 5
    const rank = evaluate5(hand);
    expect(handCategory(rank)).toBe(4);
  });

  it("detects three of a kind", () => {
    const hand: [number, number][] = [[9, 0], [9, 1], [9, 2], [11, 3], [0, 0]]; // JJJ K 2
    const rank = evaluate5(hand);
    expect(handCategory(rank)).toBe(3);
  });

  it("detects two pair", () => {
    const hand: [number, number][] = [[12, 0], [12, 1], [11, 2], [11, 3], [0, 0]]; // AAKK2
    const rank = evaluate5(hand);
    expect(handCategory(rank)).toBe(2);
  });

  it("detects pair", () => {
    const hand: [number, number][] = [[12, 0], [12, 1], [10, 2], [9, 3], [0, 0]]; // AAQ J 2
    const rank = evaluate5(hand);
    expect(handCategory(rank)).toBe(1);
  });

  it("detects high card", () => {
    const hand: [number, number][] = [[12, 0], [10, 1], [7, 2], [5, 3], [1, 0]]; // A Q 9 7 3
    const rank = evaluate5(hand);
    expect(handCategory(rank)).toBe(0);
  });

  it("ranks hands correctly: SF > quads > full house > flush", () => {
    const sf: [number, number][] = [[8, 0], [9, 0], [10, 0], [11, 0], [12, 0]];
    const quads: [number, number][] = [[12, 0], [12, 1], [12, 2], [12, 3], [11, 0]];
    const fullHouse: [number, number][] = [[12, 0], [12, 1], [12, 2], [11, 0], [11, 1]];
    const flush: [number, number][] = [[12, 0], [10, 0], [7, 0], [3, 0], [1, 0]];

    expect(evaluate5(sf)).toBeGreaterThan(evaluate5(quads));
    expect(evaluate5(quads)).toBeGreaterThan(evaluate5(fullHouse));
    expect(evaluate5(fullHouse)).toBeGreaterThan(evaluate5(flush));
  });

  it("compares two high cards correctly", () => {
    const aceHigh: [number, number][] = [[12, 0], [10, 1], [7, 2], [5, 3], [1, 0]];
    const kingHigh: [number, number][] = [[11, 0], [10, 1], [7, 2], [5, 3], [1, 0]];
    expect(evaluate5(aceHigh)).toBeGreaterThan(evaluate5(kingHigh));
  });
});

describe("evaluate7", () => {
  it("picks best 5-card hand from 7 cards", () => {
    // Hold: AA, Board: K Q J T 2 (should detect broadway straight or pair of aces)
    const cards: [number, number][] = [
      [12, 0], [12, 1],  // AA
      [11, 2], [10, 3], [9, 0], [8, 1], [0, 2],  // K Q J T 2
    ];
    const rank = evaluate7(cards);
    // Best hand should be A-high straight (AKQJT)
    expect(handCategory(rank)).toBe(4); // straight
  });

  it("finds full house from 7 cards", () => {
    const cards: [number, number][] = [
      [12, 0], [12, 1],  // AA
      [11, 0], [11, 1], [11, 2],  // KKK
      [0, 0], [1, 0],  // 2 3
    ];
    const rank = evaluate7(cards);
    // Best: KKK AA (full house)
    expect(handCategory(rank)).toBe(6);
  });
});
