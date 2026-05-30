import { NextResponse } from "next/server";
import { runSequence } from "@/lib/sequencer";

// Manually trigger one pass of the follow-up sequencer (same code the cron runs).
export async function POST() {
  const result = runSequence();
  return NextResponse.json({ ok: true, ...result });
}
