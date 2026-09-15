import Fastify from "fastify";
import type { FastifyError } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { ZodError } from "zod";
import type { Database } from "better-sqlite3";
import type { Config } from "./config.js";
import { ApiError } from "./lib/errors.js";
import { Bus } from "./services/bus.js";
import { authRoutes } from "./routes/auth.js";
import { meRoutes } from "./routes/me.js";
import { capeRoutes } from "./routes/capes.js";
import { premiumRoutes } from "./routes/premium.js";
import { wsRoutes } from "./routes/ws.js";

export function buildApp(
  cfg: Config,
  db: Database,
  opts: { logger?: boolean } = {},
) {
  const app = Fastify({ logger: opts.logger ?? false, trustProxy: true });
  app.decorate("db", db);
  app.decorate("config", cfg);
  app.decorate("bus", new Bus());

  app.register(helmet, { contentSecurityPolicy: false });
  app.register(cors, { origin: cfg.siteOrigin, credentials: true });
  app.register(rateLimit, { global: true, max: 300, timeWindow: "1 minute" });
  app.register(websocket);

  app.setErrorHandler((error: FastifyError, _req, reply) => {
    if (error instanceof ApiError) {
      return reply
        .code(error.statusCode)
        .send({ ok: false, error: { code: error.code, message: error.message } });
    }
    if (error instanceof ZodError) {
      return reply.code(400).send({
        ok: false,
        error: { code: "VALIDATION", message: error.issues.map((i) => i.message).join("; ") },
      });
    }
    const status = typeof error.statusCode === "number" && error.statusCode >= 400 ? error.statusCode : 500;
    if (status >= 500) app.log.error(error);
    const code = status === 429 ? "RATE_LIMITED" : status >= 500 ? "INTERNAL" : "ERROR";
    const message =
      status === 429 ? "Слишком много запросов" : status >= 500 ? "Внутренняя ошибка" : error.message;
    return reply.code(status).send({ ok: false, error: { code, message } });
  });

  app.get("/health", async () => ({ ok: true, service: "easycapes" }));

  app.register(
    async (scope) => {
      authRoutes(scope);
      meRoutes(scope);
      capeRoutes(scope);
      premiumRoutes(scope);
      wsRoutes(scope);
    },
    { prefix: "/api/v1" },
  );

  return app;
}
