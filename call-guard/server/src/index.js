import cors from "cors";
import express from "express";
import { v4 as uuid } from "uuid";
import { db } from "./db.js";
import { isHongKongMemberPhone, normalizeHkE164 } from "./hkPhone.js";

const app = express();
const PORT = process.env.PORT || 8787;
/** Product is Hong Kong–only: block calls received by HK members. */
const MARKET = "HK";

app.use(cors());
app.use(express.json());

const now = () => new Date().toISOString();

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    phone: row.phone,
    email: row.email,
    displayName: row.display_name,
    status: row.status,
    market: row.market || MARKET,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
  };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "call-guard", market: MARKET });
});

/** Register → candidate list (Hong Kong numbers only) */
app.post("/api/register", (req, res) => {
  const { phone, email, displayName } = req.body || {};
  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ error: "phone is required" });
  }

  if (!isHongKongMemberPhone(phone)) {
    return res.status(400).json({
      error: "hk_phone_required",
      message: "只支援香港號碼（+852）。本服務淨係欄截喺香港收到嘅來電。",
    });
  }

  const normalized = normalizeHkE164(phone);

  const existing = db.prepare("SELECT * FROM users WHERE phone = ?").get(normalized);
  if (existing) {
    return res.json({ user: publicUser(existing), created: false });
  }

  const user = {
    id: uuid(),
    phone: normalized,
    email: email || null,
    display_name: displayName || null,
    status: "candidate",
    market: MARKET,
    created_at: now(),
    activated_at: null,
  };

  db.prepare(
    `INSERT INTO users (id, phone, email, display_name, status, market, created_at, activated_at)
     VALUES (@id, @phone, @email, @display_name, @status, @market, @created_at, @activated_at)`
  ).run(user);

  res.status(201).json({ user: publicUser(user), created: true });
});

app.get("/api/users/:id", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "not found" });
  res.json({ user: publicUser(user) });
});

/** Candidate list (admin / ops) */
app.get("/api/lists/candidates", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM users WHERE status = 'candidate' ORDER BY created_at DESC")
    .all();
  res.json({ users: rows.map(publicUser) });
});

/** Active (paid) list */
app.get("/api/lists/active", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM users WHERE status = 'active' ORDER BY activated_at DESC")
    .all();
  res.json({ users: rows.map(publicUser) });
});

/**
 * Mock $1 HKD/month payment.
 * Production: replace with Stripe / local payment webhook.
 */
