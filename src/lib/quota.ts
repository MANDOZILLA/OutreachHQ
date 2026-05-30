// Brevo daily send-quota tracker.
//
// A SQLite counter keyed by calendar day. Every outbound email increments
// today's count; a node-cron job zeroes it at midnight (see cron-manager).
// The dashboard header reads getQuota() to show "sent / limit" for today.

import { getDb } from "./db";
import { getEnvNumber } from "./env";
import { writeLog } from "./logger";

export const DEFAULT_DAILY_LIMIT = 300;

function today(): string {
  // Local calendar day (YYYY-MM-DD).
  return new Date().toLocaleDateString("en-CA");
}

export function getDailyLimit(): number {
  return getEnvNumber("DAILY_EMAIL_LIMIT", DEFAULT_DAILY_LIMIT);
}

export interface QuotaStatus {
  day: string;
  sent: number;
  limit: number;
  remaining: number;
}

export function getQuota(): QuotaStatus {
  const db = getDb();
  const day = today();
  const row = db.prepare("SELECT sent FROM email_quota WHERE day = ?").get(day) as
    | { sent: number }
    | undefined;
  const sent = row?.sent ?? 0;
  const limit = getDailyLimit();
  return { day, sent, limit, remaining: Math.max(0, limit - sent) };
}

/** True if there is room under today's limit to send `n` more emails. */
export function hasQuota(n = 1): boolean {
  const { sent, limit } = getQuota();
  return sent + n <= limit;
}

/** Increment today's counter and return the new status. */
export function incrementQuota(n = 1): QuotaStatus {
  const db = getDb();
  const day = today();
  db.prepare(
    `INSERT INTO email_quota (day, sent) VALUES (?, ?)
     ON CONFLICT(day) DO UPDATE SET sent = sent + excluded.sent`
  ).run(day, n);
  return getQuota();
}

/** Zero today's counter (called by the midnight cron). */
export function resetQuota(): void {
  const db = getDb();
  const day = today();
  db.prepare(
    `INSERT INTO email_quota (day, sent) VALUES (?, 0)
     ON CONFLICT(day) DO UPDATE SET sent = 0`
  ).run(day);
  writeLog("BREVO", `Daily email quota reset for ${day}`);
}
