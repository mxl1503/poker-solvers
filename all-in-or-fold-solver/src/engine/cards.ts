export interface Card {
  rank: number; // 0=2 .. 12=A
  suit: number; // 0=c 1=d 2=h 3=s
}

export function cardIndex(rank: number, suit: number): number {
  return rank * 4 + suit;
}

export function cardFromIndex(i: number): Card {
  return { rank: (i >> 2), suit: i & 3 };
}
