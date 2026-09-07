/**
 * Signed, tamper-evident cookie values.
 *
 * Written against Web Crypto rather than `node:crypto` so the same code runs in
 * `proxy.ts` (which may be deployed to the edge) and in Server Actions.
 *
 * A token is `<payload>.<signature>`, where the payload is base64url-encoded JSON
 * and the signature is HMAC-SHA256 over the payload bytes. Verification uses
 * `crypto.subtle.verify`, which compares in constant time.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error(
      "SESSION_SECRET is not set. Generate one with `openssl rand -base64 48`.",
    );
  }
  return value;
}

let keyPromise: Promise<CryptoKey> | undefined;

function signingKey(): Promise<CryptoKey> {
  keyPromise ??= crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return keyPromise;
}

export async function sign(payload: object): Promise<string> {
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    encoder.encode(body),
  );
  return `${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** Returns the payload, or null if the token is malformed or the signature fails. */
export async function verify<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const body = token.slice(0, separator);
  const signature = base64UrlDecode(token.slice(separator + 1));
  if (!signature) return null;

  const ok = await crypto.subtle.verify(
    "HMAC",
    await signingKey(),
    signature as BufferSource,
    encoder.encode(body),
  );
  if (!ok) return null;

  const decoded = base64UrlDecode(body);
  if (!decoded) return null;

  try {
    return JSON.parse(decoder.decode(decoded)) as T;
  } catch {
    return null;
  }
}

/**
 * A Group Link secret: 16 characters, ~79 bits, drawn from an alphabet with no
 * lookalike characters (no 0/O, 1/l/I). Rejection sampling rather than modulo,
 * so every character is equally likely.
 */
export function generateGroupSecret(length = 16): string {
  const alphabet = "23456789abcdefghjkmnpqrstuvwxyz";
  const limit = 256 - (256 % alphabet.length);
  let out = "";
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    for (const byte of bytes) {
      if (byte >= limit) continue;
      out += alphabet[byte % alphabet.length];
      if (out.length === length) break;
    }
  }
  return out;
}
