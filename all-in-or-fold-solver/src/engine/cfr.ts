import {
  GameConfig,
  GameTree,
  GameNode,
  NodeStrategy,
  WorkerOutput,
  SerializedSolverResult,
  ACCURACY_SAMPLES,
  MAX_CFR_ITERATIONS,
  CONVERGENCE_THRESHOLD,
  CFR_PROGRESS_INTERVAL,
} from "./types";
import { buildGameTree, getNode, infoSetKey } from "./gameTree";
import { computeHUEquityMatrix, cachedMultiwayEquity, clearEquityCache, EquityMatrix } from "./equity";
import { computeFoldWinPayoffs, computeShowdownPayoffs } from "./terminal";
import { NUM_HAND_GROUPS } from "./hands";

interface InfoSetData {
  regretSum: Float64Array;    // [fold_regret, jam_regret]
  strategySum: Float64Array;  // cumulative strategy for averaging
}

function getStrategy(data: InfoSetData): [number, number] {
  // Regret matching: strategy proportional to positive regrets
  const rFold = Math.max(0, data.regretSum[0]);
  const rJam = Math.max(0, data.regretSum[1]);
  const total = rFold + rJam;
  if (total <= 0) return [0.5, 0.5];
  return [rFold / total, rJam / total];
}

function getAverageStrategy(data: InfoSetData): [number, number] {
  const total = data.strategySum[0] + data.strategySum[1];
  if (total <= 0) return [0.5, 0.5];
  return [data.strategySum[0] / total, data.strategySum[1] / total];
}

/**
 * Main CFR solver entry point. Called from the WebWorker.
 */
