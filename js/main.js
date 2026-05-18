import { detectDetails, detectType } from "./detector.js";
import { runTool } from "./router.js";
import { applyUnifiedDiff, buildMergedResult, createMergeBlocks, mergeTextDiff, summarizeMergeBlocks } from "./tools/diffViewer.js";

const inputArea = document.getElementById("inputArea");
const outputArea = document.getElementById("outputArea");
const toolSelect = document.getElementById("toolSelect");
const languageSelect = document.getElementById("languageSelect");
const detectedType = document.getElementById("detectedType");
const detectConfidence = document.getElementById("detectConfidence");
const detectReason = document.getElementById("detectReason");
const sampleButton = document.getElementById("sampleButton");
const formatButton = document.getElementById("formatButton");
const clearButton = document.getElementById("clearButton");
const resetButton = document.getElementById("resetButton");
const copyButton = document.getElementById("copyButton");
const copyStatus = document.getElementById("copyStatus");
const jsonOptionsPanel = document.getElementById("jsonOptionsPanel");
const jsonPathInput = document.getElementById("jsonPathInput");
const jsonKeySearchInput = document.getElementById("jsonKeySearchInput");
const jsonValueSearchInput = document.getElementById("jsonValueSearchInput");
const logFilterPanel = document.getElementById("logFilterPanel");
const logLevelFilter = document.getElementById("logLevelFilter");
const logKeywordFilter = document.getElementById("logKeywordFilter");
const logCaseSensitive = document.getElementById("logCaseSensitive");
const logTimeFrom = document.getElementById("logTimeFrom");
const logTimeTo = document.getElementById("logTimeTo");
const logContextLines = document.getElementById("logContextLines");
const stackOptionsPanel = document.getElementById("stackOptionsPanel");
const stackHideVendor = document.getElementById("stackHideVendor");
const stackFrameFilter = document.getElementById("stackFrameFilter");
const minifyOptionsPanel = document.getElementById("minifyOptionsPanel");
const minifyModeSelect = document.getElementById("minifyModeSelect");
const textOptionsPanel = document.getElementById("textOptionsPanel");
const codeOptionsPanel = document.getElementById("codeOptionsPanel");
const codeModeSelect = document.getElementById("codeModeSelect");
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
const diffMergedArea = document.getElementById("diffMergedArea");
const diffAfterArea = document.getElementById("diffAfterArea");
const previewSection = document.getElementById("previewSection");
const previewOutput = document.getElementById("previewOutput");
const processingSummary = document.getElementById("processingSummary");
const warningBox = document.getElementById("warningBox");
const advancedContent = document.getElementById("advancedContent");

let copyStatusTimer;
let mergeChoices = {};
let activeOutputElement = null;

const samples = {
  json: '{"user":{"id":42,"name":"Ada","roles":["admin","reviewer"],"profile":{"active":true,"team":"platform"}},"meta":{"requestId":"req-2026-001","latencyMs":38},"items":[{"id":"a1","ok":true},{"id":"b2","ok":false,"error":null}]}',
  log: '2026-05-18 10:00:00 INFO request_id=req-1 start user=42\n2026-05-18 10:00:03 WARN request_id=req-1 slow query {"duration":1280}\n2026-05-18 10:00:05 ERROR request_id=req-1 failed {"code":500,"path":"/api/users"}\n    at handler (src/app.ts:22:9)\n2026-05-18 10:00:06 DEBUG request_id=req-1 retry queued\n2026-05-18 10:00:07 TRACE request_id=req-1 done',
  code: 'function getUserName(user){if(user){if(user.profile){if(user.profile.isActive){return user.profile.name;}}}return "guest";}',
  stack: 'TypeError: Cannot read properties of undefined\n    at getUserName (src/components/UserCard.tsx:42:17)\n    at renderUser (src/app/users.ts:18:5)\n    at map (node_modules/react/cjs/react.development.js:100:3)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)',
  minify: 'function loadUser(id){if(!id){return null;}const user={id:id,roles:["admin","reviewer"],active:true};return user;}',
  diff: 'function config(){\n  return { retries: 2, region: "us" };\n}\n---\nfunction config(){\n  return { retries: 3, region: "jp" };\n}',
  text: '  Incident summary\t\t\n\n\nService  degraded   for 12 minutes.  \n\nAction items:\n\t- rotate token\n\t- review alerts\n',
};

