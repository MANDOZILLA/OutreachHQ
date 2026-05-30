import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  const db = getDb();

  const total = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE deleted_at IS NULL").get() as { c: number }).c;
  const emailed = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE emailed_at IS NOT NULL AND deleted_at IS NULL").get() as { c: number }).c;
  const replies = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE replied_at IS NOT NULL AND deleted_at IS NULL").get() as { c: number }).c;
  const interested = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'interested' AND deleted_at IS NULL").get() as { c: number }).c;
  const needsInfo = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'needs_info' AND deleted_at IS NULL").get() as { c: number }).c;
  const notInterested = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'not_interested' AND deleted_at IS NULL").get() as { c: number }).c;

  const replyRate = emailed > 0 ? ((replies / emailed) * 100).toFixed(1) : "0.0";

  // Revenue pipeline — projected MRR from interested leads.
  // interested × close rate (15%) × plan price ($49/mo).
  const CLOSE_RATE = 0.15;
  const PLAN_PRICE = 49;
  const projectedMrr = Math.round(interested * CLOSE_RATE * PLAN_PRICE);

  const hotReplies = db.prepare(`
    SELECT id, name, city, state, hook_type, replied_at, status
    FROM leads
    WHERE replied_at IS NOT NULL
      AND status IN ('interested', 'needs_info')
      AND deleted_at IS NULL
    ORDER BY replied_at DESC
    LIMIT 10
  `).all();

  return NextResponse.json({
    total,
    emailed,
    replies,
    interested,
    needsInfo,
    notInterested,
    replyRate,
    projectedMrr,
    closeRate: CLOSE_RATE,
    planPrice: PLAN_PRICE,
    hotReplies,
  });
}
