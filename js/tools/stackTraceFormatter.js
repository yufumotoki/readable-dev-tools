function stripAnsi(line) {
  return line.replace(/\u001b\[[0-9;]*m/g, "");
}

function parseError(lines) {
  const header = lines.find((line) => /^([\w.]*Error|[\w.]*Exception|Traceback)\b/.test(line)) || lines[0] || "";
  const match = header.match(/^([\w.]*Error|[\w.]*Exception|Traceback)(?::\s*(.*))?/);
  return {
    name: match ? match[1] : "UnknownError",
    message: match ? (match[2] || "") : header,
  };
}

function classifyFrame(filePath) {
  if (!filePath) return "unknown";
  if (/node_modules|\/vendor\/|\\vendor\\|webpack\/bootstrap|internal\/modules/.test(filePath)) return "dependency";
  if (/(^|[\\/])(src|app|pages|components|lib)[\\/]/.test(filePath) || /\.(tsx?|jsx?)$/.test(filePath)) return "app";
  return "unknown";
}

function parseFrame(line, index) {
  const clean = stripAnsi(line).trim();
  let match = clean.match(/^at\s+(.*?)\s+\((.*?):(\d+):(\d+)\)$/);
  if (!match) match = clean.match(/^at\s+(.*?):(\d+):(\d+)$/);

  if (match && match.length === 5) {
    const filePath = match[2];
    return {
      index,
      raw: clean,
      functionName: match[1] || "(anonymous)",
      filePath,
      lineNumber: Number(match[3]),
      columnNumber: Number(match[4]),
      classification: classifyFrame(filePath),
      minified: /min\.js|bundle\.js|:[0-9]+:[0-9]+$/.test(filePath) && clean.length > 160,
    };
  }

  if (match && match.length === 4) {
    const filePath = match[1];
    return {
      index,
      raw: clean,
      functionName: "(anonymous)",
      filePath,
      lineNumber: Number(match[2]),
      columnNumber: Number(match[3]),
      classification: classifyFrame(filePath),
      minified: /min\.js|bundle\.js/.test(filePath) || clean.length > 160,
    };
  }

  return null;
}

function filterFrames(frames, filter) {
  if (filter === "app") return frames.filter((frame) => frame.classification === "app");
  if (filter === "dependency") return frames.filter((frame) => frame.classification === "dependency");
  return frames;
}

export function analyzeStackTrace(input, options = {}) {
  const lines = input.split(/\r?\n/).map((line) => stripAnsi(line).trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", summary: "", appFrames: "", dependencyFrames: "", errorSummary: "" };

  const error = parseError(lines);
  const frames = lines.map(parseFrame).filter(Boolean);
  const appFrames = frames.filter((frame) => frame.classification === "app");
  const dependencyFrames = frames.filter((frame) => frame.classification === "dependency");
  const selected = filterFrames(frames, options.filter || (options.hideVendor === false ? "all" : "all"));
  const summary = [
    "[SUMMARY]",
    `Error name: ${error.name}`,
    `Message: ${error.message || "none"}`,
    `Total frames: ${frames.length}`,
    `App frames: ${appFrames.length}`,
    `Dependency frames: ${dependencyFrames.length}`,
    `Unknown frames: ${frames.length - appFrames.length - dependencyFrames.length}`,
    `Minified frames: ${frames.filter((frame) => frame.minified).length}`,
  ].join("\n");
  const frameList = selected.map((frame) => [
    `[FRAME ${frame.index}] ${frame.classification}${frame.minified ? " minified" : ""}`,
    `Function: ${frame.functionName}`,
    `File: ${frame.filePath}`,
    `Line: ${frame.lineNumber}`,
    `Column: ${frame.columnNumber}`,
    `Raw: ${frame.raw}`,
  ].join("\n")).join("\n\n");
  const errorSummary = `${error.name}: ${error.message || "none"} | frames=${frames.length} app=${appFrames.length} dependency=${dependencyFrames.length}`;

  return {
    output: [summary, "", "[FRAME LIST]", frameList || "No frames found.", "", "[SELECTED FRAME DETAIL]", selected[0] ? JSON.stringify(selected[0], null, 2) : "none"].join("\n"),
    summary,
    appFrames: appFrames.map((frame) => frame.raw).join("\n"),
    dependencyFrames: dependencyFrames.map((frame) => frame.raw).join("\n"),
    errorSummary,
  };
}

export function formatStackTrace(input, options = {}) {
  return analyzeStackTrace(input, options).output;
}
