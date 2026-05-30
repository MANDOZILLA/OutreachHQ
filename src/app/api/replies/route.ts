import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const db = getDb();
  const search = req.nextUrl.searchParams.get("search") || "";
  const city = req.nextUrl.searchParams.get("city") || "";
  const hook = req.nextUrl.searchParams.get("hook") || "";

  let where = "WHERE replied_at IS NOT NULL AND deleted_at IS NULL";
  const params: string[] = [];

  if (search) {
    where += " AND (name LIKE ? OR city LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (city) {
    where += " AND city = ?";
    params.push(city);
  }
  if (hook) {
    where += " AND hook_type = ?";
    params.push(hook);
  }

  const rows = db.prepare(
    `SELECT id, name, city, state, cuisine, price_level, rating, score, lead_score, tier, hook_type, hook_text, replied_at, reply_text, status, sentiment, blacklisted, email_address, email_body, emailed_at, opted_out
     FROM leads ${where}
     ORDER BY replied_at DESC`
  ).all(...params);

  const cities = db.prepare("SELECT DISTINCT city FROM leads WHERE replied_at IS NOT NULL AND deleted_at IS NULL AND city IS NOT NULL ORDER BY city").all();
  const hooks = db.prepare("SELECT DISTINCT hook_type FROM leads WHERE replied_at IS NOT NULL AND deleted_at IS NULL AND hook_type IS NOT NULL ORDER BY hook_type").all();

  const grouped = {
    interested: rows.filter((r) => (r as Record<string, unknown>).status === "interested"),
    needs_info: rows.filter((r) => (r as Record<string, unknown>).status === "needs_info"),
    not_interested: rows.filter((r) => (r as Record<string, unknown>).status === "not_interested"),
  };

  return NextResponse.json({ grouped, cities, hooks });
}
