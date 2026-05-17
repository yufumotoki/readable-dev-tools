import { detectType } from "./detector.js";
import { runTool } from "./router.js";
import { compareTextDiff } from "./tools/diffViewer.js";

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
const diffComparePanel = document.getElementById("diffComparePanel");
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
  const options = {
    log: {
      level: logLevelFilter ? logLevelFilter.value : "all",
      keyword: logKeywordFilter ? logKeywordFilter.value.trim() : "",
      caseSensitive: logCaseSensitive ? logCaseSensitive.checked : false,
    },
  };

  detectedType.textContent = formatTypeLabel(type);

  if (
    type === "diff" &&
    toolSelect.value === "diff" &&
    diffBeforeArea &&
    diffAfterArea &&
    (diffBeforeArea.value || diffAfterArea.value)
  ) {
    outputArea.value = compareTextDiff(diffBeforeArea.value, diffAfterArea.value);
  } else {
    outputArea.value = runTool(type, input, options);
  }

  if (logFilterPanel) {
    logFilterPanel.hidden = type !== "log";
  }

  if (diffComparePanel) {
    diffComparePanel.hidden = type !== "diff";
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
  inputArea.focus();
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
if (diffBeforeArea) {
  diffBeforeArea.addEventListener("input", processInput);
}
if (diffAfterArea) {
  diffAfterArea.addEventListener("input", processInput);
}

processInput();
