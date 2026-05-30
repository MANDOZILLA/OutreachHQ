import { NextResponse } from "next/server";
import { getQuota } from "@/lib/quota";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getQuota());
}
