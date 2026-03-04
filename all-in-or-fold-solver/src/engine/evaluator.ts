/**
 * Fast 5-card and 7-card poker hand evaluator.
 * Returns a comparable integer rank (higher = better hand).
 *
 * Encoding: (category << 20) | sub_rank
 * Categories: 0=High Card, 1=Pair, 2=Two Pair, 3=Trips, 4=Straight,
 *             5=Flush, 6=Full House, 7=Quads, 8=Straight Flush
 *
 * Sub-rank packs relevant rank values in 4-bit nibbles from MSB to LSB
 * so that natural numeric comparison gives correct ordering.
 */

function rankBits(ranks: number[]): number {
  let bits = 0;
  for (const r of ranks) bits |= (1 << r);
  return bits;
}

function countRanks(ranks: number[]): number[] {
  const counts = new Array(13).fill(0);
  for (const r of ranks) counts[r]++;
  return counts;
}

function straightHigh(bits: number): number {
  if ((bits & 0b1111100000000) === 0b1111100000000) return 12; // A-high
  for (let high = 12; high >= 4; high--) {
    const mask = 0b11111 << (high - 4);
    if ((bits & mask) === mask) return high;
  }
  if ((bits & 0b1000000001111) === 0b1000000001111) return 3; // Wheel (5-high)
  return -1;
}

/**
 * Pack up to 5 rank values into a 20-bit integer, 4 bits each,
 * positioned at offsets 16, 12, 8, 4, 0 from MSB to LSB.
 */
function pack(r0: number, r1 = 0, r2 = 0, r3 = 0, r4 = 0): number {
  return (r0 << 16) | (r1 << 12) | (r2 << 8) | (r3 << 4) | r4;
}

export function evaluate5(cards: [number, number][]): number {
  const ranks = cards.map((c) => c[0]);
  const suits = cards.map((c) => c[1]);
  const counts = countRanks(ranks);
  const bits = rankBits(ranks);

  const isFlush = suits[0] === suits[1] && suits[1] === suits[2] &&
                  suits[2] === suits[3] && suits[3] === suits[4];

  const sh = straightHigh(bits);
  const isStraight = sh >= 0;

  if (isFlush && isStraight) return (8 << 20) | sh;

  // Collect rank groups by count (descending rank order)
  const quads: number[] = [];
  const trips: number[] = [];
  const pairs: number[] = [];
  const singles: number[] = [];
  for (let r = 12; r >= 0; r--) {
    if (counts[r] === 4) quads.push(r);
    else if (counts[r] === 3) trips.push(r);
    else if (counts[r] === 2) pairs.push(r);
    else if (counts[r] === 1) singles.push(r);
  }

  if (quads.length >= 1) {
    const kicker = [...trips, ...pairs, ...singles][0] ?? 0;
    return (7 << 20) | pack(quads[0], kicker);
  }

  if (trips.length >= 1 && pairs.length >= 1) {
    return (6 << 20) | pack(trips[0], pairs[0]);
  }

  if (isFlush) {
    // All 5 are singles in a flush (can't have pairs in 5-card flush without being SF)
    return (5 << 20) | pack(singles[0], singles[1], singles[2], singles[3], singles[4]);
  }

  if (isStraight) return (4 << 20) | sh;

  if (trips.length >= 1) {
    return (3 << 20) | pack(trips[0], singles[0] ?? 0, singles[1] ?? 0);
  }

  if (pairs.length >= 2) {
    return (2 << 20) | pack(pairs[0], pairs[1], singles[0] ?? 0);
  }

  if (pairs.length === 1) {
    return (1 << 20) | pack(pairs[0], singles[0] ?? 0, singles[1] ?? 0, singles[2] ?? 0);
  }

  // High card
  return pack(singles[0], singles[1], singles[2], singles[3], singles[4]);
}

/**
 * Evaluate a 7-card hand by checking all C(7,5)=21 combinations.
 */
export function evaluate7(cards: [number, number][]): number {
  let best = 0;
  for (let i = 0; i < 7; i++) {
    for (let j = i + 1; j < 7; j++) {
      const hand: [number, number][] = [];
      for (let k = 0; k < 7; k++) {
        if (k !== i && k !== j) hand.push(cards[k]);
      }
      const rank = evaluate5(hand);
      if (rank > best) best = rank;
    }
  }
  return best;
}

export function handCategory(rank: number): number {
  return rank >> 20;
}

export const CATEGORY_NAMES = [
  "High Card", "Pair", "Two Pair", "Three of a Kind", "Straight",
  "Flush", "Full House", "Four of a Kind", "Straight Flush",
];
