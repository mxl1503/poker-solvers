import { useState, useEffect } from "react";
import {
  GameConfig,
  DEFAULT_CONFIG,
  POSITIONS_BY_COUNT,
  Accuracy,
} from "../engine/types";
import RakeEditor from "./RakeEditor";
import { PRESETS } from "./Presets";
import { INPUT_CLASS, INPUT_BASE_CLASS } from "./styles";

interface Props {
  config: GameConfig;
  onChange: (config: GameConfig) => void;
  onApplyAndSolve: (config: GameConfig) => void;
  onStop: () => void;
  solving: boolean;
}

export default function ConfigPanel({ config, onChange, onApplyAndSolve, onStop, solving }: Props) {
  const [draft, setDraft] = useState<GameConfig>({ ...config });

  useEffect(() => {
    setDraft({ ...config });
  }, [config]);

  function updateDraft(partial: Partial<GameConfig>) {
    setDraft((d) => {
      const next = { ...d, ...partial };
      // Sync stacks array length when player count changes
      if (partial.playerCount && partial.playerCount !== d.playerCount) {
        const defaultStack = d.stacks[0] ?? 20;
        next.stacks = Array.from({ length: partial.playerCount }, (_, i) =>
          d.stacks[i] ?? defaultStack,
        );
      }
      return next;
    });
  }

  function apply() {
    onChange(draft);
  }

  function reset() {
    const fresh = { ...DEFAULT_CONFIG, stacks: [...DEFAULT_CONFIG.stacks] };
    setDraft(fresh);
    onChange(fresh);
  }

  const positions = POSITIONS_BY_COUNT[draft.playerCount];

  return (
    <div className="p-4 space-y-5 text-sm">
      {/* Presets */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Presets</h2>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                const c = { ...preset.config, stacks: [...preset.config.stacks], rake: { ...preset.config.rake } };
                setDraft(c);
                onChange(c);
              }}
              className="px-2 py-1 rounded text-[10px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Configuration
        </h2>

        {/* Player count */}
        <div>
          <label className="text-zinc-400 text-xs block mb-1">Players</label>
          <div className="flex gap-1">
            {([2, 3, 4] as const).map((n) => (
              <button
                key={n}
                onClick={() => updateDraft({ playerCount: n })}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                  draft.playerCount === n
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {n}P
              </button>
            ))}
          </div>
        </div>

        {/* Blinds */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-zinc-400 text-xs block mb-1">Small Blind</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={draft.sb}
              onChange={(e) => updateDraft({ sb: Number(e.target.value) })}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="text-zinc-400 text-xs block mb-1">Big Blind</label>
            <input
              type="number"
              min={0}
              step={1}
              value={draft.bb}
              onChange={(e) => updateDraft({ bb: Number(e.target.value) })}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {/* Unit toggle */}
        <div>
          <label className="text-zinc-400 text-xs block mb-1">Stack Unit</label>
          <div className="flex gap-1">
            {(["chips", "bb"] as const).map((u) => (
              <button
                key={u}
                onClick={() => updateDraft({ unit: u })}
                className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                  draft.unit === u
                    ? "bg-zinc-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {u === "bb" ? "BB" : "Chips"}
              </button>
            ))}
          </div>
        </div>

        {/* Stacks */}
        <div>
          <label className="text-zinc-400 text-xs block mb-1">
            Stacks {draft.unit === "bb" ? "(bb)" : "(chips)"}
          </label>
          <div className="space-y-1.5">
            {positions.map((pos, i) => (
              <div key={pos} className="flex items-center gap-2">
                <span className="text-zinc-500 text-xs w-8">{pos}</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={draft.stacks[i] ?? 20}
                  onChange={(e) => {
                    const stacks = [...draft.stacks];
                    stacks[i] = Number(e.target.value);
                    updateDraft({ stacks });
                  }}
                  className={`flex-1 ${INPUT_BASE_CLASS}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Accuracy */}
        <div>
          <label className="text-zinc-400 text-xs block mb-1">Accuracy</label>
          <div className="flex gap-1">
            {(["low", "medium", "high"] as Accuracy[]).map((a) => (
              <button
                key={a}
                onClick={() => updateDraft({ accuracy: a })}
                className={`flex-1 py-1 rounded text-xs font-medium transition-colors capitalize ${
                  draft.accuracy === a
                    ? "bg-zinc-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rake */}
      <RakeEditor
        rake={draft.rake}
        onChange={(rake) => updateDraft({ rake })}
      />

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => { apply(); }}
          className="flex-1 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
        >
          Apply
        </button>
        <button
          onClick={reset}
          className="py-2 px-3 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
        >
          Reset
        </button>
      </div>
      <div className="flex gap-2">
        {solving ? (
          <button
            onClick={onStop}
            className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            Stop Solver
          </button>
        ) : (
          <button
            onClick={() => onApplyAndSolve(draft)}
            className="flex-1 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            Solve
          </button>
        )}
      </div>
    </div>
  );
}