export async function solveCFR(
  config: GameConfig,
  emit: (msg: WorkerOutput) => void,
  isStopped: () => boolean,
): Promise<void> {
  const tree = buildGameTree(config.playerCount, config.stacks, config.sb, config.bb);

  // Phase 1: Compute equity matrix
  emit({ type: "progress", phase: "equity", percent: 0 });

  const samplesPerMatchup = ACCURACY_SAMPLES[config.accuracy];
  const equityMatrix = computeHUEquityMatrix(
    samplesPerMatchup,
    (pct) => {
      emit({ type: "progress", phase: "equity", percent: pct });
    },
    isStopped,
  );

  if (isStopped()) return;
  emit({ type: "progress", phase: "equity", percent: 100 });

  clearEquityCache();

  // Phase 2: Run CFR
  const infoSets = new Map<string, InfoSetData>();

  function getOrCreateInfoSet(key: string): InfoSetData {
    let data = infoSets.get(key);
    if (!data) {
      data = {
        regretSum: new Float64Array(2),
        strategySum: new Float64Array(2),
      };
      infoSets.set(key, data);
    }
    return data;
  }

  /**
   * CFR traversal for one iteration.
   * traversalPlayer: the player whose regrets are updated.
   * handGroups[i]: hand group index for player i.
   * reach[i]: reach probability for player i.
   * Returns the expected value for the traversal player.
   */
  function cfr(
    node: GameNode,
    handGroups: number[],
    reach: Float64Array,
    traversalPlayer: number,
  ): number {
    if (node.isTerminal) {
      return terminalValue(node, handGroups, traversalPlayer, config, equityMatrix);
    }

    const actIdx = node.actingPlayerIndex!;
    const hg = handGroups[actIdx];
    const key = infoSetKey(node, hg);
    const data = getOrCreateInfoSet(key);
    const strategy = getStrategy(data);

    // Compute action values
    const actionValues = new Float64Array(2); // [fold_ev, jam_ev]

    for (let a = 0; a < 2; a++) {
      const childEdge = node.children[a];
      const childNode = getNode(tree, childEdge.nodeId);

      const newReach = new Float64Array(reach);
      newReach[actIdx] *= strategy[a];

      actionValues[a] = cfr(childNode, handGroups, newReach, traversalPlayer);
    }

    const nodeValue = strategy[0] * actionValues[0] + strategy[1] * actionValues[1];

    // Update regrets for the acting player if they are the traversal player
    if (actIdx === traversalPlayer) {
      for (let a = 0; a < 2; a++) {
        data.regretSum[a] += actionValues[a] - nodeValue;
      }
    }

    // Accumulate strategy (weighted by reach of the acting player)
    data.strategySum[0] += reach[actIdx] * strategy[0];
    data.strategySum[1] += reach[actIdx] * strategy[1];

    return nodeValue;
  }

  function terminalValue(
    node: GameNode,
    handGroups: number[],
    traversalPlayer: number,
    config: GameConfig,
    eqMatrix: EquityMatrix,
  ): number {
    if (node.terminalType === "fold-win") {
      const result = computeFoldWinPayoffs(node, config.rake);
      return result.payoffs[traversalPlayer];
    }

    // Showdown: compute equity shares for specific hand groups
    const nonFolded = node.players
      .map((p, i) => ({ idx: i, status: p.status }))
      .filter((e) => e.status !== "folded");

    if (nonFolded.length === 2) {
      const i0 = nonFolded[0].idx;
      const i1 = nonFolded[1].idx;
      const hg0 = handGroups[i0];
      const hg1 = handGroups[i1];
      const eq0 = eqMatrix[hg0 * NUM_HAND_GROUPS + hg1];
      const eqShares = new Array(node.players.length).fill(0);
      eqShares[i0] = eq0;
      eqShares[i1] = 1 - eq0;
      const result = computeShowdownPayoffs(node, eqShares, config.rake);
      return result.payoffs[traversalPlayer];
    }

    // 3+ way: use multiway equity
    const hgList = nonFolded.map((e) => handGroups[e.idx]);
    const multiSamples = ACCURACY_SAMPLES[config.accuracy];
    const eqs = cachedMultiwayEquity(hgList, multiSamples);
    const eqShares = new Array(node.players.length).fill(0);
    for (let k = 0; k < nonFolded.length; k++) {
      eqShares[nonFolded[k].idx] = eqs[k];
    }
    const result = computeShowdownPayoffs(node, eqShares, config.rake);
    return result.payoffs[traversalPlayer];
  }

  // Main CFR loop
  let iterations = 0;

  for (let iter = 0; iter < MAX_CFR_ITERATIONS; iter++) {
    if (isStopped()) break;

    for (let traversalPlayer = 0; traversalPlayer < config.playerCount; traversalPlayer++) {
      iterateHandGroups(
        tree,
        config.playerCount,
        traversalPlayer,
        (handGroups) => {
          const reach = new Float64Array(config.playerCount).fill(1);
          cfr(getNode(tree, tree.root), handGroups, reach, traversalPlayer);
        },
      );
    }

    iterations = iter + 1;

    if (iterations % CFR_PROGRESS_INTERVAL === 0 || iterations === 1) {
      const exploitability = computeExploitability(
        tree, config, infoSets, equityMatrix,
      );
      emit({
        type: "progress",
        phase: "cfr",
        percent: (iterations / MAX_CFR_ITERATIONS) * 100,
        iterations,
        exploitability,
      });

      if (exploitability < CONVERGENCE_THRESHOLD) break;
    }
  }

  // Extract final strategies
  const nodeStrategies = extractStrategies(tree, config, infoSets);

  const exploitability = computeExploitability(tree, config, infoSets, equityMatrix);

  const result: SerializedSolverResult = {
    nodeStrategies: Array.from(nodeStrategies.entries()),
    iterations,
    exploitability,
    status: isStopped() ? "stopped" : "converged",
  };

  emit({ type: "result", data: result });
}

/**
 * Iterate over all hand group combinations for N players.
 * For scalability, we iterate over each hand group for each player.
 * With 169 groups and 2-4 players: 169^2 = 28K (2p), 169^3 = 4.8M (3p), 169^4 = 815M (4p).
 * For 3+ players, we sample rather than exhaustively iterate.
 */
