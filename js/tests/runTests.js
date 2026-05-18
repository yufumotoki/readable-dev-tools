import { runTool } from "../router.js";
import { detectDetails } from "../detector.js";
import { buildMergedResult, createMergeBlocks, mergeTextDiff, summarizeMergeBlocks } from "../tools/diffViewer.js";
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
  Object.assign(options, testCase.options || {});

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

  if (testCase.tool === "diff" && testCase.diffExpectations) {
    const blocks = createMergeBlocks(testCase.input, testCase.afterInput || "");
    const baseSummary = summarizeMergeBlocks(blocks, {});
    const leftSummary = summarizeMergeBlocks(blocks, testCase.diffExpectations.leftChoices || {});
    const resetSummary = summarizeMergeBlocks(blocks, {});
    const leftMerged = buildMergedResult(blocks, testCase.diffExpectations.leftChoices || {});
    const rightMerged = buildMergedResult(blocks, testCase.diffExpectations.rightChoices || {});
    const bothMerged = buildMergedResult(blocks, testCase.diffExpectations.bothChoices || {});

    for (const [key, expected] of Object.entries(testCase.diffExpectations.summary || {})) {
      if (baseSummary[key] !== expected) missing.push(`diff summary ${key} expected ${expected} got ${baseSummary[key]}`);
    }
    for (const needle of testCase.diffExpectations.useLeftContains || []) {
      if (!leftMerged.includes(needle)) missing.push(`use left missing ${needle}`);
    }
    for (const needle of testCase.diffExpectations.useRightContains || []) {
      if (!rightMerged.includes(needle)) missing.push(`use right missing ${needle}`);
    }
    for (const needle of testCase.diffExpectations.useBothContains || []) {
      if (!bothMerged.includes(needle)) missing.push(`use both missing ${needle}`);
    }
    if (leftSummary.resolvedBlocks < 1 && baseSummary.diffBlocks > 0) missing.push("use left did not resolve a block");
    if (resetSummary.unresolvedBlocks !== baseSummary.unresolvedBlocks) missing.push("reset did not restore unresolved count");
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
