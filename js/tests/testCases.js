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

[
  ["json-edge-empty", ""],
  ["json-edge-null", "null", ["Root: null"]],
  ["json-edge-true", "true", ["Root: boolean"]],
  ["json-edge-number", "123", ["Root: number"]],
  ["json-edge-string", "\"hello\"", ["Root: string"]],
  ["json-edge-trailing-comma", "{\"a\":1,}", ["Invalid JSON", "trailing comma"]],
  ["json-edge-single-quote", "{'a':1}", ["Invalid JSON", "single quote"]],
  ["json-edge-missing-comma", "{\"a\":1 \"b\":2}", ["Invalid JSON"]],
  ["json-edge-unclosed-object", "{\"a\":1", ["Invalid JSON", "unclosed"]],
  ["json-edge-unclosed-array", "[1,2,3", ["Invalid JSON", "unclosed"]],
  ["json-edge-json-lines-partial", "{\"a\":1}\n{\"b\":}", ["Invalid JSON"]],
  ["json-edge-deep", JSON.stringify({ a: { b: { c: { d: { e: 1 } } } } }), ["Max depth:"]],
  ["json-edge-array", "[1,2,3]", ["Root: array"]],
  ["json-edge-mixed", "[{\"a\":1},{\"b\":[true,null]}]", ["Arrays:", "Objects:"]],
  ["json-edge-japanese-key", "{\"\u540d\u524d\":\"\u592a\u90ce\",\"\u6709\u52b9\":true}", ["\u540d\u524d"]],
].forEach(([id, input, expectedContains = []]) => {
  cases.push({
    id,
    tool: "json",
    name: id.replace(/-/g, " "),
    input,
    expectedContains,
    shouldNotContain: ["TypeError"],
    notes: "JSON edge and invalid input coverage.",
  });
});

[
  ["log-edge-empty", ""],
  ["log-edge-no-level", "plain line without level", ["[SUMMARY]", "Info count: 1"]],
  ["log-edge-lower-error", "2026-05-18 10:00:00 error db failed", ["Error count: 1"]],
  ["log-edge-no-timestamp", "ERROR failed without timestamp", ["First timestamp: none"]],
  ["log-edge-mixed-timestamp", "[2026-05-18 10:00:00] INFO start\n2026-05-18T10:00:01Z WARN slow\n10:00:02 ERROR failed", ["Warn count: 1", "Error count: 1"]],
  ["log-edge-bad-json", "ERROR payload {bad}", ["[FORMATTED LOGS]"]],
  ["log-edge-long-line", `ERROR ${"x".repeat(1200)}`, ["Error count: 1"]],
  ["log-edge-japanese", "2026-05-18 10:00:00 ERROR \u5931\u6557\u3057\u307e\u3057\u305f request_id=jp-1", ["jp-1"]],
  ["log-edge-error-message-only", "user message contains ERROR but is not prefixed", ["Error count: 1"]],
  ["log-edge-stack-mixed", "ERROR crash\n    at run (src/app.ts:1:2)", ["\u21b3 at run"]],
].forEach(([id, input, expectedContains = []]) => {
  cases.push({ id, tool: "log", name: id.replace(/-/g, " "), input, expectedContains, shouldNotContain: ["TypeError"], notes: "Log exception coverage." });
});

[
  ["stack-edge-message-only", "Error: boom", ["Error name:", "Total frames: 0"]],
  ["stack-edge-no-at", "TypeError: bad\nnot a frame", ["No frames found."]],
  ["stack-edge-node-modules", "Error: bad\n    at x (node_modules/pkg/index.js:1:2)", ["Dependency frames: 1"]],
  ["stack-edge-no-app", "Error: bad\n    at x (vendor/pkg.js:1:2)", ["App frames: 0"]],
  ["stack-edge-minified", `Error: bad\n    at a (dist/app.min.js:1:999) ${"x".repeat(180)}`, ["Minified frames:"]],
  ["stack-edge-windows", "Error: bad\n    at run (C:\\app\\src\\main.ts:10:5)", ["main.ts"]],
  ["stack-edge-japanese", "Error: \u65e5\u672c\u8a9e\u30a8\u30e9\u30fc\n    at run (src/app.ts:10:5)", ["\u65e5\u672c\u8a9e\u30a8\u30e9\u30fc"]],
  ["stack-edge-typescript", "TypeError: bad\n    at load (src/service/user.ts:20:8)", ["user.ts"]],
  ["stack-edge-anonymous", "Error: bad\n    at src/app.js:4:2", ["(anonymous)"]],
  ["stack-edge-malformed", "totally malformed stack", ["UnknownError"]],
].forEach(([id, input, expectedContains]) => {
  cases.push({ id, tool: "stack", name: id.replace(/-/g, " "), input, expectedContains, shouldNotContain: [], notes: "Stack exception coverage." });
});

