function indentation(depth) {
  return "  ".repeat(Math.max(depth, 0));
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
    .replace(/\s*(===|!==|==|!=|<=|>=)\s*/g, " $1 ")
    .replace(/([^=!<>])=([^=>])/g, "$1 = $2")
    .replace(/:(?!\/\/)([^\s;}\],)])/g, ": $1")
    .replace(/\s*=\s*>\s*/g, " => ")
    .replace(/\s+/g, " ");

  return formatted.replace(/__RDT_LITERAL_(\d+)__/g, (match, index) => {
    return literals[Number(index)] || match;
  });
}

export function beautifyMinified(input) {
  const text = input.trim();

  if (!text) {
    return "";
  }

  let depth = 0;
  let buffer = "";
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let parenDepth = 0;
  const lines = [];

  function pushBuffer() {
    const trimmed = buffer.trim();

    if (trimmed) {
      lines.push(`${indentation(depth)}${formatReadableLine(trimmed)}`);
    }

    buffer = "";
  }

  function appendToLastLine(value) {
    if (lines.length === 0) {
      lines.push(value);
      return;
    }

    lines[lines.length - 1] = `${lines[lines.length - 1]}${value}`;
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

      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }

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

    if (char === "(") {
      parenDepth += 1;
      buffer += char;
      continue;
    }

    if (char === ")") {
      parenDepth = Math.max(parenDepth - 1, 0);
      buffer += char;
      continue;
    }

    if (char === "{") {
      buffer += char;
      pushBuffer();
      depth += 1;
      continue;
    }

    if (char === "}") {
      pushBuffer();
      depth -= 1;
      lines.push(`${indentation(depth)}}`);
      continue;
    }

    if (char === ";" && parenDepth === 0) {
      if (!buffer.trim() && lines.length > 0 && lines[lines.length - 1].trim().endsWith("}")) {
        appendToLastLine(";");
        continue;
      }

      buffer += char;
      pushBuffer();
      continue;
    }

    if (char === "," && parenDepth === 0) {
      buffer += ", ";
      continue;
    }

    buffer += char;
  }

  pushBuffer();

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}
