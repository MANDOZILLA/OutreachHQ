import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const VALID_STATUSES = ["interested", "needs_info", "not_interested", "not_emailed", "emailed", "replied", "opted_out"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { status } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, params.id);
  return NextResponse.json({ ok: true });
}