const translations = {
  en: {
    heroTitle: "Paste it. Make it readable.",
    heroLead: "No data leaves your browser. Everything is processed locally.",
    languageLabel: "Language",
    languageEnglish: "English",
    languageJapanese: "Japanese",
    homeLink: "Home",
    securityTitle: "No data leaves your browser.",
    securityText: "Your input is never sent to a server and is processed only in browser memory.",
    detectedLabel: "Detected:",
    toolLabel: "Tool",
    toolAuto: "Auto",
    toolJson: "JSON Formatter",
    toolLog: "Log Formatter",
    toolCode: "Code Refactor",
    toolStack: "Stack Trace Formatter",
    toolMinify: "Minify Beautifier",
    toolDiff: "Diff Viewer",
    toolText: "Text Formatter",
    sampleButton: "Sample",
    formatButton: "Format / Refactor",
    clearButton: "Clear",
    copyButton: "Copy Output",
    jsonPathLabel: "JSON Path",
    levelLabel: "Level",
    allLevels: "All levels",
    keywordLabel: "Keyword",
    keywordPlaceholder: "request id, user id, error text",
    caseSensitiveLabel: "Case sensitive",
    fromTimeLabel: "From time",
    toTimeLabel: "To time",
    errorContextLabel: "Error context",
    foldVendorLabel: "Fold vendor frames",
    inputTypeLabel: "Input type",
    preserveMarkdownLabel: "Preserve Markdown",
    dedupeLinesLabel: "Remove duplicate lines",
    sortLinesLabel: "Sort lines",
    diffModeLabel: "Diff Mode",
    compareTwoTexts: "Compare two texts",
    formatExistingDiff: "Format existing diff",
    applyUnifiedDiff: "Apply unified diff",
    beforeLabel: "Before",
    afterLabel: "After",
    originalLabel: "Original",
    patchOrResultLabel: "Patch or Result",
    diffBeforePlaceholder: "Paste the original text",
    diffAfterPlaceholder: "Paste the changed text",
    diffOriginalPlaceholder: "Paste the original code or text",
    diffPatchPlaceholder: "Paste a unified diff patch, or paste the desired final content",
    inputLabel: "Input",
    outputLabel: "Output",
    inputPlaceholder: "Paste logs, JSON, code, stack traces, diffs, or text here",
    previewTitle: "Before / After Preview",
    emptyValue: "(empty)",
    leftLabel: "Left",
    rightLabel: "Right",
    beforeBlock: "[BEFORE]",
    afterBlock: "[AFTER]",
    rulesTitle: "Code Refactor Rules",
    ruleOne: "Only transformations that can be judged without changing behavior are applied.",
    ruleTwo: "Guard clauses are preferred for reducing nesting, while risky cases are preserved.",
    ruleThree: "Variable names, function names, and meaningful operation order are not rewritten.",
    ruleFour: "Without AST parsing, complex code is formatted conservatively instead of forced.",
    toolsTitle: "Tools",
    jsonCard: "Formats unreadable JSON with two-space indentation, key summaries, and JSON Path lookup.",
    logCard: "Cleans log levels and timestamps, extracts request IDs, and filters long logs.",
    codeCard: "Applies safe guard-clause refactors, removes else after return, and explains changes.",
    stackCard: "Organizes errors and stack frames, counts frames, and folds vendor noise.",
    minifyCard: "Beautifies minified JS/CSS and reports line and size changes.",
    diffCard: "Compares before/after text, formats diffs, and applies unified diff patches.",
    textCard: "Normalizes spacing, keeps Markdown readable, removes duplicates, and sorts lines.",
    footerSecurity: "No data leaves your browser.",
    privacyLink: "Privacy",
    aboutLink: "About",
    copied: "Copied",
    copyFailed: "Copy failed",
    seoHomeTitle: "Secure browser-only developer tools",
    seoHomeCopy: "Readable Dev Tools is a secure local developer toolkit for engineers who need to format sensitive logs, JSON, stack traces, diffs, and source code without uploading data to external servers.",
    seoSecurityLine: "No data leaves your browser. 100% Local Processing. No API Calls. No Storage. Browser-only developer tools.",
  },
  ja: {
    heroTitle: "\u8cbc\u308b\u3060\u3051\u3067\u3001\u8aad\u3081\u308b\u3002",
    heroLead: "\u30c7\u30fc\u30bf\u306f\u4e00\u5207\u5916\u306b\u51fa\u307e\u305b\u3093\u3002\u3059\u3079\u3066\u30d6\u30e9\u30a6\u30b6\u5185\u3067\u51e6\u7406\u3055\u308c\u307e\u3059\u3002",
    languageLabel: "\u8a00\u8a9e",
    languageEnglish: "\u82f1\u8a9e",
    languageJapanese: "\u65e5\u672c\u8a9e",
    homeLink: "\u30db\u30fc\u30e0",
    securityTitle: "\u30c7\u30fc\u30bf\u306f\u30d6\u30e9\u30a6\u30b6\u306e\u5916\u306b\u51fa\u307e\u305b\u3093\u3002",
    securityText: "\u5165\u529b\u3055\u308c\u305f\u5185\u5bb9\u306f\u30b5\u30fc\u30d0\u30fc\u306b\u9001\u4fe1\u3055\u308c\u305a\u3001\u30d6\u30e9\u30a6\u30b6\u5185\u306e\u30e1\u30e2\u30ea\u4e0a\u3067\u306e\u307f\u51e6\u7406\u3055\u308c\u307e\u3059\u3002",
    detectedLabel: "\u5224\u5b9a:",
    toolLabel: "\u30c4\u30fc\u30eb",
    toolAuto: "\u81ea\u52d5",
    toolJson: "JSON\u6574\u5f62",
    toolLog: "\u30ed\u30b0\u6574\u5f62",
    toolCode: "\u30b3\u30fc\u30c9\u30ea\u30d5\u30a1\u30af\u30bf",
    toolStack: "\u30b9\u30bf\u30c3\u30af\u30c8\u30ec\u30fc\u30b9\u6574\u5f62",
    toolMinify: "minify\u30b3\u30fc\u30c9\u6574\u5f62",
    toolDiff: "\u5dee\u5206\u30d3\u30e5\u30fc\u30a2",
    toolText: "\u30c6\u30ad\u30b9\u30c8\u6574\u5f62",
    sampleButton: "\u30b5\u30f3\u30d7\u30eb",
    formatButton: "\u6574\u5f62 / \u30ea\u30d5\u30a1\u30af\u30bf",
    clearButton: "\u30af\u30ea\u30a2",
    copyButton: "\u51fa\u529b\u3092\u30b3\u30d4\u30fc",
    jsonPathLabel: "JSON Path",
    levelLabel: "\u30ec\u30d9\u30eb",
    allLevels: "\u3059\u3079\u3066\u306e\u30ec\u30d9\u30eb",
    keywordLabel: "\u30ad\u30fc\u30ef\u30fc\u30c9",
    keywordPlaceholder: "request id\u3001user id\u3001\u30a8\u30e9\u30fc\u6587",
    caseSensitiveLabel: "\u5927\u6587\u5b57\u5c0f\u6587\u5b57\u3092\u533a\u5225",
    fromTimeLabel: "\u958b\u59cb\u6642\u523b",
    toTimeLabel: "\u7d42\u4e86\u6642\u523b",
    errorContextLabel: "\u30a8\u30e9\u30fc\u524d\u5f8c\u884c",
    foldVendorLabel: "\u5916\u90e8\u30e9\u30a4\u30d6\u30e9\u30ea\u884c\u3092\u6298\u308a\u305f\u305f\u3080",
    inputTypeLabel: "\u5165\u529b\u5f62\u5f0f",
    preserveMarkdownLabel: "Markdown\u3092\u4fdd\u6301",
    dedupeLinesLabel: "\u91cd\u8907\u884c\u3092\u524a\u9664",
    sortLinesLabel: "\u884c\u3092\u30bd\u30fc\u30c8",
    diffModeLabel: "Diff\u30e2\u30fc\u30c9",
    compareTwoTexts: "2\u3064\u306e\u30c6\u30ad\u30b9\u30c8\u3092\u6bd4\u8f03",
    formatExistingDiff: "\u65e2\u5b58diff\u3092\u6574\u5f62",
    applyUnifiedDiff: "unified diff\u3092\u9069\u7528",
    beforeLabel: "\u5909\u66f4\u524d",
    afterLabel: "\u5909\u66f4\u5f8c",
    originalLabel: "\u5143\u30c7\u30fc\u30bf",
    patchOrResultLabel: "\u30d1\u30c3\u30c1\u307e\u305f\u306f\u5b8c\u6210\u5f62",
    diffBeforePlaceholder: "\u5143\u306e\u30c6\u30ad\u30b9\u30c8\u3092\u8cbc\u308a\u4ed8\u3051\u3066\u304f\u3060\u3055\u3044",
    diffAfterPlaceholder: "\u5909\u66f4\u5f8c\u306e\u30c6\u30ad\u30b9\u30c8\u3092\u8cbc\u308a\u4ed8\u3051\u3066\u304f\u3060\u3055\u3044",
    diffOriginalPlaceholder: "\u5143\u306e\u30b3\u30fc\u30c9\u307e\u305f\u306f\u30c6\u30ad\u30b9\u30c8\u3092\u8cbc\u308a\u4ed8\u3051\u3066\u304f\u3060\u3055\u3044",
    diffPatchPlaceholder: "unified diff\u30d1\u30c3\u30c1\u3001\u307e\u305f\u306f\u671b\u307e\u3057\u3044\u5b8c\u6210\u5f62\u3092\u8cbc\u308a\u4ed8\u3051\u3066\u304f\u3060\u3055\u3044",
    inputLabel: "\u5165\u529b",
    outputLabel: "\u51fa\u529b",
    inputPlaceholder: "\u30ed\u30b0\u30fbJSON\u30fb\u30b3\u30fc\u30c9\u30fbstack trace\u30fbdiff\u30fb\u30c6\u30ad\u30b9\u30c8\u3092\u8cbc\u308a\u4ed8\u3051\u3066\u304f\u3060\u3055\u3044",
    previewTitle: "\u5909\u66f4\u524d / \u5909\u66f4\u5f8c\u30d7\u30ec\u30d3\u30e5\u30fc",
    emptyValue: "(\u7a7a)",
    leftLabel: "\u5de6",
    rightLabel: "\u53f3",
    beforeBlock: "[\u5909\u66f4\u524d]",
    afterBlock: "[\u5909\u66f4\u5f8c]",
    rulesTitle: "\u30b3\u30fc\u30c9\u30ea\u30d5\u30a1\u30af\u30bf\u306e\u30eb\u30fc\u30eb",
    ruleOne: "\u632f\u308b\u821e\u3044\u3092\u5909\u3048\u306a\u3044\u3068\u5224\u65ad\u3067\u304d\u308b\u5909\u63db\u3060\u3051\u3092\u9069\u7528\u3057\u307e\u3059\u3002",
    ruleTwo: "\u30cd\u30b9\u30c8\u524a\u6e1b\u3067\u306fguard clause\u3092\u512a\u5148\u3057\u3001\u5371\u967a\u306a\u30b1\u30fc\u30b9\u306f\u7dad\u6301\u3057\u307e\u3059\u3002",
    ruleThree: "\u5909\u6570\u540d\u3001\u95a2\u6570\u540d\u3001\u610f\u5473\u306e\u3042\u308b\u51e6\u7406\u9806\u5e8f\u306f\u66f8\u304d\u63db\u3048\u307e\u305b\u3093\u3002",
    ruleFour: "AST\u89e3\u6790\u306a\u3057\u3067\u6271\u3048\u306a\u3044\u8907\u96d1\u306a\u30b3\u30fc\u30c9\u306f\u3001\u7121\u7406\u306b\u5909\u63db\u305b\u305a\u4fdd\u5b88\u7684\u306b\u6574\u5f62\u3057\u307e\u3059\u3002",
    toolsTitle: "\u5bfe\u5fdc\u30c4\u30fc\u30eb",
    jsonCard: "\u8aad\u307f\u306b\u304f\u3044JSON\u30922\u30b9\u30da\u30fc\u30b9\u3067\u6574\u5f62\u3057\u3001\u30ad\u30fc\u4e00\u89a7\u3084JSON Path\u691c\u7d22\u3082\u8868\u793a\u3057\u307e\u3059\u3002",
    logCard: "\u30ed\u30b0\u306e\u30ec\u30d9\u30eb\u3084\u65e5\u6642\u3092\u6574\u3048\u3001request id\u62bd\u51fa\u3084\u9577\u3044\u30ed\u30b0\u306e\u7d5e\u308a\u8fbc\u307f\u306b\u5bfe\u5fdc\u3057\u307e\u3059\u3002",
    codeCard: "\u5b89\u5168\u306aguard clause\u5316\u3001else after return\u524a\u9664\u3001\u5909\u66f4\u7406\u7531\u306e\u8868\u793a\u3092\u884c\u3044\u307e\u3059\u3002",
    stackCard: "Error\u884c\u3068stack frame\u3092\u6574\u7406\u3057\u3001\u30d5\u30ec\u30fc\u30e0\u6570\u96c6\u8a08\u3084\u5916\u90e8\u30e9\u30a4\u30d6\u30e9\u30ea\u884c\u306e\u6298\u308a\u305f\u305f\u307f\u306b\u5bfe\u5fdc\u3057\u307e\u3059\u3002",
    minifyCard: "minify\u3055\u308c\u305fJS/CSS\u3092\u6574\u5f62\u3057\u3001\u884c\u6570\u3084\u30b5\u30a4\u30ba\u5909\u5316\u3092\u8868\u793a\u3057\u307e\u3059\u3002",
    diffCard: "\u5909\u66f4\u524d\u5f8c\u306e\u6bd4\u8f03\u3001\u65e2\u5b58diff\u306e\u6574\u5f62\u3001unified diff\u30d1\u30c3\u30c1\u306e\u9069\u7528\u304c\u3067\u304d\u307e\u3059\u3002",
    textCard: "\u4f59\u5206\u306a\u7a7a\u767d\u3092\u6574\u7406\u3057\u3001Markdown\u4fdd\u6301\u3001\u91cd\u8907\u524a\u9664\u3001\u30bd\u30fc\u30c8\u306b\u5bfe\u5fdc\u3057\u307e\u3059\u3002",
    footerSecurity: "\u30c7\u30fc\u30bf\u306f\u30d6\u30e9\u30a6\u30b6\u306e\u5916\u306b\u51fa\u307e\u305b\u3093\u3002",
    privacyLink: "\u30d7\u30e9\u30a4\u30d0\u30b7\u30fc",
    aboutLink: "\u3053\u306e\u30b5\u30a4\u30c8\u306b\u3064\u3044\u3066",
    copied: "\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f",
    copyFailed: "\u30b3\u30d4\u30fc\u5931\u6557",
    seoHomeTitle: "\u5b89\u5168\u306a\u30d6\u30e9\u30a6\u30b6\u5b8c\u7d50\u306e\u958b\u767a\u8005\u30c4\u30fc\u30eb",
    seoHomeCopy: "Readable Dev Tools\u306f\u3001\u6a5f\u5bc6\u6027\u306e\u9ad8\u3044\u30ed\u30b0\u3001JSON\u3001stack trace\u3001diff\u3001\u30bd\u30fc\u30b9\u30b3\u30fc\u30c9\u3092\u5916\u90e8\u30b5\u30fc\u30d0\u30fc\u3078\u9001\u4fe1\u305b\u305a\u306b\u6574\u5f62\u30fb\u78ba\u8a8d\u3057\u305f\u3044\u30a8\u30f3\u30b8\u30cb\u30a2\u5411\u3051\u306e\u30ed\u30fc\u30ab\u30eb\u958b\u767a\u30c4\u30fc\u30eb\u3067\u3059\u3002",
    seoSecurityLine: "\u30c7\u30fc\u30bf\u306f\u30d6\u30e9\u30a6\u30b6\u306e\u5916\u306b\u51fa\u307e\u305b\u3093\u3002100% \u30ed\u30fc\u30ab\u30eb\u51e6\u7406\u3002API\u547c\u3073\u51fa\u3057\u306a\u3057\u3002\u4fdd\u5b58\u306a\u3057\u3002\u30d6\u30e9\u30a6\u30b6\u5b8c\u7d50\u306e\u958b\u767a\u8005\u30c4\u30fc\u30eb\u3067\u3059\u3002",
  },
};

