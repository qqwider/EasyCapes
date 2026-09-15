import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, tokenHashFromRequest } from "../plugins/auth.js";
import { ApiError } from "../lib/errors.js";
import { fetchAndValidateImage } from "../services/imageValidator.js";
import { capeJson, saveTexture, upsertCape } from "../lib/capes.js";
import { publicUser } from "./auth.js";

const capeUrlSchema = z.object({
  url: z.string().min(8).max(2048),
});

export function meRoutes(app: FastifyInstance): void {
  app.get("/me", async (req) => {
    const user = requireAuth(req);
    const hasCape = !!app.db
      .prepare("SELECT id FROM capes WHERE name_lower = ?")
      .get(user.name_lower);
    return { ok: true, user: publicUser(user, hasCape) };
  });

  app.post(
    "/me/cape",
    {
      config: {
        rateLimit: {
          max: app.config.maxCapeChangesPerHour,
          timeWindow: "1 hour",
          keyGenerator: (request) => tokenHashFromRequest(request),
        },
      },
    },
    async (req) => {
      const user = requireAuth(req);
      const body = capeUrlSchema.parse(req.body);
      const image = await fetchAndValidateImage(body.url, {
        maxTextureBytes: app.config.maxTextureBytes,
        maxStaticWidth: app.config.maxStaticWidth,
      });
      const now = new Date().toISOString();
      saveTexture(app.db, image);
      const row = upsertCape(app.db, user.name_lower, user.id, image, body.url, now);
      const cape = capeJson(row, app.config.externalUrl);
      app.bus.broadcastCapeUpdate(user.mc_name, cape);
      return { ok: true, cape };
    },
  );

  app.delete("/me/cape", async (req) => {
    const user = requireAuth(req);
    const result = app.db
      .prepare("DELETE FROM capes WHERE name_lower = ?")
      .run(user.name_lower);
    if (result.changes === 0) {
      throw ApiError.notFound("У вас нет установленного плаща");
    }
    app.bus.broadcastCapeUpdate(user.mc_name, null);
    return { ok: true };
  });
}
