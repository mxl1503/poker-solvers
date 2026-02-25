import { useRef, useCallback } from "react";
import { RANKS, getHandLabel, getHandType } from "./hands";

const TYPE_COLORS = {
  pair: "bg-emerald-900/50 border-emerald-700/40",
  suited: "bg-sky-900/40 border-sky-700/40",
  offsuit: "bg-amber-900/30 border-amber-700/40",
};

const SELECTED_CLASS = "!bg-emerald-600 !border-emerald-500 text-white";

export default function RangeMatrix({ selected, onToggle, onBulk }) {
  const drag = useRef({ active: false, value: false });

  const handleDown = useCallback(
    (hand, e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const next = !selected.has(hand);
      drag.current = { active: true, value: next };
      onToggle(hand, next);
    },
    [selected, onToggle],
  );

  const handleEnter = useCallback(
    (hand, e) => {
      if (e.buttons !== 1 || !drag.current.active) return;
      e.preventDefault();
      onToggle(hand, drag.current.value);
    },
    [onToggle],
  );

  const handleUp = useCallback(() => {
    drag.current.active = false;
  }, []);

  return (
    <div className="space-y-2" onMouseUp={handleUp} onMouseLeave={handleUp}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400">
          {selected.size} / 169 selected
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onBulk("all")}
            className="text-xs px-2 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onBulk("clear")}
            className="text-xs px-2 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="grid grid-cols-13 gap-px">
        {RANKS.map((_, row) =>
          RANKS.map((_, col) => {
            const hand = getHandLabel(row, col);
            const type = getHandType(row, col);
            const isSel = selected.has(hand);
            return (
              <button
                key={hand}
                type="button"
                onMouseDown={(e) => handleDown(hand, e)}
                onMouseEnter={(e) => handleEnter(hand, e)}
                className={`text-[9px] sm:text-[10px] leading-tight py-0.5 border rounded select-none cursor-pointer transition-colors ${TYPE_COLORS[type]} ${isSel ? SELECTED_CLASS : "text-zinc-300"}`}
              >
                {hand}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
