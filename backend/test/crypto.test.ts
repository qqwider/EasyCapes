import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, generateToken, randomId } from "../src/lib/crypto.js";

describe("crypto", () => {
  it("хэширует и проверяет пароль", () => {
    const stored = hashPassword("password123");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("password123", stored)).toBe(true);
    expect(verifyPassword("wrong", stored)).toBe(false);
  });

  it("генерирует уникальные токены", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toHaveLength(64);
    expect(a).not.toBe(b);
  });

  it("генерирует id с префиксом", () => {
    expect(randomId("u")).toMatch(/^u_[0-9a-f]{16}$/);
  });
});
