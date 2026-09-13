import { loadConfig } from "./config.js";
import { openDb } from "./db.js";
import { buildApp } from "./app.js";

const cfg = loadConfig();
const db = openDb(cfg.dbPath);
const app = buildApp(cfg, db, { logger: true });

const shutdown = async () => {
  await app.close();
  db.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

app.listen({ port: cfg.port, host: cfg.host }).then((address) => {
  app.log.info(`EasyCapes backend запущен: ${address}`);
  app.log.info(`Раздача текстур с базовым URL: ${cfg.externalUrl}`);
});
