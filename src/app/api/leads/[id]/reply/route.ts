import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { writeLog } from "@/lib/logger";
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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  const { message, subject } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ ok: false, error: "Message is required" }, { status: 400 });
  }

  const db = getDb();
  const lead = db.prepare(
    "SELECT id, name, email_address, opted_out FROM leads WHERE id = ? AND deleted_at IS NULL"
  ).get(id) as { id: number; name: string; email_address: string; opted_out: number } | undefined;

  if (!lead) {
    return NextResponse.json({ ok: false, error: "Lead not found" }, { status: 404 });
  }

  if (lead.opted_out) {
    return NextResponse.json({ ok: false, error: "This lead has opted out" }, { status: 403 });
  }

  if (!lead.email_address) {
    return NextResponse.json({ ok: false, error: "No email address for this lead" }, { status: 400 });
  }

  const env = parseEnv();
  const apiKey = env.BREVO_API_KEY;
  const senderName = env.SENDER_NAME || "OutreachHQ";
  const senderEmail = env.SENDER_EMAIL;
  const testMode = env.TEST_MODE === "true";
  const testEmail = env.TEST_EMAIL;

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Brevo API key not configured. Add it in Settings." }, { status: 400 });
  }

  if (!senderEmail) {
    return NextResponse.json({ ok: false, error: "Sender email not configured. Add it in Settings." }, { status: 400 });
  }

  const recipientEmail = testMode && testEmail ? testEmail : lead.email_address;
  const emailSubject = subject || `Re: ${lead.name}`;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: recipientEmail, name: lead.name }],
        subject: emailSubject,
        textContent: message,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errMsg = (err as Record<string, string>).message || `Brevo returned ${res.status}`;
      writeLog("ERROR", `Reply to ${lead.name} failed: ${errMsg}`);
      return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
    }

    if (testMode) {
      writeLog("BREVO", `Test reply sent to ${testEmail} (real: ${lead.email_address}) for ${lead.name}`);
    } else {
      writeLog("BREVO", `Reply sent to ${lead.name} at ${lead.email_address}`);
    }

    return NextResponse.json({ ok: true, testMode, sentTo: recipientEmail });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    writeLog("ERROR", `Reply failed: ${errMsg}`);
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
