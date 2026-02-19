const output = document.getElementById("output");
const statusText = document.getElementById("status");
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const HAND_SET = new Set();
const matrixState = {
  oop: { selected: new Set(), syncing: false },
  ip: { selected: new Set(), syncing: false },
};

const fields = {
  board: document.getElementById("board"),
  effectiveStack: document.getElementById("effectiveStack"),
  startingPot: document.getElementById("startingPot"),
  startingStreet: document.getElementById("startingStreet"),
  oopRange: document.getElementById("oopRange"),
  ipRange: document.getElementById("ipRange"),
  maxRaises: document.getElementById("maxRaises"),
  minBetPercent: document.getElementById("minBetPercent"),
  allInThreshold: document.getElementById("allInThreshold"),
  allowDonk: document.getElementById("allowDonk"),
  allowLimpTree: document.getElementById("allowLimpTree"),
  ipFlopBet: document.getElementById("ipFlopBet"),
  ipFlopRaise: document.getElementById("ipFlopRaise"),
  ipFlopAllIn: document.getElementById("ipFlopAllIn"),
  ipTurnBet: document.getElementById("ipTurnBet"),
  ipTurnRaise: document.getElementById("ipTurnRaise"),
  ipTurnAllIn: document.getElementById("ipTurnAllIn"),
  ipRiverBet: document.getElementById("ipRiverBet"),
  ipRiverRaise: document.getElementById("ipRiverRaise"),
  ipRiverAllIn: document.getElementById("ipRiverAllIn"),
  oopFlopBet: document.getElementById("oopFlopBet"),
  oopFlopRaise: document.getElementById("oopFlopRaise"),
  oopFlopAllIn: document.getElementById("oopFlopAllIn"),
  oopFlopLead: document.getElementById("oopFlopLead"),
  oopTurnBet: document.getElementById("oopTurnBet"),
  oopTurnRaise: document.getElementById("oopTurnRaise"),
  oopTurnAllIn: document.getElementById("oopTurnAllIn"),
  oopTurnLead: document.getElementById("oopTurnLead"),
  oopRiverBet: document.getElementById("oopRiverBet"),
  oopRiverRaise: document.getElementById("oopRiverRaise"),
  oopRiverAllIn: document.getElementById("oopRiverAllIn"),
  oopRiverLead: document.getElementById("oopRiverLead"),
};

const generateBtn = document.getElementById("generateBtn");
const downloadBtn = document.getElementById("downloadBtn");
const uploadInput = document.getElementById("uploadInput");
const matrixElements = {
  oop: document.getElementById("oopMatrix"),
  ip: document.getElementById("ipMatrix"),
};
const matrixContentElements = {
  oop: document.getElementById("oopMatrixContent"),
  ip: document.getElementById("ipMatrixContent"),
};
const matrixActionElements = {
  oop: document.getElementById("oopMatrixActions"),
  ip: document.getElementById("ipMatrixActions"),
};
const matrixToggleButtons = {
  oop: document.getElementById("oopMatrixToggle"),
  ip: document.getElementById("ipMatrixToggle"),
};
const matrixCounts = {
  oop: document.getElementById("oopMatrixCount"),
  ip: document.getElementById("ipMatrixCount"),
};
const oopSelectAllBtn = document.getElementById("oopSelectAllBtn");
const oopClearBtn = document.getElementById("oopClearBtn");
const ipSelectAllBtn = document.getElementById("ipSelectAllBtn");
const ipClearBtn = document.getElementById("ipClearBtn");
const dragState = {
  active: false,
  player: null,
  value: false,
};

function getHandLabel(rowIndex, colIndex) {
  const rowRank = RANKS[rowIndex];
  const colRank = RANKS[colIndex];
  if (rowIndex === colIndex) {
    return `${rowRank}${colRank}`;
  }
  if (rowIndex < colIndex) {
    return `${rowRank}${colRank}s`;
  }
  return `${colRank}${rowRank}o`;
}

function getHandType(rowIndex, colIndex) {
  if (rowIndex === colIndex) {
    return "pair";
  }
  return rowIndex < colIndex ? "suited" : "offsuit";
}

function initializeHands() {
  for (let row = 0; row < RANKS.length; row += 1) {
    for (let col = 0; col < RANKS.length; col += 1) {
      HAND_SET.add(getHandLabel(row, col));
    }
  }
}

function parseRangeHands(rangeText) {
  const tokens = rangeText
    .split(/[\s,]+/)
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);
  const selected = new Set();
  tokens.forEach((token) => {
    if (HAND_SET.has(token)) {
      selected.add(token);
    }
  });
  return selected;
}

function toRangeString(selectedHands) {
  return [...selectedHands].sort().join(",");
}

