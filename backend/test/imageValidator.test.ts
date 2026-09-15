import { describe, expect, it } from "vitest";
import {
  validatePng,
  checkCapeDimensions,
  isPrivateIp,
  assertSafeUrl,
} from "../src/services/imageValidator.js";
import { ApiError } from "../src/lib/errors.js";

function makePng(width: number, height: number): Buffer {
  const buf = Buffer.alloc(33);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  buf[24] = 8;
  buf[25] = 6;
  return buf;
}

describe("validatePng", () => {
  it("принимает корректный 64x32", () => {
    const img = validatePng(makePng(64, 32));
    expect(img.width).toBe(64);
    expect(img.height).toBe(32);
    expect(img.mime).toBe("image/png");
    expect(img.hash).toHaveLength(64);
  });

  it("принимает 4096x2048 (4K)", () => {
    expect(() => validatePng(makePng(4096, 2048))).not.toThrow();
  });

  it("отклоняет не-2:1", () => {
    expect(() => validatePng(makePng(64, 64))).toThrow(ApiError);
  });

  it("отклоняет некратную 64 ширину", () => {
    expect(() => validatePng(makePng(100, 50))).toThrow(/кратна 64/);
  });

  it("отклоняет больше 4K", () => {
    expect(() => validatePng(makePng(8192, 4096))).toThrow(ApiError);
  });

  it("отклоняет не-PNG", () => {
    expect(() => validatePng(Buffer.alloc(64, 1))).toThrow(ApiError);
  });
});

describe("checkCapeDimensions", () => {
  it("валидные размеры проходят", () => {
    expect(() => checkCapeDimensions(1024, 512, 4096, 2048)).not.toThrow();
  });
  it("ноль высоты отклоняется", () => {
    expect(() => checkCapeDimensions(64, 0, 4096, 2048)).toThrow(ApiError);
  });
});

describe("isPrivateIp", () => {
  it("приватные IPv4", () => {
    for (const ip of ["127.0.0.1", "10.0.0.1", "192.168.1.1", "172.16.0.1", "172.31.255.255", "169.254.1.1", "0.0.0.0", "10.255.255.255"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });

  it("публичные IPv4", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });

  it("приватные IPv6", () => {
    for (const ip of ["::1", "::", "fe80::1", "fc00::1", "fd12:3456::1"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });

  it("не IP — не приватный (домены проверяются через DNS)", () => {
    expect(isPrivateIp("example.com")).toBe(false);
  });
});

describe("assertSafeUrl", () => {
  it("отклоняет http", () => {
    expect(() => assertSafeUrl("http://example.com/a.png")).toThrow(/HTTPS/);
  });
  it("отклоняет localhost", () => {
    expect(() => assertSafeUrl("https://localhost/a.png")).toThrow(/Приватн/);
  });
  it("отклоняет приватные IP-литералы", () => {
    expect(() => assertSafeUrl("https://192.168.0.1/a.png")).toThrow(/Приватн/);
    expect(() => assertSafeUrl("https://[::1]/a.png")).toThrow(/Приватн/);
  });
  it("отклоняет мусор", () => {
    expect(() => assertSafeUrl("not a url")).toThrow(ApiError);
  });
  it("пропускает нормальный https", () => {
    expect(assertSafeUrl("https://example.com/a.png").hostname).toBe("example.com");
  });
});
