function getErrorContext(input, message) {
  const positionMatch = message.match(/position (\d+)/i);

  if (!positionMatch) {
    return "\nLocation: unavailable\nNear: " + input.slice(0, 120).replace(/\r?\n/g, "\\n");
  }

  const position = Number(positionMatch[1]);
  const before = input.slice(0, position);
  const line = before.split(/\r?\n/).length;
  const column = before.split(/\r?\n/).pop().length + 1;
  const contextStart = Math.max(position - 50, 0);
  const contextEnd = Math.min(position + 50, input.length);
  const snippet = input.slice(contextStart, contextEnd).replace(/\r?\n/g, "\\n");

  return `\nLocation: line ${line}, column ${column}\nNear: ${snippet}`;
}

function inferJsonIssue(input, message) {
  const hints = [];

  if (/,\s*[}\]]/.test(input)) hints.push("trailing comma");
  if (/'[^']*'\s*:|:\s*'[^']*'/.test(input)) hints.push("single quote");
  if (/"\s*[\r\n]\s*"/.test(input) || /\d\s*[\r\n]\s*"/.test(input)) hints.push("missing comma");
  if ((input.match(/\{/g) || []).length !== (input.match(/\}/g) || []).length) hints.push("unclosed bracket");
  if ((input.match(/\[/g) || []).length !== (input.match(/\]/g) || []).length) hints.push("unclosed bracket");
  if (/Unexpected token|Unexpected non-whitespace|position/i.test(message)) hints.push("unexpected token");

  return [...new Set(hints)].join(", ") || "unknown parse error";
}

function parsePossiblyEncodedJSON(input) {
  const parsed = JSON.parse(input);

  if (typeof parsed === "string") {
    const nested = parsed.trim();

    if ((nested.startsWith("{") && nested.endsWith("}")) || (nested.startsWith("[") && nested.endsWith("]"))) {
      return JSON.parse(nested);
    }
  }

  return parsed;
}

function parseJSONOrLines(text) {
  try {
    return { value: parsePossiblyEncodedJSON(text), mode: "JSON" };
  } catch (error) {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    if (lines.length > 1) {
      const values = [];

      for (const line of lines) {
        values.push(parsePossiblyEncodedJSON(line));
      }

      return { value: values, mode: "JSON Lines" };
    }

    throw error;
  }
}

function typeOfJSON(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function describeValue(value) {
  const type = typeOfJSON(value);
  if (type === "array") return `array(${value.length})`;
  if (type === "object") return `object(${Object.keys(value).length})`;
  return type;
}

function pathForKey(path, key) {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;
}

function walkJSON(value, path = "$", depth = 0, rows = [], stats = { objects: 0, arrays: 0, keys: 0, maxDepth: 0 }) {
  const type = typeOfJSON(value);
  stats.maxDepth = Math.max(stats.maxDepth, depth);

  if (type === "array") {
    stats.arrays += 1;
    rows.push({ path, type, depth, value, label: `${path}: array(${value.length})` });
    value.forEach((item, index) => walkJSON(item, `${path}[${index}]`, depth + 1, rows, stats));
  } else if (type === "object") {
    const keys = Object.keys(value);
    stats.objects += 1;
    stats.keys += keys.length;
    rows.push({ path, type, depth, value, label: `${path}: object(${keys.length})` });
    keys.forEach((key) => walkJSON(value[key], pathForKey(path, key), depth + 1, rows, stats));
  } else {
    rows.push({ path, type, depth, value, label: `${path}: ${type} = ${JSON.stringify(value)}` });
  }

  return { rows, stats };
}

function tokenizeJSONPath(path) {
  const normalized = path.trim();
  if (!normalized || normalized === "$") return [];

  const tokens = [];
  const pattern = /\.([A-Za-z_$][\w$]*)|\[(\d+|".*?"|'.*?')\]/g;
  let match;

  while ((match = pattern.exec(normalized)) !== null) {
    if (match[1]) tokens.push(match[1]);
    else if (/^\d+$/.test(match[2])) tokens.push(Number(match[2]));
    else tokens.push(match[2].slice(1, -1));
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

function matchesSearch(row, keySearch, valueSearch) {
  const keyNeedle = keySearch.toLowerCase();
  const valueNeedle = valueSearch.toLowerCase();
  const keyHit = keyNeedle && row.path.toLowerCase().includes(keyNeedle);
  const valueHit = valueNeedle && JSON.stringify(row.value).toLowerCase().includes(valueNeedle);
  return keyHit || valueHit;
}

function createTree(rows, keySearch, valueSearch) {
  return rows.slice(0, 400).map((row) => {
    const marker = matchesSearch(row, keySearch, valueSearch) ? " <<MATCH>>" : "";
    const foldHint = row.type === "object" || row.type === "array" ? "[toggle]" : "        ";
    return `${"  ".repeat(row.depth)}${foldHint} ${row.label}${marker}`;
  }).join("\n");
}

export function analyzeJSON(input, options = {}) {
  const text = input.trim().replace(/^\uFEFF/, "");
  if (!text) return { ok: true, output: "", formatted: "", summary: "", tree: "", warning: "", selectedPath: "", selectedValue: "" };

  const keySearch = (options.keySearch || options.search || "").trim();
  const valueSearch = (options.valueSearch || "").trim();
  const path = (options.path || "").trim();

  try {
    const parsed = parseJSONOrLines(text);
    const formatted = JSON.stringify(parsed.value, null, 2);
    const { rows, stats } = walkJSON(parsed.value);
    const matches = rows.filter((row) => matchesSearch(row, keySearch, valueSearch));
    const selected = path ? getByPath(parsed.value, path) : { found: false, value: undefined };
    const selectedValue = path ? (selected.found ? JSON.stringify(selected.value, null, 2) : "Path not found") : "";
    const summary = [
      "[SUMMARY]",
      `Mode: ${parsed.mode}`,
      `Root: ${describeValue(parsed.value)}`,
      `Objects: ${stats.objects}`,
      `Arrays: ${stats.arrays}`,
      `Keys: ${stats.keys}`,
      `Max depth: ${stats.maxDepth}`,
      `Tree nodes: ${rows.length}`,
      `Search matches: ${matches.length}`,
    ].join("\n");
    const detail = path ? ["", "[SELECTED NODE]", `Path: ${path}`, `Type: ${selected.found ? typeOfJSON(selected.value) : "not-found"}`, "Value:", selectedValue].join("\n") : "";
    const tree = createTree(rows, keySearch, valueSearch);
    const output = [summary, detail, "", "[JSON TREE VIEW]", tree, "", "[FORMATTED JSON]", formatted].filter(Boolean).join("\n");

    return { ok: true, output, formatted, summary, tree, warning: "", selectedPath: path, selectedValue };
  } catch (error) {
    const issue = inferJsonIssue(text, error.message);
    const output = [
      "[ERROR]",
      `Invalid JSON: ${error.message}`,
      `Cause guess: ${issue}`,
      getErrorContext(text, error.message),
      "",
      "[WARNING]",
      "Rule-based JSON error inference. Please review the source around the reported location.",
    ].join("\n");
    return { ok: false, output, formatted: "", summary: "", tree: "", warning: `Cause guess: ${issue}`, selectedPath: "", selectedValue: "" };
  }
}

export function formatJSON(input, options = {}) {
  return analyzeJSON(input, options).output;
}
