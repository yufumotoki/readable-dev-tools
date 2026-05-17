function hasDiffPrefix(line) {
  return /^\[(ADD|DEL|CHUNK|FILE|META|SUMMARY)\]\s/.test(line);
}

function summarizeDiff(lines) {
  const added = lines.filter((line) => line.startsWith("+") && !line.startsWith("+++")).length;
  const deleted = lines.filter((line) => line.startsWith("-") && !line.startsWith("---")).length;
  const chunks = lines.filter((line) => line.startsWith("@@")).length;

  if (added + deleted + chunks === 0) {
    return "";
  }

  return `[SUMMARY] +${added} -${deleted} chunks:${chunks}`;
}

function classifyDiffLine(line) {
  if (hasDiffPrefix(line)) {
    return line;
  }

  if (/^(diff --git|index\s|new file mode|deleted file mode|rename from|rename to|similarity index|dissimilarity index|Binary files|\\ No newline)/.test(line)) {
    return `[META] ${line}`;
  }

  if (/^(\+\+\+|---)\s/.test(line)) {
    return `[FILE] ${line}`;
  }

  if (line.startsWith("@@")) {
    return `[CHUNK] ${line}`;
  }

  if (line.startsWith("+")) {
    return `[ADD] ${line}`;
  }

  if (line.startsWith("-")) {
    return `[DEL] ${line}`;
  }

  return `      ${line}`;
}

export function formatDiff(input) {
  const lines = input.split(/\r?\n/);
  const summary = summarizeDiff(lines);
  const formatted = lines.map(classifyDiffLine).join("\n");

  return summary ? `${summary}\n${formatted}` : formatted;
}
