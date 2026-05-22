import Database from "better-sqlite3";
import path from "path";

const DB_PATH =
  process.env.LEADS_DB_PATH ||
  path.join(process.cwd(), "data", "leads.db");

let _db: Database.Database | null = null;
let _seeded = false;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initSchema(_db);
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
  `);

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
