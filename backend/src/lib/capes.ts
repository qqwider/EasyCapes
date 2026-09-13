import { randomId } from "./crypto.js";
import type { CapeRow } from "../db.js";
import type { Database } from "better-sqlite3";

export interface CapeJson {
  id: string;
  type: string;
  url: string;
  hash: string;
  meta: Record<string, unknown>;
}

export function capeJson(row: CapeRow, externalUrl: string): CapeJson {
  let meta: Record<string, unknown> = {};
  try {
    meta = JSON.parse(row.meta) as Record<string, unknown>;
  } catch {
    meta = {};
  }
  return {
    id: row.id,
    type: row.type,
    url: `${externalUrl}/api/v1/textures/${row.hash}.png`,
    hash: row.hash,
    meta,
  };
}

export function getCapeByName(db: Database, nameLower: string): CapeRow | undefined {
  return db
    .prepare("SELECT * FROM capes WHERE name_lower = ? AND status = 'visible'")
    .get(nameLower) as CapeRow | undefined;
}

export function saveTexture(
  db: Database,
  image: { hash: string; width: number; height: number; mime: string; data: Buffer },
): void {
  db.prepare(
    `INSERT INTO textures (hash, width, height, mime, size, data) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(hash) DO NOTHING`,
  ).run(image.hash, image.width, image.height, image.mime, image.data.length, image.data);
}

export function upsertCape(
  db: Database,
  nameLower: string,
  ownerUserId: string | null,
  image: { hash: string; mime: string; width: number; height: number },
  originalUrl: string,
  now: string,
): CapeRow {
  const meta = JSON.stringify({ width: image.width, height: image.height });
  const existing = db.prepare("SELECT id FROM capes WHERE name_lower = ?").get(nameLower) as
    | { id: string }
    | undefined;
  const id = existing?.id ?? randomId("c");
  db.prepare(
    `INSERT INTO capes (id, name_lower, owner_user_id, hash, type, meta, original_url, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'static', ?, ?, 'visible', ?, ?)
     ON CONFLICT(name_lower) DO UPDATE SET
       hash = excluded.hash,
       type = 'static',
       meta = excluded.meta,
       original_url = excluded.original_url,
       updated_at = excluded.updated_at,
       status = 'visible'`,
  ).run(id, nameLower, ownerUserId, image.hash, meta, originalUrl, now, now);
  return db.prepare("SELECT * FROM capes WHERE name_lower = ?").get(nameLower) as CapeRow;
}