function iterateHandGroups(
  tree: GameTree,
  playerCount: number,
  traversalPlayer: number,
  callback: (handGroups: number[]) => void,
): void {
  if (playerCount === 2) {
    for (let tp = 0; tp < NUM_HAND_GROUPS; tp++) {
      for (let opp = 0; opp < NUM_HAND_GROUPS; opp++) {
        const handGroups = [0, 0];
        handGroups[traversalPlayer] = tp;
        handGroups[1 - traversalPlayer] = opp;
        callback(handGroups);
      }
    }
  } else {
    // For 3-4 players, sample opponent hands to keep iterations tractable
    const oppSamples = playerCount === 3 ? 50 : 30;
    for (let tp = 0; tp < NUM_HAND_GROUPS; tp++) {
      for (let s = 0; s < oppSamples; s++) {
        const handGroups = new Array(playerCount).fill(0);
        handGroups[traversalPlayer] = tp;
        for (let p = 0; p < playerCount; p++) {
          if (p !== traversalPlayer) {
            handGroups[p] = Math.floor(Math.random() * NUM_HAND_GROUPS);
          }
        }
        callback(handGroups);
      }
    }
  }
}

function extractStrategies(
  tree: GameTree,
  config: GameConfig,
  infoSets: Map<string, InfoSetData>,
): Map<string, NodeStrategy> {
  const result = new Map<string, NodeStrategy>();

  function visit(node: GameNode): void {
    if (node.isTerminal) return;

    const historyKey = node.actionHistory.join(",");
    const nodeKey = `${historyKey}|P${node.actingPlayerIndex}`;

    if (!result.has(nodeKey)) {
      const jamFreq = new Float64Array(NUM_HAND_GROUPS);
      const evFold = new Float64Array(NUM_HAND_GROUPS);
      const evJam = new Float64Array(NUM_HAND_GROUPS);

      for (let hg = 0; hg < NUM_HAND_GROUPS; hg++) {
        const key = infoSetKey(node, hg);
        const data = infoSets.get(key);
        if (data) {
          const [foldProb, jamProb] = getAverageStrategy(data);
          jamFreq[hg] = jamProb;

          const regTotal = Math.abs(data.regretSum[0]) + Math.abs(data.regretSum[1]);
          if (regTotal > 0) {
            evFold[hg] = data.regretSum[0] / regTotal;
            evJam[hg] = data.regretSum[1] / regTotal;
          }
        } else {
          jamFreq[hg] = 0.5;
        }
      }

      result.set(nodeKey, {
        jamFrequency: Array.from(jamFreq),
        evFold: Array.from(evFold),
        evJam: Array.from(evJam),
      });
    }

    for (const child of node.children) {
      visit(getNode(tree, child.nodeId));
    }
  }

  visit(getNode(tree, tree.root));
  return result;
}

/**
 * Compute exploitability: sum of best-response values for each player.
 * A value near 0 means the strategy is close to Nash equilibrium.
 */
function computeExploitability(
  tree: GameTree,
  config: GameConfig,
  infoSets: Map<string, InfoSetData>,
  equityMatrix: EquityMatrix,
): number {
  let totalExpl = 0;

  for (let p = 0; p < config.playerCount; p++) {
    // Best response value for player p vs opponents' average strategies
    // Simplified: sum over all hands the max(EV_fold, EV_jam) - current_EV
    let brValue = 0;
    let currentValue = 0;
    let count = 0;

    const rootNode = getNode(tree, tree.root);
    for (let hg = 0; hg < NUM_HAND_GROUPS; hg++) {
      // Walk the tree and compute values
      const key = infoSetKey(rootNode, hg);
      const data = infoSets.get(key);
      if (data && rootNode.actingPlayerIndex === p) {
        const [foldProb, jamProb] = getAverageStrategy(data);
        brValue += Math.max(data.regretSum[0], data.regretSum[1]);
        currentValue += foldProb * data.regretSum[0] + jamProb * data.regretSum[1];
        count++;
      }
    }

    if (count > 0) {
      totalExpl += (brValue - currentValue) / count;
    }
  }

  return Math.max(0, totalExpl / config.playerCount);
}
