import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { NICK_RE, publicUser, issueToken } from "./auth.js";
import { ApiError } from "../lib/errors.js";
import { verifyMojangSession, normalizeUuid } from "../services/mojang.js";
import { capeJson, getCapeByName } from "../lib/capes.js";
import { randomId } from "../lib/crypto.js";

const verifySchema = z.object({
  name: z.string().regex(NICK_RE),
  uuid: z.string().uuid(),
  serverId: z.string().regex(/^[0-9a-f]{16,64}$/i),
});

export function premiumRoutes(app: FastifyInstance): void {
  app.post("/premium/verify", async (req) => {
    const body = verifySchema.parse(req.body);
    const nameLower = body.name.toLowerCase();
    const ok = await verifyMojangSession(body.name, body.uuid, body.serverId);
    if (!ok) {
      throw ApiError.badRequest("VERIFY_FAILED", "Не удалось верифицировать Mojang-сессию");
    }

    const now = new Date().toISOString();
    const existing = app.db.prepare("SELECT * FROM users WHERE name_lower = ?").get(nameLower) as
      | { id: string; uuid: string | null }
      | undefined;

    if (existing) {
      if (existing.uuid && existing.uuid.toLowerCase() !== body.uuid.toLowerCase()) {
        throw ApiError.conflict("UUID_CONFLICT", "Ник уже привязан к другому UUID");
      }
      app.db
        .prepare("UPDATE users SET verified = 1, uuid = COALESCE(uuid, ?) WHERE id = ?")
        .run(normalizeUuid(body.uuid), existing.id);
    } else {
      const uuidOwner = app.db
        .prepare("SELECT id FROM users WHERE uuid = ?")
        .get(normalizeUuid(body.uuid));
      if (uuidOwner) {
        throw ApiError.conflict("UUID_CONFLICT", "UUID уже привязан к другому нику");
      }
      app.db
        .prepare(
          "INSERT INTO users (id, mc_name, name_lower, uuid, role, verified, created_at) VALUES (?, ?, ?, ?, 'user', 1, ?)",
        )
        .run(randomId("u"), body.name, nameLower, normalizeUuid(body.uuid), now);
    }

    const row = app.db.prepare("SELECT * FROM users WHERE name_lower = ?").get(nameLower) as
      | { id: string; mc_name: string; name_lower: string; uuid: string | null; role: string; verified: number; created_at: string }
      | undefined;
    const cape = getCapeByName(app.db, nameLower);
    const token = row ? issueToken(app, row.id) : null;
    return {
      ok: true,
      user: row ? publicUser(row as never, !!cape) : null,
      cape: cape ? capeJson(cape, app.config.externalUrl) : null,
      token,
    };
  });
}