function currentLanguage() {
  return languageSelect ? languageSelect.value : "en";
}

function dictionary() {
  return translations[currentLanguage()] || translations.en;
}

function t(key) {
  const active = dictionary();
  return active[key] || translations.en[key] || key;
}

function formatTypeLabel(type) {
  const labels = {
    en: {
      empty: "Empty",
      json: "JSON",
      log: "Log",
      code: "Code",
      stack: "Stack Trace",
      minify: "Minify",
      diff: "Diff",
      text: "Text",
    },
    ja: {
      empty: "\u7a7a",
      json: "JSON",
      log: "\u30ed\u30b0",
      code: "\u30b3\u30fc\u30c9",
      stack: "\u30b9\u30bf\u30c3\u30af\u30c8\u30ec\u30fc\u30b9",
      minify: "minify\u30b3\u30fc\u30c9",
      diff: "\u5dee\u5206",
      text: "\u30c6\u30ad\u30b9\u30c8",
    },
  };

  const language = currentLanguage();
  return (labels[language] && labels[language][type]) || labels.en[type] || labels.en.text;
}

function getOptions() {
  return {
    json: {
      path: jsonPathInput ? jsonPathInput.value.trim() : "",
      keySearch: jsonKeySearchInput ? jsonKeySearchInput.value.trim() : "",
      valueSearch: jsonValueSearchInput ? jsonValueSearchInput.value.trim() : "",
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
      filter: stackFrameFilter ? stackFrameFilter.value : "all",
    },
    minify: {
      mode: minifyModeSelect ? minifyModeSelect.value : "auto",
    },
    text: {
      markdown: textMarkdownMode ? textMarkdownMode.checked : true,
      dedupe: textDedupeLines ? textDedupeLines.checked : false,
      sort: textSortLines ? textSortLines.checked : false,
    },
    code: {
      mode: codeModeSelect ? codeModeSelect.value : "readability",
    },
  };
}

