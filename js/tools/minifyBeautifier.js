function indentation(depth) {
  return "  ".repeat(Math.max(depth, 0));
}

function detectMinifyType(text, requested = "auto") {
  if (requested && requested !== "auto") return requested.toUpperCase();
  if (/[.#]?[a-zA-Z][^{]+\{[^}]+:[^}]+;?[^}]*\}/.test(text) && !/\bfunction\b|=>|const |let /.test(text)) return "CSS";
  return "JS";
}

function formatReadableLine(line) {
  const literals = [];
  const protectedLine = line.replace(/(["'`])(?:\\.|(?!\1)[\s\S])*\1/g, (literal) => {
    const token = `__RDT_LITERAL_${literals.length}__`;
    literals.push(literal);
    return token;
  });

  const formatted = protectedLine
    .trim()
    .replace(/\s*\{\s*$/, " {")
    .replace(/\b(if|for|while|switch|catch|function)\s*\(/g, "$1 (")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*(===|!==|==|!=|<=|>=|\+|-|\*|\/)\s*/g, " $1 ")
    .replace(/([^=!<>])=([^=>])/g, "$1 = $2")
    .replace(/:(?!\/\/)([^\s;}\],)])/g, ": $1")
    .replace(/\s*=\s*>\s*/g, " => ")
    .replace(/\s+/g, " ");

  return formatted.replace(/__RDT_LITERAL_(\d+)__/g, (match, index) => literals[Number(index)] || match);
}

export function beautifyMinified(input, options = {}) {
  const text = input.trim();
  if (!text) return "";

  const detectedType = detectMinifyType(text, options.mode || "auto");
  let depth = 0;
  let maxDepth = 0;
  let buffer = "";
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let parenDepth = 0;
  const lines = [];

  function pushBuffer() {
    const trimmed = buffer.trim();
    if (trimmed) lines.push(`${indentation(depth)}${formatReadableLine(trimmed)}`);
    buffer = "";
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1] || "";

    if (lineComment) {
      buffer += char;
      if (char === "\n") {
        pushBuffer();
        lineComment = false;
      }
      continue;
    }

    if (blockComment) {
      buffer += char;
      if (char === "*" && next === "/") {
        buffer += next;
        index += 1;
        pushBuffer();
        blockComment = false;
      }
      continue;
    }

    if (quote) {
      buffer += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }

    if (char === "/" && next === "/") {
      buffer += char + next;
      index += 1;
      lineComment = true;
      continue;
    }

    if (char === "/" && next === "*") {
      buffer += char + next;
      index += 1;
      blockComment = true;
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      buffer += char;
      continue;
    }

    if (char === "(" || char === "[") {
      parenDepth += 1;
      buffer += char;
      continue;
    }

    if (char === ")" || char === "]") {
      parenDepth = Math.max(parenDepth - 1, 0);
      buffer += char;
      continue;
    }

    if (char === "{") {
      buffer += char;
      pushBuffer();
      depth += 1;
      maxDepth = Math.max(maxDepth, depth);
      continue;
    }

    if (char === "}") {
      pushBuffer();
      depth -= 1;
      lines.push(`${indentation(depth)}}`);
      continue;
    }

    if (char === ";" && parenDepth === 0) {
      buffer += char;
      pushBuffer();
      continue;
    }

    if (char === "," && parenDepth === 0) {
      buffer += ", ";
      if (detectedType === "JS" && /[\]}]\s*,\s*$/.test(buffer)) pushBuffer();
      continue;
    }

    buffer += char;
  }

  pushBuffer();

  const body = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  return [
    "[SUMMARY]",
    `Detected type: ${detectedType}`,
    `Original length: ${text.length}`,
    `Output lines: ${body ? body.split(/\r?\n/).length : 0}`,
    `Brace depth max: ${maxDepth}`,
    "",
    "[WARNING]",
    "Rule-based beautifier. Please review complex code.",
    "",
    "[BEAUTIFIED]",
    body,
  ].join("\n");
}
