function isStructuredLine(line) {
  return /^(\s*[-*]|\s*\d+\.|\s*[A-Za-z0-9_-]+:|\s*#|\s*\|)/.test(line);
}

function formatPlainParagraph(paragraph) {
  const lines = paragraph.split("\n");
  const isStructured = lines.some(isStructuredLine);

  if (isStructured || lines.length <= 1) {
    return paragraph;
  }

  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
}

function splitMarkdownBlocks(text) {
  const blocks = [];
  const lines = text.split("\n");
  let current = [];
  let inFence = false;

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      current.push(line);

      if (inFence) {
        blocks.push({ type: "raw", text: current.join("\n") });
        current = [];
      } else if (current.length > 1) {
        blocks.push({ type: "plain", text: current.slice(0, -1).join("\n") });
        current = [line];
      }

      inFence = !inFence;
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    blocks.push({ type: inFence ? "raw" : "plain", text: current.join("\n") });
  }

  return blocks;
}

export function formatText(input, options = {}) {
  let normalizedLines = input
    .trim()
    .replace(/\t/g, "  ")
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+$/g, "").replace(/[ \t]{3,}/g, "  "));

  if (options.dedupe) {
    const seen = new Set();
    normalizedLines = normalizedLines.filter((line) => {
      if (seen.has(line)) {
        return false;
      }

      seen.add(line);
      return true;
    });
  }

  if (options.sort) {
    normalizedLines = [...normalizedLines].sort((a, b) => a.localeCompare(b));
  }

  const normalized = normalizedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  let output = splitMarkdownBlocks(normalized)
    .map((block) => {
      if (block.type === "raw") {
        return options.markdown === false ? formatPlainParagraph(block.text) : block.text;
      }

      return block.text
        .split(/\n\n/)
        .map(formatPlainParagraph)
        .join("\n\n");
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return [
    "[SUMMARY]",
    `Lines: ${input.split(/\r?\n/).length} -> ${output.split(/\r?\n/).length}`,
    `Duplicate removal: ${options.dedupe ? "on" : "off"}`,
    `Sort: ${options.sort ? "on" : "off"}`,
    "",
    "[FORMATTED]",
    output,
  ].join("\n");
}
