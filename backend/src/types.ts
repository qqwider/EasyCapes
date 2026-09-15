import type { Database } from "better-sqlite3";
import type { Config } from "./config.js";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
    config: Config;
    bus: BusLike;
  }
}

export interface BusLike {
  add(socket: unknown, names: string[]): void;
  remove(socket: unknown): void;
  broadcastCapeUpdate(name: string, cape: unknown): void;
}
