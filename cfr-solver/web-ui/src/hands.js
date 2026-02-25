export const RANKS = [
  "A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2",
];

const RANK_ORDER = Object.fromEntries(RANKS.map((r, i) => [r, i]));

export function getHandLabel(row, col) {
  const r1 = RANKS[row];
  const r2 = RANKS[col];
  if (row === col) return `${r1}${r2}`;
  if (row < col) return `${r1}${r2}s`;
  return `${r2}${r1}o`;
}

export function getHandType(row, col) {
  if (row === col) return "pair";
  return row < col ? "suited" : "offsuit";
}

export function buildAllHands() {
  const hands = new Set();
  for (let r = 0; r < 13; r++)
    for (let c = 0; c < 13; c++) hands.add(getHandLabel(r, c));
  return hands;
}

export function parseRangeText(text) {
  const all = buildAllHands();
  return new Set(
    text
      .split(/[\s,]+/)
      .map((t) => t.trim().toUpperCase())
      .filter((t) => all.has(t)),
  );
}

export function comboToHandGroup(combo) {
  const r1 = combo[0];
  const r2 = combo[2];
  const s1 = combo[1];
  const s2 = combo[3];

  if (r1 === r2) return `${r1}${r2}`;

  const i1 = RANK_ORDER[r1] ?? 99;
  const i2 = RANK_ORDER[r2] ?? 99;

  if (i1 < i2) return s1 === s2 ? `${r1}${r2}s` : `${r1}${r2}o`;
  return s1 === s2 ? `${r2}${r1}s` : `${r2}${r1}o`;
}

export function aggregateStrategies(strategy, actions) {
  if (!strategy || actions.length === 0) return {};

  const groups = {};
  for (const [combo, freqs] of Object.entries(strategy)) {
    const group = comboToHandGroup(combo);
    if (!groups[group]) groups[group] = { freqs: new Array(actions.length).fill(0), count: 0 };
    groups[group].count += 1;
    for (let i = 0; i < freqs.length; i++) groups[group].freqs[i] += freqs[i];
  }

  const result = {};
  for (const [group, data] of Object.entries(groups)) {
    result[group] = data.freqs.map((f) => f / data.count);
  }
  return result;
}

export const ACTION_COLORS = [
  "#22c55e", // green
  "#ef4444", // red
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

export function getActionColor(index) {
  return ACTION_COLORS[index % ACTION_COLORS.length];
}

export function parseList(input) {
  return input
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
}
