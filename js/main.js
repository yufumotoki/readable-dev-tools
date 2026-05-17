import { detectType } from "./detector.js";
import { runTool } from "./router.js";
import { applyUnifiedDiff, compareTextDiff } from "./tools/diffViewer.js";

const inputArea = document.getElementById("inputArea");
const outputArea = document.getElementById("outputArea");
const toolSelect = document.getElementById("toolSelect");
const detectedType = document.getElementById("detectedType");
const formatButton = document.getElementById("formatButton");
const clearButton = document.getElementById("clearButton");
const copyButton = document.getElementById("copyButton");
const copyStatus = document.getElementById("copyStatus");
const logFilterPanel = document.getElementById("logFilterPanel");
const logLevelFilter = document.getElementById("logLevelFilter");
const logKeywordFilter = document.getElementById("logKeywordFilter");
const logCaseSensitive = document.getElementById("logCaseSensitive");
const editorGrid = document.getElementById("editorGrid");
const inputPanel = document.getElementById("inputPanel");
const diffModePanel = document.getElementById("diffModePanel");
const diffModeSelect = document.getElementById("diffModeSelect");
const diffComparePanel = document.getElementById("diffComparePanel");
const diffBeforeLabel = document.getElementById("diffBeforeLabel");
const diffAfterLabel = document.getElementById("diffAfterLabel");
const diffBeforeArea = document.getElementById("diffBeforeArea");
const diffAfterArea = document.getElementById("diffAfterArea");

let copyStatusTimer;

function formatTypeLabel(type) {
  const labels = {
    empty: "Empty",
    json: "JSON",
    log: "Log",
    code: "Code",
    stack: "Stack Trace",
    minify: "Minify",
    diff: "Diff",
    text: "Text",
  };

  return labels[type] || "Text";
}

export function processInput() {
  const input = inputArea.value;
  const selectedType = toolSelect.value;
  const type = selectedType === "auto" ? detectType(input) : selectedType;
  const isManualDiff = selectedType === "diff";
  const diffMode = diffModeSelect ? diffModeSelect.value : "compare";
  const isDiffCompareMode = isManualDiff && diffMode === "compare";
  const isDiffApplyMode = isManualDiff && diffMode === "apply";
  const usesTwoPanelDiff = isDiffCompareMode || isDiffApplyMode;
  const options = {
    log: {
      level: logLevelFilter ? logLevelFilter.value : "all",
      keyword: logKeywordFilter ? logKeywordFilter.value.trim() : "",
      caseSensitive: logCaseSensitive ? logCaseSensitive.checked : false,
    },
  };

  detectedType.textContent = formatTypeLabel(type);

  if (isDiffCompareMode && diffBeforeArea && diffAfterArea) {
    outputArea.value = compareTextDiff(diffBeforeArea.value, diffAfterArea.value);
  } else if (isDiffApplyMode && diffBeforeArea && diffAfterArea) {
    outputArea.value = applyUnifiedDiff(diffBeforeArea.value, diffAfterArea.value);
  } else {
    outputArea.value = runTool(type, input, options);
  }

  if (logFilterPanel) {
    logFilterPanel.hidden = type !== "log";
  }

  if (diffComparePanel) {
    diffComparePanel.hidden = !usesTwoPanelDiff;
  }

  if (diffModePanel) {
    diffModePanel.hidden = !isManualDiff;
  }

  if (inputPanel) {
    inputPanel.hidden = usesTwoPanelDiff;
  }

  if (editorGrid) {
    editorGrid.classList.toggle("output-only", usesTwoPanelDiff);
  }

  if (diffBeforeLabel && diffAfterLabel && diffBeforeArea && diffAfterArea) {
    if (isDiffApplyMode) {
      diffBeforeLabel.textContent = "Original";
      diffAfterLabel.textContent = "Patch";
      diffBeforeArea.placeholder = "元のコードやテキストを貼り付けてください";
      diffAfterArea.placeholder = "unified diff形式のpatchを貼り付けてください";
    } else {
      diffBeforeLabel.textContent = "Before";
      diffAfterLabel.textContent = "After";
      diffBeforeArea.placeholder = "比較元のテキストを貼り付けてください";
      diffAfterArea.placeholder = "比較先のテキストを貼り付けてください";
    }
  }
}

function resetCopyStatus(message = "") {
  window.clearTimeout(copyStatusTimer);
  copyStatus.textContent = message;

  if (message) {
    copyStatusTimer = window.setTimeout(() => {
      copyStatus.textContent = "";
    }, 1400);
  }
}

async function copyOutput() {
  const text = outputArea.value;

  if (!text) {
    resetCopyStatus("");
    return;
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      outputArea.focus();
      outputArea.select();
      document.execCommand("copy");
      outputArea.setSelectionRange(0, 0);
    }

    resetCopyStatus("Copied");
  } catch (error) {
    resetCopyStatus("Copy failed");
  }
}

inputArea.addEventListener("input", processInput);
toolSelect.addEventListener("change", processInput);
formatButton.addEventListener("click", processInput);

clearButton.addEventListener("click", () => {
  inputArea.value = "";
  outputArea.value = "";
  if (diffBeforeArea) {
    diffBeforeArea.value = "";
  }
  if (diffAfterArea) {
    diffAfterArea.value = "";
  }
  if (diffModeSelect) {
    diffModeSelect.value = "compare";
  }
  if (logLevelFilter) {
    logLevelFilter.value = "all";
  }
  if (logKeywordFilter) {
    logKeywordFilter.value = "";
  }
  if (logCaseSensitive) {
    logCaseSensitive.checked = false;
  }
  detectedType.textContent = "Empty";
  resetCopyStatus("");
  if (toolSelect.value === "diff" && diffBeforeArea) {
    diffBeforeArea.focus();
  } else {
    inputArea.focus();
  }
});

copyButton.addEventListener("click", copyOutput);
if (logLevelFilter) {
  logLevelFilter.addEventListener("change", processInput);
}
if (logKeywordFilter) {
  logKeywordFilter.addEventListener("input", processInput);
}
if (logCaseSensitive) {
  logCaseSensitive.addEventListener("change", processInput);
}
if (diffModeSelect) {
  diffModeSelect.addEventListener("change", processInput);
}
if (diffBeforeArea) {
  diffBeforeArea.addEventListener("input", processInput);
}
if (diffAfterArea) {
  diffAfterArea.addEventListener("input", processInput);
}

processInput();