[
  ["diff-edge-identical", "a\nb", "a\nb", ["Changed blocks: 0"]],
  ["diff-edge-left-empty", "", "a", ["Right only:"]],
  ["diff-edge-right-empty", "a", "", ["Left only:"]],
  ["diff-edge-add-line", "a", "a\nb", ["Right only: 1"]],
  ["diff-edge-delete-line", "a\nb", "a", ["Left only: 1"]],
  ["diff-edge-space-only", "a ", "a", ["Changed blocks:"]],
  ["diff-edge-newline-code", "a\r\nb", "a\nb", ["Changed blocks: 0"]],
  ["diff-edge-json", "{\"a\":1}", "{\"a\":2}", ["Change summary:"]],
  ["diff-edge-config", "retries=2", "retries=3", ["Change summary:"]],
  ["diff-edge-japanese", "\u3053\u3093\u306b\u3061\u306f", "\u3053\u3093\u3070\u3093\u306f", ["Changed blocks:"]],
  ["diff-edge-large", Array.from({ length: 120 }, (_, i) => `line-${i}`).join("\n"), Array.from({ length: 120 }, (_, i) => (i === 50 ? "changed" : `line-${i}`)).join("\n"), ["Changed blocks:"]],
  ["diff-edge-reset-ready", "old", "new", ["unresolved"]],
].forEach(([id, input, afterInput, expectedContains]) => {
  cases.push({ id, tool: "diff", name: id.replace(/-/g, " "), input, afterInput, expectedContains, shouldNotContain: ["TypeError"], notes: "Diff merge edge coverage." });
});

[
  ["minify-edge-empty", ""],
  ["minify-edge-not-js", "hello world", ["[BEAUTIFIED]"]],
  ["minify-edge-not-css", "plain text only", ["Detected type:"]],
  ["minify-edge-string-symbols", "const s=\";{}\";function x(){return s;}", ["[BEAUTIFIED]"]],
  ["minify-edge-template", "const s=`a;{b}`;console.log(s);", ["[BEAUTIFIED]"]],
  ["minify-edge-media", "@media(max-width:600px){.a{display:block;color:red;}}", ["Detected type: CSS"]],
  ["minify-edge-nested-object", "const x={a:{b:[1,2,3]}};", ["Brace depth max:"]],
  ["minify-edge-unclosed", "function x(){if(true){return 1;", ["[WARNING]"]],
  ["minify-edge-japanese", "const msg=\"\u3053\u3093\u306b\u3061\u306f\";function hi(){return msg;}", ["\u3053\u3093\u306b\u3061\u306f"]],
].forEach(([id, input, expectedContains = []]) => {
  cases.push({ id, tool: "minify", name: id.replace(/-/g, " "), input, expectedContains, shouldNotContain: ["TypeError"], notes: "Minify edge coverage." });
});

[
  ["code-edge-empty", ""],
  ["code-edge-not-code", "this is not code", ["// Refactored by Readable Dev Tools"]],
  ["code-edge-flat", "function x(){return 1;}", ["[SUMMARY]"]],
  ["code-edge-deep-if", "function x(a){if(a){if(a.b){if(a.b.c){if(a.b.c.d){return a.b.c.d;}}}}}", ["Nested blocks detected:"]],
  ["code-edge-else-return", "function x(e){if(e){return null;}else{return 1;}}", ["Else blocks removed:"]],
  ["code-edge-multiple-return", "function x(a){if(a){return 1;}return 2;}", ["[REFACTORED]"]],
  ["code-edge-side-effect", "function x(){if(save()){return true;}return false;}", ["[SUGGESTIONS]"]],
  ["code-edge-for-if", "for(const item of items){if(!item.ok){doWork(item);}}", ["Continue"]],
  ["code-edge-while", "while(x){if(y){break;}}", ["[WARNING]"]],
  ["code-edge-switch", "switch(x){case 1:return true;default:return false;}", ["[WARNING]"]],
  ["code-edge-try-catch", "try{run();}catch(error){return null;}", ["[WARNING]"]],
  ["code-edge-async", "async function x(){if(await ok()){return true;}return false;}", ["[WARNING]"]],
  ["code-edge-japanese-comment", "// \u65e5\u672c\u8a9e\u30b3\u30e1\u30f3\u30c8\nfunction x(a){if(a){return a;}}", ["\u65e5\u672c\u8a9e\u30b3\u30e1\u30f3\u30c8"]],
  ["code-edge-unsafe-skip", "function x(a){if(a = get()){return a;}}", ["skipped"]],
  ["code-edge-performance", "for(const item of items){if(!item){work(item);}}", ["[SUMMARY]"], { code: { mode: "performance" } }],
  ["code-edge-safe", "function x(a){if(a){if(a.b){return a.b;}}}", ["[SUMMARY]"], { code: { mode: "safe" } }],
].forEach(([id, input, expectedContains = [], options]) => {
  cases.push({ id, tool: "code", name: id.replace(/-/g, " "), input, expectedContains, options, shouldNotContain: ["TypeError"], notes: "Code refactor edge coverage." });
});

