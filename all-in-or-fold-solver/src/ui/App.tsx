import { useReducer, useCallback, useMemo, useRef, useEffect } from "react";
import {
  GameConfig,
  GameTree,
  DEFAULT_CONFIG,
  SolverResult,
  NodeStrategy,
  SerializedSolverResult,
  WorkerOutput,
} from "../engine/types";
import { buildGameTree, getNode } from "../engine/gameTree";
import ConfigPanel from "./ConfigPanel";
import NodeExplorer from "./NodeExplorer";
import StrategyPanel from "./StrategyPanel";

interface AppState {
  config: GameConfig;
  tree: GameTree | null;
  currentPath: number[];
  solverResult: SolverResult | null;
  solverPhase: "idle" | "equity" | "cfr" | "done";
  solverProgress: number;
  solverIterations: number;
  solverExploitability: number;
  errorMessage: string | null;
}

type AppAction =
  | { type: "setConfig"; config: GameConfig }
  | { type: "solve" }
  | { type: "navigateTo"; nodeId: number }
  | { type: "navigateBack" }
  | { type: "navigateRoot" }
  | { type: "navigateToDepth"; depth: number }
  | { type: "solverProgress"; phase: "equity" | "cfr"; percent: number; iterations?: number; exploitability?: number }
  | { type: "solverResult"; data: SerializedSolverResult }
  | { type: "solverError"; message: string }
  | { type: "solverReset" };

function buildTree(config: GameConfig): GameTree {
  return buildGameTree(config.playerCount, config.stacks, config.sb, config.bb);
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "setConfig": {
      const tree = buildTree(action.config);
      return {
        ...state,
        config: action.config,
        tree,
        currentPath: [tree.root],
        solverResult: null,
        solverPhase: "idle",
        solverProgress: 0,
        solverIterations: 0,
        solverExploitability: 0,
      };
    }
    case "solve":
      return { ...state, solverPhase: "equity", solverProgress: 0, solverResult: null, errorMessage: null };
    case "navigateTo": {
      return { ...state, currentPath: [...state.currentPath, action.nodeId] };
    }
    case "navigateBack": {
      if (state.currentPath.length <= 1) return state;
      return { ...state, currentPath: state.currentPath.slice(0, -1) };
    }
    case "navigateRoot": {
      if (!state.tree) return state;
      return { ...state, currentPath: [state.tree.root] };
    }
    case "navigateToDepth": {
      return { ...state, currentPath: state.currentPath.slice(0, action.depth + 1) };
    }
    case "solverProgress":
      return {
        ...state,
        solverPhase: action.phase,
        solverProgress: action.percent,
        solverIterations: action.iterations ?? state.solverIterations,
        solverExploitability: action.exploitability ?? state.solverExploitability,
      };
    case "solverResult": {
      const result: SolverResult = {
        nodeStrategies: new Map(action.data.nodeStrategies),
        iterations: action.data.iterations,
        exploitability: action.data.exploitability,
        status: action.data.status,
      };
      return {
        ...state,
        solverResult: result,
        solverPhase: "done",
        solverProgress: 100,
        solverIterations: result.iterations,
        solverExploitability: result.exploitability,
      };
    }
    case "solverError":
      return { ...state, solverPhase: "idle", solverProgress: 0, errorMessage: action.message };
    case "solverReset":
      return {
        ...state,
        solverResult: null,
        solverPhase: "idle",
        solverProgress: 0,
        solverIterations: 0,
        solverExploitability: 0,
        errorMessage: null,
      };
    default:
      return state;
  }
}

const initialTree = buildTree(DEFAULT_CONFIG);
const initialState: AppState = {
  config: DEFAULT_CONFIG,
  tree: initialTree,
  currentPath: [initialTree.root],
  solverResult: null,
  solverPhase: "idle",
  solverProgress: 0,
  solverIterations: 0,
  solverExploitability: 0,
  errorMessage: null,
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const workerRef = useRef<Worker | null>(null);

  const currentNode = useMemo(() => {
    if (!state.tree || state.currentPath.length === 0) return null;
    return getNode(state.tree, state.currentPath[state.currentPath.length - 1]);
  }, [state.tree, state.currentPath]);

  const nodeStrategy: NodeStrategy | null = useMemo(() => {
    if (!state.solverResult || !currentNode || currentNode.isTerminal) return null;
    const key = `${currentNode.actionHistory.join(",")}|P${currentNode.actingPlayerIndex}`;
    return state.solverResult.nodeStrategies.get(key) ?? null;
  }, [state.solverResult, currentNode]);

  const startSolver = useCallback((config: GameConfig) => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }
    dispatch({ type: "solve" });
    const worker = new Worker(
      new URL("../engine/solver.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    worker.onmessage = (e: MessageEvent<WorkerOutput>) => {
      const msg = e.data;
      switch (msg.type) {
        case "progress":
          dispatch({
            type: "solverProgress",
            phase: msg.phase,
            percent: msg.percent,
            iterations: msg.iterations,
            exploitability: msg.exploitability,
          });
          break;
        case "result":
          dispatch({ type: "solverResult", data: msg.data });
          worker.terminate();
          workerRef.current = null;
          break;
        case "error":
          dispatch({ type: "solverError", message: msg.message });
          worker.terminate();
          workerRef.current = null;
          break;
      }
    };
    worker.postMessage({ type: "solve", config });
  }, []);

  const handleApplyAndSolve = useCallback((config: GameConfig) => {
    dispatch({ type: "setConfig", config });
    startSolver(config);
  }, [startSolver]);

  const handleStop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "stop" });
    }
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
        <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
          All-In or Fold Solver
        </h1>
      </header>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr_380px] gap-0 overflow-hidden">
        <div className="border-r border-zinc-800 overflow-y-auto">
          <ConfigPanel
            config={state.config}
            onChange={(c) => dispatch({ type: "setConfig", config: c })}
            onApplyAndSolve={handleApplyAndSolve}
            onStop={handleStop}
            solving={state.solverPhase !== "idle" && state.solverPhase !== "done"}
          />
        </div>
        <div className="overflow-y-auto border-r border-zinc-800">
          <NodeExplorer
            tree={state.tree}
            currentPath={state.currentPath}
            currentNode={currentNode}
            config={state.config}
            onNavigateTo={(id) => dispatch({ type: "navigateTo", nodeId: id })}
            onNavigateBack={() => dispatch({ type: "navigateBack" })}
            onNavigateRoot={() => dispatch({ type: "navigateRoot" })}
            onNavigateToDepth={(depth) => dispatch({ type: "navigateToDepth", depth })}
          />
        </div>
        <div className="overflow-y-auto">
          <StrategyPanel
            node={currentNode}
            strategy={nodeStrategy}
            solverPhase={state.solverPhase}
            solverProgress={state.solverProgress}
            solverIterations={state.solverIterations}
            solverExploitability={state.solverExploitability}
            fullResult={state.solverResult}
            errorMessage={state.errorMessage}
          />
        </div>
      </div>
    </div>
  );
}
