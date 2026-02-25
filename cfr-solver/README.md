# CFR Solver

Counterfactual Regret Minimization solver for heads-up poker. A web UI
for defining tree configurations and a C++ solver engine that computes
Nash Equilibrium strategies.

## Structure

```
cfr-solver/
├── core/                   Shared C++ headers
│   ├── tree_config.h         JSON config parser
│   ├── game_tree.h           Pre-built game tree (nodes, actions, payoffs)
│   └── cfr_engine.h          CFR algorithm + strategy output
├── river-node-solver/      River-only bucket solver
│   ├── river_solver.cpp      CLI entry point
│   └── examples/             Sample JSON configs
└── web-ui/                 Browser UI for building tree configs
    ├── index.html
    ├── styles.css
    └── app.js
```

## Web UI

Defines a solver tree configuration:
- Player ranges (IP/OOP)
- Board cards
- Effective stack and starting pot
- Bet and raise sizes by street/position
- Tree rules (max raises, all-in threshold, donk/limp toggles)

```bash
open web-ui/index.html
```

## River Solver

See [river-node-solver/README.md](river-node-solver/README.md) for
build instructions, usage, and JSON config reference.

```bash
cd river-node-solver
make run
```
