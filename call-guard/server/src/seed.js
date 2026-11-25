import { v4 as uuid } from "uuid";
import { db } from "./db.js";

const now = () => new Date().toISOString();

const samples = [
  { e164: "+85261230001", category: "scam", label_zh: "疑似騙案電話" },
  { e164: "+85261230002", category: "scam", label_zh: "疑似騙案電話" },
  { e164: "+85261230003", category: "telemarketing", label_zh: "推銷電話" },
  { e164: "+85261230004", category: "telemarketing", label_zh: "推銷電話" },
  { e164: "+85261230005", category: "loan", label_zh: "財務借貸推介" },
  { e164: "+85261230006", category: "loan", label_zh: "財務借貸推介" },
  { e164: "+85261230007", category: "harassment", label_zh: "騷擾電話" },
  { e164: "+85291110001", category: "scam", label_zh: "疑似騙案電話" },
  { e164: "+85291110002", category: "telemarketing", label_zh: "推銷電話" },
  { e164: "+85291110003", category: "loan", label_zh: "財務借貸推介" },
];

const insert = db.prepare(`
  INSERT INTO spam_numbers (id, e164, category, label_zh, confidence, source, updated_at)
  VALUES (@id, @e164, @category, @label_zh, @confidence, @source, @updated_at)
  ON CONFLICT(e164) DO UPDATE SET
    category = excluded.category,
    label_zh = excluded.label_zh,
    confidence = excluded.confidence,
    updated_at = excluded.updated_at
`);

const tx = db.transaction(() => {
  for (const row of samples) {
    insert.run({
      id: uuid(),
      ...row,
      confidence: 0.9,
      source: "seed",
      updated_at: now(),
    });
  }
});

tx();
console.log(`Seeded ${samples.length} spam numbers.`);
