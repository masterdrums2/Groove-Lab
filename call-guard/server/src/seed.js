import { v4 as uuid } from "uuid";
import { db } from "./db.js";
import { normalizeHkE164 } from "./hkPhone.js";

const now = () => new Date().toISOString();

/** Seed only numbers that call into Hong Kong. */
const samples = [
  { e164: "+85261230001", category: "scam", label_zh: "疑似騙案電話（香港）" },
  { e164: "+85261230002", category: "scam", label_zh: "疑似騙案電話（香港）" },
  { e164: "+85261230003", category: "telemarketing", label_zh: "推銷電話（香港）" },
  { e164: "+85261230004", category: "telemarketing", label_zh: "推銷電話（香港）" },
  { e164: "+85261230005", category: "loan", label_zh: "財務借貸推介（香港）" },
  { e164: "+85261230006", category: "loan", label_zh: "財務借貸推介（香港）" },
  { e164: "+85261230007", category: "harassment", label_zh: "騷擾電話（香港）" },
  { e164: "+85291110001", category: "scam", label_zh: "疑似騙案電話（香港）" },
  { e164: "+85291110002", category: "telemarketing", label_zh: "推銷電話（香港）" },
  { e164: "+85291110003", category: "loan", label_zh: "財務借貸推介（香港）" },
  // Overseas number known to dial into HK (spoof / inbound scam pattern)
  { e164: "+8613912345678", category: "scam", label_zh: "境外打入香港疑似騙案" },
];

const insert = db.prepare(`
  INSERT INTO spam_numbers (id, e164, category, label_zh, confidence, source, region, updated_at)
  VALUES (@id, @e164, @category, @label_zh, @confidence, @source, 'HK', @updated_at)
  ON CONFLICT(e164) DO UPDATE SET
    category = excluded.category,
    label_zh = excluded.label_zh,
    confidence = excluded.confidence,
    region = 'HK',
    updated_at = excluded.updated_at
`);

const tx = db.transaction(() => {
  for (const row of samples) {
    const e164 = normalizeHkE164(row.e164) || row.e164;
    insert.run({
      id: uuid(),
      e164,
      category: row.category,
      label_zh: row.label_zh,
      confidence: 0.9,
      source: "seed-hk",
      updated_at: now(),
    });
  }
});

tx();
console.log(`Seeded ${samples.length} Hong Kong inbound spam numbers.`);
