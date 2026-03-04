import { useState, useMemo } from "react";
import { getHandLabel, getHandType, NUM_HAND_GROUPS, handGroupFromIndex } from "../engine/hands";

const TYPE_BG: Record<string, string> = {
  pair: "rgba(16,185,129,0.08)",
  suited: "rgba(56,189,248,0.06)",
  offsuit: "rgba(251,191,36,0.05)",
};

function freqToColor(freq: number): string {
  if (freq >= 0.95) return "rgba(34,197,94,0.85)";
  if (freq <= 0.05) return "rgba(239,68,68,0.25)";
  // Gradient from red to green
  const r = Math.round(239 - freq * 180);
  const g = Math.round(68 + freq * 129);
  const b = Math.round(68 - freq * 20);
  const a = 0.3 + freq * 0.5;
  return `rgba(${r},${g},${b},${a})`;
}

interface Props {
  jamFrequencies: Record<string, number>;
  evData?: { jamFrequency: number[]; evFold: number[]; evJam: number[] };
}

export default function HandMatrix({ jamFrequencies, evData }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const cells = useMemo(() => {
    const result: { hand: string; type: string; freq: number; row: number; col: number }[] = [];
    for (let row = 0; row < 13; row++) {
      for (let col = 0; col < 13; col++) {
        const hand = getHandLabel(row, col);
        const type = getHandType(row, col);
        const freq = jamFrequencies[hand] ?? 0;
        result.push({ hand, type, freq, row, col });
      }
    }
    return result;
  }, [jamFrequencies]);

  const hoveredInfo = useMemo(() => {
    if (!hovered || !evData) return null;
    // Find the hand group index
    for (let hg = 0; hg < NUM_HAND_GROUPS; hg++) {
      const { row, col } = handGroupFromIndex(hg);
      if (getHandLabel(row, col) === hovered) {
        return {
          jam: evData.jamFrequency[hg] ?? 0,
          evFold: evData.evFold[hg] ?? 0,
          evJam: evData.evJam[hg] ?? 0,
        };
      }
    }
    return null;
  }, [hovered, evData]);

  return (
    <div className="space-y-2">
      <div
        className="grid gap-px"
        style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}
      >
        {cells.map(({ hand, type, freq }) => (
          <div
            key={hand}
            className="relative aspect-square rounded-[3px] overflow-hidden cursor-pointer border border-zinc-800 hover:border-zinc-500 transition-colors"
            style={{ background: freq > 0.01 ? freqToColor(freq) : TYPE_BG[type] }}
            onMouseEnter={() => setHovered(hand)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[7px] sm:text-[8px] font-medium text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] pointer-events-none leading-none">
              {hand}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-[10px] text-zinc-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(239,68,68,0.25)" }} />
          <span>Fold</span>
        </div>
        <div className="flex-1 h-2 rounded-full" style={{
          background: "linear-gradient(to right, rgba(239,68,68,0.4), rgba(234,179,8,0.5), rgba(34,197,94,0.85))",
        }} />
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(34,197,94,0.85)" }} />
          <span>Jam</span>
        </div>
      </div>

      {/* Hover tooltip */}
      {hovered && hoveredInfo && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-xs">
          <div className="font-semibold text-zinc-200 mb-1">{hovered}</div>
          <div className="space-y-0.5 text-zinc-400">
            <div className="flex justify-between">
              <span>Jam:</span>
              <span className="text-emerald-400 font-medium">{(hoveredInfo.jam * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>EV(Fold):</span>
              <span className="text-zinc-300 tabular-nums">{hoveredInfo.evFold.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span>EV(Jam):</span>
              <span className="text-zinc-300 tabular-nums">{hoveredInfo.evJam.toFixed(3)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
