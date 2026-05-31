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
  const NOT_NOW_RATE = 0.03;
  const PLAN_PRICE = 49;
  const projectedMrr = Math.round(interested * CLOSE_RATE * PLAN_PRICE);

  // Sequence pipeline — where leads sit in the drip.
  const notSent = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE emailed_at IS NULL AND deleted_at IS NULL AND COALESCE(blacklisted,0)=0").get() as { c: number }).c;
  const inSequence = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE emailed_at IS NOT NULL AND replied_at IS NULL AND COALESCE(sequence_complete,0)=0 AND deleted_at IS NULL").get() as { c: number }).c;
  const pausedReplied = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE replied_at IS NOT NULL AND COALESCE(sequence_complete,0)=0 AND deleted_at IS NULL").get() as { c: number }).c;
  const complete = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE COALESCE(sequence_complete,0)=1 AND deleted_at IS NULL").get() as { c: number }).c;
  const sequencePipeline = { notSent, inSequence, pausedReplied, complete };

  // Reply sentiment split among replied leads.
  const sentRows = db.prepare(`
    SELECT sentiment, COUNT(*) as c FROM leads
    WHERE replied_at IS NOT NULL AND deleted_at IS NULL AND sentiment IS NOT NULL
    GROUP BY sentiment
  `).all() as Array<{ sentiment: string; c: number }>;
  const sentimentSplit = { interested: 0, not_now: 0, hard_no: 0 };
  for (const r of sentRows) {
    if (r.sentiment in sentimentSplit) sentimentSplit[r.sentiment as keyof typeof sentimentSplit] = r.c;
  }
  const sentimentTotal = sentimentSplit.interested + sentimentSplit.not_now + sentimentSplit.hard_no;

  // Revenue pipeline weighted MRR by sentiment.
  const interestedMrr = Math.round(sentimentSplit.interested * CLOSE_RATE * PLAN_PRICE);
  const notNowMrr = Math.round(sentimentSplit.not_now * NOT_NOW_RATE * PLAN_PRICE);
  const weightedMrr = interestedMrr + notNowMrr;

  // 8-week reply-rate trend from the sends table.
  const replyByWeek: Array<{ label: string; rate: number; sent: number; replied: number }> = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - i * 7 - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(now.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);
    const startStr = start.toISOString().slice(0, 19).replace("T", " ");
    const endStr = end.toISOString().slice(0, 19).replace("T", " ");
    const sent = (db.prepare("SELECT COUNT(*) as c FROM sends WHERE sent_at >= ? AND sent_at <= ?").get(startStr, endStr) as { c: number }).c;
    const repd = (db.prepare("SELECT COUNT(*) as c FROM sends WHERE replied = 1 AND sent_at >= ? AND sent_at <= ?").get(startStr, endStr) as { c: number }).c;
    replyByWeek.push({
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      rate: sent > 0 ? Math.round((repd / sent) * 100) : 0,
      sent,
      replied: repd,
    });
  }

  // Action needed — recently replied (awaiting handling) + overdue next step.
  const actionNeeded: Array<{ id: number; name: string; city: string; reason: string; kind: string }> = [];
  const recentlyReplied = db.prepare(`
    SELECT id, name, city, replied_at, sentiment FROM leads
    WHERE replied_at IS NOT NULL AND status IN ('interested','needs_info')
      AND COALESCE(blacklisted,0)=0 AND deleted_at IS NULL
    ORDER BY replied_at DESC LIMIT 5
  `).all() as Array<{ id: number; name: string; city: string; replied_at: string; sentiment: string }>;
  for (const r of recentlyReplied) {
    const label = r.sentiment === "interested" ? "INTERESTED" : r.sentiment === "not_now" ? "NOT NOW" : "replied";
    actionNeeded.push({ id: r.id, name: r.name, city: r.city, reason: `replied — auto-classified ${label}`, kind: "reply" });
  }
  // Overdue: emailed, not replied, not complete, last contact older than the next enabled step's offset.
  const overdue = db.prepare(`
    SELECT l.id, l.name, l.city, l.sequence_step,
           COALESCE(l.last_contacted_at, l.emailed_at) as last_at
    FROM leads l
    WHERE l.emailed_at IS NOT NULL AND l.replied_at IS NULL
      AND COALESCE(l.sequence_complete,0)=0 AND COALESCE(l.blacklisted,0)=0
      AND l.deleted_at IS NULL
    ORDER BY last_at ASC LIMIT 10
  `).all() as Array<{ id: number; name: string; city: string; sequence_step: number; last_at: string }>;
  const steps = db.prepare("SELECT step_index, day_offset FROM sequence_steps WHERE enabled = 1 ORDER BY step_index").all() as Array<{ step_index: number; day_offset: number }>;
  const maxStep = steps.length;
  for (const o of overdue) {
    if (actionNeeded.length >= 6) break;
    const curStep = o.sequence_step ?? 0;
    const nextStep = steps.find((s) => s.step_index === curStep + 1);
    if (!nextStep) continue;
    const daysSince = o.last_at ? Math.floor((Date.now() - new Date(o.last_at).getTime()) / 86400000) : 0;
    if (daysSince >= nextStep.day_offset) {
      actionNeeded.push({ id: o.id, name: o.name, city: o.city, reason: `day ${daysSince} passed — email ${curStep + 2} of ${maxStep} not sent yet`, kind: "overdue" });
    }
  }

  // Recent activity — broader feed for the dashboard table.
  const recentActivity = db.prepare(`
    SELECT id, name, city, state, score, lead_score, status, sentiment, replied_at, emailed_at,
           COALESCE(replied_at, emailed_at, created_at) as activity_at
    FROM leads
    WHERE deleted_at IS NULL AND (emailed_at IS NOT NULL OR replied_at IS NOT NULL)
    ORDER BY activity_at DESC LIMIT 8
  `).all();

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
    notNowRate: NOT_NOW_RATE,
    planPrice: PLAN_PRICE,
    interestedMrr,
    notNowMrr,
    weightedMrr,
    sequencePipeline,
    sentimentSplit,
    sentimentTotal,
    replyByWeek,
    actionNeeded,
    recentActivity,
    hotReplies,
  });
}