function updateMatrixCount(player) {
  matrixCounts[player].textContent = `${matrixState[player].selected.size} / 169 selected`;
}

function syncRangeTextFromMatrix(player) {
  const textarea = player === "oop" ? fields.oopRange : fields.ipRange;
  matrixState[player].syncing = true;
  textarea.value = toRangeString(matrixState[player].selected);
  matrixState[player].syncing = false;
  updateMatrixCount(player);
}

function syncMatrixFromRangeText(player) {
  const textarea = player === "oop" ? fields.oopRange : fields.ipRange;
  matrixState[player].selected = parseRangeHands(textarea.value);
  const container = matrixElements[player];
  container.querySelectorAll(".range-cell").forEach((cell) => {
    const hand = cell.dataset.hand;
    cell.classList.toggle("selected", matrixState[player].selected.has(hand));
  });
  updateMatrixCount(player);
}

function buildRangeMatrix(player) {
  const container = matrixElements[player];
  container.innerHTML = "";
  for (let row = 0; row < RANKS.length; row += 1) {
    for (let col = 0; col < RANKS.length; col += 1) {
      const hand = getHandLabel(row, col);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `range-cell ${getHandType(row, col)}`;
      cell.dataset.hand = hand;
      cell.textContent = hand;
      cell.addEventListener("mousedown", (event) => {
        if (event.button !== 0) {
          return;
        }
        event.preventDefault();
        dragState.active = true;
        dragState.player = player;
        dragState.value = !matrixState[player].selected.has(hand);
        applyCellSelection(player, hand, dragState.value);
      });
      cell.addEventListener("mouseenter", (event) => {
        if (event.buttons !== 1 || !dragState.active || dragState.player !== player) {
          return;
        }
        event.preventDefault();
        applyCellSelection(player, hand, dragState.value);
      });
      container.appendChild(cell);
    }
  }
}

function applyCellSelection(player, hand, shouldSelect) {
  const selectedHands = matrixState[player].selected;
  if (shouldSelect) {
    selectedHands.add(hand);
  } else {
    selectedHands.delete(hand);
  }
  const cell = matrixElements[player].querySelector(`[data-hand="${hand}"]`);
  if (cell) {
    cell.classList.toggle("selected", shouldSelect);
  }
  syncRangeTextFromMatrix(player);
}

function setMatrixExpanded(player, expanded) {
  matrixContentElements[player].classList.toggle("hidden", !expanded);
  matrixActionElements[player].classList.toggle("hidden", !expanded);
  matrixToggleButtons[player].setAttribute("aria-expanded", String(expanded));
}

function parseList(input) {
  return input
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0);
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.style.color = isError ? "#b42318" : "#2f5736";
}

function getStreetConfig(prefix, street) {
  return {
    betSizesPctPot: parseList(fields[`${prefix}${street}Bet`].value),
    raiseSizesPctPot: parseList(fields[`${prefix}${street}Raise`].value),
    addAllIn: fields[`${prefix}${street}AllIn`].checked,
    allowLead: prefix === "oop" ? fields[`${prefix}${street}Lead`].checked : undefined,
  };
}

function buildConfig() {
  const effectiveStack = Number(fields.effectiveStack.value);
  const startingPot = Number(fields.startingPot.value);

  if (!Number.isFinite(effectiveStack) || effectiveStack <= 0) {
    throw new Error("Effective stack must be a positive number.");
  }
  if (!Number.isFinite(startingPot) || startingPot < 0) {
    throw new Error("Starting pot must be zero or greater.");
  }

  return {
    metadata: {
      app: "cfr-tree-builder",
      version: 1,
      generatedAt: new Date().toISOString(),
    },
    setup: {
      board: fields.board.value.trim(),
      startingStreet: fields.startingStreet.value,
      effectiveStackBb: effectiveStack,
      startingPotBb: startingPot,
    },
    ranges: {
      oop: fields.oopRange.value.trim(),
      ip: fields.ipRange.value.trim(),
    },
    treeRules: {
      maxRaisesPerNode: Number(fields.maxRaises.value),
      minBetSizePctPot: Number(fields.minBetPercent.value),
      allInThresholdPctStack: Number(fields.allInThreshold.value),
      allowDonkBets: fields.allowDonk.checked,
      includeLimpTree: fields.allowLimpTree.checked,
    },
    sizing: {
      ip: {
        flop: getStreetConfig("ip", "Flop"),
        turn: getStreetConfig("ip", "Turn"),
        river: getStreetConfig("ip", "River"),
      },
      oop: {
        flop: getStreetConfig("oop", "Flop"),
        turn: getStreetConfig("oop", "Turn"),
        river: getStreetConfig("oop", "River"),
      },
    },
  };
}