[
  ["text-edge-empty", ""],
  ["text-edge-spaces", "     ", ["[SUMMARY]"]],
  ["text-edge-tabs", "\t\t", ["[SUMMARY]"]],
  ["text-edge-japanese", "  \u3053\u3093\u306b\u3061\u306f  \n\n\u4e16\u754c  ", ["\u3053\u3093\u306b\u3061\u306f"]],
  ["text-edge-emoji", " hello \u{1F600}  ", ["\u{1F600}"]],
  ["text-edge-many-newlines", "a\n\n\n\nb", ["[FORMATTED]"]],
  ["text-edge-long", "word ".repeat(500), ["Word count:"]],
  ["text-edge-mixed", " a\t b  \r\n\r\n c ", ["[FORMATTED]"]],
].forEach(([id, input, expectedContains = []]) => {
  cases.push({ id, tool: "text", name: id.replace(/-/g, " "), input, expectedContains, shouldNotContain: ["\t"], notes: "Text formatter edge coverage." });
});

[
  {
    id: "diff-ux-001",
    name: "identical left and right",
    input: "alpha\nbeta",
    afterInput: "alpha\nbeta",
    summary: { commonLines: 2, diffBlocks: 0, unresolvedBlocks: 0 },
  },
  {
    id: "diff-ux-002",
    name: "one line changed",
    input: "alpha\nold\nomega",
    afterInput: "alpha\nnew\nomega",
    summary: { commonLines: 2, diffBlocks: 1, unresolvedBlocks: 1 },
    left: ["old"],
    right: ["new"],
    both: ["old", "new"],
  },
  {
    id: "diff-ux-003",
    name: "left only line",
    input: "alpha\nleft-only\nomega",
    afterInput: "alpha\nomega",
    summary: { commonLines: 2, diffBlocks: 1, unresolvedBlocks: 1 },
    left: ["left-only"],
    right: ["alpha\nomega"],
    both: ["left-only"],
  },
  {
    id: "diff-ux-004",
    name: "right only line",
    input: "alpha\nomega",
    afterInput: "alpha\nright-only\nomega",
    summary: { commonLines: 2, diffBlocks: 1, unresolvedBlocks: 1 },
    left: ["alpha\nomega"],
    right: ["right-only"],
    both: ["right-only"],
  },
  {
    id: "diff-ux-005",
    name: "multiple diff blocks",
    input: "a\nold-1\nsame\nold-2\nz",
    afterInput: "a\nnew-1\nsame\nnew-2\nz",
    summary: { commonLines: 3, diffBlocks: 2, unresolvedBlocks: 2 },
    left: ["old-1"],
    right: ["new-1"],
    both: ["old-1", "new-1"],
  },
  {
    id: "diff-ux-006",
    name: "blank lines preserved",
    input: "a\n\nold\nz",
    afterInput: "a\n\nnew\nz",
    summary: { commonLines: 3, diffBlocks: 1, unresolvedBlocks: 1 },
    left: ["old"],
    right: ["new"],
    both: ["old", "new"],
  },
  {
    id: "diff-ux-007",
    name: "indentation difference",
    input: "function x() {\n  return 1;\n}",
    afterInput: "function x() {\n    return 1;\n}",
    summary: { commonLines: 2, diffBlocks: 1, unresolvedBlocks: 1 },
    left: ["  return 1;"],
    right: ["    return 1;"],
    both: ["  return 1;", "    return 1;"],
  },
  {
    id: "diff-ux-008",
    name: "japanese text difference",
    input: "\u3053\u3093\u306b\u3061\u306f\n\u65e7\u30c6\u30ad\u30b9\u30c8",
    afterInput: "\u3053\u3093\u306b\u3061\u306f\n\u65b0\u30c6\u30ad\u30b9\u30c8",
    summary: { commonLines: 1, diffBlocks: 1, unresolvedBlocks: 1 },
    left: ["\u65e7\u30c6\u30ad\u30b9\u30c8"],
    right: ["\u65b0\u30c6\u30ad\u30b9\u30c8"],
    both: ["\u65e7\u30c6\u30ad\u30b9\u30c8", "\u65b0\u30c6\u30ad\u30b9\u30c8"],
  },
  {
    id: "diff-ux-009",
    name: "crlf lf mixed",
    input: "a\r\nb\r\nc",
    afterInput: "a\nb\nc",
    summary: { commonLines: 3, diffBlocks: 0, unresolvedBlocks: 0 },
  },
  {
    id: "diff-ux-010",
    name: "load sample diff",
    input: "const apiUrl = \"https://dev-api.example.com\";\nconst timeout = 3000;",
    afterInput: "const apiUrl = \"https://prod-api.example.com\";\nconst timeout = 5000;",
    summary: { commonLines: 0, diffBlocks: 1, unresolvedBlocks: 1 },
    left: ["dev-api", "3000"],
    right: ["prod-api", "5000"],
    both: ["dev-api", "prod-api"],
  },
].forEach((test) => {
  const choices = { 0: "left", 1: "left", 2: "left", 3: "left", 4: "left" };
  const rightChoices = { 0: "right", 1: "right", 2: "right", 3: "right", 4: "right" };
  const bothChoices = { 0: "both", 1: "both", 2: "both", 3: "both", 4: "both" };
  cases.push({
    id: test.id,
    tool: "diff",
    name: test.name,
    input: test.input,
    afterInput: test.afterInput,
    expectedContains: ["Total left lines / \u5de6\u884c\u6570:", "Common lines / \u5171\u901a\u884c:", "Diff blocks / \u5dee\u5206\u30d6\u30ed\u30c3\u30af:"],
    shouldNotContain: ["TypeError"],
    diffExpectations: {
      summary: test.summary,
      leftChoices: choices,
      rightChoices,
      bothChoices,
      useLeftContains: test.left || [],
      useRightContains: test.right || [],
      useBothContains: test.both || [],
    },
    notes: "Diff Viewer three-pane merge UX behavior.",
  });
});

