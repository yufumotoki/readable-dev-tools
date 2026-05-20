function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function testRegex(input, options = {}) {
  const pattern = options.pattern || "";
  const flags = options.flags || "g";
  const replacement = options.replacement ?? "";
  const text = String(input || "");

  if (!pattern) {
    return "[SUMMARY]\nStatus: Missing regex pattern\nMatch count: 0\n\n[WARNING]\nEnter a regular expression pattern to test.";
  }

  if (text.length > 200000) {
    return "[SUMMARY]\nStatus: Input too large\nMatch count: 0\n\n[WARNING]\nLong input detected. Use a smaller sample for responsive regex testing.";
  }

  try {
    const uniqueFlags = [...new Set(String(flags || "").split(""))].filter((flag) => "gimsuy".includes(flag)).join("");
    const regex = new RegExp(pattern, uniqueFlags.includes("g") ? uniqueFlags : `${uniqueFlags}g`);
    const matches = [];
    let match = regex.exec(text);
    while (match && matches.length < 1000) {
      matches.push({
        index: match.index,
        value: match[0],
        groups: match.slice(1),
      });
      if (match[0] === "") regex.lastIndex += 1;
      match = regex.exec(text);
    }

    const highlighted = matches.reduceRight((acc, item) => {
      return `${acc.slice(0, item.index)}[[MATCH:${item.value}]]${acc.slice(item.index + item.value.length)}`;
    }, text);
    const replaceRegex = new RegExp(pattern, uniqueFlags);
    const replaced = replacement ? text.replace(replaceRegex, replacement) : "";

    return [
      "[SUMMARY]",
      "Status: OK",
      `Pattern: /${pattern}/${uniqueFlags}`,
      `Match count: ${matches.length}`,
      "",
      "[MATCHES]",
      matches.map((item, index) => [
        `#${index + 1} index=${item.index} value=${item.value || "(empty)"}`,
        `Capture groups: ${item.groups.map((group, groupIndex) => `$${groupIndex + 1}=${group ?? "(undefined)"}`).join(", ") || "none"}`,
      ].join("\n")).join("\n\n") || "No matches.",
      "",
      "[HIGHLIGHTED]",
      highlighted || "(empty)",
      "",
      "[REPLACE PREVIEW]",
      replacement ? replaced : "No replacement text provided.",
    ].join("\n");
  } catch (error) {
    return [
      "[SUMMARY]",
      "Status: Regex error",
      `Error: ${error.message}`,
      "",
      "[WARNING]",
      `Invalid regular expression. Escaped pattern preview: ${escapeRegex(pattern)}`,
    ].join("\n");
  }
}
