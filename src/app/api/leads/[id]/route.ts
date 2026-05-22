import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const lead = db.prepare("SELECT * FROM leads WHERE id = ? AND deleted_at IS NULL").get(params.id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  db.prepare("UPDATE leads SET deleted_at = datetime('now') WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true });
}
