import { detectType } from "./detector.js";
import { runTool } from "./router.js";
import { applyUnifiedDiff, compareTextDiff } from "./tools/diffViewer.js";

const inputArea = document.getElementById("inputArea");
const outputArea = document.getElementById("outputArea");
const toolSelect = document.getElementById("toolSelect");
const languageSelect = document.getElementById("languageSelect");
const detectedType = document.getElementById("detectedType");
const sampleButton = document.getElementById("sampleButton");
const formatButton = document.getElementById("formatButton");
const clearButton = document.getElementById("clearButton");
const copyButton = document.getElementById("copyButton");
const copyStatus = document.getElementById("copyStatus");
const jsonOptionsPanel = document.getElementById("jsonOptionsPanel");
const jsonPathInput = document.getElementById("jsonPathInput");
const logFilterPanel = document.getElementById("logFilterPanel");
const logLevelFilter = document.getElementById("logLevelFilter");
const logKeywordFilter = document.getElementById("logKeywordFilter");
const logCaseSensitive = document.getElementById("logCaseSensitive");
const logTimeFrom = document.getElementById("logTimeFrom");
const logTimeTo = document.getElementById("logTimeTo");
const logContextLines = document.getElementById("logContextLines");
const stackOptionsPanel = document.getElementById("stackOptionsPanel");
const stackHideVendor = document.getElementById("stackHideVendor");
const minifyOptionsPanel = document.getElementById("minifyOptionsPanel");
const minifyModeSelect = document.getElementById("minifyModeSelect");
const textOptionsPanel = document.getElementById("textOptionsPanel");
const textMarkdownMode = document.getElementById("textMarkdownMode");
const textDedupeLines = document.getElementById("textDedupeLines");
const textSortLines = document.getElementById("textSortLines");
const editorGrid = document.getElementById("editorGrid");
const inputPanel = document.getElementById("inputPanel");
const diffModePanel = document.getElementById("diffModePanel");
const diffModeSelect = document.getElementById("diffModeSelect");
const diffComparePanel = document.getElementById("diffComparePanel");
const diffBeforeLabel = document.getElementById("diffBeforeLabel");
const diffAfterLabel = document.getElementById("diffAfterLabel");
const diffBeforeArea = document.getElementById("diffBeforeArea");
const diffAfterArea = document.getElementById("diffAfterArea");
const previewSection = document.getElementById("previewSection");
const previewOutput = document.getElementById("previewOutput");

let copyStatusTimer;

const samples = {
  json: '{"user":{"id":1,"name":"Ada"},"items":[{"id":"a1","ok":true}]}',
  log: '2026-05-17 10:00:00 INFO request_id=req-1 start\n2026-05-17 10:00:05 ERROR request_id=req-1 failed {"code":500}\n    at handler (app.js:1:2)',
  code: 'function getName(user){if(user){if(user.profile){return user.profile.name;}}return "guest";}',
  stack: 'TypeError: Cannot read properties\n    at handler (app.js:10:2)\n    at run (node_modules/lib/index.js:1:1)\nCaused by: Error: root',
  minify: 'function x(a,b){if(a){return {url:"http://x.test",ok:true};}}',
  diff: '@@ -1 +1 @@\n-old\n+new',
  text: 'This is\nwrapped prose\n\n- keep\n- bullets',
};

const translations = {
  en: {
    heroTitle: "Paste it. Make it readable.",
    heroLead: "No data leaves your browser. Everything is processed locally.",
    securityText: "Your input is never sent to a server and is processed only in browser memory.",
  },
  ja: {
    heroTitle: "貼るだけで、読める。",
    heroLead: "データは一切外に出ません。すべてブラウザ内で処理されます。",
    securityText: "入力された内容はサーバーに送信されず、ブラウザ内のメモリ上でのみ処理されます。",
  },
};

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

function getOptions() {
  return {
    json: {
      path: jsonPathInput ? jsonPathInput.value.trim() : "",
    },
    log: {
      level: logLevelFilter ? logLevelFilter.value : "all",
      keyword: logKeywordFilter ? logKeywordFilter.value.trim() : "",
      caseSensitive: logCaseSensitive ? logCaseSensitive.checked : false,
      timeFrom: logTimeFrom ? logTimeFrom.value.trim() : "",
      timeTo: logTimeTo ? logTimeTo.value.trim() : "",
      contextLines: logContextLines ? logContextLines.value.trim() : "0",
    },
    stack: {
      hideVendor: stackHideVendor ? stackHideVendor.checked : true,
    },
    minify: {
      mode: minifyModeSelect ? minifyModeSelect.value : "auto",
    },
    text: {
      markdown: textMarkdownMode ? textMarkdownMode.checked : true,
      dedupe: textDedupeLines ? textDedupeLines.checked : false,
      sort: textSortLines ? textSortLines.checked : false,
    },
  };
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

  detectedType.textContent = formatTypeLabel(type);

  if (isDiffCompareMode && diffBeforeArea && diffAfterArea) {
    outputArea.value = compareTextDiff(diffBeforeArea.value, diffAfterArea.value);
  } else if (isDiffApplyMode && diffBeforeArea && diffAfterArea) {
    outputArea.value = applyUnifiedDiff(diffBeforeArea.value, diffAfterArea.value);
  } else {
    outputArea.value = runTool(type, input, getOptions());
  }

  togglePanels(type, isManualDiff, usesTwoPanelDiff);
  updateDiffLabels(isDiffApplyMode);
  updatePreview(input, outputArea.value, type, usesTwoPanelDiff);
}