export function processInput() {
  const input = inputArea.value;
  const selectedType = toolSelect.value;
  const details = detectDetails(input);
  const type = selectedType === "auto" ? details.type : selectedType;
  const isManualDiff = selectedType === "diff";
  const diffMode = diffModeSelect ? diffModeSelect.value : "compare";
  const isDiffCompareMode = isManualDiff && diffMode === "compare";
  const isDiffApplyMode = isManualDiff && diffMode === "apply";
  const usesTwoPanelDiff = isDiffCompareMode || isDiffApplyMode;

  detectedType.textContent = formatTypeLabel(type);
  if (detectConfidence) detectConfidence.textContent = `Confidence: ${selectedType === "auto" ? details.confidence : "Manual"}`;
  if (detectReason) detectReason.textContent = `Reason: ${selectedType === "auto" ? details.reason : "Manual tool selection overrides auto detection."}`;

  if (isDiffCompareMode && diffBeforeArea && diffAfterArea) {
    outputArea.readOnly = false;
    outputArea.value = mergeTextDiff(diffBeforeArea.value, diffAfterArea.value, mergeChoices);
    if (diffMergedArea) {
      diffMergedArea.value = getSection(outputArea.value, "MERGED RESULT");
      activeOutputElement = diffMergedArea;
    }
  } else if (isDiffApplyMode && diffBeforeArea && diffAfterArea) {
    outputArea.readOnly = true;
    outputArea.value = applyUnifiedDiff(diffBeforeArea.value, diffAfterArea.value);
    if (diffMergedArea) {
      diffMergedArea.value = getSection(outputArea.value, "APPLIED RESULT") || outputArea.value;
      activeOutputElement = diffMergedArea;
    }
  } else {
    outputArea.readOnly = true;
    outputArea.value = runTool(type, input, getOptions());
    activeOutputElement = outputArea;
  }

  togglePanels(type, isManualDiff, usesTwoPanelDiff);
  updateDiffLabels(isDiffApplyMode);
  updatePreview(input, outputArea.value, usesTwoPanelDiff);
  updateAdvancedView(outputArea.value, isDiffCompareMode);
}

