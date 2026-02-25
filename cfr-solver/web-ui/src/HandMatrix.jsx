import { useState, useMemo } from "react";
import { RANKS, getHandLabel, getHandType, getActionColor } from "./hands";

const TYPE_BG = {
  pair: "rgba(16,185,129,0.08)",
  suited: "rgba(56,189,248,0.06)",
  offsuit: "rgba(251,191,36,0.05)",
};

export default function HandMatrix({ aggregated, actions }) {
  const [hovered, setHovered] = useState(null);

  const cells = useMemo(() => {
    const result = [];
    for (let row = 0; row < 13; row++) {
      for (let col = 0; col < 13; col++) {
        const hand = getHandLabel(row, col);
        const type = getHandType(row, col);
        const freqs = aggregated[hand];
        result.push({ hand, type, freqs, row, col });
      }
    }
    return result;
  }, [aggregated]);

  const hoveredData = hovered ? aggregated[hovered] : null;

  return (
    <div className="space-y-3">
      <div
        className="grid gap-px"
        style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}
      >
        {cells.map(({ hand, type, freqs }) => (
          <div
            key={hand}
            className="relative aspect-[4/3] rounded-[3px] overflow-hidden cursor-pointer border border-zinc-800 hover:border-zinc-500 transition-colors"
            style={{ background: TYPE_BG[type] }}
            onMouseEnter={() => setHovered(hand)}
            onMouseLeave={() => setHovered(null)}
          >
            {freqs && (
              <div className="absolute inset-0 flex">
                {freqs.map((f, i) =>
                  f > 0.001 ? (
                    <div
                      key={i}
                      style={{
                        width: `${f * 100}%`,
                        backgroundColor: getActionColor(i),
                      }}
                    />
                  ) : null,
                )}
              </div>
            )}
            <span className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[9px] font-medium text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] pointer-events-none">
              {hand}
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {actions.map((action, i) => (
          <div key={action} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: getActionColor(i) }}
            />
            <span className="text-xs text-zinc-400">{action}</span>
          </div>
        ))}
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-xs">
          <div className="font-semibold text-zinc-200 mb-1.5">{hovered}</div>
          {hoveredData ? (
            <div className="space-y-1">
              {actions.map((action, i) => {
                const freq = hoveredData[i] ?? 0;
                return (
                  <div key={action} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: getActionColor(i) }}
                    />
                    <span className="text-zinc-400 w-16">{action}</span>
                    <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${freq * 100}%`,
                          backgroundColor: getActionColor(i),
                        }}
                      />
                    </div>
                    <span className="text-zinc-300 w-12 text-right tabular-nums">
                      {(freq * 100).toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-zinc-500">Not in range</span>
          )}
        </div>
      )}
    </div>
  );
}
