import { formatJSON } from "./tools/jsonFormatter.js";
import { formatLog } from "./tools/logFormatter.js";
import { refactorNestedCode } from "./tools/nestRefactor.js";
import { formatStackTrace } from "./tools/stackTraceFormatter.js";
import { beautifyMinified } from "./tools/minifyBeautifier.js";
import { formatDiff } from "./tools/diffViewer.js";
import { formatText } from "./tools/textFormatter.js";
import { detectSecrets } from "./tools/secretDetector.js";
import { decodeJWT } from "./tools/jwtDecoder.js";
import { testRegex } from "./tools/regexTester.js";
import { compareEnv } from "./tools/envCompare.js";
import { generateJsonSchema } from "./tools/jsonSchemaGenerator.js";

export function runTool(type, input, options = {}) {
  switch (type) {
    case "json":
      return formatJSON(input, options.json || {});
    case "log":
      return formatLog(input, options.log || {});
    case "code":
      return refactorNestedCode(input, options.code || {});
    case "stack":
      return formatStackTrace(input, options.stack || {});
    case "minify":
      return beautifyMinified(input, options.minify || {});
    case "diff":
      return formatDiff(input);
    case "text":
      return formatText(input, options.text || {});
    case "secret":
      return detectSecrets(input, options.secret || {});
    case "jwt":
      return decodeJWT(input, options.jwt || {});
    case "regex":
      return testRegex(input, options.regex || {});
    case "env":
      return compareEnv(input, options.env?.right || "", options.env || {});
    case "schema":
      return generateJsonSchema(input, options.schema || {});
    case "empty":
      return "";
    default:
      return formatText(input);
  }
}
