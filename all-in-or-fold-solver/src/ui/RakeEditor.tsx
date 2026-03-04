import { RakeConfig, RakeMode } from "../engine/types";
import { INPUT_CLASS } from "./styles";

interface Props {
  rake: RakeConfig;
  onChange: (rake: RakeConfig) => void;
}

const MODES: { value: RakeMode; label: string }[] = [
  { value: "none", label: "No Rake" },
  { value: "percent", label: "Percent" },
  { value: "percent_cap", label: "Percent + Cap" },
  { value: "fixed", label: "Fixed Drop" },
  { value: "threshold", label: "Threshold" },
];

export default function RakeEditor({ rake, onChange }: Props) {
  function update(partial: Partial<RakeConfig>) {
    onChange({ ...rake, ...partial });
  }

  const showPercent = rake.mode === "percent" || rake.mode === "percent_cap" || rake.mode === "threshold";
  const showCap = rake.mode === "percent_cap" || rake.mode === "threshold";
  const showFixed = rake.mode === "fixed";
  const showThreshold = rake.mode === "threshold";

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rake</h3>

      <div>
        <label className="text-zinc-400 text-xs block mb-1">Mode</label>
        <select
          value={rake.mode}
          onChange={(e) => update({ mode: e.target.value as RakeMode })}
          className={INPUT_CLASS}
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {rake.mode !== "none" && (
        <div className="space-y-2">
          {showPercent && (
            <div>
              <label className="text-zinc-400 text-xs block mb-1">Rake %</label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={rake.percent}
                onChange={(e) => update({ percent: Number(e.target.value) })}
                className={INPUT_CLASS}
              />
            </div>
          )}

          {showCap && (
            <div>
              <label className="text-zinc-400 text-xs block mb-1">Cap</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={rake.cap}
                onChange={(e) => update({ cap: Number(e.target.value) })}
                className={INPUT_CLASS}
              />
            </div>
          )}

          {showFixed && (
            <div>
              <label className="text-zinc-400 text-xs block mb-1">Fixed Drop</label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={rake.fixedDrop}
                onChange={(e) => update({ fixedDrop: Number(e.target.value) })}
                className={INPUT_CLASS}
              />
            </div>
          )}

          {showThreshold && (
            <div>
              <label className="text-zinc-400 text-xs block mb-1">Min Pot Threshold</label>
              <input
                type="number"
                min={0}
                step={1}
                value={rake.minPotThreshold}
                onChange={(e) => update({ minPotThreshold: Number(e.target.value) })}
                className={INPUT_CLASS}
              />
            </div>
          )}

          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rake.noFlopNoDrop}
                onChange={(e) => update({ noFlopNoDrop: e.target.checked })}
                className="rounded bg-zinc-800 border-zinc-600 text-emerald-500 focus:ring-0"
              />
              No flop no drop
            </label>
            <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rake.rakePreflop}
                onChange={(e) => update({ rakePreflop: e.target.checked })}
                className="rounded bg-zinc-800 border-zinc-600 text-emerald-500 focus:ring-0"
              />
              Rake preflop
            </label>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={rake.perPot}
              onChange={(e) => update({ perPot: e.target.checked })}
              className="rounded bg-zinc-800 border-zinc-600 text-emerald-500 focus:ring-0"
            />
            Rake each side pot individually
          </label>
        </div>
      )}
    </div>
  );
}
