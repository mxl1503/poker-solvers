import { GameConfig, DEFAULT_RAKE } from "../engine/types";

export interface Preset {
  name: string;
  config: GameConfig;
}

export const PRESETS: Preset[] = [
  {
    name: "2P 20bb (no rake)",
    config: {
      playerCount: 2,
      sb: 0.5,
      bb: 1,
      stacks: [20, 20],
      rake: { ...DEFAULT_RAKE, mode: "none" },
      accuracy: "medium",
      unit: "bb",
    },
  },
  {
    name: "2P 10bb (no rake)",
    config: {
      playerCount: 2,
      sb: 0.5,
      bb: 1,
      stacks: [10, 10],
      rake: { ...DEFAULT_RAKE, mode: "none" },
      accuracy: "medium",
      unit: "bb",
    },
  },
  {
    name: "2P 15bb (5% rake, cap 1)",
    config: {
      playerCount: 2,
      sb: 0.5,
      bb: 1,
      stacks: [15, 15],
      rake: { ...DEFAULT_RAKE, mode: "percent_cap", percent: 0.05, cap: 1, rakePreflop: true },
      accuracy: "medium",
      unit: "bb",
    },
  },
  {
    name: "3P 20bb (no rake)",
    config: {
      playerCount: 3,
      sb: 0.5,
      bb: 1,
      stacks: [20, 20, 20],
      rake: { ...DEFAULT_RAKE, mode: "none" },
      accuracy: "medium",
      unit: "bb",
    },
  },
  {
    name: "3P 10bb (no rake)",
    config: {
      playerCount: 3,
      sb: 0.5,
      bb: 1,
      stacks: [10, 10, 10],
      rake: { ...DEFAULT_RAKE, mode: "none" },
      accuracy: "medium",
      unit: "bb",
    },
  },
  {
    name: "4P 15bb (no rake)",
    config: {
      playerCount: 4,
      sb: 0.5,
      bb: 1,
      stacks: [15, 15, 15, 15],
      rake: { ...DEFAULT_RAKE, mode: "none" },
      accuracy: "medium",
      unit: "bb",
    },
  },
  {
    name: "2P Unequal (10bb vs 20bb)",
    config: {
      playerCount: 2,
      sb: 0.5,
      bb: 1,
      stacks: [10, 20],
      rake: { ...DEFAULT_RAKE, mode: "none" },
      accuracy: "medium",
      unit: "bb",
    },
  },
];
