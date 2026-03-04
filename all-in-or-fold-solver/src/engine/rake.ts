import { RakeConfig, SidePot } from "./types";

export interface RakeResult {
  pots: SidePot[];
  totalRake: number;
}

function rakeAmount(potSize: number, config: RakeConfig): number {
  if (config.mode === "none") return 0;

  // "no flop no drop" means preflop pots pay no rake
  // rakePreflop overrides this: if true, rake still applies
  if (config.noFlopNoDrop && !config.rakePreflop) return 0;

  if (potSize < config.minPotThreshold) return 0;

  switch (config.mode) {
    case "fixed":
      return config.fixedDrop;
    case "percent": {
      return potSize * config.percent;
    }
    case "percent_cap": {
      return Math.min(potSize * config.percent, config.cap);
    }
    case "threshold": {
      return Math.min(potSize * config.percent, config.cap > 0 ? config.cap : Infinity);
    }
    default:
      return 0;
  }
}

/**
 * Apply rake to side pots.
 * If config.perPot, each side pot is raked individually.
 * Otherwise, rake is taken from the total and distributed proportionally.
 */
export function applyRake(pots: SidePot[], config: RakeConfig): RakeResult {
  if (config.mode === "none") {
    return { pots: pots.map((p) => ({ ...p })), totalRake: 0 };
  }

  if (config.noFlopNoDrop && !config.rakePreflop) {
    return { pots: pots.map((p) => ({ ...p })), totalRake: 0 };
  }

  if (config.perPot) {
    let totalRake = 0;
    const rakedPots = pots.map((pot) => {
      const rake = rakeAmount(pot.amount, config);
      totalRake += rake;
      return {
        ...pot,
        amount: pot.amount - rake,
      };
    });
    return { pots: rakedPots, totalRake };
  }

  // Rake total pot, distribute proportionally
  const totalPotSize = pots.reduce((s, p) => s + p.amount, 0);
  const rake = rakeAmount(totalPotSize, config);
  if (rake === 0 || totalPotSize === 0) {
    return { pots: pots.map((p) => ({ ...p })), totalRake: 0 };
  }

  const factor = (totalPotSize - rake) / totalPotSize;
  const rakedPots = pots.map((pot) => ({
    ...pot,
    amount: pot.amount * factor,
  }));
  return { pots: rakedPots, totalRake: rake };
}
