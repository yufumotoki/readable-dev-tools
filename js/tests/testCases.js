const cases = [];

function addMany(prefix, tool, count, factory) {
  for (let index = 1; index <= count; index += 1) {
    const id = `${prefix}-${String(index).padStart(3, "0")}`;
    cases.push({ id, tool, ...factory(index, id) });
  }
}

addMany("json", "json", 15, (index) => ({
  name: `valid nested json ${index}`,
  input: JSON.stringify({ user: { id: index, name: `User ${index}`, active: index % 2 === 0 }, items: [{ id: `item-${index}`, count: index }] }),
  expectedContains: ["[SUMMARY]", "[JSON TREE VIEW]", "[FORMATTED JSON]", "Objects:", "Arrays:", "Keys:", "Max depth:"],
  expectedSummaryContains: ["Root:", "Tree nodes:"],
  shouldNotContain: ["Invalid JSON"],
  notes: "Covers structured JSON parsing, summary, and tree output.",
}));

addMany("log", "log", 15, (index) => ({
  name: `mixed production log ${index}`,
  input: `2026-05-18 10:00:0${index % 9} INFO request_id=req-${index} start\n2026-05-18 10:00:1${index % 9} WARN request_id=req-${index} slow\n2026-05-18 10:00:2${index % 9} ERROR request_id=req-${index} failed {"code":500}\n2026-05-18 10:00:3${index % 9} DEBUG request_id=req-${index} retry\n2026-05-18 10:00:4${index % 9} TRACE request_id=req-${index} done`,
  expectedContains: ["[SUMMARY]", "Error count:", "Warn count:", "Debug count:", "Trace count:", "[FORMATTED LOGS]"],
  expectedSummaryContains: ["Filtered count:", "First timestamp:", "Last timestamp:"],
  shouldNotContain: ["Invalid JSON"],
  notes: "Covers log level detection, timestamp extraction, JSON log fragments, and request IDs.",
}));

addMany("stack", "stack", 15, (index) => ({
  name: `typescript stack trace ${index}`,
  input: `TypeError: Cannot read property ${index}\n    at renderUser (src/components/UserCard.tsx:${40 + index}:17)\n    at loadUser (src/app/users.ts:${10 + index}:5)\n    at map (node_modules/react/index.js:100:3)`,
  expectedContains: ["[SUMMARY]", "Error name:", "Total frames:", "App frames:", "Dependency frames:", "[FRAME LIST]"],
  expectedSummaryContains: ["TypeError", "App frames:"],
  shouldNotContain: ["Patch apply failed"],
  notes: "Covers frame parsing, app/dependency classification, and summary.",
}));

addMany("diff", "diff", 20, (index) => ({
  name: `merge diff block ${index}`,
  input: `left-${index}\nshared\nold-${index}`,
  afterInput: `right-${index}\nshared\nnew-${index}`,
  expectedContains: ["[SUMMARY]", "Changed blocks:", "Unresolved blocks:", "[DIFF BLOCKS]", "[MERGED RESULT]"],
  expectedSummaryContains: ["Left only:", "Right only:"],
  shouldNotContain: ["TypeError"],
  notes: "Covers 3-pane merge summary and unresolved block output.",
}));

addMany("minify", "minify", 10, (index) => ({
  name: `minified js ${index}`,
  input: `function x${index}(a,b){if(a){return {id:${index},ok:true,items:[a,b]};}return null;}`,
  expectedContains: ["[SUMMARY]", "Detected type:", "Original length:", "Brace depth max:", "[BEAUTIFIED]"],
  expectedSummaryContains: ["Output lines:"],
  shouldNotContain: ["Invalid JSON"],
  notes: "Covers rule-based JS beautification.",
}));

addMany("code", "code", 20, (index) => ({
  name: `nested if refactor ${index}`,
  input: `function check${index}(user){if(user){if(user.profile){if(user.profile.active){return user.profile.name;}}}return "guest";}`,
  expectedContains: ["// Refactored by Readable Dev Tools", "[SUMMARY]", "[SUGGESTIONS]", "[REFACTORED]", "[WARNING]"],
  expectedSummaryContains: ["Nested blocks detected:", "Guard clauses applied:"],
  shouldNotContain: ["undefined undefined"],
  notes: "Covers mode-aware local refactoring output.",
}));

addMany("text", "text", 5, (index) => ({
  name: `messy text ${index}`,
  input: `  Line ${index}  \n\n\n\tword word  \n`,
  expectedContains: ["[SUMMARY]", "Line count:", "Character count:", "Word count:", "[FORMATTED]"],
  expectedSummaryContains: ["Word count:"],
  shouldNotContain: ["\t"],
  notes: "Covers whitespace cleanup and text stats.",
}));

export const testCases = cases;
