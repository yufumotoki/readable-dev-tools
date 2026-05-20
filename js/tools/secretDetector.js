function maskValue(value) {
  const text = String(value || "");
  if (text.length <= 8) return "*".repeat(Math.max(text.length, 4));
  return `${text.slice(0, 4)}${"*".repeat(Math.min(text.length - 4, 24))}`;
}

function addFinding(findings, type, lineNumber, value, recommendation, risk = "High") {
  findings.push({
    risk,
    type,
    lineNumber,
    maskedValue: maskValue(value),
    recommendation,
  });
}

const patterns = [
  { type: "AWS Access Key", regex: /\bAKIA[0-9A-Z]{16}\b/g, recommendation: "Rotate the AWS key and remove it from code or logs." },
  { type: "GitHub Token", regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, recommendation: "Revoke the token in GitHub and create a scoped replacement." },
  { type: "Bearer Token", regex: /\bBearer\s+([A-Za-z0-9._~+/=-]{20,})/gi, recommendation: "Avoid pasting bearer tokens into shared logs; rotate if exposed." },
  { type: "JWT", regex: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, recommendation: "Check JWT expiry and rotate the signing secret if leaked." },
  { type: "API Key-like Value", regex: /\b(?:api[_-]?key|apikey)\s*[:=]\s*["']?([A-Za-z0-9._~+/=-]{12,})["']?/gi, recommendation: "Move API keys to a secret manager and rotate exposed values." },
  { type: "Password Assignment", regex: /\bpassword\s*[:=]\s*["']?([^"'\s]{4,})["']?/gi, recommendation: "Remove passwords from text and rotate exposed credentials." },
  { type: "Secret Assignment", regex: /\bsecret\s*[:=]\s*["']?([^"'\s]{6,})["']?/gi, recommendation: "Store secrets outside source control and rotate exposed values." },
  { type: "Token Assignment", regex: /\btoken\s*[:=]\s*["']?([^"'\s]{8,})["']?/gi, recommendation: "Use short-lived tokens and rotate exposed credentials." },
  { type: "Private Key", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, recommendation: "Remove the private key immediately and replace the key pair." },
  { type: "DATABASE_URL", regex: /\bDATABASE_URL\s*=\s*([^\s]+)/g, recommendation: "Mask database URLs and rotate database credentials if exposed." },
  { type: "JWT_SECRET", regex: /\bJWT_SECRET\s*=\s*([^\s]+)/g, recommendation: "Rotate JWT_SECRET and invalidate existing sessions if necessary." },
];

export function detectSecrets(input) {
  const lines = String(input || "").split(/\r?\n/);
  const findings = [];

  lines.forEach((line, index) => {
    patterns.forEach((pattern) => {
      pattern.regex.lastIndex = 0;
      let match = pattern.regex.exec(line);
      while (match) {
        addFinding(findings, pattern.type, index + 1, match[1] || match[0], pattern.recommendation);
        match = pattern.regex.exec(line);
      }
    });
  });

  const risk = findings.some((item) => item.risk === "High") ? "High" : findings.length ? "Medium" : "Low";
  const maskedLines = lines.map((line) => {
    let masked = line;
    patterns.forEach((pattern) => {
      pattern.regex.lastIndex = 0;
      masked = masked.replace(pattern.regex, (full, captured) => full.replace(captured || full, maskValue(captured || full)));
    });
    return masked;
  });

  const findingLines = findings.length
    ? findings.map((item) => [
      `Risk Level: ${item.risk}`,
      `Type: ${item.type}`,
      `Line Number: ${item.lineNumber}`,
      `Masked Value: ${item.maskedValue}`,
      `Recommendation: ${item.recommendation}`,
    ].join("\n")).join("\n\n")
    : "No obvious secrets detected.";

  return [
    "[SUMMARY]",
    `Risk Level: ${risk}`,
    `Findings: ${findings.length}`,
    `Scanned lines: ${lines.filter((line) => line.length > 0).length}`,
    "",
    "[FINDINGS]",
    findingLines,
    "",
    "[MASKED RESULT]",
    maskedLines.join("\n"),
    "",
    "[WARNING]",
    "Rule-based secret detection. Review manually and rotate any exposed credentials.",
  ].join("\n");
}

export { maskValue };
