import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSequenceSteps } from "@/lib/sequencer";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ steps: getSequenceSteps() });
}

// Update the editable cadence — accepts an array of { id, day_offset, enabled }.
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const steps = Array.isArray(body.steps) ? body.steps : [];
  const db = getDb();

  const update = db.prepare(
    "UPDATE sequence_steps SET day_offset = ?, enabled = ? WHERE id = ?"
  );
  const tx = db.transaction(() => {
    for (const s of steps) {
      const dayOffset = Math.max(0, parseInt(String(s.day_offset), 10) || 0);
      const enabled = s.enabled ? 1 : 0;
      update.run(dayOffset, enabled, s.id);
    }
  });
  tx();

  return NextResponse.json({ ok: true, steps: getSequenceSteps() });
}
