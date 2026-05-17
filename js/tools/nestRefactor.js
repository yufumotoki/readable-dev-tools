function normalizeCode(input) {
  let output = "";
  let quote = "";
  let escaped = false;
  let parenDepth = 0;

  for (const char of input.trim()) {
    if (quote) {
      output += char;

      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }

      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      output += char;
      continue;
    }

    if (char === "{") {
      output = output.trimEnd();
      output += " {\n";
      continue;
    }

    if (char === "}") {
      output = output.trimEnd();
      output += "\n}\n";
      continue;
    }

    if (char === "(") {
      parenDepth += 1;
      output += char;
      continue;
    }

    if (char === ")") {
      parenDepth = Math.max(parenDepth - 1, 0);
      output += char;
      continue;
    }

    if (char === ";" && parenDepth === 0) {
      output = output.trimEnd();
      output += ";\n";
      continue;
    }

    output += char;
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function createBlock(header) {
  return {
    type: "block",
    header,
    children: [],
  };
}

function parseCode(input) {
  const root = createBlock("");
  const stack = [root];
  const lines = normalizeCode(input);

  for (const line of lines) {
    const current = stack[stack.length - 1];

    if (line === "}") {
      if (stack.length > 1) {
        stack.pop();
      }
      continue;
    }

    if (/^}\s*else\b/.test(line)) {
      if (stack.length > 1) {
        stack.pop();
      }
    }

    if (line.endsWith("{")) {
      const block = createBlock(line.slice(0, -1).trim());
      current.children.push(block);
      stack.push(block);
      continue;
    }

    current.children.push({
      type: "line",
      text: line,
    });
  }

  return root;
}

function isIfBlock(node) {
  return Boolean(node) && node.type === "block" && /^if\s*\(.+\)$/.test(node.header);
}

function isElseBlock(node) {
  return Boolean(node) && node.type === "block" && node.header === "else";
}

function isElseLikeBlock(node) {
  return Boolean(node) && node.type === "block" && /^else\b/.test(node.header);
}

