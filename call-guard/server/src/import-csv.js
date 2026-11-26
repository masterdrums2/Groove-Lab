/**
 * Import pre-built HK blocklist CSV into spam_numbers.
 *
 * Usage:
 *   node src/import-csv.js
 *   node src/import-csv.js ./data/prebuilt-hk-blocklist.csv
 *
 * CSV columns: e164,category,label_zh,source,confidence
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v4 as uuid } from "uuid";
import { db } from "./db.js";
import { normalizeHkE164 } from "./hkPhone.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath =
  process.argv[2] ||
  path.join(__dirname, "..", "data", "prebuilt-hk-blocklist.csv");

if (!fs.existsSync(csvPath)) {
  console.error("CSV not found:", csvPath);
  process.exit(1);
}

const allowed = new Set(["harassment", "scam", "telemarketing", "loan"]);
const raw = fs.readFileSync(csvPath, "utf8").trim().split(/\r?\n/);
const header = raw.shift();
if (!header || !header.includes("e164")) {
  console.error("CSV must include header with e164 column");
  process.exit(1);
}

const cols = header.split(",").map((c) => c.trim());
const idx = Object.fromEntries(cols.map((c, i) => [c, i]));

const upsert = db.prepare(`
  INSERT INTO spam_numbers (id, e164, category, label_zh, confidence, source, region, updated_at)
  VALUES (@id, @e164, @category, @label_zh, @confidence, @source, 'HK', @updated_at)
  ON CONFLICT(e164) DO UPDATE SET
    category = excluded.category,
    label_zh = excluded.label_zh,
    confidence = excluded.confidence,
    source = excluded.source,
    region = 'HK',
    updated_at = excluded.updated_at
`);

const now = new Date().toISOString();
let ok = 0;
let skip = 0;

const tx = db.transaction(() => {
  for (const line of raw) {
    if (!line.trim()) continue;
    // simple CSV split (no embedded commas in our file)
    const parts = line.split(",");
    const e164Raw = parts[idx.e164];
    const category = parts[idx.category];
    const label_zh = parts[idx.label_zh] || category;
    const source = parts[idx.source] || "csv-import";
    const confidence = Number(parts[idx.confidence] ?? 0.8);

    if (!allowed.has(category)) {
      skip++;
      continue;
    }
    const e164 = normalizeHkE164(e164Raw) || e164Raw;
    if (!e164 || !e164.startsWith("+")) {
      skip++;
      continue;
    }

    upsert.run({
      id: uuid(),
      e164,
      category,
      label_zh,
      confidence: Number.isFinite(confidence) ? confidence : 0.8,
      source,
      updated_at: now,
    });
    ok++;
  }
});

tx();

const total = db
  .prepare("SELECT COUNT(*) AS n FROM spam_numbers WHERE region = 'HK'")
  .get().n;
console.log(`Imported ${ok} rows (skipped ${skip}). HK blocklist size: ${total}`);
console.log(`Source file: ${csvPath}`);
