import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  const db = getDb();
  const schedules = db.prepare("SELECT * FROM schedules ORDER BY id").all();
  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, task_type, cron_expr, enabled = 1 } = body;

  if (!name || !task_type || !cron_expr) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(
    "INSERT INTO schedules (name, description, task_type, cron_expr, enabled) VALUES (?, ?, ?, ?, ?)"
  ).run(name, description || "", task_type, cron_expr, enabled ? 1 : 0);

  return NextResponse.json({ ok: true, id: result.lastInsertRowid });
}
