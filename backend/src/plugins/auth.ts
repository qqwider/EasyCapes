import type { FastifyRequest } from "fastify";
import { sha256hex } from "../lib/crypto.js";
import { ApiError } from "../lib/errors.js";
import type { UserRow } from "../db.js";

export function requireAuth(req: FastifyRequest): UserRow {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw ApiError.unauthorized();
  }
  const tokenHash = sha256hex(header.slice(7).trim());
  const row = req.server.db
    .prepare(
      `SELECT u.* FROM tokens t JOIN users u ON u.id = t.user_id
       WHERE t.token_hash = ? AND t.expires_at > ?`,
    )
    .get(tokenHash, new Date().toISOString()) as UserRow | undefined;
  if (!row) {
    throw ApiError.unauthorized("Токен недействителен или истёк");
  }
  return row;
}

export function tokenHashFromRequest(req: FastifyRequest): string {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : req.ip;
  return sha256hex(token || req.ip);
}