function isLoopBlock(node) {
  return Boolean(node) && node.type === "block" && /^(for|while)\s*\(|^do$|^for\s+await\s*\(/.test(node.header);
}

function isTryLikeBlock(node) {
  return Boolean(node) && node.type === "block" && /^(try|catch|finally)\b/.test(node.header);
}

function getIfCondition(header) {
  const match = header.match(/^if\s*\((.*)\)$/);
  return match ? match[1].trim() : "";
}

function guardCondition(condition) {
  const trimmed = condition.trim();

  if (trimmed.startsWith("!")) {
    return trimmed.slice(1).trim();
  }

  if (/^[a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)*$/.test(trimmed)) {
    return `!${trimmed}`;
  }

  return `!(${trimmed})`;
}

function containsReturn(children) {
  return children.some((child) => {
    if (child.type === "line") {
      return /^return\b/.test(child.text);
    }

    return containsReturn(child.children);
  });
}

function isReturnLine(node) {
  return Boolean(node) && node.type === "line" && /^return\b/.test(node.text.trim());
}

function flattenNestedIf(node) {
  if (!isIfBlock(node)) {
    return null;
  }

  const conditions = [getIfCondition(node.header)];
  let cursor = node;

  while (
    cursor.children.length === 1 &&
    isIfBlock(cursor.children[0]) &&
    !cursor.children.some(isElseBlock)
  ) {
    cursor = cursor.children[0];
    conditions.push(getIfCondition(cursor.header));
  }

  if (conditions.length < 2 || cursor.children.length === 0 || cursor.children.some(isElseBlock)) {
    return null;
  }

  return {
    conditions,
    body: cursor.children,
  };
}

function removeElseAfterReturn(children) {
  const nextChildren = [];

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    const next = children[index + 1];

    if (isIfBlock(child) && isElseBlock(next) && containsReturn(child.children)) {
      nextChildren.push(child, ...next.children);
      index += 1;
      continue;
    }

    nextChildren.push(child);
  }

  return nextChildren;
}

function transformChildren(children, context = {}) {
  const transformed = children.map((child) => {
    if (child.type === "block") {
      const childContext = {
        inLoop: context.inLoop || isLoopBlock(child),
        inTryLike: context.inTryLike || isTryLikeBlock(child),
      };

      return {
        ...child,
        children: transformChildren(child.children, childContext),
      };
    }

    return child;
  });

  const withoutReturnElse = removeElseAfterReturn(transformed);
  const result = [];

  for (let index = 0; index < withoutReturnElse.length; index += 1) {
    const child = withoutReturnElse[index];
    const next = withoutReturnElse[index + 1];
    const hasFollowingWork = index < withoutReturnElse.length - 1;
    const flattened = !isElseLikeBlock(next) && !context.inTryLike ? flattenNestedIf(child) : null;

    if (flattened) {
      const fallbackReturn = containsReturn(flattened.body) && isReturnLine(next) ? next.text : "";
      const canSafelyGuard = fallbackReturn || !hasFollowingWork;

      if (!canSafelyGuard) {
        result.push(child);
        continue;
      }

      const guardKeyword = fallbackReturn || (context.inLoop ? "continue;" : "return;");
      const guards = flattened.conditions.map((condition) => ({
        type: "line",
        text: `if (${guardCondition(condition)}) ${guardKeyword}`,
      }));

      result.push(...guards, ...transformChildren(flattened.body, context));

      if (fallbackReturn) {
        index += 1;
      }

      continue;
    }

    result.push(child);
  }

  return result;
}

function formatLine(line) {
  const literals = [];
  const placeholderPrefix = "__RDT_LITERAL_";
  const protectedLine = line.replace(/(["'`])(?:\\.|(?!\1)[\s\S])*\1/g, (literal) => {
    const token = `${placeholderPrefix}${literals.length}__`;
    literals.push(literal);
    return token;
  });

  const formatted = protectedLine
    .trim()
    .replace(/\b(if|for|while|switch|catch)\s*\(/g, "$1 (")
    .replace(/\bfunction\s+([a-zA-Z_$][\w$]*)\s*\(/g, "function $1(")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*(===|!==|==|!=|<=|>=)\s*/g, " $1 ")
    .replace(/([^=!<>])=([^=>])/g, "$1 = $2")
    .replace(/\s*<\s*/g, " < ")
    .replace(/\s*>\s*/g, " > ")
    .replace(/\s*=\s*>\s*/g, " => ")
    .replace(/;\s*/g, "; ")
    .replace(/\s+/g, " ")
    .replace(/\s+;/g, ";")
    .trim();

  return formatted.replace(new RegExp(`${placeholderPrefix}(\\d+)__`, "g"), (match, index) => {
    return literals[Number(index)] || match;
  });
}

function simplifyBooleanReturns(lines) {
  return lines.replace(
    /if \(([^{}\n]+)\) \{\n\s*return true;\n\s*\}\n\s*return false;/g,
    "return Boolean($1);"
  ).replace(
    /if \(([^{}\n]+)\) \{\n\s*return false;\n\s*\}\n\s*return true;/g,
    "return !($1);"
  );
}

function formatTree(node, depth = 0) {
  const indent = "  ".repeat(depth);
  const lines = [];

  for (const child of node.children) {
    if (child.type === "line") {
      lines.push(`${indent}${formatLine(child.text)}`);
      continue;
    }

    lines.push(`${indent}${formatLine(child.header)} {`);
    lines.push(...formatTree(child, depth + 1));
    lines.push(`${indent}}`);
  }

  return lines;
}

export function refactorNestedCode(input) {
  const original = input.trim();

  if (!original) {
    return "";
  }

  const tree = parseCode(original);
  tree.children = transformChildren(tree.children);
  const body = simplifyBooleanReturns(formatTree(tree).join("\n"));
  const formattedOriginal = formatTree(parseCode(original)).join("\n");
  const reasons = [];

  if (body.includes("return Boolean(") || body.includes("return !(")) {
    reasons.push("- Simplified boolean return branches.");
  }

  if (/if \(!.+\) (return|continue)/.test(body)) {
    reasons.push("- Replaced safe nested conditions with guard clauses.");
  }

  if (!body.includes("else {") && formattedOriginal.includes("else {")) {
    reasons.push("- Removed else after a branch that returns.");
  }

  if (reasons.length === 0) {
    reasons.push("- Formatted code without applying risky behavior-changing refactors.");
  }

  const diff = createSimpleDiff(formattedOriginal, body);

  return [
    "// Refactored by Readable Dev Tools",
    "// Rules: preserve behavior, prefer early exits, reduce nesting, keep names and side effects unchanged.",
    "",
    "[REASONS]",
    ...reasons,
    "",
    "[BEFORE / AFTER DIFF]",
    diff,
    "",
    "[REFACTORED]",
    body,
  ].join("\n");
}

function createSimpleDiff(before, after) {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const max = Math.max(beforeLines.length, afterLines.length);
  const rows = [];

  for (let index = 0; index < max; index += 1) {
    const beforeLine = beforeLines[index];
    const afterLine = afterLines[index];

    if (beforeLine === afterLine) {
      rows.push(`  ${beforeLine || ""}`);
    } else {
      if (beforeLine !== undefined) {
        rows.push(`- ${beforeLine}`);
      }

      if (afterLine !== undefined) {
        rows.push(`+ ${afterLine}`);
      }
    }
  }

  return rows.join("\n");
}
