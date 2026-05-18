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

export function createMergeBlocks(leftInput, rightInput) {
  const rows = createDiffRows(normalizeLines(leftInput), normalizeLines(rightInput));
  const blocks = [];
  let current = null;

  rows.forEach((row) => {
    if (row.type === "same") {
      if (current) {
        blocks.push(current);
        current = null;
      }
      blocks.push({ type: "same", left: [row.text], right: [row.text], resolved: true, choice: "same" });
      return;
    }

    if (!current) current = { type: "changed", left: [], right: [], resolved: false, choice: "unresolved" };
    if (row.type === "del") current.left.push(row.text);
    if (row.type === "add") current.right.push(row.text);
  });

  if (current) blocks.push(current);
  return blocks;
}

export function buildMergedResult(blocks, choices = {}) {
  const output = [];

  blocks.forEach((block, index) => {
    if (block.type === "same") {
      output.push(...block.left);
      return;
    }

    const choice = choices[index] || block.choice || "unresolved";
    if (choice === "left") output.push(...block.left);
    else if (choice === "right") output.push(...block.right);
    else if (choice === "both") output.push(...block.left, ...block.right);
    else {
      output.push("<<<<<<< YOUR VERSION", ...block.left, "=======", ...block.right, ">>>>>>> OTHER VERSION");
    }
  });

  return output.join("\n");
}

export function summarizeMergeBlocks(blocks, choices = {}) {
  let changedBlocks = 0;
  let unresolvedBlocks = 0;
  let resolvedBlocks = 0;
  let leftOnly = 0;
  let rightOnly = 0;
  let totalLines = 0;

  blocks.forEach((block, index) => {
    totalLines += Math.max(block.left.length, block.right.length);
    if (block.type === "same") return;
    changedBlocks += 1;
    if (block.left.length && !block.right.length) leftOnly += block.left.length;
    if (block.right.length && !block.left.length) rightOnly += block.right.length;
    const choice = choices[index] || block.choice;
    if (choice && choice !== "unresolved") resolvedBlocks += 1;
    else unresolvedBlocks += 1;
  });

  return { totalLines, changedBlocks, unresolvedBlocks, resolvedBlocks, leftOnly, rightOnly };
}

export function mergeTextDiff(leftInput, rightInput, choices = {}) {
  const blocks = createMergeBlocks(leftInput, rightInput);
  const summary = summarizeMergeBlocks(blocks, choices);
  const merged = buildMergedResult(blocks, choices);
  const blockText = blocks.map((block, index) => {
    if (block.type === "same") return `[BLOCK ${index}] SAME\n${block.left.join("\n")}`;
    return [
      `[BLOCK ${index}] CHANGED unresolved=${!(choices[index] && choices[index] !== "unresolved")}`,
      "[YOUR VERSION]",
      block.left.join("\n") || "(empty)",
      "[OTHER VERSION]",
      block.right.join("\n") || "(empty)",
      "Actions: Use Left | Use Right | Use Both | Reset Block",
    ].join("\n");
  }).join("\n\n");

  return [
    "[SUMMARY]",
    `Total lines: ${summary.totalLines}`,
    `Changed blocks: ${summary.changedBlocks}`,
    `Unresolved blocks: ${summary.unresolvedBlocks}`,
    `Resolved blocks: ${summary.resolvedBlocks}`,
    `Left only: ${summary.leftOnly}`,
    `Right only: ${summary.rightOnly}`,
    "",
    "[DIFF BLOCKS]",
    blockText,
    "",
    "[MERGED RESULT]",
    merged,
  ].join("\n");
}

function parseHunkHeader(line) {
  const match = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);

  if (!match) {
    return null;
  }

  return {
    oldStart: Number(match[1]),
    oldCount: Number(match[2] || "1"),
    newStart: Number(match[3]),
    newCount: Number(match[4] || "1"),
  };
}

function stripPatchPrefix(line) {
  if (/^(diff --git|index\s|---\s|\+\+\+\s|new file mode|deleted file mode|rename from|rename to|similarity index|dissimilarity index)/.test(line)) {
    return null;
  }

  if (line.startsWith("\\ No newline")) {
    return null;
  }

  return line;
}

export function applyUnifiedDiff(originalInput, patchInput) {
  if (!originalInput && !patchInput) {
    return "";
  }

  const patchText = patchInput.trim();

  if (!patchText) {
    return originalInput;
  }

  if (!/^@@\s+-\d+/m.test(patchText)) {
    const preview = compareTextDiff(originalInput, patchInput);

    return [
      "[MODE] Patch field did not contain unified diff hunks.",
      "[ACTION] Treated Patch as the desired final content.",
      "",
      "[DIFF PREVIEW]",
      preview,
      "",
      "[APPLIED RESULT]",
      patchInput,
    ].join("\n");
  }

  const original = normalizeLines(originalInput);
  const patch = normalizeLines(patchInput).map(stripPatchPrefix).filter((line) => line !== null);
  const output = [];
  let originalIndex = 0;
  let patchIndex = 0;
  let appliedHunks = 0;

  while (patchIndex < patch.length) {
    const header = parseHunkHeader(patch[patchIndex]);

    if (!header) {
      patchIndex += 1;
      continue;
    }

    const targetIndex = Math.max(header.oldStart - 1, 0);

    while (originalIndex < targetIndex) {
      output.push(original[originalIndex]);
      originalIndex += 1;
    }

    patchIndex += 1;

    while (patchIndex < patch.length && !parseHunkHeader(patch[patchIndex])) {
      const patchLine = patch[patchIndex];
      const marker = patchLine[0];
      const value = patchLine.slice(1);

      if (marker === " ") {
        if (original[originalIndex] !== value) {
          return [
            "Patch apply failed: context mismatch.",
            `Expected: ${value}`,
            `Actual: ${original[originalIndex] ?? ""}`,
            `Original line: ${originalIndex + 1}`,
          ].join("\n");
        }

        output.push(original[originalIndex]);
        originalIndex += 1;
      } else if (marker === "-") {
        if (original[originalIndex] !== value) {
          return [
            "Patch apply failed: delete mismatch.",
            `Expected to delete: ${value}`,
            `Actual: ${original[originalIndex] ?? ""}`,
            `Original line: ${originalIndex + 1}`,
          ].join("\n");
        }

        originalIndex += 1;
      } else if (marker === "+") {
        output.push(value);
      }

      patchIndex += 1;
    }

    appliedHunks += 1;
  }

  if (appliedHunks === 0) {
    return "Patch apply failed: no unified diff hunks found.";
  }

  while (originalIndex < original.length) {
    output.push(original[originalIndex]);
    originalIndex += 1;
  }

  return output.join("\n");
}
