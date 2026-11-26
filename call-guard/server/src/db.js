import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "data", "call-guard.sqlite");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    display_name TEXT,
    status TEXT NOT NULL DEFAULT 'candidate'
      CHECK (status IN ('candidate', 'active', 'cancelled')),
    market TEXT NOT NULL DEFAULT 'HK',
    created_at TEXT NOT NULL,
    activated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    amount_cents INTEGER NOT NULL DEFAULT 100,
    currency TEXT NOT NULL DEFAULT 'HKD',
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
    paid_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS spam_numbers (
    id TEXT PRIMARY KEY,
    e164 TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL
      CHECK (category IN ('harassment', 'scam', 'telemarketing', 'loan')),
    label_zh TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.8,
    source TEXT NOT NULL DEFAULT 'seed',
    -- Numbers known to call people *in Hong Kong* (local or inbound overseas)
    region TEXT NOT NULL DEFAULT 'HK',
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS blocked_calls (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    e164 TEXT NOT NULL,
    category TEXT,
    label_zh TEXT,
    blocked_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
  CREATE INDEX IF NOT EXISTS idx_spam_category ON spam_numbers(category);
  CREATE INDEX IF NOT EXISTS idx_spam_region ON spam_numbers(region);
  CREATE INDEX IF NOT EXISTS idx_blocked_user ON blocked_calls(user_id, blocked_at DESC);
`);

/** Lightweight migrations for DBs created before HK market columns. */
const userCols = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
if (!userCols.includes("market")) {
  db.exec(`ALTER TABLE users ADD COLUMN market TEXT NOT NULL DEFAULT 'HK'`);
}

const spamCols = db.prepare("PRAGMA table_info(spam_numbers)").all().map((c) => c.name);
if (!spamCols.includes("region")) {
  db.exec(`ALTER TABLE spam_numbers ADD COLUMN region TEXT NOT NULL DEFAULT 'HK'`);
}
