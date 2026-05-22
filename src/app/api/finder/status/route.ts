import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const STATUS_FILE = path.join(process.cwd(), "data", "finder-status.json");

export function GET() {
  if (!fs.existsSync(STATUS_FILE)) {
    return NextResponse.json({ running: false });
  }
  const status = JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8"));
  return NextResponse.json(status);
}
