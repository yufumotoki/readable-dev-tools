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
      return formatJSON(input);
    case "log":
      return formatLog(input, options.log || {});
    case "code":
      return refactorNestedCode(input);
    case "stack":
      return formatStackTrace(input);
    case "minify":
      return beautifyMinified(input);
    case "diff":
      return formatDiff(input);
    case "text":
      return formatText(input);
    case "empty":
      return "";
    default:
      return formatText(input);
  }
}
