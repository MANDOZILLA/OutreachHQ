import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DB_PATH =
  process.env.LEADS_DB_PATH ||
  path.join(process.cwd(), "data", "leads.db");

let _db: Database.Database | null = null;
let _seeded = false;

export function getDb(): Database.Database {
  if (!_db) {
    // Ensure the data directory exists before opening (better-sqlite3 won't
    // create it, and a fresh checkout has no data/ dir).
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
    migrateSchema(_db);
  }
  if (!_seeded) {
    _seeded = true;
    try {
      // Dynamic import to avoid circular deps — seed is only needed once
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { seed } = require("./seed");
      seed();
    } catch {}
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT,
      state TEXT,
      cuisine TEXT,
      price_level TEXT,
      rating REAL,
      score INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'cold',
      hook_type TEXT,
      hook_text TEXT,
      email_address TEXT,
      email_body TEXT,
      emailed_at TEXT,
      replied_at TEXT,
      reply_text TEXT,
      status TEXT DEFAULT 'not_emailed',
      opted_out INTEGER DEFAULT 0,
      deleted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      task_type TEXT NOT NULL,
      cron_expr TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      last_run TEXT,
      next_run TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Editable follow-up cadence (Sequence builder). Each row is one step in
    -- the drip sequence; day_offset is days after first contact it should fire.
    CREATE TABLE IF NOT EXISTS sequence_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      step_index INTEGER NOT NULL,
      day_offset INTEGER NOT NULL,
      label TEXT NOT NULL,
      enabled INTEGER DEFAULT 1
    );

    -- One row per outbound email send. Tracks which A/B subject-line variant
    -- was used and whether the lead replied, for per-variant reply-rate stats.
    CREATE TABLE IF NOT EXISTS sends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      step_index INTEGER DEFAULT 0,
      variant TEXT NOT NULL,
      subject TEXT,
      sent_at TEXT DEFAULT (datetime('now')),
      replied INTEGER DEFAULT 0,
      replied_at TEXT
    );

    -- Daily Brevo send counter, keyed by calendar day. A node-cron job resets
    -- (zeroes) the current day's row at midnight.
    CREATE TABLE IF NOT EXISTS email_quota (
      day TEXT PRIMARY KEY,
      sent INTEGER DEFAULT 0
    );
  `);

  const stepCount = db.prepare("SELECT COUNT(*) as c FROM sequence_steps").get() as { c: number };
  if (stepCount.c === 0) {
    const insertStep = db.prepare(
      "INSERT INTO sequence_steps (step_index, day_offset, label, enabled) VALUES (?, ?, ?, ?)"
    );
    insertStep.run(0, 0, "Day 0 — Intro", 1);
    insertStep.run(1, 3, "Day 3 — Follow-up", 1);
    insertStep.run(2, 7, "Day 7 — Final nudge", 1);
  }

  const count = db.prepare("SELECT COUNT(*) as c FROM schedules").get() as { c: number };
  if (count.c === 0) {
    const insert = db.prepare(
      "INSERT INTO schedules (name, description, task_type, cron_expr, enabled) VALUES (?, ?, ?, ?, ?)"
    );
    insert.run("Weekly scrape + email", "Every Monday 9:00am · 300 emails", "scrape_email", "0 9 * * 1", 1);
    insert.run("Follow-up checker", "Daily 10:00am · sends follow-ups after 7 days", "follow_up", "0 10 * * *", 1);
    insert.run("Inbox sync (IMAP)", "Every 30 mins · classifies new replies via Groq", "inbox_sync", "*/30 * * * *", 1);
    insert.run("Weekly report email", "Every Sunday 8:00pm · summary to your inbox", "report", "0 20 * * 0", 0);
  }
}

function migrateSchema(db: Database.Database) {
  const cols: [string, string][] = [
    ["sequence_step", "INTEGER DEFAULT 0"],
    ["first_contacted_at", "TEXT"],
    ["sequence_complete", "INTEGER DEFAULT 0"],
    ["last_contacted_at", "TEXT"],
    // Reply sentiment from Groq: 'interested' | 'not_now' | 'hard_no'
    ["sentiment", "TEXT"],
    // One-click blacklist — excluded from all send queries
    ["blacklisted", "INTEGER DEFAULT 0"],
    // Lead-scoring signals + 1–10 score (see lib/scoring.ts)
    ["has_website", "INTEGER DEFAULT 0"],
    ["has_phone", "INTEGER DEFAULT 0"],
    ["has_reviews", "INTEGER DEFAULT 0"],
    ["uses_competitor_pos", "INTEGER DEFAULT 0"],
    ["lead_score", "INTEGER"],
  ];
  const existing = (
    db.prepare("PRAGMA table_info(leads)").all() as Array<{ name: string }>
  ).map((r) => r.name);
  for (const [col, type] of cols) {
    if (!existing.includes(col)) {
      db.exec(`ALTER TABLE leads ADD COLUMN ${col} ${type}`);
    }
  }

  backfillLeadScores(db);
  backfillSentiment(db);
}

// Backfill 1–10 lead scores for leads created before the scoring feature.
function backfillLeadScores(db: Database.Database) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { computeLeadScore, deriveSignalsForExistingLead } = require("./scoring");
  const leads = db
    .prepare("SELECT id, email_address, rating, hook_text FROM leads WHERE lead_score IS NULL")
    .all() as Array<{ id: number; email_address: string | null; rating: number | null; hook_text: string | null }>;
  if (leads.length === 0) return;
  const update = db.prepare(
    `UPDATE leads SET has_website = ?, has_phone = ?, has_reviews = ?,
       uses_competitor_pos = ?, lead_score = ? WHERE id = ?`
  );
  const tx = db.transaction(() => {
    for (const lead of leads) {
      const s = deriveSignalsForExistingLead(lead);
      update.run(
        s.hasWebsite ? 1 : 0,
        s.hasPhone ? 1 : 0,
        s.hasReviews ? 1 : 0,
        s.usesCompetitorPos ? 1 : 0,
        computeLeadScore(s),
        lead.id
      );
    }
  });
  tx();
}

// Map legacy reply statuses to a sentiment label so existing replies show a
// badge even though they predate Groq sentiment scoring.
function backfillSentiment(db: Database.Database) {
  const map: Record<string, string> = {
    interested: "interested",
    needs_info: "not_now",
    not_interested: "hard_no",
  };
  const update = db.prepare("UPDATE leads SET sentiment = ? WHERE id = ?");
  const rows = db
    .prepare("SELECT id, status FROM leads WHERE replied_at IS NOT NULL AND sentiment IS NULL")
    .all() as Array<{ id: number; status: string }>;
  const tx = db.transaction(() => {
    for (const r of rows) {
      const sentiment = map[r.status];
      if (sentiment) update.run(sentiment, r.id);
    }
  });
  tx();
}
