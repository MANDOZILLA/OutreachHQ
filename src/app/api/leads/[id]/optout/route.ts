import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  db.prepare("UPDATE leads SET opted_out = 1, status = 'opted_out', updated_at = datetime('now') WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true });
}
