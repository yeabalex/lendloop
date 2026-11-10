/**
 * Cryptographic HMAC-SHA256 utility for securing webhooks between Convex and n8n.
 * Uses the Web Crypto API (`crypto.subtle`), which runs natively in Convex runtime, Node, and modern browsers.
 *
 * Payload format: `${timestamp}.${rawBody}`
 * Signature header: `X-LendLoop-Signature: t=${timestamp},v1=${hexDigest}`
 */

const encoder = new TextEncoder();

/**
 * Import a raw secret string as an HMAC-SHA256 CryptoKey.
 */
async function getCryptoKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Converts an ArrayBuffer to a lowercase hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Timing-safe string comparison to prevent timing attacks on HMAC verification.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Signs a payload string with a timestamp using HMAC-SHA256.
 * Returns the hex signature.
 */
export async function signPayload(
  secret: string,
  timestamp: number,
  body: string
): Promise<string> {
  const key = await getCryptoKey(secret);
  const data = encoder.encode(`${timestamp}.${body}`);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);
  return bufferToHex(signatureBuffer);
}

/**
 * Formats the full signature header value: `t=<timestamp>,v1=<hexDigest>`.
 */
export async function createSignatureHeader(
  secret: string,
  timestamp: number,
  body: string
): Promise<string> {
  const hex = await signPayload(secret, timestamp, body);
  return `t=${timestamp},v1=${hex}`;
}

/**
 * Parses a signature header formatted as `t=<timestamp>,v1=<hexDigest>`.
 */
export function parseSignatureHeader(
  header: string | null
): { timestamp: number; signature: string } | null {
  if (!header) return null;

  const parts = header.split(",");
  let timestamp: number | null = null;
  let signature: string | null = null;

  for (const part of parts) {
    const [key, value] = part.trim().split("=");
    if (key === "t") {
      timestamp = parseInt(value, 10);
    } else if (key === "v1") {
      signature = value;
    }
  }

  if (timestamp === null || !signature || isNaN(timestamp)) {
    return null;
  }

  return { timestamp, signature };
}

/**
 * Verifies an incoming webhook's HMAC signature.
 * Rejects requests older than `toleranceMs` (default 5 minutes) to protect against replay attacks.
 */
export async function verifySignature(
  secret: string,
  signatureHeader: string | null,
  body: string,
  toleranceMs = 5 * 60 * 1000 // 5 minutes
): Promise<{ valid: boolean; reason?: string }> {
  if (!secret) {
    return { valid: false, reason: "Webhook secret not configured" };
  }

  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) {
    return { valid: false, reason: "Invalid or missing X-LendLoop-Signature header format" };
  }

  const { timestamp, signature } = parsed;
  const now = Date.now();

  // Replay protection: check clock drift
  if (Math.abs(now - timestamp) > toleranceMs) {
    return { valid: false, reason: "Signature timestamp expired or clock skew exceeded tolerance" };
  }

  // Compute expected signature
  const expectedHex = await signPayload(secret, timestamp, body);

  if (!timingSafeEqual(expectedHex, signature)) {
    return { valid: false, reason: "Signature verification failed" };
  }

  return { valid: true };
}

