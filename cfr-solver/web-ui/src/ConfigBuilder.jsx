import { useState, useCallback, useRef } from "react";
import RangeMatrix from "./RangeMatrix";
import { buildAllHands, parseRangeText, parseList } from "./hands";

const ALL_HANDS = buildAllHands();

const STREETS = ["Flop", "Turn", "River"];

function Panel({ title, children, className = "" }) {
  return (
    <div
      className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 ${className}`}
    >
      {title && (
        <h2 className="text-sm font-semibold text-zinc-200 mb-3">{title}</h2>
      )}
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1 text-xs text-zinc-400">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
    />
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-emerald-500"
      />
      {label}
    </label>
  );
}

function StreetSizing({ prefix, state, onChange }) {
  const get = (street, field) => state[`${prefix}${street}${field}`] ?? "";
  const set = (street, field, val) =>
    onChange({ ...state, [`${prefix}${street}${field}`]: val });
  const getBool = (street, field) =>
    state[`${prefix}${street}${field}`] ?? false;
  const setBool = (street, field, val) =>
    onChange({ ...state, [`${prefix}${street}${field}`]: val });

  return (
    <div className="space-y-3">
      {STREETS.map((st) => (
        <div
          key={st}
          className="space-y-2 pb-3 border-b border-zinc-800 last:border-0 last:pb-0"
        >
          <h3 className="text-xs font-medium text-emerald-400">{st}</h3>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Bet sizes (% pot)">
              <Input
                value={get(st, "Bet")}
                onChange={(e) => set(st, "Bet", e.target.value)}
                placeholder="33,66,100"
              />
            </Field>
            <Field label="Raise sizes (% pot)">
              <Input
                value={get(st, "Raise")}
                onChange={(e) => set(st, "Raise", e.target.value)}
                placeholder="250"
              />
            </Field>
          </div>
          <div className="flex gap-4">
            <Checkbox
              label="All-in"
              checked={getBool(st, "AllIn")}
              onChange={(v) => setBool(st, "AllIn", v)}
            />
            {prefix === "oop" && (
              <Checkbox
                label="Allow lead"
                checked={getBool(st, "Lead")}
                onChange={(v) => setBool(st, "Lead", v)}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function RangeEditor({ label, text, onTextChange, selected, onToggle, onBulk }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <Field label={`${label} Range`}>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="AA,KK,QQ,AKs,AQs,..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 resize-y focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </Field>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
      >
        <span
          className="inline-block transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        >
          ▸
        </span>
        {label} Grid
      </button>
      {open && (
        <RangeMatrix selected={selected} onToggle={onToggle} onBulk={onBulk} />
      )}
    </div>
  );
}

const DEFAULT_SIZING = {
  ipFlopBet: "33,66,100", ipFlopRaise: "250", ipFlopAllIn: false,
  ipTurnBet: "66,100", ipTurnRaise: "250", ipTurnAllIn: false,
  ipRiverBet: "75,125", ipRiverRaise: "250", ipRiverAllIn: true,
  oopFlopBet: "33,66,100", oopFlopRaise: "250", oopFlopAllIn: false, oopFlopLead: true,
  oopTurnBet: "66,100", oopTurnRaise: "250", oopTurnAllIn: false, oopTurnLead: true,
  oopRiverBet: "75,125", oopRiverRaise: "250", oopRiverAllIn: true, oopRiverLead: true,
};

export default function ConfigBuilder() {
  const [board, setBoard] = useState("");
  const [stack, setStack] = useState(100);
  const [pot, setPot] = useState(5);
  const [street, setStreet] = useState("flop");
  const [oopText, setOopText] = useState("");
  const [ipText, setIpText] = useState("");
  const [oopSelected, setOopSelected] = useState(new Set());
  const [ipSelected, setIpSelected] = useState(new Set());
  const [maxRaises, setMaxRaises] = useState(2);
  const [minBet, setMinBet] = useState(20);
  const [aiThreshold, setAiThreshold] = useState(67);
  const [allowDonk, setAllowDonk] = useState(true);
  const [limpTree, setLimpTree] = useState(false);
  const [sizing, setSizing] = useState(DEFAULT_SIZING);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState({ msg: "", err: false });
  const uploadRef = useRef(null);

  const syncFromText = useCallback((player, text) => {
    const sel = parseRangeText(text);
    if (player === "oop") {
      setOopText(text);
      setOopSelected(sel);
    } else {
      setIpText(text);
      setIpSelected(sel);
    }
  }, []);

  const handleToggle = useCallback(
    (player, hand, value) => {
      const prev = player === "oop" ? oopSelected : ipSelected;
      const next = new Set(prev);
      value ? next.add(hand) : next.delete(hand);
      const text = [...next].sort().join(",");
      if (player === "oop") {
        setOopSelected(next);
        setOopText(text);
      } else {
        setIpSelected(next);
        setIpText(text);
      }
    },
    [oopSelected, ipSelected],
  );

  const handleBulk = useCallback((player, action) => {
    const next = action === "all" ? new Set(ALL_HANDS) : new Set();
    const text = [...next].sort().join(",");
    if (player === "oop") {
      setOopSelected(next);
      setOopText(text);
    } else {
      setIpSelected(next);
      setIpText(text);
    }
  }, []);

  const getStreetConfig = (prefix, st) => {
    const key = st.charAt(0).toUpperCase() + st.slice(1);
    return {
      betSizesPctPot: parseList(sizing[`${prefix}${key}Bet`] || ""),
      raiseSizesPctPot: parseList(sizing[`${prefix}${key}Raise`] || ""),
      addAllIn: sizing[`${prefix}${key}AllIn`] || false,
      ...(prefix === "oop"
        ? { allowLead: sizing[`${prefix}${key}Lead`] ?? true }
        : {}),
    };
  };

  const buildConfig = () => {
    if (!Number.isFinite(stack) || stack <= 0)
      throw new Error("Effective stack must be a positive number.");
    if (!Number.isFinite(pot) || pot < 0)
      throw new Error("Starting pot must be zero or greater.");
    return {
      metadata: {
        app: "cfr-tree-builder",
        version: 1,
        generatedAt: new Date().toISOString(),
      },
      setup: {
        board,
        startingStreet: street,
        effectiveStackBb: stack,
        startingPotBb: pot,
      },
      ranges: { oop: oopText.trim(), ip: ipText.trim() },
      treeRules: {
        maxRaisesPerNode: maxRaises,
        minBetSizePctPot: minBet,
        allInThresholdPctStack: aiThreshold,
        allowDonkBets: allowDonk,
        includeLimpTree: limpTree,
      },
      sizing: {
        ip: { flop: getStreetConfig("ip", "flop"), turn: getStreetConfig("ip", "turn"), river: getStreetConfig("ip", "river") },
        oop: { flop: getStreetConfig("oop", "flop"), turn: getStreetConfig("oop", "turn"), river: getStreetConfig("oop", "river") },
      },
    };
  };

  const generate = () => {
    try {
      const cfg = buildConfig();
      setOutput(JSON.stringify(cfg, null, 2));
      setStatus({ msg: "Config generated.", err: false });
    } catch (e) {
      setStatus({ msg: e.message, err: true });
    }
  };

  const download = () => {
    try {
      const cfg = buildConfig();
      const json = JSON.stringify(cfg, null, 2);
      setOutput(json);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tree-config.json";
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ msg: "Downloaded tree-config.json", err: false });
    } catch (e) {
      setStatus({ msg: e.message, err: true });
    }
  };

  const loadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      setBoard(parsed.setup?.board || "");
      setStack(parsed.setup?.effectiveStackBb ?? 100);
      setPot(parsed.setup?.startingPotBb ?? 5);
      setStreet(parsed.setup?.startingStreet || "flop");
      syncFromText("oop", parsed.ranges?.oop || "");
      syncFromText("ip", parsed.ranges?.ip || "");
      setMaxRaises(parsed.treeRules?.maxRaisesPerNode ?? 2);
      setMinBet(parsed.treeRules?.minBetSizePctPot ?? 20);
      setAiThreshold(parsed.treeRules?.allInThresholdPctStack ?? 67);
      setAllowDonk(!!parsed.treeRules?.allowDonkBets);
      setLimpTree(!!parsed.treeRules?.includeLimpTree);
      const next = { ...DEFAULT_SIZING };
      for (const st of ["Flop", "Turn", "River"]) {
        const sk = st.toLowerCase();
        const ipSt = parsed.sizing?.ip?.[sk];
        const oopSt = parsed.sizing?.oop?.[sk];
        if (ipSt) {
          next[`ip${st}Bet`] = (ipSt.betSizesPctPot || []).join(",");
          next[`ip${st}Raise`] = (ipSt.raiseSizesPctPot || []).join(",");
          next[`ip${st}AllIn`] = !!ipSt.addAllIn;
        }
        if (oopSt) {
          next[`oop${st}Bet`] = (oopSt.betSizesPctPot || []).join(",");
          next[`oop${st}Raise`] = (oopSt.raiseSizesPctPot || []).join(",");
          next[`oop${st}AllIn`] = !!oopSt.addAllIn;
          next[`oop${st}Lead`] = !!oopSt.allowLead;
        }
      }
      setSizing(next);
      setOutput(JSON.stringify(parsed, null, 2));
      setStatus({ msg: "Config loaded.", err: false });
    } catch {
      setStatus({ msg: "Failed to parse JSON config.", err: true });
    }
    if (uploadRef.current) uploadRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Core Setup">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Board">
              <Input
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                placeholder="Qs Jh 2h"
              />
            </Field>
            <Field label="Effective Stack (bb)">
              <Input
                type="number"
                min={1}
                value={stack}
                onChange={(e) => setStack(Number(e.target.value))}
              />
            </Field>
            <Field label="Starting Pot (bb)">
              <Input
                type="number"
                min={0}
                step={0.5}
                value={pot}
                onChange={(e) => setPot(Number(e.target.value))}
              />
            </Field>
            <Field label="Starting Street">
              <select
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="preflop">Preflop</option>
                <option value="flop">Flop</option>
                <option value="turn">Turn</option>
                <option value="river">River</option>
              </select>
            </Field>
          </div>
        </Panel>

        <Panel title="Ranges">
          <div className="space-y-4">
            <RangeEditor
              label="OOP"
              text={oopText}
              onTextChange={(t) => syncFromText("oop", t)}
              selected={oopSelected}
              onToggle={(h, v) => handleToggle("oop", h, v)}
              onBulk={(a) => handleBulk("oop", a)}
            />
            <RangeEditor
              label="IP"
              text={ipText}
              onTextChange={(t) => syncFromText("ip", t)}
              selected={ipSelected}
              onToggle={(h, v) => handleToggle("ip", h, v)}
              onBulk={(a) => handleBulk("ip", a)}
            />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="IP Sizing">
          <StreetSizing prefix="ip" state={sizing} onChange={setSizing} />
        </Panel>
        <Panel title="OOP Sizing">
          <StreetSizing prefix="oop" state={sizing} onChange={setSizing} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Tree Rules">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max Raises / Node">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={maxRaises}
                  onChange={(e) => setMaxRaises(Number(e.target.value))}
                />
              </Field>
              <Field label="Min Bet Size (% pot)">
                <Input
                  type="number"
                  min={0}
                  value={minBet}
                  onChange={(e) => setMinBet(Number(e.target.value))}
                />
              </Field>
              <Field label="All-in Threshold (% stack)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={aiThreshold}
                  onChange={(e) => setAiThreshold(Number(e.target.value))}
                />
              </Field>
            </div>
            <div className="flex gap-4">
              <Checkbox
                label="Allow donk bets"
                checked={allowDonk}
                onChange={setAllowDonk}
              />
              <Checkbox
                label="Include limp tree"
                checked={limpTree}
                onChange={setLimpTree}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={generate}
                className="px-4 py-1.5 rounded-full text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                Generate Config
              </button>
              <button
                onClick={download}
                className="px-4 py-1.5 rounded-full text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
              >
                Download JSON
              </button>
              <label className="px-4 py-1.5 rounded-full text-sm font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors cursor-pointer">
                Load JSON
                <input
                  ref={uploadRef}
                  type="file"
                  accept="application/json"
                  onChange={loadFile}
                  className="hidden"
                />
              </label>
            </div>
            {status.msg && (
              <p
                className={`text-xs mt-1 ${status.err ? "text-red-400" : "text-emerald-400"}`}
              >
                {status.msg}
              </p>
            )}
          </div>
        </Panel>
        <Panel title="Generated Config">
          <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 overflow-auto max-h-80 min-h-[10rem]">
            {output || "Click 'Generate Config' to preview JSON."}
          </pre>
        </Panel>
      </div>
    </div>
  );
}
