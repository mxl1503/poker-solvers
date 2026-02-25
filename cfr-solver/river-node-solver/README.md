# River Node CFR Solver

A simplified Counterfactual Regret Minimization (CFR) solver for river-only
heads-up poker decisions. Reads a JSON config (compatible with the
`cfr-tree-builder` web UI) and computes Nash Equilibrium strategies.

## How it works

| Concept | Implementation |
|---|---|
| Hand abstraction | Equity **buckets** (0 = weakest … N-1 = strongest) |
| Algorithm | Vanilla CFR with regret matching |
| Traversal | Full game-tree enumeration over all bucket pairs |
| Showdown | Higher bucket wins; ties chop |

OOP acts first. The tree is built implicitly from the sizing config — each
node's legal actions (check, bet, fold, call, raise, all-in) are derived on the
fly from pot geometry and the JSON parameters.

## Build

```bash
make          # downloads nlohmann/json header, compiles
make run      # run with examples/river_config.json
```

Requires **g++** with C++20 support and **curl** (for the one-time header
download).

## Usage

```bash
./river_solver <config.json> [iterations]
```

`iterations` on the command line overrides the value in the JSON file.

```bash
# Use a custom config, 50 000 iterations
./river_solver my_config.json 50000

# Quick run with default example
make run ITER=5000
```

## JSON configuration

The solver reads the same JSON format produced by the web UI. Only the fields
below are consumed; everything else (board, ranges, flop/turn sizing) is
ignored.

| Path | Type | Default | Description |
|---|---|---|---|
| `setup.startingPotBb` | number | 20 | Starting pot in bb |
| `setup.effectiveStackBb` | number | 100 | Effective stack in bb |
| `treeRules.maxRaisesPerNode` | int | 2 | Max bets / raises per sequence |
| `treeRules.minBetSizePctPot` | number | 20 | Min bet as % of pot |
| `treeRules.allInThresholdPctStack` | number | 67 | Bet ≥ X% of stack → all-in |
| `sizing.oop.river.betSizesPctPot` | [number] | — | OOP bet sizes (% pot) |
| `sizing.oop.river.raiseSizesPctPot` | [number] | — | OOP raise sizes (% pot) |
| `sizing.oop.river.addAllIn` | bool | false | Include all-in action |
| `sizing.oop.river.allowLead` | bool | true | Let OOP open-bet (lead) |
| `sizing.ip.river.*` | — | — | Same structure for IP |
| `solver.numBuckets` | int | 10 | Equity-bucket count |
| `solver.iterations` | int | 10 000 | CFR iterations |

See `examples/river_config.json` for a full working example.

## Bucket system

Hands are abstracted into **N equity buckets** numbered 0 through N-1.
Bucket 0 represents the weakest portion of a player's range; bucket N-1 the
strongest. At showdown the higher bucket wins. The solver computes an
independent strategy for every (bucket, action-history) information set.

## Sizing semantics

- **Bet** = `pot × pct / 100`
- **Raise** = `to_call + pot × pct / 100` (call first, then add pct% of current pot)
- If a bet/raise uses ≥ `allInThresholdPctStack`% of the remaining stack it is
  automatically converted to an all-in.
- Duplicate actions (same amount after capping) are deduplicated.

## Output

The solver prints the average strategy for every information set, grouped by
tree node (action history) and sorted by depth:

```
OOP | (root)
  [ 0]  check:0.9500  b75:0.0300  b125:0.0100  allin:0.0100
  [ 9]  check:0.1000  b75:0.3500  b125:0.4000  allin:0.1500

IP  | check
  [ 0]  check:0.8500  b75:0.1000  b125:0.0500  allin:0.0000
  ...
```

`[N]` is the bucket number. Frequencies sum to 1.0 per row.
