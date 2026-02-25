# River Node CFR Solver

A Counterfactual Regret Minimization (CFR) solver for river-only
heads-up poker decisions. Reads a JSON config (compatible with the
`cfr-tree-builder` web UI) and computes approximate Nash Equilibrium
strategies over actual hand combos.

## Build

```bash
make
make run
```

Requires **g++** with C++20 support and **curl** (for the one-time header
download).

## Usage

```bash
./river_solver <config.json> [iterations | --exploit-pct P] [--json]
```

Three stopping modes:

| Mode | Invocation | Behaviour |
|---|---|---|
| Convergence (default) | `./river_solver config.json` | Train until exploitability ≤ target % pot |
| Fixed iterations | `./river_solver config.json 5000` | Run exactly N iterations |
| Custom target | `./river_solver config.json --exploit-pct 0.1` | Train until exploitability ≤ 0.1% pot |

Add `--json` (or `-j`) to emit the full solution tree as JSON to stdout.

```bash
# Default convergence (0.25% pot) with text output
./river_solver examples/river_config.json

# Fixed 50k iterations, JSON output
./river_solver examples/river_config.json 50000 --json

# Tight convergence target
./river_solver examples/river_config.json -e 0.05 -j > solution.json

# Quick run via Makefile
make run
make json
```
## JSON configuration

The solver reads the same JSON format produced by the web UI.

| Path | Type | Default | Description |
|---|---|---|---|
| `setup.board` | string | — | Board cards (e.g. `"Qs Jh 2h 8c 5d"`) |
| `setup.startingPotBb` | number | 20 | Starting pot in bb |
| `setup.effectiveStackBb` | number | 100 | Effective stack in bb |
| `ranges.oop` | string | — | OOP range (e.g. `"AA,KK,AKs"`) |
| `ranges.ip` | string | — | IP range |
| `treeRules.maxRaisesPerNode` | int | 2 | Max bets / raises per sequence |
| `treeRules.minBetSizePctPot` | number | 20 | Min bet as % of pot |
| `treeRules.allInThresholdPctStack` | number | 67 | Bet ≥ X% of stack → all-in |
| `sizing.oop.river.betSizesPctPot` | [number] | — | OOP bet sizes (% pot) |
| `sizing.oop.river.raiseSizesPctPot` | [number] | — | OOP raise sizes (% pot) |
| `sizing.oop.river.addAllIn` | bool | false | Include all-in action |
| `sizing.oop.river.allowLead` | bool | true | Let OOP open-bet (lead) |
| `sizing.ip.river.*` | — | — | Same structure for IP |
| `solver.targetExploitabilityPctPot` | number | 0.25 | Stop when exploit ≤ X% pot |
| `solver.maxIterations` | int | 1 000 000 | Safety cap for convergence mode |

See `examples/river_config.json` for a full working example.

## Sizing semantics

- **Bet** = `pot × pct / 100`
- **Raise** = `to_call + pot × pct / 100` (call first, then add pct% of current pot)
- If a bet/raise uses ≥ `allInThresholdPctStack`% of the remaining stack it is
  automatically converted to an all-in.
- Duplicate actions (same amount after capping) are deduplicated.

## Output

### Text mode (default)

Prints the average strategy for every information set, grouped by
tree node and sorted by depth:

```
Game value (OOP): 1.2688 bb
Exploitability:   0.0423 bb (0.2117% pot)

Game tree
============================================================

(root) OOP to act
  AcAd  check:0.4537  b75:0.5463  allin:0.0000
  AcAh  check:0.0006  b75:0.9994  allin:0.0000
  ...
```

### JSON mode (`--json`)

Writes the full solution tree to stdout. The `meta` object includes:

```json
{
  "board": "Qs Jh 2h 8c 5d",
  "pot": 20.0,
  "stack": 100.0,
  "gameValueOop": 1.2688,
  "iterations": 3750,
  "exploitability": 0.0423,
  "exploitabilityPctPot": 0.2117,
  "oopRange": "AA,KK,QQ,JJ,TT,AKs,AQs,AJs,KQs",
  "ipRange": "AA,KK,QQ,JJ,TT,99,AKs,AQs,AJs,ATs,KQs,KJs,QJs"
}
```

Each node in the `nodes` array contains the strategy map
(`hand_label → [freq_per_action]`), pot, stacks, and child references.
