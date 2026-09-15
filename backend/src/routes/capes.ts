import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { NICK_RE } from "./auth.js";
import { ApiError } from "../lib/errors.js";
import { capeJson, getCapeByName } from "../lib/capes.js";
import type { CapeRow, TextureRow } from "../db.js";
import { TextureStore } from "../services/textures.js";

const namesSchema = z.object({ names: z.string().max(560) });

const galleryQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export function capeRoutes(app: FastifyInstance): void {
  const textures = new TextureStore((hash) => {
    return app.db.prepare("SELECT * FROM textures WHERE hash = ?").get(hash) as
      | TextureRow
      | undefined;
  });

  app.get("/capes", async (req) => {
    const { names: query } = namesSchema.parse(req.query);
    const names = query
      .split(",")
      .map((n) => n.trim())
      .filter((n) => n.length > 0)
      .slice(0, 32);
    if (names.length === 0) {
      throw ApiError.badRequest("VALIDATION", "Укажите хотя бы один ник");
    }
    const result: Record<string, unknown> = {};
    for (const name of names) {
      if (!NICK_RE.test(name)) {
        result[name] = null;
        continue;
      }
      const row = getCapeByName(app.db, name.toLowerCase());
      result[name] = row ? capeJson(row, app.config.externalUrl) : null;
    }
    return { ok: true, capes: result };
  });

  app.get("/textures/:hash", async (req, reply) => {
    const { hash } = req.params as { hash: string };
    const clean = hash.replace(/\.png$/i, "").toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(clean)) {
      return reply
        .code(400)
        .send({ ok: false, error: { code: "INVALID_HASH", message: "Некорректный хеш" } });
    }
    const texture = textures.get(clean);
    if (!texture) {
      return reply
        .code(404)
        .send({ ok: false, error: { code: "NOT_FOUND", message: "Текстура не найдена" } });
    }
    return reply
      .code(200)
      .type(texture.mime)
      .header("Cache-Control", "public, max-age=31536000, immutable")
      .send(Buffer.from(texture.data));
  });

  app.get("/gallery", async (req) => {
    const { limit, offset } = galleryQuery.parse(req.query);
    const rows = app.db
      .prepare(
        `SELECT c.*, u.mc_name FROM capes c LEFT JOIN users u ON u.id = c.owner_user_id
         WHERE c.status = 'visible' ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`,
      )
      .all(limit, offset) as (CapeRow & { mc_name: string | null })[];
    const total = (
      app.db.prepare("SELECT COUNT(*) AS n FROM capes WHERE status = 'visible'").get() as {
        n: number;
      }
    ).n;
    return {
      ok: true,
      total,
      items: rows.map((r) => ({
        name: r.mc_name ?? r.name_lower,
        cape: capeJson(r, app.config.externalUrl),
        createdAt: r.updated_at,
      })),
    };
  });
}
