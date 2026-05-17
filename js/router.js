import { formatJSON } from "./tools/jsonFormatter.js";
import { formatLog } from "./tools/logFormatter.js";
import { refactorNestedCode } from "./tools/nestRefactor.js";
import { formatStackTrace } from "./tools/stackTraceFormatter.js";
import { beautifyMinified } from "./tools/minifyBeautifier.js";
import { formatDiff } from "./tools/diffViewer.js";
import { formatText } from "./tools/textFormatter.js";

export function runTool(type, input, options = {}) {
  switch (type) {
    case "json":
      return formatJSON(input, options.json || {});
    case "log":
      return formatLog(input, options.log || {});
    case "code":
      return refactorNestedCode(input);
    case "stack":
      return formatStackTrace(input, options.stack || {});
    case "minify":
      return beautifyMinified(input, options.minify || {});
    case "diff":
      return formatDiff(input);
    case "text":
      return formatText(input, options.text || {});
    case "empty":
      return "";
    default:
      return formatText(input);
  }
}