[
  ["secret-new-001", "", ["Findings: 0"]],
  ["secret-new-002", "plain log line", ["No obvious secrets detected."]],
  ["secret-new-003", "AWS_ACCESS_KEY_ID=AKIA1234567890ABCDEF", ["AWS Access Key", "AKIA"]],
  ["secret-new-004", "token=ghp_abcdefghijklmnopqrstuvwxyz123456", ["GitHub Token"]],
  ["secret-new-005", "Authorization: Bearer abcdefghijklmnopqrstuvwxyz123456", ["Bearer Token"]],
  ["secret-new-006", "jwt=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature", ["JWT"]],
  ["secret-new-007", "password=supersecret", ["Password Assignment"]],
  ["secret-new-008", "-----BEGIN PRIVATE KEY-----", ["Private Key"]],
  ["secret-new-009", "DATABASE_URL=postgres://user:pass@db/app\nJWT_SECRET=abc123456789", ["DATABASE_URL", "JWT_SECRET"]],
  ["secret-new-010", "ERROR 日本語ログ secret=ひみつtoken123", ["Secret Assignment"]],
].forEach(([id, input, expectedContains]) => {
  cases.push({ id, tool: "secret", name: id, input, expectedContains, shouldNotContain: ["supersecret\n"], notes: "Secret Detector new feature coverage." });
});