function renderConfig(config) {
  output.textContent = JSON.stringify(config, null, 2);
}

function applyConfig(config) {
  fields.board.value = config.setup?.board || "";
  fields.effectiveStack.value = config.setup?.effectiveStackBb ?? 100;
  fields.startingPot.value = config.setup?.startingPotBb ?? 5;
  fields.startingStreet.value = config.setup?.startingStreet || "flop";
  fields.oopRange.value = config.ranges?.oop || "";
  fields.ipRange.value = config.ranges?.ip || "";
  fields.maxRaises.value = config.treeRules?.maxRaisesPerNode ?? 2;
  fields.minBetPercent.value = config.treeRules?.minBetSizePctPot ?? 20;
  fields.allInThreshold.value = config.treeRules?.allInThresholdPctStack ?? 67;
  fields.allowDonk.checked = !!config.treeRules?.allowDonkBets;
  fields.allowLimpTree.checked = !!config.treeRules?.includeLimpTree;

  ["Flop", "Turn", "River"].forEach((street) => {
    const streetKey = street.toLowerCase();
    const ipStreet = config.sizing?.ip?.[streetKey];
    const oopStreet = config.sizing?.oop?.[streetKey];

    fields[`ip${street}Bet`].value = (ipStreet?.betSizesPctPot || []).join(",");
    fields[`ip${street}Raise`].value = (ipStreet?.raiseSizesPctPot || []).join(",");
    fields[`ip${street}AllIn`].checked = !!ipStreet?.addAllIn;

    fields[`oop${street}Bet`].value = (oopStreet?.betSizesPctPot || []).join(",");
    fields[`oop${street}Raise`].value = (oopStreet?.raiseSizesPctPot || []).join(",");
    fields[`oop${street}AllIn`].checked = !!oopStreet?.addAllIn;
    fields[`oop${street}Lead`].checked = !!oopStreet?.allowLead;
  });
}

generateBtn.addEventListener("click", () => {
  try {
    const config = buildConfig();
    renderConfig(config);
    setStatus("Config generated.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

downloadBtn.addEventListener("click", () => {
  try {
    const config = buildConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tree-config.json";
    link.click();
    URL.revokeObjectURL(url);
    renderConfig(config);
    setStatus("Downloaded tree-config.json");
  } catch (error) {
    setStatus(error.message, true);
  }
});

uploadInput.addEventListener("change", async () => {
  const file = uploadInput.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    applyConfig(parsed);
    renderConfig(parsed);
    setStatus("Config loaded.");
  } catch (error) {
    setStatus("Failed to parse JSON config.", true);
  } finally {
    uploadInput.value = "";
  }
});

fields.oopRange.addEventListener("input", () => {
  if (!matrixState.oop.syncing) {
    syncMatrixFromRangeText("oop");
  }
});

fields.ipRange.addEventListener("input", () => {
  if (!matrixState.ip.syncing) {
    syncMatrixFromRangeText("ip");
  }
});

oopSelectAllBtn.addEventListener("click", () => {
  matrixState.oop.selected = new Set(HAND_SET);
  syncRangeTextFromMatrix("oop");
  syncMatrixFromRangeText("oop");
});

oopClearBtn.addEventListener("click", () => {
  matrixState.oop.selected = new Set();
  syncRangeTextFromMatrix("oop");
  syncMatrixFromRangeText("oop");
});

ipSelectAllBtn.addEventListener("click", () => {
  matrixState.ip.selected = new Set(HAND_SET);
  syncRangeTextFromMatrix("ip");
  syncMatrixFromRangeText("ip");
});

ipClearBtn.addEventListener("click", () => {
  matrixState.ip.selected = new Set();
  syncRangeTextFromMatrix("ip");
  syncMatrixFromRangeText("ip");
});

matrixToggleButtons.oop.addEventListener("click", () => {
  const expanded = matrixToggleButtons.oop.getAttribute("aria-expanded") === "true";
  setMatrixExpanded("oop", !expanded);
});

matrixToggleButtons.ip.addEventListener("click", () => {
  const expanded = matrixToggleButtons.ip.getAttribute("aria-expanded") === "true";
  setMatrixExpanded("ip", !expanded);
});

document.addEventListener("mouseup", () => {
  dragState.active = false;
  dragState.player = null;
});

initializeHands();
buildRangeMatrix("oop");
buildRangeMatrix("ip");
setMatrixExpanded("oop", false);
setMatrixExpanded("ip", false);
syncMatrixFromRangeText("oop");
syncMatrixFromRangeText("ip");

renderConfig(buildConfig());
