# Poker Solvers

A collection of Counterfactual Regret Minimization (CFR) solvers for
poker, from toy games to preflop all-in-or-fold and real river decisions.

## Projects

### [Kuhn Solver](kuhn-solver/)

CFR applied to **Kuhn Poker** — a 3-card toy game often used to
introduce game-theoretic concepts. Trains strategies that converge to
the known Nash Equilibrium (game value −1/18 for player 1).

```bash
cd kuhn-solver
make run
```

### [All-In or Fold Solver](all-in-or-fold-solver/)

Nash equilibrium solver for **preflop All-In or Fold** games with 2–4
players. Runs entirely in the browser using a WebWorker. Supports unequal
stacks, side pots, and configurable rake. Built with React + TypeScript.

```bash
cd all-in-or-fold-solver
npm install
npm run dev
```

### [CFR Solver](cfr-solver/)

A solver for **real poker** river decisions over actual hand combos,
paired with a React-based web UI for building tree configurations.

- **River Node Solver** — C++ engine that reads a JSON config, builds the
  corresponding game tree, and trains via CFR until nash distance falls under
  a target threshold (default 0.25% pot).
- **Web UI** — configure player ranges, board, stack/pot sizes, and
  bet sizings, then export the JSON config for the solver.

```bash
# Run the solver
cd cfr-solver/river-node-solver
make run

# Launch the web UI
cd cfr-solver/web-ui
npm install
npm run dev
```