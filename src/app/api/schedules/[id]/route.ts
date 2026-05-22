import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const db = getDb();

  if ("enabled" in body) {
    db.prepare("UPDATE schedules SET enabled = ? WHERE id = ?").run(body.enabled ? 1 : 0, params.id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  db.prepare("DELETE FROM schedules WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true });
}
