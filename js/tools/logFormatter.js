const LEVELS = ["ERROR", "WARN", "INFO", "DEBUG", "TRACE"];
const LEVEL_RANK = { ERROR: 5, WARN: 4, INFO: 3, DEBUG: 2, TRACE: 1 };

function stripAnsi(line) {
  return line.replace(/\u001b\[[0-9;]*m/g, "");
}

function detectLevel(line) {
  const clean = stripAnsi(line);
  const prefixed = clean.match(/^\[(ERROR|WARN|INFO|DEBUG|TRACE)\]\s/i);
  if (prefixed) return prefixed[1].toUpperCase();

  const match = clean.match(/\b(ERROR|WARN|WARNING|INFO|DEBUG|TRACE)\b/i);
  if (!match) return "";
  return match[1].toUpperCase() === "WARNING" ? "WARN" : match[1].toUpperCase();
}

function extractTimestamp(line) {
  const clean = stripAnsi(line);
  const patterns = [
    /\[(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\]/,
    /(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/,
    /\[(\d{2}:\d{2}:\d{2})\]/,
    /\b(\d{2}:\d{2}:\d{2})\b/,
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match) return match[1].replace("T", " ").replace(/Z$/, "");
  }

  return "";
}

function extractRequestIds(text) {
  const ids = new Set();
  const patterns = [
    /\b(?:request[-_ ]?id|req[-_ ]?id|trace[-_ ]?id|correlation[-_ ]?id)\s*[=:]\s*([A-Za-z0-9_.:-]+)/gi,
    /\b(?:rid|tid)\s*[=:]\s*([A-Za-z0-9_.:-]+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) ids.add(match[1]);
  }

  return [...ids];
}

function formatJsonFragment(line) {
  const cleanLine = stripAnsi(line);
  const firstBrace = cleanLine.indexOf("{");
  const lastBrace = cleanLine.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return cleanLine;

  const before = cleanLine.slice(0, firstBrace).trimEnd();
  const fragment = cleanLine.slice(firstBrace, lastBrace + 1);
  const after = cleanLine.slice(lastBrace + 1).trimStart();

  try {
    const formatted = JSON.stringify(JSON.parse(fragment), null, 2)
      .split("\n")
      .map((jsonLine) => `  ${jsonLine}`)
      .join("\n");
    return [before, formatted, after ? `  ${after}` : ""].filter(Boolean).join("\n");
  } catch (error) {
    return cleanLine;
  }
}

function isLogHeader(line) {
  const clean = stripAnsi(line).trim();
  return Boolean(detectLevel(clean) || extractTimestamp(clean));
}

function groupEntries(input) {
  const entries = [];
  input.split(/\r?\n/).forEach((line, lineIndex) => {
    const startsEntry = isLogHeader(line);
    if (startsEntry || entries.length === 0) {
      entries.push({ lines: [line], startLine: lineIndex + 1 });
      return;
    }
    entries[entries.length - 1].lines.push(line);
  });
  return entries;
}

function normalizeFilter(value) {
  if (!value || value === "all") return "all";
  if (value === "error") return "ERROR";
  if (value === "warn+") return "WARN+";
  if (value === "debug+") return "DEBUG+";
  return value.toUpperCase();
}

function levelAllowed(level, filter) {
  const normalized = normalizeFilter(filter);
  if (normalized === "all") return true;
  if (normalized === "WARN+") return LEVEL_RANK[level] >= LEVEL_RANK.WARN;
  if (normalized === "DEBUG+") return LEVEL_RANK[level] >= LEVEL_RANK.TRACE;
  return level === normalized;
}

function keywordAllowed(text, keyword, caseSensitive) {
  if (!keyword) return true;
  return caseSensitive ? text.includes(keyword) : text.toLowerCase().includes(keyword.toLowerCase());
}

function timeAllowed(timestamp, from, to) {
  if (!timestamp) return true;
  if (from && timestamp < from) return false;
  if (to && timestamp > to) return false;
  return true;
}

function highlightLine(line, keyword, caseSensitive) {
  if (!keyword) return line;
  const source = caseSensitive ? line : line.toLowerCase();
  const needle = caseSensitive ? keyword : keyword.toLowerCase();
  let cursor = 0;
  let output = "";
  let index = source.indexOf(needle, cursor);

  while (index !== -1) {
    output += line.slice(cursor, index) + "<<MATCH>>" + line.slice(index, index + keyword.length) + "<</MATCH>>";
    cursor = index + keyword.length;
    index = source.indexOf(needle, cursor);
  }

  return output + line.slice(cursor);
}

function formatEntry(entry, options) {
  return entry.lines.map((line, index) => {
    const trimmed = stripAnsi(line).trim();
    if (!trimmed) return "";
    if (/^at\s+/.test(trimmed)) return `  \u21b3 ${trimmed}`;
    const level = detectLevel(trimmed);
    const prefix = index === 0 && level && !trimmed.startsWith(`[${level}]`) ? `[${level}] ` : "";
    return highlightLine(`${prefix}${formatJsonFragment(trimmed)}`, options.keyword || "", Boolean(options.caseSensitive));
  }).join("\n");
}

export function analyzeLog(input, options = {}) {
  if (!input.trim()) return { output: "", summary: "", filtered: "", warning: "" };

  const entries = groupEntries(input);
  const lineCount = input.split(/\r?\n/).length;
  const contextLines = Math.max(Number(options.contextLines || 0), 0);
  const counts = Object.fromEntries(LEVELS.map((level) => [level, 0]));
  const timestamps = [];
  const included = new Set();
  const matchedErrors = new Set();
  const filter = normalizeFilter(options.level || "all");

  entries.forEach((entry, index) => {
    const joined = entry.lines.join("\n");
    const level = detectLevel(joined) || "INFO";
    if (counts[level] !== undefined) counts[level] += 1;
    const timestamp = extractTimestamp(entry.lines[0] || joined);
    if (timestamp) timestamps.push(timestamp);

    if (
      levelAllowed(level, filter) &&
      keywordAllowed(stripAnsi(joined), options.keyword || "", Boolean(options.caseSensitive)) &&
      timeAllowed(timestamp, options.timeFrom || "", options.timeTo || "")
    ) {
      included.add(index);
      if (level === "ERROR") matchedErrors.add(index);
    }
  });

  if (contextLines > 0) {
    matchedErrors.forEach((index) => {
      for (let offset = -contextLines; offset <= contextLines; offset += 1) {
        const next = index + offset;
        if (next >= 0 && next < entries.length) included.add(next);
      }
    });
  }

  const selected = entries.filter((entry, index) => included.has(index));
  const formatted = selected.map((entry) => formatEntry(entry, options)).join("\n");
  const requestIds = extractRequestIds(selected.flatMap((entry) => entry.lines).join("\n"));
  const summary = [
    "[SUMMARY]",
    `Total lines: ${lineCount}`,
    `Entries: ${entries.length}`,
    `Filtered count: ${selected.length}`,
    `First timestamp: ${timestamps[0] || "none"}`,
    `Last timestamp: ${timestamps[timestamps.length - 1] || "none"}`,
    `Error count: ${counts.ERROR}`,
    `Warn count: ${counts.WARN}`,
    `Info count: ${counts.INFO}`,
    `Debug count: ${counts.DEBUG}`,
    `Trace count: ${counts.TRACE}`,
    `Request IDs: ${requestIds.length ? requestIds.join(", ") : "none"}`,
  ].join("\n");

  return {
    output: formatted ? `${summary}\n\n[FORMATTED LOGS]\n${formatted}` : `${summary}\n\nNo log entries matched.`,
    summary,
    filtered: formatted,
    warning: "",
  };
}

export function formatLog(input, options = {}) {
  return analyzeLog(input, options).output;
}