app.post("/api/users/:id/pay", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "not found" });

  const subId = uuid();
  const paidAt = now();

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO subscriptions (id, user_id, amount_cents, currency, status, paid_at, created_at)
       VALUES (?, ?, 100, 'HKD', 'paid', ?, ?)`
    ).run(subId, user.id, paidAt, paidAt);

    db.prepare(
      `UPDATE users SET status = 'active', activated_at = ? WHERE id = ?`
    ).run(paidAt, user.id);
  });
  tx();

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
  res.json({
    user: publicUser(updated),
    subscription: {
      id: subId,
      amountCents: 100,
      currency: "HKD",
      status: "paid",
      paidAt,
    },
  });
});

/** Full spam blocklist for native sync (active members only) */
app.get("/api/blocklist", (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ error: "not found" });
  if (user.status !== "active") {
    return res.status(403).json({
      error: "membership_inactive",
      message: "付費開通後先會同步欄截名單",
    });
  }

  // Only numbers known to call into Hong Kong
  const numbers = db
    .prepare(
      `SELECT e164, category, label_zh AS labelZh, confidence, updated_at AS updatedAt
       FROM spam_numbers WHERE region = 'HK' ORDER BY e164 ASC`
    )
    .all();

  res.json({
    market: MARKET,
    version: numbers.length ? numbers[numbers.length - 1].updatedAt : now(),
    count: numbers.length,
    numbers,
  });
});

/** Device reports a blocked call (Android CallScreeningService) */
app.post("/api/blocked-calls", (req, res) => {
  const { userId, e164, category, labelZh, blockedAt } = req.body || {};
  if (!userId || !e164) {
    return res.status(400).json({ error: "userId and e164 required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user || user.status !== "active") {
    return res.status(403).json({ error: "membership_inactive" });
  }

  const spam = db.prepare("SELECT * FROM spam_numbers WHERE e164 = ?").get(e164);
  const row = {
    id: uuid(),
    user_id: userId,
    e164,
    category: category || spam?.category || null,
    label_zh: labelZh || spam?.label_zh || "已欄截來電",
    blocked_at: blockedAt || now(),
  };

  db.prepare(
    `INSERT INTO blocked_calls (id, user_id, e164, category, label_zh, blocked_at)
     VALUES (@id, @user_id, @e164, @category, @label_zh, @blocked_at)`
  ).run(row);

  res.status(201).json({
    call: {
      id: row.id,
      e164: row.e164,
      category: row.category,
      labelZh: row.label_zh,
      blockedAt: row.blocked_at,
    },
  });
});

/** UI: only blocked-call history for the member */
app.get("/api/users/:id/blocked-calls", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "not found" });

  const calls = db
    .prepare(
      `SELECT id, e164, category, label_zh AS labelZh, blocked_at AS blockedAt
       FROM blocked_calls WHERE user_id = ? ORDER BY blocked_at DESC LIMIT 200`
    )
    .all(user.id);

  res.json({ calls });
});

const CATEGORY_LABELS = {
  harassment: "騷擾電話（香港）",
  scam: "疑似騙案電話（香港）",
  telemarketing: "推銷電話（香港）",
  loan: "財務借貸推介（香港）",
};

function upsertSpamNumber({ e164, category, labelZh, confidence, source }) {
  const id = uuid();
  const updatedAt = now();
  db.prepare(
    `INSERT INTO spam_numbers (id, e164, category, label_zh, confidence, source, region, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'HK', ?)
     ON CONFLICT(e164) DO UPDATE SET
       category = excluded.category,
       label_zh = excluded.label_zh,
       confidence = MAX(spam_numbers.confidence, excluded.confidence),
       source = excluded.source,
       region = 'HK',
       updated_at = excluded.updated_at`
  ).run(
    id,
    e164,
    category,
    labelZh || CATEGORY_LABELS[category],
    confidence ?? 0.85,
    source,
    updatedAt
  );
  return { e164, category, updatedAt };
}

/** Ops: add a spam number that calls into Hong Kong */
app.post("/api/spam-numbers", (req, res) => {
  const { e164, category, labelZh, confidence } = req.body || {};
  const allowed = ["harassment", "scam", "telemarketing", "loan"];
  if (!e164 || !allowed.includes(category)) {
    return res.status(400).json({ error: "e164 and valid category required" });
  }

  const normalized = normalizeHkE164(e164) || e164;
  const row = upsertSpamNumber({
    e164: normalized,
    category,
    labelZh,
    confidence,
    source: "manual",
  });
  res.status(201).json({ ok: true, ...row, region: "HK" });
});

/**
 * Supplementary path only: member reports help cover brand-new numbers.
 * Primary product value is the pre-curated HK blocklist unlocked by $1 pay.
 * MVP auto-accepts; production can use status=pending + moderation.
 */
app.post("/api/reports", (req, res) => {
  const { userId, e164, category, note } = req.body || {};
  const allowed = ["harassment", "scam", "telemarketing", "loan"];
  if (!userId || !e164 || !allowed.includes(category)) {
    return res.status(400).json({
      error: "userId, e164 and valid category required",
    });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user || user.status !== "active") {
    return res.status(403).json({
      error: "membership_inactive",
      message: "付費開通後先可以舉報，令其他會員一齊攔",
    });
  }

  const normalized = normalizeHkE164(e164) || e164;
  const reportId = uuid();
  const createdAt = now();

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO reports (id, user_id, e164, category, note, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'accepted', ?)`
    ).run(reportId, userId, normalized, category, note || null, createdAt);

    upsertSpamNumber({
      e164: normalized,
      category,
      labelZh: CATEGORY_LABELS[category],
      confidence: 0.88,
      source: "member_report",
    });
  });
  tx();

  const activeCount = db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'active'")
    .get().n;

  res.status(201).json({
    report: {
      id: reportId,
      e164: normalized,
      category,
      status: "accepted",
      createdAt,
    },
    sharedWithActiveMembers: activeCount,
    message:
      "已作補漏入庫。主攔截仍靠預建名單；其他已開通會員下次同步後會一齊攔呢個新號碼。",
  });
});


app.listen(PORT, () => {
  console.log(`call-guard API (HK only) on http://127.0.0.1:${PORT}`);
});
