import { runTool } from "../router.js";
import { detectDetails } from "../detector.js";
import { mergeTextDiff } from "../tools/diffViewer.js";
import { testCases } from "./testCases.js";

function runCase(testCase) {
  let output = "";
  const options = {
    json: { path: "$.user.id" },
    log: { level: "all", contextLines: 1 },
    stack: { filter: "all" },
    minify: { mode: "auto" },
    code: { mode: "readability" },
    text: { dedupe: true, sort: false },
  };

  if (testCase.tool === "diff") {
    output = mergeTextDiff(testCase.input, testCase.afterInput || "");
  } else {
    output = runTool(testCase.tool, testCase.input, options);
  }

  const missing = [];
  for (const needle of testCase.expectedContains || []) {
    if (!output.includes(needle)) missing.push(`missing ${needle}`);
  }
  for (const needle of testCase.expectedSummaryContains || []) {
    if (!output.includes(needle)) missing.push(`summary missing ${needle}`);
  }
  for (const needle of testCase.shouldNotContain || []) {
    if (needle && output.includes(needle)) missing.push(`unexpected ${needle}`);
  }

  return {
    id: testCase.id,
    name: testCase.name,
    passed: missing.length === 0,
    errors: missing,
    detected: detectDetails(testCase.input),
  };
}

export function runAllTests() {
  const results = testCases.map(runCase);
  const failed = results.filter((result) => !result.passed);

  return {
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    failedTestIds: failed.map((result) => result.id),
    results,
  };
}

function renderResults() {
  const root = document.getElementById("testResults");
  if (!root) return;

  const report = runAllTests();
  root.textContent = [
    `total tests: ${report.total}`,
    `passed: ${report.passed}`,
    `failed: ${report.failed}`,
    `failed test ids: ${report.failedTestIds.join(", ") || "none"}`,
    "",
    ...report.results.map((result) => {
      return `${result.passed ? "PASS" : "FAIL"} ${result.id} ${result.name}${result.errors.length ? ` :: ${result.errors.join("; ")}` : ""}`;
    }),
  ].join("\n");
}

if (typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", renderResults);
}
