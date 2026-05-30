// Follow-up sequencer.
//
// Drives the editable Day 0 / Day 3 / Day 7 cadence (see the sequence_steps
// table). For each enabled follow-up step it finds leads whose next step is
// due and "sends" the follow-up (recorded as a Brevo send + quota increment).
//
// Auto-pause on reply: a lead that has replied — or opted out / been
// blacklisted — is skipped, and right before each send we re-check has_replied
// so a reply that landed mid-run still pauses the sequence.

import { getDb } from "./db";
import { writeLog } from "./logger";
import { hasQuota, incrementQuota } from "./quota";
import { recordSend } from "./sends";

export interface SequenceStep {
  id: number;
  step_index: number;
  day_offset: number;
  label: string;
  enabled: number;
}

export function getSequenceSteps(): SequenceStep[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM sequence_steps ORDER BY step_index")
    .all() as SequenceStep[];
}

function daysSince(iso: string | null): number {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

// Has this lead replied? (the auto-pause condition)
function hasReplied(leadId: number): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT replied_at FROM leads WHERE id = ?")
    .get(leadId) as { replied_at: string | null } | undefined;
  return !!row?.replied_at;
}

export interface SequenceRunResult {
  sent: number;
  paused: number; // skipped because the lead replied
  skipped: number; // not due / no quota / etc.
}

/**
 * Run one pass of the follow-up sequence. Safe to call from cron or an API.
 */
export function runSequence(): SequenceRunResult {
  const db = getDb();
  const steps = getSequenceSteps();
  const totalSteps = steps.length;
  const result: SequenceRunResult = { sent: 0, paused: 0, skipped: 0 };

  // Candidate leads: contacted at least once, not finished, and eligible to
  // be emailed. Blacklisted / opted-out / replied leads are excluded up front.
  const leads = db
    .prepare(
      `SELECT id, name, sequence_step, first_contacted_at, last_contacted_at
       FROM leads
       WHERE emailed_at IS NOT NULL
         AND replied_at IS NULL
         AND opted_out = 0
         AND blacklisted = 0
         AND sequence_complete = 0
         AND deleted_at IS NULL`
    )
    .all() as Array<{
      id: number;
      name: string;
      sequence_step: number;
      first_contacted_at: string | null;
      last_contacted_at: string | null;
    }>;

  for (const lead of leads) {
    // Step 0 (intro) is sent by the finder; the sequencer only fires follow-ups.
    const nextIndex = Math.max(lead.sequence_step, 1);

    if (nextIndex >= totalSteps) {
      db.prepare(
        "UPDATE leads SET sequence_complete = 1, updated_at = datetime('now') WHERE id = ?"
      ).run(lead.id);
      continue;
    }

    const step = steps.find((s) => s.step_index === nextIndex);
    if (!step || !step.enabled) {
      result.skipped++;
      continue;
    }

    // Due only once enough days have passed since first contact.
    const anchor = lead.first_contacted_at || lead.last_contacted_at;
    if (daysSince(anchor) < step.day_offset) {
      result.skipped++;
      continue;
    }

    // Auto-pause: re-check the reply state immediately before sending.
    if (hasReplied(lead.id)) {
      result.paused++;
      continue;
    }

    if (!hasQuota(1)) {
      writeLog("BREVO", "Daily email quota reached — sequence paused");
      result.skipped++;
      break;
    }

    const { variant, subject } = recordSend(lead.id, lead.name, step.step_index);
    incrementQuota(1);
    const completed = nextIndex + 1;
    db.prepare(
      `UPDATE leads SET sequence_step = ?, last_contacted_at = datetime('now'),
         sequence_complete = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(completed, completed >= totalSteps ? 1 : 0, lead.id);

    writeLog(
      "BREVO",
      `Follow-up ${step.label} → ${lead.name} [variant ${variant}: "${subject}"]`
    );
    result.sent++;
  }

  writeLog(
    "SYSTEM",
    `Sequence run complete — ${result.sent} sent, ${result.paused} paused (replied), ${result.skipped} not due`
  );
  return result;
}
