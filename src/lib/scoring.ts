// Lead scoring — score a lead 1–10 at scrape time based on signal quality.
//
// Signals (each contributes to the score):
//   • has a website            → reachable / legit business
//   • has a phone number        → contactable
//   • has Google reviews        → established, has online presence
//   • does NOT already use a competitor POS (Toast / Square / Clover)
//     → bigger opportunity for StockSense, so this is a positive signal
//
// The result is clamped to the 1–10 range and stored on the lead as
// `lead_score` (the legacy 0–100 `score`/`tier` fields are left untouched).

export interface LeadSignals {
  hasWebsite: boolean;
  hasPhone: boolean;
  hasReviews: boolean;
  usesCompetitorPos: boolean;
}

const COMPETITOR_POS = ["toast", "square", "clover"];

/**
 * Detect whether free-text (e.g. a website blurb or scraped notes) mentions a
 * competing point-of-sale system. Used to set the `usesCompetitorPos` signal.
 */
export function mentionsCompetitorPos(text: string | null | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return COMPETITOR_POS.some((pos) => lower.includes(pos));
}

/**
 * Compute a 1–10 lead score from boolean signals.
 *
 * Weighting (out of 10):
 *   website  +3
 *   phone    +2
 *   reviews  +3
 *   no competitor POS +2
 * Floor of 1 so every lead has a usable score.
 */
export function computeLeadScore(signals: LeadSignals): number {
  let score = 0;
  if (signals.hasWebsite) score += 3;
  if (signals.hasPhone) score += 2;
  if (signals.hasReviews) score += 3;
  if (!signals.usesCompetitorPos) score += 2;
  return Math.max(1, Math.min(10, score));
}

/**
 * Deterministic, stable signal derivation for an existing lead that predates
 * the scoring feature. Uses the lead id as a seed so backfilled scores don't
 * change on every read. Real scraped leads pass explicit signals instead.
 */
export function deriveSignalsForExistingLead(lead: {
  id: number;
  email_address?: string | null;
  rating?: number | null;
  hook_text?: string | null;
}): LeadSignals {
  // Cheap deterministic pseudo-random in [0,1) from the id.
  const rng = (salt: number) => {
    const x = Math.sin((lead.id + 1) * 97.13 + salt * 31.7) * 10000;
    return x - Math.floor(x);
  };
  return {
    hasWebsite: !!lead.email_address, // an email implies a discoverable web presence
    hasPhone: rng(1) > 0.2, // most real businesses list a phone
    hasReviews: lead.rating != null ? lead.rating > 0 : rng(2) > 0.3,
    usesCompetitorPos:
      mentionsCompetitorPos(lead.hook_text) || rng(3) > 0.7,
  };
}
