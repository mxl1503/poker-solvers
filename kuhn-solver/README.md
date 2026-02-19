# Kuhn Solver

A C++20 implementation of **Counterfactual Regret Minimization (CFR)** for **Kuhn Poker**.

## What is Kuhn Poker?

Kuhn Poker is a tiny poker game used to study game theory and imperfect-information decision making.

Rules:
- Deck has only 3 cards: `J`, `Q`, `K`.
- Two players each ante 1 chip.
- Each player is dealt one private card.
- There is one betting round with two actions:
  - `b`: bet (or call, depending on context)
  - `c`: check (or fold, depending on context)
- Highest card wins at showdown (`K > Q > J`).

Even though the game is small, it still has hidden information and bluffing, which makes it a standard teaching example for CFR.

## How this solver works

`kuhn_solver.cpp` trains strategies using vanilla CFR via the `KuhnSolver` class:

1. Sample a random deal of two cards from `J/Q/K`.
2. Traverse the game tree recursively from the current history.
3. At each information set (private card + action history), compute the current strategy via regret matching.
4. Evaluate both actions (`b` and `c`) to get counterfactual values.
5. Update cumulative regrets and average strategy sums.
6. Repeat for many iterations.

As iterations increase, the average strategy converges to a Nash equilibrium. The theoretical game value for player 1 is exactly `-1/18` (~`-0.0556`).

## Build and run

From this folder:

```bash
make
make run
```

Run with a custom iteration count:

```bash
make run ITER=10000000
```

Or run the binary directly:

```bash
./kuhn_solver 1000000
```

## Linting

```bash
make lint
```

## Expected output

The program prints:
- The theoretical game value for player 1 (`-1/18`).
- The computed average game value from training.
- The learned average strategy at each information set, with a human-readable description of the situation.

With enough iterations, the computed value converges to `-0.0556` and the strategies match the known Nash equilibrium.
