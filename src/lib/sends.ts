// Outbound send tracking + A/B subject-line testing.
//
// Every send is recorded with the subject-line variant it used. When a lead
// replies, their send rows are marked replied=1 so we can compute reply rate
// per variant.

import { getDb } from "./db";

export type Variant = "A" | "B";

export interface SubjectVariant {
  variant: Variant;
  template: string;
}

// The two competing subject lines. `{name}` is filled with the lead name.
export const SUBJECT_VARIANTS: SubjectVariant[] = [
  { variant: "A", template: "Quick question about {name}" },
  { variant: "B", template: "Cutting food waste at {name}" },
];

export function renderSubject(variant: Variant, leadName: string): string {
  const v = SUBJECT_VARIANTS.find((s) => s.variant === variant) || SUBJECT_VARIANTS[0];
  return v.template.replace("{name}", leadName);
}

/**
 * Pick the next A/B variant. Balances assignment by giving the variant with
 * fewer sends so far, so the split stays roughly even.
 */
export function pickVariant(): Variant {
  const db = getDb();
  const rows = db
    .prepare("SELECT variant, COUNT(*) as c FROM sends GROUP BY variant")
    .all() as Array<{ variant: string; c: number }>;
  const counts: Record<string, number> = { A: 0, B: 0 };
  for (const r of rows) counts[r.variant] = r.c;
  return counts.A <= counts.B ? "A" : "B";
}

/** Record an outbound send and return the chosen variant + subject. */
export function recordSend(
  leadId: number,
  leadName: string,
  stepIndex: number
): { variant: Variant; subject: string } {
  const db = getDb();
  const variant = pickVariant();
  const subject = renderSubject(variant, leadName);
  db.prepare(
    "INSERT INTO sends (lead_id, step_index, variant, subject) VALUES (?, ?, ?, ?)"
  ).run(leadId, stepIndex, variant, subject);
  return { variant, subject };
}

/** Mark all of a lead's sends as replied (called on reply ingest). */
export function markRepliedForLead(leadId: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE sends SET replied = 1, replied_at = datetime('now') WHERE lead_id = ? AND replied = 0"
  ).run(leadId);
}

export interface VariantStats {
  variant: Variant;
  template: string;
  sent: number;
  replied: number;
  replyRate: number; // 0–100
}

export function getVariantStats(): VariantStats[] {
  const db = getDb();
  return SUBJECT_VARIANTS.map((v) => {
    const row = db
      .prepare(
        "SELECT COUNT(*) as sent, COALESCE(SUM(replied), 0) as replied FROM sends WHERE variant = ?"
      )
      .get(v.variant) as { sent: number; replied: number };
    const sent = row.sent || 0;
    const replied = row.replied || 0;
    return {
      variant: v.variant,
      template: v.template,
      sent,
      replied,
      replyRate: sent > 0 ? Math.round((replied / sent) * 1000) / 10 : 0,
    };
  });
}
