import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function sha256hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function randomId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1]!, "hex");
  const expected = Buffer.from(parts[2]!, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}
