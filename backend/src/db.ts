import Database from "better-sqlite3";

export function openDb(path: string): Database.Database {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      mc_name TEXT NOT NULL,
      name_lower TEXT NOT NULL UNIQUE,
      uuid TEXT UNIQUE,
      password_hash TEXT,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS capes (
      id TEXT PRIMARY KEY,
      name_lower TEXT NOT NULL UNIQUE,
      owner_user_id TEXT REFERENCES users(id),
      hash TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'static',
      meta TEXT NOT NULL DEFAULT '{}',
      original_url TEXT,
      status TEXT NOT NULL DEFAULT 'visible',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS textures (
      hash TEXT PRIMARY KEY,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      data BLOB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      cape_id TEXT NOT NULL REFERENCES capes(id),
      reporter TEXT,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tokens_user ON tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_capes_owner ON capes(owner_user_id);
  `);
  return db;
}

export interface UserRow {
  id: string;
  mc_name: string;
  name_lower: string;
  uuid: string | null;
  password_hash: string | null;
  email: string | null;
  role: string;
  verified: number;
  created_at: string;
}

export interface CapeRow {
  id: string;
  name_lower: string;
  owner_user_id: string | null;
  hash: string;
  type: string;
  meta: string;
  original_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TextureRow {
  hash: string;
  width: number;
  height: number;
  mime: string;
  size: number;
  data: Buffer;
}
