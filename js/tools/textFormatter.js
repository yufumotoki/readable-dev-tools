function countWords(text) {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

export function formatText(input, options = {}) {
  if (!input) return "";

  let lines = input
    .replace(/\t/g, "  ")
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+$/g, ""));

  if (options.dedupe) {
    const seen = new Set();
    lines = lines.filter((line) => {
      const key = line.trim();
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (options.sort) {
    lines = [...lines].sort((a, b) => a.localeCompare(b));
  }

  const collapsed = [];
  let blank = false;
  for (const line of lines) {
    if (!line.trim()) {
      if (!blank) collapsed.push("");
      blank = true;
    } else {
      collapsed.push(line);
      blank = false;
    }
  }

  const cleaned = collapsed.join("\n").trim();
  return [
    "[SUMMARY]",
    `Line count: ${cleaned ? cleaned.split(/\r?\n/).length : 0}`,
    `Character count: ${cleaned.length}`,
    `Word count: ${countWords(cleaned)}`,
    "",
    "[FORMATTED]",
    cleaned,
  ].join("\n");
}
