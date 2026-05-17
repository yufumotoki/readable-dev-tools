function stripAnsi(line) {
  return line.replace(/\u001b\[[0-9;]*m/g, "");
}

function isStackFrame(line) {
  return /^(at\s+|async\s|File ".+", line \d+)/.test(line);
}

function isErrorHeader(line) {
  return /^([\w.]*Error|[\w.]*Exception|Traceback)\b/.test(line);
}

function isVendorFrame(line) {
  return /node_modules|\/vendor\/|\\vendor\\|webpack\/bootstrap|internal\/modules|<anonymous>/.test(line);
}

export function formatStackTrace(input, options = {}) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => stripAnsi(line).trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "";
  }

  let frames = 0;
  let vendorFrames = 0;
  let errors = 0;

  const formatted = lines
    .map((line, index) => {
      if (isStackFrame(line)) {
        frames += 1;

        if (isVendorFrame(line)) {
          vendorFrames += 1;

          if (options.hideVendor !== false) {
            return null;
          }
        }

        return `  -> ${line}`;
      }

      if (isErrorHeader(line)) {
        errors += 1;
        return index === 0 ? line : `\n${line}`;
      }

      if (/^Caused by:/.test(line)) {
        return `\n${line}`;
      }

      return line;
    })
    .filter((line) => line !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  const summary = [
    "[SUMMARY]",
    `Errors: ${errors}`,
    `Frames: ${frames}`,
    `Vendor frames: ${vendorFrames}${options.hideVendor === false ? "" : " folded"}`,
    "",
  ].join("\n");

  return `${summary}${formatted}`;
}
