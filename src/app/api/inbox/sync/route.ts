import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { writeLog } from "@/lib/logger";
import { getDb } from "@/lib/db";
import { simpleParser } from "mailparser";
import { classifyReply } from "@/lib/groq";
import { markRepliedForLead } from "@/lib/sends";

function getImapConfig() {
  return {
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: process.env.IMAP_EMAIL || "",
      pass: process.env.IMAP_PASSWORD || "",
    },
    logger: false as const,
  };
}

function extractPlainText(parsed: { text?: string; html?: string | false }): string {
  if (parsed.text) return parsed.text.trim();
  if (parsed.html && typeof parsed.html === "string") {
    return parsed.html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
  }
  return "";
}

export async function POST() {
  const config = getImapConfig();

  if (!config.auth.user || !config.auth.pass) {
    writeLog("IMAP", "Sync skipped — IMAP credentials not configured");
    return NextResponse.json(
      { ok: false, error: "IMAP credentials not set. Add them in Settings." },
      { status: 400 }
    );
  }

  writeLog("IMAP", `Connecting to Gmail as ${config.auth.user}...`);

  const client = new ImapFlow(config);
  let newReplies = 0;

  try {
    await client.connect();
    writeLog("IMAP", "Connected to Gmail IMAP");

    const db = getDb();

    const leads = db
      .prepare(
        `SELECT id, name, email_address FROM leads
         WHERE email_address IS NOT NULL
           AND emailed_at IS NOT NULL
           AND opted_out = 0
           AND deleted_at IS NULL
           AND status != 'replied'`
      )
      .all() as Array<{ id: number; name: string; email_address: string }>;

    if (leads.length === 0) {
      writeLog("IMAP", "No emailed leads to check replies for");
      await client.logout();
      return NextResponse.json({ ok: true, newReplies: 0 });
    }

    const emailToLead = new Map<string, { id: number; name: string }>();
    for (const lead of leads) {
      emailToLead.set(lead.email_address.toLowerCase(), {
        id: lead.id,
        name: lead.name,
      });
    }

    const lock = await client.getMailboxLock("INBOX");

    try {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const messages = client.fetch(
        { since, seen: false },
        { envelope: true, source: true }
      );

      for await (const msg of messages) {
        if (!msg.envelope) continue;
        const fromAddr = msg.envelope.from?.[0]?.address?.toLowerCase();
        if (!fromAddr) continue;

        const lead = emailToLead.get(fromAddr);
        if (!lead) continue;

        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const replyText = extractPlainText(parsed);

        if (!replyText) continue;

        const subject = (msg.envelope.subject || "").toLowerCase();
        const bodyLower = replyText.toLowerCase();

        let status = "interested";
        const optOutPhrases = [
          "unsubscribe",
          "stop emailing",
          "remove me",
          "opt out",
          "do not contact",
          "take me off",
        ];
        const notInterestedPhrases = [
          "not interested",
          "no thanks",
          "no thank you",
          "pass on this",
          "decline",
        ];

        if (optOutPhrases.some((p) => bodyLower.includes(p) || subject.includes(p))) {
          status = "opted_out";
        } else if (notInterestedPhrases.some((p) => bodyLower.includes(p) || subject.includes(p))) {
          status = "not_interested";
        } else if (bodyLower.includes("more info") || bodyLower.includes("tell me more") || bodyLower.includes("details")) {
          status = "needs_info";
        }

        // Classify reply sentiment via Groq (falls back to a heuristic when
        // no GROQ_API_KEY is configured).
        const sentiment = await classifyReply(replyText);
        writeLog("GROQ", `${lead.name} reply sentiment: ${sentiment}`);

        if (status === "opted_out") {
          db.prepare(
            `UPDATE leads SET status = 'replied', reply_text = ?, replied_at = datetime('now'),
             opted_out = 1, sentiment = ?, updated_at = datetime('now') WHERE id = ?`
          ).run(replyText.slice(0, 2000), sentiment, lead.id);
          writeLog("IMAP", `${lead.name} opted out via reply`);
        } else {
          db.prepare(
            `UPDATE leads SET status = ?, reply_text = ?, replied_at = datetime('now'),
             sentiment = ?, updated_at = datetime('now') WHERE id = ?`
          ).run(status, replyText.slice(0, 2000), sentiment, lead.id);
          writeLog("IMAP", `Reply from ${lead.name} — classified as ${status}`);
        }

        // Mark this lead's sends as replied (auto-pauses sequence + feeds A/B stats).
        markRepliedForLead(lead.id);

        newReplies++;
      }
    } finally {
      lock.release();
    }

    await client.logout();
    writeLog("IMAP", `Inbox sync complete — ${newReplies} new ${newReplies === 1 ? "reply" : "replies"}`);

    return NextResponse.json({ ok: true, newReplies });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    writeLog("ERROR", `IMAP sync failed: ${message}`);

    try { await client.logout(); } catch {}

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
