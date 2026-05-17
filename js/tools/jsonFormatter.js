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

function describeValue(value) {
  if (Array.isArray(value)) {
    return `array(${value.length})`;
  }

  if (value && typeof value === "object") {
    return `object(${Object.keys(value).length})`;
  }

  return typeof value;
}

function collectKeys(value, path = "$", rows = []) {
  if (Array.isArray(value)) {
    rows.push(`${path}: array(${value.length})`);
    value.slice(0, 20).forEach((item, index) => collectKeys(item, `${path}[${index}]`, rows));
    return rows;
  }

  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    rows.push(`${path}: object(${keys.length})`);
    keys.slice(0, 80).forEach((key) => {
      const safeKey = /^[A-Za-z_$][\w$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`;
      const nextPath = `${path}${safeKey}`;
      const child = value[key];
      rows.push(`${nextPath}: ${describeValue(child)}`);

      if (child && typeof child === "object") {
        collectKeys(child, nextPath, rows);
      }
    });
  }

  return rows;
}

function summarizeJSON(value) {
  const keys = collectKeys(value);
  const rootType = describeValue(value);
  return [
    "[SUMMARY]",
    `Root: ${rootType}`,
    `Discovered paths: ${keys.length}`,
    "",
    "[KEYS]",
    ...keys.slice(0, 120),
    keys.length > 120 ? `... ${keys.length - 120} more paths` : "",
  ].filter(Boolean).join("\n");
}

function tokenizeJSONPath(path) {
  const normalized = path.trim();

  if (!normalized || normalized === "$") {
    return [];
  }

  const tokens = [];
  const pattern = /\.([A-Za-z_$][\w$]*)|\[(\d+|".*?"|'.*?')\]/g;
  let match;

  while ((match = pattern.exec(normalized)) !== null) {
    if (match[1]) {
      tokens.push(match[1]);
    } else if (/^\d+$/.test(match[2])) {
      tokens.push(Number(match[2]));
    } else {
      tokens.push(match[2].slice(1, -1));
    }
  }

  return tokens;
}

function getByPath(value, path) {
  const tokens = tokenizeJSONPath(path);
  let cursor = value;

  for (const token of tokens) {
    if (cursor == null || !(token in Object(cursor))) {
      return { found: false, value: undefined };
    }

    cursor = cursor[token];
  }

  return { found: true, value: cursor };
}

export function formatJSON(input, options = {}) {
  const text = input.trim().replace(/^\uFEFF/, "");

  if (!text) {
    return "";
  }

  try {
    const parsed = parsePossiblyEncodedJSON(text);
    const formatted = JSON.stringify(parsed, null, 2);
    const summary = summarizeJSON(parsed);
    const path = (options.path || "").trim();

    if (path) {
      const result = getByPath(parsed, path);
      const pathValue = result.found ? JSON.stringify(result.value, null, 2) : "Path not found";
      return `${summary}\n\n[JSON PATH: ${path}]\n${pathValue}\n\n[FORMATTED]\n${formatted}`;
    }

    return `${summary}\n\n[FORMATTED]\n${formatted}`;
  } catch (error) {
    return `Invalid JSON: ${error.message}${getErrorContext(text, error.message)}`;
  }
}
