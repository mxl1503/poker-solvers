/// <reference lib="webworker" />

import { WorkerInput, WorkerOutput } from "./types";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let stopped = false;

ctx.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const msg = e.data;
  if (msg.type === "stop") {
    stopped = true;
    return;
  }
  if (msg.type === "solve") {
    stopped = false;
    try {
      const { solveCFR } = await import("./cfr");
      await solveCFR(msg.config, (output: WorkerOutput) => {
        ctx.postMessage(output);
      }, () => stopped);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const out: WorkerOutput = { type: "error", message };
      ctx.postMessage(out);
    }
  }
};
