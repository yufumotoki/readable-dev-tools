function stripAnsi(line) {
  return line.replace(/\u001b\[[0-9;]*m/g, "");
}

function isStackFrame(line) {
  return /^(at\s+|async\s|File ".+", line \d+)/.test(line);
}

function isErrorHeader(line) {
  return /^([\w.]*Error|[\w.]*Exception|Traceback)\b/.test(line);
}

export function formatStackTrace(input) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => stripAnsi(line).trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "";
  }

  return lines
    .map((line, index) => {
      if (isStackFrame(line)) {
        return `  -> ${line}`;
      }

      if (isErrorHeader(line)) {
        return index === 0 ? line : `\n${line}`;
      }

      if (/^Caused by:/.test(line)) {
        return `\n${line}`;
      }

      return line;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}
