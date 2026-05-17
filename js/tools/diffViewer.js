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

function normalizeLines(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function createDiffRows(beforeLines, afterLines) {
  const beforeLength = beforeLines.length;
  const afterLength = afterLines.length;

  if (beforeLength * afterLength > 90000) {
    return createLinearDiffRows(beforeLines, afterLines);
  }

  const table = Array.from({ length: beforeLength + 1 }, () => Array(afterLength + 1).fill(0));

  for (let beforeIndex = beforeLength - 1; beforeIndex >= 0; beforeIndex -= 1) {
    for (let afterIndex = afterLength - 1; afterIndex >= 0; afterIndex -= 1) {
      if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
        table[beforeIndex][afterIndex] = table[beforeIndex + 1][afterIndex + 1] + 1;
      } else {
        table[beforeIndex][afterIndex] = Math.max(
          table[beforeIndex + 1][afterIndex],
          table[beforeIndex][afterIndex + 1]
        );
      }
    }
  }

  const rows = [];
  let beforeIndex = 0;
  let afterIndex = 0;

  while (beforeIndex < beforeLength && afterIndex < afterLength) {
    if (beforeLines[beforeIndex] === afterLines[afterIndex]) {
      rows.push({ type: "same", text: beforeLines[beforeIndex] });
      beforeIndex += 1;
      afterIndex += 1;
    } else if (table[beforeIndex + 1][afterIndex] >= table[beforeIndex][afterIndex + 1]) {
      rows.push({ type: "del", text: beforeLines[beforeIndex] });
      beforeIndex += 1;
    } else {
      rows.push({ type: "add", text: afterLines[afterIndex] });
      afterIndex += 1;
    }
  }

  while (beforeIndex < beforeLength) {
    rows.push({ type: "del", text: beforeLines[beforeIndex] });
    beforeIndex += 1;
  }

  while (afterIndex < afterLength) {
    rows.push({ type: "add", text: afterLines[afterIndex] });
    afterIndex += 1;
  }

  return rows;
}

function createLinearDiffRows(beforeLines, afterLines) {
  const rows = [];
  const maxLength = Math.max(beforeLines.length, afterLines.length);

  for (let index = 0; index < maxLength; index += 1) {
    const beforeLine = beforeLines[index];
    const afterLine = afterLines[index];

    if (beforeLine === afterLine) {
      rows.push({ type: "same", text: beforeLine || "" });
    } else {
      if (beforeLine !== undefined) {
        rows.push({ type: "del", text: beforeLine });
      }

      if (afterLine !== undefined) {
        rows.push({ type: "add", text: afterLine });
      }
    }
  }

  return rows;
}

export function compareTextDiff(beforeInput, afterInput) {
  const before = normalizeLines(beforeInput);
  const after = normalizeLines(afterInput);

  if (!beforeInput && !afterInput) {
    return "";
  }

  const rows = createDiffRows(before, after);
  const added = rows.filter((row) => row.type === "add").length;
  const deleted = rows.filter((row) => row.type === "del").length;
  const unchanged = rows.filter((row) => row.type === "same").length;
  const output = rows.map((row) => {
    if (row.type === "add") {
      return `[ADD] +${row.text}`;
    }

    if (row.type === "del") {
      return `[DEL] -${row.text}`;
    }

    return `      ${row.text}`;
  });

  return [`[SUMMARY] +${added} -${deleted} unchanged:${unchanged}`, "[CHUNK] @@ compare before after @@", ...output].join("\n");
}