function togglePanels(type, isManualDiff, usesTwoPanelDiff) {
  if (jsonOptionsPanel) jsonOptionsPanel.hidden = type !== "json";
  if (logFilterPanel) logFilterPanel.hidden = type !== "log";
  if (stackOptionsPanel) stackOptionsPanel.hidden = type !== "stack";
  if (minifyOptionsPanel) minifyOptionsPanel.hidden = type !== "minify";
  if (textOptionsPanel) textOptionsPanel.hidden = type !== "text";
  if (codeOptionsPanel) codeOptionsPanel.hidden = type !== "code";
  if (diffModePanel) diffModePanel.hidden = !isManualDiff;
  if (diffComparePanel) diffComparePanel.hidden = !usesTwoPanelDiff;
  if (inputPanel) inputPanel.hidden = usesTwoPanelDiff;
  if (editorGrid) editorGrid.hidden = usesTwoPanelDiff;
  if (editorGrid) editorGrid.classList.toggle("output-only", usesTwoPanelDiff);
}

function clearElement(element) {
  while (element && element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function getSection(output, name) {
  const pattern = new RegExp(`\\[${name}\\]\\n([\\s\\S]*?)(?=\\n\\[[A-Z /]+\\]|$)`);
  const match = output.match(pattern);
  return match ? match[1].trim() : "";
}

function createMergeButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function updateDiffMergeOutput() {
  const blocks = createMergeBlocks(diffBeforeArea.value, diffAfterArea.value);
  const summary = summarizeMergeBlocks(blocks, mergeChoices);
  outputArea.value = [
    "[SUMMARY]",
    `Total lines: ${summary.totalLines}`,
    `Changed blocks: ${summary.changedBlocks}`,
    `Unresolved blocks: ${summary.unresolvedBlocks}`,
    `Resolved blocks: ${summary.resolvedBlocks}`,
    `Left only: ${summary.leftOnly}`,
    `Right only: ${summary.rightOnly}`,
    "",
    "[MERGED RESULT]",
    buildMergedResult(blocks, mergeChoices),
  ].join("\n");
  if (diffMergedArea) {
    diffMergedArea.value = getSection(outputArea.value, "MERGED RESULT");
    activeOutputElement = diffMergedArea;
  }
  updateAdvancedView(outputArea.value, true);
}

function renderMergeControls() {
  if (!advancedContent || !diffBeforeArea || !diffAfterArea) return;
  const blocks = createMergeBlocks(diffBeforeArea.value, diffAfterArea.value);
  blocks.forEach((block, index) => {
    if (block.type === "same") return;

    const blockEl = document.createElement("div");
    blockEl.className = "advanced-block";
    const text = document.createElement("pre");
    text.textContent = [
      `[BLOCK ${index}] ${mergeChoices[index] || "unresolved"}`,
      "[YOUR VERSION]",
      block.left.join("\n") || "(empty)",
      "[OTHER VERSION]",
      block.right.join("\n") || "(empty)",
    ].join("\n");
    const actions = document.createElement("div");
    actions.className = "block-actions";
    actions.append(
      createMergeButton("Use Left / \u5de6\u3092\u63a1\u7528", () => { mergeChoices[index] = "left"; updateDiffMergeOutput(); }),
      createMergeButton("Use Right / \u53f3\u3092\u63a1\u7528", () => { mergeChoices[index] = "right"; updateDiffMergeOutput(); }),
      createMergeButton("Use Both / \u4e21\u65b9\u63a1\u7528", () => { mergeChoices[index] = "both"; updateDiffMergeOutput(); }),
      createMergeButton("Reset / \u623b\u3059", () => { delete mergeChoices[index]; updateDiffMergeOutput(); })
    );
    blockEl.append(text, actions);
    advancedContent.appendChild(blockEl);
  });
}

function updateAdvancedView(output, includeMergeControls = false) {
  if (!processingSummary || !warningBox || !advancedContent) return;

  clearElement(processingSummary);
  clearElement(advancedContent);
  const summary = getSection(output, "SUMMARY");
  const warning = getSection(output, "WARNING");

  summary.split(/\r?\n/).filter(Boolean).slice(0, 12).forEach((line) => {
    const card = document.createElement("div");
    card.className = "summary-card";
    const parts = line.split(":");
    const strong = document.createElement("strong");
    strong.textContent = parts.shift() || "Summary";
    const span = document.createElement("span");
    span.textContent = parts.join(":").trim() || "-";
    card.append(strong, span);
    processingSummary.appendChild(card);
  });

  warningBox.hidden = !warning;
  warningBox.textContent = warning;

  ["JSON TREE VIEW", "FRAME LIST", "DIFF BLOCKS", "SUGGESTIONS", "REASONS", "FORMATTED LOGS"].forEach((name) => {
    const section = getSection(output, name);
    if (!section) return;
    const block = document.createElement("div");
    block.className = "advanced-block";
    block.textContent = `[${name}]\n${section}`;
    advancedContent.appendChild(block);
  });

  if (includeMergeControls) {
    renderMergeControls();
  }
}

function updateDiffLabels(isApplyMode) {
  if (!diffBeforeLabel || !diffAfterLabel || !diffBeforeArea || !diffAfterArea) return;

  if (isApplyMode) {
    diffBeforeLabel.textContent = t("originalLabel");
    diffAfterLabel.textContent = t("patchOrResultLabel");
    diffBeforeArea.placeholder = t("diffOriginalPlaceholder");
    diffAfterArea.placeholder = t("diffPatchPlaceholder");
  } else {
    diffBeforeLabel.textContent = "Your Version / \u81ea\u5206\u306e\u7248";
    diffAfterLabel.textContent = "Other Version / \u76f8\u624b\u306e\u7248";
    diffBeforeArea.placeholder = t("diffBeforePlaceholder");
    diffAfterArea.placeholder = t("diffAfterPlaceholder");
  }
}

function updatePreview(input, output, usesTwoPanelDiff) {
  if (!previewSection || !previewOutput) return;

  const empty = t("emptyValue");
  const before = usesTwoPanelDiff
    ? `${t("leftLabel")}:\n${diffBeforeArea.value || empty}\n\n${t("rightLabel")}:\n${diffAfterArea.value || empty}`
    : input || empty;

  if (!input && !output && !usesTwoPanelDiff) {
    previewSection.hidden = true;
    previewOutput.textContent = "";
    return;
  }

  previewSection.hidden = false;
  previewOutput.textContent = [t("beforeBlock"), before, "", t("afterBlock"), output || empty].join("\n");
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage();

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    element.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-option]").forEach((element) => {
    const key = element.getAttribute("data-i18n-option");
    element.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.getAttribute("data-i18n-placeholder");
    element.placeholder = t(key);
  });

  processInput();
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
  const target = activeOutputElement || outputArea;
  const text = target.value;

  if (!text) {
    resetCopyStatus("");
    return;
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      target.focus();
      target.select();
      document.execCommand("copy");
      target.setSelectionRange(0, 0);
    }

    resetCopyStatus(t("copied"));
  } catch (error) {
    resetCopyStatus(t("copyFailed"));
  }
}

