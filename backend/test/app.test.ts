import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/config.js";
import { openDb } from "../src/db.js";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

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

const PNG = makePng(64, 32);

function stubFetchImage(mime = "image/png") {
  const png = makePng(64, 32);
  const body = mime === "image/png" ? png : Buffer.from("GIF89a-fake");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: {
        get: (k: string) =>
          k.toLowerCase() === "content-type" ? mime : k.toLowerCase() === "content-length" ? String(body.length) : null,
      },
      arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
    })),
  );
}

let app: FastifyInstance;

beforeEach(() => {
  vi.unstubAllGlobals();
  const cfg = loadConfig({ PORT: "9999", DB_PATH: ":memory:", EXTERNAL_URL: "http://test.local" });
  const db = openDb(cfg.dbPath);
  app = buildApp(cfg, db);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

async function register(name = "TestPlayer") {
  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { mcName: name, password: "password123" },
  });
  return res.json() as { token: string; user: { mcName: string } };
}

describe("auth", () => {
  it("регистрация + логин + me", async () => {
    const reg = await register();
    expect(reg.token).toHaveLength(64);
    expect(reg.user.mcName).toBe("TestPlayer");

    const dup = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { mcName: "testplayer", password: "password123" },
    });
    expect(dup.statusCode).toBe(409);

    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { mcName: "TestPlayer", password: "password123" },
    });
    expect(login.statusCode).toBe(200);

    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { mcName: "TestPlayer", password: "wrongpass" },
    });
    expect(bad.statusCode).toBe(401);

    const me = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: `Bearer ${reg.token}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.hasCape).toBe(false);
  });

  it("регистрация с невалидным ником — 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { mcName: "!!", password: "password123" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("capes", () => {
  it("полный цикл: установка, чтение, текстура, удаление", async () => {
    const { token } = await register();
    stubFetchImage();

    const set = await app.inject({
      method: "POST",
      url: "/api/v1/me/cape",
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "https://cdn.example.com/cape.png" },
    });
    expect(set.statusCode).toBe(200);
    const cape = set.json().cape;
    expect(cape.type).toBe("static");
    expect(cape.url).toMatch(/^http:\/\/test\.local\/api\/v1\/textures\/[0-9a-f]{64}\.png$/);
    expect(cape.meta.width).toBe(64);
    expect(cape.meta.height).toBe(32);

    const bulk = await app.inject({ method: "GET", url: "/api/v1/capes?names=TestPlayer,UnknownGuy" });
    expect(bulk.statusCode).toBe(200);
    const capes = bulk.json().capes;
    expect(capes.TestPlayer.hash).toBe(cape.hash);
    expect(capes.UnknownGuy).toBeNull();

    const hash = cape.hash as string;
    const tex = await app.inject({ method: "GET", url: `/api/v1/textures/${hash}.png` });
    expect(tex.statusCode).toBe(200);
    expect(tex.headers["content-type"]).toBe("image/png");
    expect(tex.headers["cache-control"]).toContain("immutable");
    expect(tex.body.length).toBe(PNG.length);

    const del = await app.inject({
      method: "DELETE",
      url: "/api/v1/me/cape",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(del.statusCode).toBe(200);
    const bulk2 = await app.inject({ method: "GET", url: "/api/v1/capes?names=TestPlayer" });
    expect(bulk2.json().capes.TestPlayer).toBeNull();
  });

  it("http-ссылка отклоняется", async () => {
    const { token } = await register();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/me/cape",
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "http://cdn.example.com/cape.png" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("INVALID_URL");
  });

  it("gif отклоняется с понятной ошибкой", async () => {
    const { token } = await register();
    stubFetchImage("image/gif");
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/me/cape",
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "https://cdn.example.com/cape.gif" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.message).toContain("GIF");
  });

  it("не-auth запросы — 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/me" });
    expect(res.statusCode).toBe(401);
  });

  it("галерея отдаёт плащ", async () => {
    const { token } = await register("GalleryGuy");
    stubFetchImage();
    await app.inject({
      method: "POST",
      url: "/api/v1/me/cape",
      headers: { authorization: `Bearer ${token}` },
      payload: { url: "https://cdn.example.com/cape.png" },
    });
    const res = await app.inject({ method: "GET", url: "/api/v1/gallery?limit=10" });
    expect(res.statusCode).toBe(200);
    const items = res.json().items;
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("GalleryGuy");
  });
});

describe("premium verify", () => {
  it("верифицирует через Mojang hasJoined", async () => {
    const uuid = "069a79f4-44e9-4726-a5be-fca90e38aaf5";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ id: uuid.replace(/-/g, ""), name: "Notch" }),
      })),
    );
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/premium/verify",
      payload: { name: "Notch", uuid, serverId: "abcd1234abcd1234abcd1234abcd1234" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.authType).toBe("premium");
  });

  it("провал верификации — 400", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 204, json: async () => ({}) })),
    );
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/premium/verify",
      payload: { name: "Notch", uuid: "069a79f4-44e9-4726-a5be-fca90e38aaf5", serverId: "abcd1234abcd1234abcd1234abcd1234" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VERIFY_FAILED");
  });
});
