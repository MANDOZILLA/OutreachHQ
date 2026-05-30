import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeLog } from "@/lib/logger";

// Toggle (or set) a lead's blacklist flag. Blacklisted leads are excluded from
// all send queries (the sequencer skips blacklisted = 1).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const lead = db
    .prepare("SELECT id, name, blacklisted FROM leads WHERE id = ? AND deleted_at IS NULL")
    .get(params.id) as { id: number; name: string; blacklisted: number } | undefined;

  if (!lead) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let next: number;
  try {
    const body = await req.json();
    next = "blacklisted" in body ? (body.blacklisted ? 1 : 0) : lead.blacklisted ? 0 : 1;
  } catch {
    next = lead.blacklisted ? 0 : 1;
  }

  db.prepare(
    "UPDATE leads SET blacklisted = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(next, lead.id);

  writeLog("SYSTEM", `${lead.name} ${next ? "added to" : "removed from"} blacklist`);
  return NextResponse.json({ ok: true, blacklisted: next });
}
