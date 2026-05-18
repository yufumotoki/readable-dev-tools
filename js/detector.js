function tryParseJSON(text) {
  try {
    JSON.parse(text);
    return true;
  } catch (error) {
    return false;
  }
}

function isJSONLines(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.length > 1 && lines.every((line) => tryParseJSON(line));
}

export function detectDetails(input) {
  const text = input.trim();

  if (!text) {
    return { type: "empty", confidence: "High", reason: "Input is empty." };
  }

  if (tryParseJSON(text)) {
    return { type: "json", confidence: "High", reason: "JSON.parse succeeded." };
  }

  if (isJSONLines(text)) {
    return { type: "json", confidence: "High", reason: "Every non-empty line is valid JSON; treated as JSON Lines." };
  }

  if (
    /\bat\s+.+\(?[^()\s]+:\d+:\d+\)?/.test(text) ||
    /(?:TypeError|ReferenceError|SyntaxError|Error|Exception):/.test(text) ||
    /\.(?:js|ts|tsx|jsx):\d+:\d+/.test(text)
  ) {
    return { type: "stack", confidence: "High", reason: "Found stack frame or error signature with file, line, and column." };
  }

  const diffLineCount = input
    .split(/\r?\n/)
    .filter((line) => /^[+-]/.test(line) || /^@@/.test(line)).length;

  if (/^@@\s+-\d+/m.test(text) || diffLineCount >= 2) {
    return { type: "diff", confidence: /^@@\s+-\d+/m.test(text) ? "High" : "Medium", reason: "Found unified diff markers or multiple added/deleted lines." };
  }

  if (/\{[^{}\n]{30,}\}/.test(text) && /function|=>|const |let |var /.test(text) && text.split(/\r?\n/).length <= 3) {
    return { type: "minify", confidence: "Medium", reason: "Detected dense JavaScript-like code with very few line breaks." };
  }

  if (/[.#]?[a-zA-Z][^{]+\{[^}]+:[^}]+;?[^}]*\}/.test(text) && text.split(/\r?\n/).length <= 3) {
    return { type: "minify", confidence: "Medium", reason: "Detected dense CSS-like rules with braces and declarations." };
  }

  if (
    /\b(function|if\s*\(|for\s*\(|const |let |var |return |=>|class |interface |type )/.test(text)
  ) {
    return { type: "code", confidence: "Medium", reason: "Found JavaScript/TypeScript code keywords." };
  }

  if (
    /\b(error|warn|info|debug|trace)\b/i.test(text) ||
    /\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(text) ||
    /\[\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}\]/.test(text) ||
    /\d{2}:\d{2}:\d{2}/.test(text)
  ) {
    return { type: "log", confidence: "High", reason: "Found timestamps and/or log levels such as ERROR, WARN, INFO, DEBUG, or TRACE." };
  }

  return { type: "text", confidence: "Low", reason: "No structured JSON, stack trace, diff, code, minified code, or log signature found." };
}

export function detectType(input) {
  return detectDetails(input).type;
}
