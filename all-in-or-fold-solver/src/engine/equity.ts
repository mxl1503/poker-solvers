import { evaluate7 } from "./evaluator";
import { NUM_HAND_GROUPS, combosForHandGroup } from "./hands";
import { cardFromIndex } from "./cards";
import { DECK_SIZE, BOARD_CARDS } from "./types";

/**
 * Precomputed equity matrix for heads-up preflop all-in.
 * equityMatrix[i * 169 + j] = probability that hand group i beats hand group j.
 * Symmetric: eq[i][j] + eq[j][i] + tie_share = 1.
 */
export type EquityMatrix = Float64Array;

function buildDeckIndices(): number[] {
  return Array.from({ length: DECK_SIZE }, (_, i) => i);
}

function cardsOverlap(a: number[], b: number[]): boolean {
  for (const x of a) {
    if (b.includes(x)) return true;
  }
  return false;
}

/**
 * Compute equity of hand group i vs hand group j via Monte Carlo.
 * Returns [win_rate_i, win_rate_j] (they sum to ~1, ties split).
 */
function mcEquityHU(
  hg1: number,
  hg2: number,
  samples: number,
): [number, number] {
  const combos1 = combosForHandGroup(hg1);
  const combos2 = combosForHandGroup(hg2);

  let totalWin1 = 0;
  let totalWin2 = 0;
  let totalTie = 0;
  let totalCount = 0;

  // For each valid pair of specific combos, run MC boards
  const samplesPerCombo = Math.max(1, Math.ceil(samples / (combos1.length * combos2.length)));
  const deck = buildDeckIndices();

  for (const c1 of combos1) {
    for (const c2 of combos2) {
      if (cardsOverlap(c1, c2)) continue;

      const blocked = new Set([...c1, ...c2]);
      const available = deck.filter((c) => !blocked.has(c));

      for (let s = 0; s < samplesPerCombo; s++) {
        const board = sampleCards(available, BOARD_CARDS);

        const cards1: [number, number][] = [
          [cardFromIndex(c1[0]).rank, cardFromIndex(c1[0]).suit],
          [cardFromIndex(c1[1]).rank, cardFromIndex(c1[1]).suit],
          ...board.map((ci) => [cardFromIndex(ci).rank, cardFromIndex(ci).suit] as [number, number]),
        ];
        const cards2: [number, number][] = [
          [cardFromIndex(c2[0]).rank, cardFromIndex(c2[0]).suit],
          [cardFromIndex(c2[1]).rank, cardFromIndex(c2[1]).suit],
          ...board.map((ci) => [cardFromIndex(ci).rank, cardFromIndex(ci).suit] as [number, number]),
        ];

        const rank1 = evaluate7(cards1);
        const rank2 = evaluate7(cards2);

        if (rank1 > rank2) totalWin1++;
        else if (rank2 > rank1) totalWin2++;
        else totalTie++;
        totalCount++;
      }
    }
  }

  if (totalCount === 0) return [0.5, 0.5];
  return [
    (totalWin1 + totalTie * 0.5) / totalCount,
    (totalWin2 + totalTie * 0.5) / totalCount,
  ];
}

function sampleCards(available: number[], count: number): number[] {
  const arr = [...available];
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (arr.length - i));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
    result.push(arr[i]);
  }
  return result;
}

/**
 * Compute the full 169x169 equity matrix via Monte Carlo.
 * onProgress called with percentage (0-100).
 */
export function computeHUEquityMatrix(
  samplesPerMatchup: number,
  onProgress?: (pct: number) => void,
  isStopped?: () => boolean,
): EquityMatrix {
  const matrix = new Float64Array(NUM_HAND_GROUPS * NUM_HAND_GROUPS);
  const total = NUM_HAND_GROUPS * (NUM_HAND_GROUPS + 1) / 2;
  let done = 0;

  for (let i = 0; i < NUM_HAND_GROUPS; i++) {
    for (let j = i; j < NUM_HAND_GROUPS; j++) {
      if (isStopped?.()) return matrix;

      const [eq1, eq2] = mcEquityHU(i, j, samplesPerMatchup);
      matrix[i * NUM_HAND_GROUPS + j] = eq1;
      matrix[j * NUM_HAND_GROUPS + i] = eq2;

      done++;
      if (onProgress && done % 100 === 0) {
        onProgress((done / total) * 100);
      }
    }
    // Progress update per row
    if (onProgress) {
      onProgress((done / total) * 100);
    }
  }

  return matrix;
}

/**
 * Compute multiway equity for N hand groups via Monte Carlo.
 * Returns array of equity shares (sum to 1).
 */
export function computeMultiwayEquity(
  handGroups: number[],
  samples: number,
): number[] {
  const n = handGroups.length;
  const wins = new Float64Array(n);
  let totalSamples = 0;

  const allCombos = handGroups.map((hg) => combosForHandGroup(hg));

  const deck = buildDeckIndices();

  for (let s = 0; s < samples; s++) {
    // Pick one specific combo per player, no overlap
    const chosen: number[][] = [];
    let valid = true;
    const used = new Set<number>();

    for (let p = 0; p < n; p++) {
      const combos = allCombos[p];
      // Pick a random non-overlapping combo via Fisher-Yates traversal
      let found = false;
      const indices = Array.from({ length: combos.length }, (_, i) => i);
      for (let i = indices.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = indices[i];
        indices[i] = indices[j];
        indices[j] = tmp;
      }
      for (const idx of indices) {
        const combo = combos[idx];
        if (!used.has(combo[0]) && !used.has(combo[1])) {
          chosen.push(combo);
          used.add(combo[0]);
          used.add(combo[1]);
          found = true;
          break;
        }
      }
      if (!found) { valid = false; break; }
    }
    if (!valid) continue;

    const available = deck.filter((c) => !used.has(c));
    const board = sampleCards(available, BOARD_CARDS);

    const ranks = chosen.map((combo) => {
      const cards: [number, number][] = [
        [cardFromIndex(combo[0]).rank, cardFromIndex(combo[0]).suit],
        [cardFromIndex(combo[1]).rank, cardFromIndex(combo[1]).suit],
        ...board.map((ci) => [cardFromIndex(ci).rank, cardFromIndex(ci).suit] as [number, number]),
      ];
      return evaluate7(cards);
    });

    const maxRank = Math.max(...ranks);
    const winners = ranks.filter((r) => r === maxRank).length;
    for (let p = 0; p < n; p++) {
      if (ranks[p] === maxRank) {
        wins[p] += 1.0 / winners;
      }
    }
    totalSamples++;
  }

  if (totalSamples === 0) {
    return new Array(n).fill(1 / n);
  }
  return Array.from(wins).map((w) => w / totalSamples);
}

// Cache for multiway equity
const multiwayCache = new Map<string, number[]>();

export function cachedMultiwayEquity(handGroups: number[], samples: number): number[] {
  const key = handGroups.join(",");
  const cached = multiwayCache.get(key);
  if (cached) return cached;
  const result = computeMultiwayEquity(handGroups, samples);
  multiwayCache.set(key, result);
  return result;
}

export function clearEquityCache(): void {
  multiwayCache.clear();
}
