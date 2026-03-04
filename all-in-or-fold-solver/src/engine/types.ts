export type PlayerStatus = "active" | "folded" | "allin";
export type Action = "fold" | "jam";
export type Position = "UTG" | "BTN" | "SB" | "BB";
export type Accuracy = "low" | "medium" | "high";

export interface PlayerState {
  stack: number;
  committed: number;
  status: PlayerStatus;
  position: Position;
}

export interface GameNode {
  id: number;
  players: PlayerState[];
  actingPlayerIndex: number | null;
  actionHistory: Action[];
  sb: number;
  bb: number;
  isTerminal: boolean;
  terminalType?: "fold-win" | "showdown";
  winnerIndex?: number;
  children: { action: Action; nodeId: number }[];
}

export interface GameTree {
  nodes: GameNode[];
  root: number;
  playerCount: number;
}

export interface SidePot {
  amount: number;
  eligiblePlayerIndices: number[];
}

export type RakeMode = "none" | "percent" | "percent_cap" | "fixed" | "threshold";

export interface RakeConfig {
  mode: RakeMode;
  percent: number;
  cap: number;
  fixedDrop: number;
  minPotThreshold: number;
  noFlopNoDrop: boolean;
  rakePreflop: boolean;
  perPot: boolean;
}

export interface GameConfig {
  playerCount: 2 | 3 | 4;
  sb: number;
  bb: number;
  stacks: number[];
  rake: RakeConfig;
  accuracy: Accuracy;
  unit: "chips" | "bb";
}

export const DEFAULT_RAKE: RakeConfig = {
  mode: "none",
  percent: 0.05,
  cap: 3,
  fixedDrop: 0,
  minPotThreshold: 0,
  noFlopNoDrop: false,
  rakePreflop: true,
  perPot: false,
};

export const DEFAULT_CONFIG: GameConfig = {
  playerCount: 2,
  sb: 0.5,
  bb: 1,
  stacks: [20, 20],
  rake: { ...DEFAULT_RAKE },
  accuracy: "medium",
  unit: "bb",
};

export const POSITIONS_BY_COUNT: Record<number, Position[]> = {
  2: ["SB", "BB"],
  3: ["BTN", "SB", "BB"],
  4: ["UTG", "BTN", "SB", "BB"],
};

export const ACCURACY_SAMPLES: Record<Accuracy, number> = {
  low: 200,
  medium: 1000,
  high: 5000,
};

export const DECK_SIZE = 52;
export const BOARD_CARDS = 5;
export const NUM_RANKS = 13;
export const NUM_SUITS = 4;
export const MAX_CFR_ITERATIONS = 10000;
export const CONVERGENCE_THRESHOLD = 0.001;
export const CFR_PROGRESS_INTERVAL = 50;

export interface NodeStrategy {
  jamFrequency: number[];
  evFold: number[];
  evJam: number[];
}

export interface SolverResult {
  nodeStrategies: Map<string, NodeStrategy>;
  iterations: number;
  exploitability: number;
  status: "running" | "converged" | "stopped";
}

export type WorkerInput =
  | { type: "solve"; config: GameConfig }
  | { type: "stop" };

export type WorkerOutput =
  | { type: "progress"; phase: "equity" | "cfr"; percent: number; iterations?: number; exploitability?: number }
  | { type: "result"; data: SerializedSolverResult }
  | { type: "error"; message: string };

export interface SerializedSolverResult {
  nodeStrategies: [string, NodeStrategy][];
  iterations: number;
  exploitability: number;
  status: "running" | "converged" | "stopped";
}
