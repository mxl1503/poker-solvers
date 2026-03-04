# All-In or Fold Solver

A browser-based Nash equilibrium solver for No-Limit Texas Hold'em preflop
"All-In or Fold" games, supporting 2–4 players with unequal stacks, side pots,
and configurable rake.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and click **Solve**.

## How It Works

### Game Model

Each player acts in position order (UTG → BTN → SB → BB). At each decision
point, a player either **Folds** or **Jams** (moves all-in). The game ends
when only one player remains (fold-win) or all remaining players are all-in
(showdown).

### Solver

The solver uses **Counterfactual Regret Minimization (CFR+)** to compute
Nash equilibrium strategies. Each information set is identified by the acting
player's position, the action history, and their private hand category
(one of 169 canonical hand groups).

1. **Equity precomputation** — A 169×169 heads-up equity matrix is computed
   via Monte Carlo simulation before CFR starts. For 3+ way showdowns,
   multiway equity is computed on-demand with caching.
2. **CFR iterations** — The solver traverses the (tiny) fold/jam game tree,
   updating regrets and accumulating strategies. Convergence is measured
   by exploitability.
3. **Output** — Per-node jam/fold frequencies and EV estimates for each of
   the 169 hand groups.

### Accuracy vs Speed

The **Accuracy** setting controls Monte Carlo samples per equity matchup:

| Level  | Samples/matchup | Typical equity phase time |
|--------|----------------:|--------------------------|
| Low    | 200             | ~15–30s                  |
| Medium | 1,000           | ~60–120s                 |
| High   | 5,000           | ~5–10 min                |

CFR iterations themselves are fast (milliseconds) since the game tree is small.

## Features

- **2/3/4 player** support with configurable positions
- **Unequal stacks** and correct side-pot construction
- **Configurable rake**: percent, percent+cap, fixed drop, threshold,
  no-flop-no-drop, per-pot vs total-pot
- **Game tree explorer** with breadcrumb navigation
- **13×13 hand matrix** showing jam frequency with color gradient
- **Per-hand EV table** with sort by jam%, EV(fold), EV(jam)
- **Export** strategies as JSON or CSV
- **Presets** for common configurations
- **WebWorker** keeps UI responsive during computation
- **Unit tests** for side pots, rake, hand evaluation, and equity

## Architecture

```
src/engine/    Core logic (pure TypeScript, no DOM dependencies)
  types.ts     Type definitions and defaults
  cards.ts     Card/deck representation
  hands.ts     169 hand groups, combo enumeration
  gameState.ts Game state transitions (fold/jam)
  gameTree.ts  Full tree builder
  sidePots.ts  Side pot construction
  terminal.ts  Terminal payouts
  rake.ts      Rake calculation
  evaluator.ts 5-card/7-card hand evaluator
  equity.ts    Monte Carlo equity calculator with caching
  cfr.ts       CFR solver
  solver.worker.ts  WebWorker entry

src/ui/        React components
  App.tsx      Three-panel layout + state management
  ConfigPanel  Left panel (config + presets)
  NodeExplorer Center panel (tree navigation)
  StrategyPanel Right panel (strategies + EVs)
  HandMatrix   13×13 jam frequency grid
```

## Tests

```bash
npm test
```

Tests cover side-pot construction, rake modes, terminal payouts,
hand evaluation, and equity calculations.

## Tech Stack

React 18, TypeScript, Vite, Tailwind CSS, Vitest