function togglePanels(type, isManualDiff, usesTwoPanelDiff) {
  if (jsonOptionsPanel) jsonOptionsPanel.hidden = type !== "json";
  if (logFilterPanel) logFilterPanel.hidden = type !== "log";
  if (stackOptionsPanel) stackOptionsPanel.hidden = type !== "stack";
  if (minifyOptionsPanel) minifyOptionsPanel.hidden = type !== "minify";
  if (textOptionsPanel) textOptionsPanel.hidden = type !== "text";
  if (diffModePanel) diffModePanel.hidden = !isManualDiff;
  if (diffComparePanel) diffComparePanel.hidden = !usesTwoPanelDiff;
  if (inputPanel) inputPanel.hidden = usesTwoPanelDiff;
  if (editorGrid) editorGrid.classList.toggle("output-only", usesTwoPanelDiff);
}

function updateDiffLabels(isApplyMode) {
  if (!diffBeforeLabel || !diffAfterLabel || !diffBeforeArea || !diffAfterArea) return;

    if (isApplyMode) {
      diffBeforeLabel.textContent = "Original";
      diffAfterLabel.textContent = "Patch or Result";
      diffBeforeArea.placeholder = "Paste the original code or text";
      diffAfterArea.placeholder = "Paste a unified diff patch, or paste the desired final content";
  } else {
    diffBeforeLabel.textContent = "Before";
    diffAfterLabel.textContent = "After";
    diffBeforeArea.placeholder = "Paste the original text";
    diffAfterArea.placeholder = "Paste the changed text";
  }
}

function updatePreview(input, output, type, usesTwoPanelDiff) {
  if (!previewSection || !previewOutput) return;

  const before = usesTwoPanelDiff
    ? `Left:\n${diffBeforeArea.value || "(empty)"}\n\nRight:\n${diffAfterArea.value || "(empty)"}`
    : input || "(empty)";

  if (!input && !output && !usesTwoPanelDiff) {
    previewSection.hidden = true;
    previewOutput.textContent = "";
    return;
  }

  previewSection.hidden = false;
  previewOutput.textContent = ["[BEFORE]", before, "", "[AFTER]", output || "(empty)"].join("\n");
}

function applyLanguage() {
  const language = languageSelect ? languageSelect.value : "en";
  const dictionary = translations[language] || translations.en;
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (dictionary[key]) element.textContent = dictionary[key];
  });
}

function fillSample() {
  const selectedType = toolSelect.value === "auto" ? "json" : toolSelect.value;

  if (selectedType === "diff" && diffBeforeArea && diffAfterArea && diffModeSelect) {
    if (diffModeSelect.value === "apply") {
      diffBeforeArea.value = 'function hello() {\n  return "old";\n}\n';
      diffAfterArea.value = '--- a/app.js\n+++ b/app.js\n@@ -1,3 +1,4 @@\n function hello() {\n-  return "old";\n+  const value = "new";\n+  return value;\n }\n';
    } else if (diffModeSelect.value === "format") {
      inputArea.value = samples.diff;
    } else {
      diffBeforeArea.value = "one\ntwo\nthree";
      diffAfterArea.value = "one\nTWO\nthree\nfour";
    }
  } else {
    inputArea.value = samples[selectedType] || samples.text;
  }

  processInput();
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

function clearAll() {
  inputArea.value = "";
  outputArea.value = "";
  if (diffBeforeArea) diffBeforeArea.value = "";
  if (diffAfterArea) diffAfterArea.value = "";
  if (diffModeSelect) diffModeSelect.value = "compare";
  if (logLevelFilter) logLevelFilter.value = "all";
  if (logKeywordFilter) logKeywordFilter.value = "";
  if (logCaseSensitive) logCaseSensitive.checked = false;
  [jsonPathInput, logTimeFrom, logTimeTo, logContextLines].forEach((field) => {
    if (field) field.value = "";
  });
  detectedType.textContent = "Empty";
  resetCopyStatus("");
  processInput();
}

inputArea.addEventListener("input", processInput);
toolSelect.addEventListener("change", processInput);
formatButton.addEventListener("click", processInput);
clearButton.addEventListener("click", clearAll);
copyButton.addEventListener("click", copyOutput);
if (sampleButton) sampleButton.addEventListener("click", fillSample);
if (languageSelect) languageSelect.addEventListener("change", applyLanguage);

[
  jsonPathInput,
  logLevelFilter,
  logKeywordFilter,
  logCaseSensitive,
  logTimeFrom,
  logTimeTo,
  logContextLines,
  stackHideVendor,
  minifyModeSelect,
  textMarkdownMode,
  textDedupeLines,
  textSortLines,
  diffModeSelect,
  diffBeforeArea,
  diffAfterArea,
].forEach((control) => {
  if (control) {
    control.addEventListener("input", processInput);
    control.addEventListener("change", processInput);
  }
});

applyLanguage();
processInput();
