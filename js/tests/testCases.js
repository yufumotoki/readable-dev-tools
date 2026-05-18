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

export const testCases = cases;
