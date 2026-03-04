import { cardIndex } from "./cards";
import { NUM_RANKS, NUM_SUITS } from "./types";

export const HAND_RANKS = [
  "A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2",
] as const;

export const NUM_HAND_GROUPS = NUM_RANKS * NUM_RANKS;

export function getHandLabel(row: number, col: number): string {
  const r1 = HAND_RANKS[row];
  const r2 = HAND_RANKS[col];
  if (row === col) return `${r1}${r2}`;
  if (row < col) return `${r1}${r2}s`;
  return `${r2}${r1}o`;
}

export function getHandType(row: number, col: number): "pair" | "suited" | "offsuit" {
  if (row === col) return "pair";
  return row < col ? "suited" : "offsuit";
}

export function handGroupIndex(row: number, col: number): number {
  return row * NUM_RANKS + col;
}

export function handGroupFromIndex(idx: number): { row: number; col: number } {
  return { row: Math.floor(idx / NUM_RANKS), col: idx % NUM_RANKS };
}

/**
 * Get all specific combos for a given hand group, returned as pairs of card indices.
 */
export function combosForHandGroup(hg: number): [number, number][] {
  const { row, col } = handGroupFromIndex(hg);
  const rank1 = (NUM_RANKS - 1) - row;
  const rank2 = (NUM_RANKS - 1) - col;
  const pairs: [number, number][] = [];

  if (row === col) {
    for (let s1 = 0; s1 < NUM_SUITS; s1++) {
      for (let s2 = s1 + 1; s2 < NUM_SUITS; s2++) {
        pairs.push([cardIndex(rank1, s1), cardIndex(rank1, s2)]);
      }
    }
  } else if (row < col) {
    for (let s = 0; s < NUM_SUITS; s++) {
      pairs.push([cardIndex(rank1, s), cardIndex(rank2, s)]);
    }
  } else {
    for (let s1 = 0; s1 < NUM_SUITS; s1++) {
      for (let s2 = 0; s2 < NUM_SUITS; s2++) {
        if (s1 !== s2) {
          pairs.push([cardIndex(rank1, s1), cardIndex(rank2, s2)]);
        }
      }
    }
  }
  return pairs;
}
