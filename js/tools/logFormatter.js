const LEVELS = ["ERROR", "WARN", "INFO", "DEBUG"];

function stripAnsi(line) {
  return line.replace(/\u001b\[[0-9;]*m/g, "");
}

function hasLevelPrefix(line) {
  return /^\[(ERROR|WARN|INFO|DEBUG)\]\s/i.test(stripAnsi(line));
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

  if (selectedLevel !== "all" && level !== selectedLevel) {
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
    return `  ↳ ${trimmed}`;
  }

  const prefix = index === 0 ? getLevelPrefix(trimmed) : "";
  return `${prefix}${formatJsonFragment(trimmed)}`;
}

export function formatLog(input, options = {}) {
  return groupLogEntries(input)
    .filter((entry) => shouldIncludeEntry(entry, options))
    .map((entry) => entry.map(formatLogLine).join("\n"))
    .join("\n");
}
