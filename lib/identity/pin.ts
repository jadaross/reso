import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/** There is one Admin PIN for the whole Group (ticket 04), stored only as a hash. */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(pin.normalize("NFKC"), salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [scheme, saltPart, keyPart] = stored.split("$");
  if (scheme !== "scrypt" || !saltPart || !keyPart) return false;

  const expected = Buffer.from(keyPart, "base64");
  if (expected.length !== KEY_LENGTH) return false;

  const actual = await derive(
    pin.normalize("NFKC"),
    Buffer.from(saltPart, "base64"),
    KEY_LENGTH,
  );
  return timingSafeEqual(actual, expected);
}