function clearAll() {
  inputArea.value = "";
  outputArea.value = "";
  if (diffBeforeArea) diffBeforeArea.value = "";
  if (diffMergedArea) diffMergedArea.value = "";
  if (diffAfterArea) diffAfterArea.value = "";
  if (diffModeSelect) diffModeSelect.value = "compare";
  mergeChoices = {};
  if (logLevelFilter) logLevelFilter.value = "all";
  if (logKeywordFilter) logKeywordFilter.value = "";
  if (logCaseSensitive) logCaseSensitive.checked = false;
  [jsonPathInput, jsonKeySearchInput, jsonValueSearchInput, logTimeFrom, logTimeTo, logContextLines].forEach((field) => {
    if (field) field.value = "";
  });
  detectedType.textContent = formatTypeLabel("empty");
  resetCopyStatus("");
  processInput();
}

function resetAll() {
  clearAll();
  if (toolSelect) toolSelect.value = "auto";
  if (diffModeSelect) diffModeSelect.value = "compare";
  if (minifyModeSelect) minifyModeSelect.value = "auto";
  if (codeModeSelect) codeModeSelect.value = "readability";
  if (stackFrameFilter) stackFrameFilter.value = "all";
  processInput();
}

inputArea.addEventListener("input", processInput);
toolSelect.addEventListener("change", processInput);
formatButton.addEventListener("click", processInput);
clearButton.addEventListener("click", clearAll);
if (resetButton) resetButton.addEventListener("click", resetAll);
copyButton.addEventListener("click", copyOutput);
if (sampleButton) sampleButton.addEventListener("click", fillSample);
if (languageSelect) languageSelect.addEventListener("change", applyLanguage);

[
  jsonPathInput,
  jsonKeySearchInput,
  jsonValueSearchInput,
  logLevelFilter,
  logKeywordFilter,
  logCaseSensitive,
  logTimeFrom,
  logTimeTo,
  logContextLines,
  stackHideVendor,
  stackFrameFilter,
  minifyModeSelect,
  codeModeSelect,
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
