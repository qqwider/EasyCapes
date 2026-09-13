import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { hashPassword, generateToken, verifyPassword } from "../lib/crypto.js";
import { ApiError } from "../lib/errors.js";
import type { UserRow } from "../db.js";

export const NICK_RE = /^[A-Za-z0-9_]{3,16}$/;

export function sha256Token(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function publicUser(row: UserRow, hasCape: boolean) {
  return {
    mcName: row.mc_name,
    uuid: row.uuid,
    authType: row.verified ? ("premium" as const) : ("offline" as const),
    role: row.role,
    hasCape,
  };
}

export function issueToken(app: FastifyInstance, userId: string): string {
  const token = generateToken();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + app.config.tokenTtlDays * 86400_000).toISOString();
  app.db
    .prepare(
      "INSERT INTO tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(randomId("t"), userId, sha256Token(token), expiresAt, now);
  return token;
}

function randomId(prefix: string): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

const registerSchema = z.object({
  mcName: z.string().regex(NICK_RE, "Ник должен быть 3-16 символов: A-Z a-z 0-9 _"),
  password: z.string().min(8, "Пароль минимум 8 символов").max(128),
  email: z.string().email().max(128).optional(),
});

const loginSchema = z.object({
  mcName: z.string().max(16),
  password: z.string().min(1).max(128),
});

export function authRoutes(app: FastifyInstance): void {
  app.post("/auth/register", async (req) => {
    const body = registerSchema.parse(req.body);
    const nameLower = body.mcName.toLowerCase();
    const exists = app.db.prepare("SELECT id FROM users WHERE name_lower = ?").get(nameLower);
    if (exists) {
      throw ApiError.conflict("NAME_TAKEN", "Ник уже занят");
    }
    const now = new Date().toISOString();
    const id = randomId("u");
    app.db
      .prepare(
        "INSERT INTO users (id, mc_name, name_lower, password_hash, email, role, verified, created_at) VALUES (?, ?, ?, ?, ?, 'user', 0, ?)",
      )
      .run(id, body.mcName, nameLower, hashPassword(body.password), body.email ?? null, now);
    const token = issueToken(app, id);
    const row = app.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow;
    return { ok: true, token, user: publicUser(row, false) };
  });

  app.post("/auth/login", async (req) => {
    const body = loginSchema.parse(req.body);
    const row = app.db
      .prepare("SELECT * FROM users WHERE name_lower = ?")
      .get(body.mcName.toLowerCase()) as UserRow | undefined;
    if (!row?.password_hash || !verifyPassword(body.password, row.password_hash)) {
      throw ApiError.unauthorized("Неверный ник или пароль");
    }
    const token = issueToken(app, row.id);
    const hasCape = !!app.db.prepare("SELECT id FROM capes WHERE name_lower = ?").get(row.name_lower);
    return { ok: true, token, user: publicUser(row, hasCape) };
  });
}
