function getErrorContext(input, message) {
  const positionMatch = message.match(/position (\d+)/i);

  if (!positionMatch) {
    return "\nLocation: unavailable\nNear: " + input.slice(0, 80).replace(/\r?\n/g, "\\n");
  }

  const position = Number(positionMatch[1]);
  const before = input.slice(0, position);
  const line = before.split(/\r?\n/).length;
  const column = before.split(/\r?\n/).pop().length + 1;
  const contextStart = Math.max(position - 35, 0);
  const contextEnd = Math.min(position + 35, input.length);
  const snippet = input.slice(contextStart, contextEnd).replace(/\r?\n/g, "\\n");

  return `\nLocation: line ${line}, column ${column}\nNear: ${snippet}`;
}

function parsePossiblyEncodedJSON(input) {
  const parsed = JSON.parse(input);

  if (typeof parsed === "string") {
    const nested = parsed.trim();

    if (
      (nested.startsWith("{") && nested.endsWith("}")) ||
      (nested.startsWith("[") && nested.endsWith("]"))
    ) {
      return JSON.parse(nested);
    }
  }

  return parsed;
}

export function formatJSON(input) {
  const text = input.trim();

  if (!text) {
    return "";
  }

  try {
    const parsed = parsePossiblyEncodedJSON(text);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    return `Invalid JSON: ${error.message}${getErrorContext(text, error.message)}`;
  }
}
