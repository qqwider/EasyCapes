import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface Config {
  port: number;
  host: string;
  dbPath: string;
  siteOrigin: string;
  externalUrl: string;
  maxTextureBytes: number;
  maxStaticWidth: number;
  maxCapeChangesPerHour: number;
  tokenTtlDays: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.PORT ?? 8787);
  const host = env.HOST ?? "127.0.0.1";
  const dbPath = env.DB_PATH ?? "./data/easycapes.db";
  const siteOrigin = env.SITE_ORIGIN ?? "http://localhost:3000";
  const externalUrl = (env.EXTERNAL_URL ?? `http://localhost:${port}`).replace(/\/+$/, "");
  if (dbPath !== ":memory:") {
    mkdirSync(dirname(dbPath), { recursive: true });
  }
  return {
    port,
    host,
    dbPath,
    siteOrigin,
    externalUrl,
    maxTextureBytes: 10 * 1024 * 1024,
    maxStaticWidth: 4096,
    maxCapeChangesPerHour: 10,
    tokenTtlDays: 90,
  };
}
