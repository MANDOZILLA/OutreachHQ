import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const db = getDb();
  const url = req.nextUrl;
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const search = url.searchParams.get("search") || "";
  const tier = url.searchParams.get("tier") || "";
  const status = url.searchParams.get("status") || "";
  const city = url.searchParams.get("city") || "";

  let where = "WHERE deleted_at IS NULL";
  const params: string[] = [];

  if (search) {
    where += " AND (name LIKE ? OR city LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (tier) {
    where += " AND tier = ?";
    params.push(tier);
  }
  if (status) {
    if (status === "not_emailed") {
      where += " AND emailed_at IS NULL AND status = 'not_emailed'";
    } else if (status === "emailed") {
      where += " AND emailed_at IS NOT NULL AND replied_at IS NULL";
    } else if (status === "replied") {
      where += " AND replied_at IS NOT NULL";
    } else if (status === "opted_out") {
      where += " AND opted_out = 1";
    } else {
      where += " AND status = ?";
      params.push(status);
    }
  }
  if (city) {
    where += " AND city = ?";
    params.push(city);
  }
  const blacklisted = url.searchParams.get("blacklisted") || "";
  if (blacklisted === "1") {
    where += " AND blacklisted = 1";
  } else if (blacklisted === "0") {
    where += " AND blacklisted = 0";
  }

  const countRow = db.prepare(`SELECT COUNT(*) as c FROM leads ${where}`).get(...params) as { c: number };
  const total = countRow.c;

  const offset = (page - 1) * limit;
  const rows = db.prepare(
    `SELECT id, name, city, state, score, lead_score, tier, hook_type, status, emailed_at,
            replied_at, opted_out, blacklisted, sentiment, email_body,
            sequence_step, sequence_complete, first_contacted_at
     FROM leads ${where}
     ORDER BY score DESC, created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  const cities = db.prepare("SELECT DISTINCT city FROM leads WHERE deleted_at IS NULL AND city IS NOT NULL ORDER BY city").all();

  return NextResponse.json({ leads: rows, total, page, limit, cities });
}
