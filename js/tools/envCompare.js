import { maskValue } from "./secretDetector.js";

function parseEnv(input) {
  const entries = new Map();
  const duplicates = [];
  const malformed = [];
  const lines = String(input || "").split(/\r?\n/);

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/);
    if (!match) {
      malformed.push({ line: index + 1, text: trimmed });
      return;
    }
    const key = match[1];
    const value = match[2].replace(/^['"]|['"]$/g, "");
    if (entries.has(key)) duplicates.push({ key, line: index + 1 });
    entries.set(key, { key, value, line: index + 1 });
  });

  return { entries, duplicates, malformed };
}

function isSensitiveKey(key) {
  return /(secret|password|token|key|credential|database_url|jwt)/i.test(key);
}

function displayValue(key, value, revealValues) {
  return isSensitiveKey(key) && !revealValues ? maskValue(value) : value;
}

export function compareEnv(leftInput, rightInput, options = {}) {
  const revealValues = Boolean(options.revealValues);
  const left = parseEnv(leftInput);
  const right = parseEnv(rightInput);
  const leftKeys = [...left.entries.keys()];
  const rightKeys = [...right.entries.keys()];
  const added = rightKeys.filter((key) => !left.entries.has(key));
  const missing = leftKeys.filter((key) => !right.entries.has(key));
  const changed = leftKeys.filter((key) => right.entries.has(key) && left.entries.get(key).value !== right.entries.get(key).value);
  const emptyValues = [...left.entries.values(), ...right.entries.values()].filter((item) => item.value === "");
  const suspicious = [...new Set([...leftKeys, ...rightKeys].filter(isSensitiveKey))];

  const lines = [
    "[SUMMARY]",
    `Left keys: ${leftKeys.length}`,
    `Right keys: ${rightKeys.length}`,
    `Added keys: ${added.length}`,
    `Missing keys: ${missing.length}`,
    `Changed values: ${changed.length}`,
    `Duplicate keys: ${left.duplicates.length + right.duplicates.length}`,
    `Empty values: ${emptyValues.length}`,
    `Suspicious secret keys: ${suspicious.length}`,
    "",
    "[COMPARISON RESULT]",
    "Added keys:",
    added.map((key) => `+ ${key}=${displayValue(key, right.entries.get(key).value, revealValues)}`).join("\n") || "none",
    "",
    "Missing keys:",
    missing.map((key) => `- ${key}=${displayValue(key, left.entries.get(key).value, revealValues)}`).join("\n") || "none",
    "",
    "Changed values:",
    changed.map((key) => `~ ${key}: ${displayValue(key, left.entries.get(key).value, revealValues)} -> ${displayValue(key, right.entries.get(key).value, revealValues)}`).join("\n") || "none",
    "",
    "Duplicate keys:",
    [...left.duplicates.map((item) => `left ${item.key} line ${item.line}`), ...right.duplicates.map((item) => `right ${item.key} line ${item.line}`)].join("\n") || "none",
    "",
    "Malformed lines:",
    [...left.malformed.map((item) => `left line ${item.line}: ${item.text}`), ...right.malformed.map((item) => `right line ${item.line}: ${item.text}`)].join("\n") || "none",
    "",
    "[WARNING]",
    revealValues ? "Sensitive values are revealed by user choice." : "Sensitive-looking values are masked by default.",
  ];

  return lines.join("\n");
}