[
  ["jwt-new-001", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMiLCJleHAiOjQxMDI0NDQ4MDB9.sig", ["Status: Decoded", "Algorithm: HS256"]],
  ["jwt-new-002", "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.sig", ["Expired: true"]],
  ["jwt-new-003", "abc.def", ["Invalid JWT format"]],
  ["jwt-new-004", "abc..sig", ["Invalid JWT"]],
  ["jwt-new-005", "not.a.jwt", ["Invalid JWT"]],
  ["jwt-new-006", "", ["Empty input"]],
  ["jwt-new-007", "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.sig", ["Algorithm: none"]],
  ["jwt-new-008", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig", ["exp not present"]],
  ["jwt-new-009", "eyJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoi5aSq6YOOIn0.sig", ["太郎"]],
  ["jwt-new-010", "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlcyI6WyJhZG1pbiIsImRldiIsIm9wcyJdfQ.sig", ["roles"]],
].forEach(([id, input, expectedContains]) => {
  cases.push({ id, tool: "jwt", name: id, input, expectedContains, shouldNotContain: ["TypeError"], notes: "JWT Decoder new feature coverage." });
});

[
  ["regex-new-001", "ERROR 500", { pattern: "ERROR\\s+(\\d+)" }, ["Match count: 1", "$1=500"]],
  ["regex-new-002", "ERROR", { pattern: "[" }, ["Regex error"]],
  ["regex-new-003", "INFO", { pattern: "ERROR" }, ["No matches."]],
  ["regex-new-004", "user=42", { pattern: "user=(\\d+)" }, ["Capture groups: $1=42"]],
  ["regex-new-005", "abc abc", { pattern: "abc", replacement: "x" }, ["x x"]],
  ["regex-new-006", "a a a", { pattern: "a", flags: "g" }, ["Match count: 3"]],
  ["regex-new-007", "a\nb", { pattern: "^b", flags: "gm" }, ["Match count: 1"]],
  ["regex-new-008", "Error", { pattern: "error", flags: "gi" }, ["Match count: 1"]],
  ["regex-new-009", "日本語ログ", { pattern: "日本語" }, ["[[MATCH:日本語]]"]],
  ["regex-new-010", "x".repeat(200001), { pattern: "x" }, ["Input too large"]],
].forEach(([id, input, options, expectedContains]) => {
  cases.push({ id, tool: "regex", name: id, input, options: { regex: options }, expectedContains, shouldNotContain: ["TypeError"], notes: "Regex Tester new feature coverage." });
});

[
  ["env-new-001", "A=1", "A=1", ["Added keys: 0", "Changed values: 0"]],
  ["env-new-002", "A=1\nB=2", "A=1", ["Missing keys: 1"]],
  ["env-new-003", "A=1", "A=1\nB=2", ["Added keys: 1"]],
  ["env-new-004", "A=1", "A=2", ["Changed values: 1"]],
  ["env-new-005", "EMPTY=", "EMPTY=1", ["Empty values: 1"]],
  ["env-new-006", "A=1\nA=2", "A=2", ["Duplicate keys: 1"]],
  ["env-new-007", "JWT_SECRET=abc123456", "JWT_SECRET=def123456", ["Suspicious secret keys: 1", "JWT_SECRET"]],
  ["env-new-008", "NAME=太郎", "NAME=花子", ["Changed values: 1"]],
  ["env-new-009", "# comment\nA=1", "A=1", ["Left keys: 1"]],
  ["env-new-010", "bad line", "A=1", ["Malformed lines:"]],
].forEach(([id, input, right, expectedContains]) => {
  cases.push({ id, tool: "env", name: id, input, options: { env: { right } }, expectedContains, shouldNotContain: ["TypeError"], notes: "Env Compare new feature coverage." });
});

[
  ["schema-new-001", "{\"a\":\"x\"}", ["\"a\"", "type GeneratedType"]],
  ["schema-new-002", "{\"a\":{\"b\":1}}", ["\"b\""]],
  ["schema-new-003", "{\"items\":[1,2]}", ["\"array\""]],
  ["schema-new-004", "{\"items\":[1,\"x\"]}", ["\"x-itemTypes\""]],
  ["schema-new-005", "{\"a\":null}", ["\"null\""]],
  ["schema-new-006", "{\"a\":true}", ["boolean"]],
  ["schema-new-007", "{\"a\":1.2}", ["number"]],
  ["schema-new-008", "{\"a\":\"text\"}", ["string"]],
  ["schema-new-009", "{}", ["Top-level keys: 0"]],
  ["schema-new-010", "{bad}", ["Invalid JSON"]],
].forEach(([id, input, expectedContains]) => {
  cases.push({ id, tool: "schema", name: id, input, expectedContains, shouldNotContain: ["TypeError"], notes: "JSON Schema Generator new feature coverage." });
});

export const testCases = cases;
