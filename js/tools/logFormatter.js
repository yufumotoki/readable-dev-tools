const LEVELS = ["ERROR", "WARN", "INFO", "DEBUG"];

function stripAnsi(line) {
  return line.replace(/\u001b\[[0-9;]*m/g, "");
}

function extractTimestamp(line) {
  const clean = stripAnsi(line);
  const match = clean.match(/(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?/);

  if (!match) {
    return "";
  }

  return match[2] ? `${match[1]} ${match[2]}` : match[1];
}

function compareTimestamp(value, boundary) {
  if (!value || !boundary) {
    return 0;
  }

  return value.localeCompare(boundary);
}

function extractRequestIds(text) {
  const ids = new Set();
  const patterns = [
    /\b(?:request[-_ ]?id|req[-_ ]?id|trace[-_ ]?id|correlation[-_ ]?id)\s*[=:]\s*([A-Za-z0-9_.:-]+)/gi,
    /\b(?:rid|tid)\s*[=:]\s*([A-Za-z0-9_.:-]+)/gi,
  ];

  for (const pattern of patterns) {
    let match;

    while ((match = pattern.exec(text)) !== null) {
      ids.add(match[1]);
    }
  }

  return [...ids];
}

function detectLevel(line) {
  const clean = stripAnsi(line);
  const prefixed = clean.match(/^\[(ERROR|WARN|INFO|DEBUG)\]\s/i);

  if (prefixed) {
    return prefixed[1].toUpperCase();
  }

  const upper = clean.toUpperCase();

  for (const level of LEVELS) {
    if (upper.includes(level)) {
      return level;
    }
  }

  return "";
}

function getLevelPrefix(line) {
  if (/^\[(ERROR|WARN|INFO|DEBUG)\]\s/.test(stripAnsi(line))) {
    return "";
  }

  const level = detectLevel(line);
  return level ? `[${level}] ` : "";
}

function formatJsonFragment(line) {
  const cleanLine = stripAnsi(line);
  const firstBrace = cleanLine.indexOf("{");
  const lastBrace = cleanLine.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return cleanLine;
  }

  const before = cleanLine.slice(0, firstBrace).trimEnd();
  const fragment = cleanLine.slice(firstBrace, lastBrace + 1);
  const after = cleanLine.slice(lastBrace + 1).trimStart();

  try {
    const formatted = JSON.stringify(JSON.parse(fragment), null, 2);
    const parts = [];

    if (before) {
      parts.push(before);
    }

    parts.push(
      formatted
        .split("\n")
        .map((jsonLine) => `  ${jsonLine}`)
        .join("\n")
    );

    if (after) {
      parts.push(`  ${after}`);
    }

    return parts.join("\n");
  } catch (error) {
    return cleanLine;
  }
}

function isLogHeader(line) {
  const clean = stripAnsi(line).trim();
  return (
    detectLevel(clean) ||
    /\d{4}-\d{2}-\d{2}/.test(clean) ||
    /\d{2}:\d{2}:\d{2}/.test(clean)
  );
}

function groupLogEntries(input) {
  const entries = [];

  for (const line of input.split(/\r?\n/)) {
    const startsEntry = isLogHeader(line);

    if (startsEntry || entries.length === 0) {
      entries.push([line]);
      continue;
    }

    entries[entries.length - 1].push(line);
  }

  return entries;
}

function shouldIncludeEntry(entry, options) {
  const joined = stripAnsi(entry.join("\n"));
  const level = detectLevel(entry[0] || joined);
  const selectedLevel = options.level || "all";
  const keyword = options.keyword || "";
  const timestamp = extractTimestamp(entry[0] || "");

  if (selectedLevel !== "all" && level !== selectedLevel) {
    return false;
  }

  if (options.timeFrom && compareTimestamp(timestamp, options.timeFrom) < 0) {
    return false;
  }

  if (options.timeTo && compareTimestamp(timestamp, options.timeTo) > 0) {
    return false;
  }

  if (!keyword) {
    return true;
  }

  if (options.caseSensitive) {
    return joined.includes(keyword);
  }

  return joined.toLowerCase().includes(keyword.toLowerCase());
}

function formatLogLine(line, index) {
  const trimmed = stripAnsi(line).trim();

  if (!trimmed) {
    return "";
  }

  if (/^at\s+/.test(trimmed)) {
    return `  \u21b3 ${trimmed}`;
  }

  const prefix = index === 0 ? getLevelPrefix(trimmed) : "";
  return `${prefix}${formatJsonFragment(trimmed)}`;
}

export function formatLog(input, options = {}) {
  const entries = groupLogEntries(input);
  const contextLines = Math.max(Number(options.contextLines || 0), 0);
  const included = new Set();
  const matchedErrors = new Set();

  entries.forEach((entry, index) => {
    if (shouldIncludeEntry(entry, options)) {
      included.add(index);

      if (detectLevel(entry[0] || entry.join("\n")) === "ERROR") {
        matchedErrors.add(index);
      }
    }
  });

  if (contextLines > 0) {
    matchedErrors.forEach((index) => {
      for (let offset = -contextLines; offset <= contextLines; offset += 1) {
        const contextIndex = index + offset;

        if (contextIndex >= 0 && contextIndex < entries.length) {
          included.add(contextIndex);
        }
      }
    });
  }

  const selectedEntries = entries.filter((entry, index) => included.has(index));
  const requestIds = extractRequestIds(selectedEntries.flat().join("\n"));
  const levels = LEVELS.map((level) => {
    const count = selectedEntries.filter((entry) => detectLevel(entry[0] || entry.join("\n")) === level).length;
    return `${level}:${count}`;
  }).join(" ");
  const summary = [
    "[SUMMARY]",
    `Entries: ${selectedEntries.length}/${entries.length}`,
    `Levels: ${levels}`,
    `Request IDs: ${requestIds.length ? requestIds.join(", ") : "none"}`,
    "",
  ].join("\n");

  const body = selectedEntries
    .map((entry) => entry.map(formatLogLine).join("\n"))
    .join("\n");

  return body ? `${summary}${body}` : `${summary}No log entries matched.`;
}
