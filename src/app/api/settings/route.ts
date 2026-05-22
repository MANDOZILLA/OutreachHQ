import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ENV_PATH = path.join(process.cwd(), ".env.local");

function parseEnv(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) return {};
  const content = fs.readFileSync(ENV_PATH, "utf-8");
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

function maskValue(val: string): string {
  if (val.length <= 4) return "****";
  return "•".repeat(val.length - 4) + val.slice(-4);
}

export function GET() {
  const env = parseEnv();
  return NextResponse.json({
    SENDER_NAME: env.SENDER_NAME || "",
    SENDER_EMAIL: env.SENDER_EMAIL || "",
    DAILY_EMAIL_LIMIT: env.DAILY_EMAIL_LIMIT || "300",
    MIN_SCORE_TO_EMAIL: env.MIN_SCORE_TO_EMAIL || "50",
    GROQ_API_KEY: env.GROQ_API_KEY ? maskValue(env.GROQ_API_KEY) : "",
    BREVO_API_KEY: env.BREVO_API_KEY ? maskValue(env.BREVO_API_KEY) : "",
    IMAP_EMAIL: env.IMAP_EMAIL || "",
    IMAP_PASSWORD: env.IMAP_PASSWORD ? maskValue(env.IMAP_PASSWORD) : "",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const current = parseEnv();

  const keysToSave = [
    "SENDER_NAME", "SENDER_EMAIL", "DAILY_EMAIL_LIMIT", "MIN_SCORE_TO_EMAIL",
    "GROQ_API_KEY", "BREVO_API_KEY", "IMAP_EMAIL", "IMAP_PASSWORD",
  ];

  for (const key of keysToSave) {
    if (key in body && !body[key].includes("•")) {
      current[key] = body[key];
    }
  }

  const lines = Object.entries(current).map(([k, v]) => `${k}="${v}"`);
  fs.writeFileSync(ENV_PATH, lines.join("\n") + "\n");

  return NextResponse.json({ ok: true });
}
