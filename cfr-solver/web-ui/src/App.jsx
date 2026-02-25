import { useState } from "react";
import ConfigBuilder from "./ConfigBuilder";
import SolutionViewer from "./SolutionViewer";

const TABS = [
  { id: "config", label: "Config Builder" },
  { id: "viewer", label: "Solution Viewer" },
];

export default function App() {
  const [tab, setTab] = useState("config");

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <h1 className="text-lg font-bold tracking-tight text-zinc-100">
            CFR Poker Tools
          </h1>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === "config" ? <ConfigBuilder /> : <SolutionViewer />}
      </main>
    </div>
  );
}
