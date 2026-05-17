export function detectType(input) {
  const text = input.trim();

  if (!text) {
    return "empty";
  }

  try {
    JSON.parse(text);
    return "json";
  } catch (error) {
    // Continue with heuristic detection.
  }

  if (
    text.includes("at ") ||
    text.includes("Error:") ||
    text.includes(".js:") ||
    text.includes(".ts:")
  ) {
    return "stack";
  }

  const diffLineCount = input
    .split(/\r?\n/)
    .filter((line) => /^[+-]/.test(line)).length;

  if (diffLineCount >= 2) {
    return "diff";
  }

  if (
    text.includes("function") ||
    text.includes("if (") ||
    text.includes("if(") ||
    text.includes("for (") ||
    text.includes("for(") ||
    text.includes("const ") ||
    text.includes("let ") ||
    text.includes("return ")
  ) {
    return "code";
  }

  if (
    /ERROR|WARN|INFO|DEBUG/.test(text) ||
    /\d{4}-\d{2}-\d{2}/.test(text) ||
    /\d{2}:\d{2}:\d{2}/.test(text)
  ) {
    return "log";
  }

  return "text";
}
