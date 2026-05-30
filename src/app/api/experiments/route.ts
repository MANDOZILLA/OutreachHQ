import { NextResponse } from "next/server";
import { getVariantStats } from "@/lib/sends";

export const dynamic = "force-dynamic";

// A/B subject-line testing — reply rate per variant.
export function GET() {
  const variants = getVariantStats();
  const totalSent = variants.reduce((a, v) => a + v.sent, 0);
  const totalReplied = variants.reduce((a, v) => a + v.replied, 0);

  // Winner = highest reply rate among variants that have at least one send.
  let winner: string | null = null;
  let best = -1;
  for (const v of variants) {
    if (v.sent > 0 && v.replyRate > best) {
      best = v.replyRate;
      winner = v.variant;
    }
  }

  return NextResponse.json({ variants, totalSent, totalReplied, winner });
}
