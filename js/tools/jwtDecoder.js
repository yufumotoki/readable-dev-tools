function base64UrlDecode(part) {
  const normalized = String(part || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function parseJsonPart(part) {
  return JSON.parse(base64UrlDecode(part));
}

function formatDate(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "not present";
  return new Date(seconds * 1000).toISOString();
}

export function decodeJWT(input) {
  const token = String(input || "").trim();
  if (!token) {
    return "[SUMMARY]\nStatus: Empty input\n\n[WARNING]\nPaste a JWT to decode it locally.";
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return "[SUMMARY]\nStatus: Invalid JWT format\nParts: " + parts.length + "\n\n[WARNING]\nA JWT should have header.payload.signature.";
  }

  try {
    const header = parseJsonPart(parts[0]);
    const payload = parseJsonPart(parts[1]);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expired = typeof payload.exp === "number" ? payload.exp < nowSeconds : false;
    const claimKeys = Object.keys(payload);

    return [
      "[SUMMARY]",
      "Status: Decoded",
      `Algorithm: ${header.alg || "unknown"}`,
      `Type: ${header.typ || "unknown"}`,
      `Expired: ${typeof payload.exp === "number" ? String(expired) : "exp not present"}`,
      `Issued at: ${formatDate(payload.iat)}`,
      `Not before: ${formatDate(payload.nbf)}`,
      `Expires: ${formatDate(payload.exp)}`,
      `Claims: ${claimKeys.join(", ") || "none"}`,
      "",
      "[HEADER]",
      JSON.stringify(header, null, 2),
      "",
      "[PAYLOAD]",
      JSON.stringify(payload, null, 2),
      "",
      "[WARNING]",
      "This tool decodes JWT locally but does not verify the signature.",
    ].join("\n");
  } catch (error) {
    return [
      "[SUMMARY]",
      "Status: Invalid JWT",
      `Error: ${error.message}`,
      "",
      "[WARNING]",
      "Could not decode JWT header or payload. Check base64url encoding and JSON syntax.",
    ].join("\n");
  }
}
