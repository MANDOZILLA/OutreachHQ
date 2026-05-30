// Reply sentiment classification via Groq.
//
// Given the plain text of a lead's reply, classify it into one of three
// sentiment buckets. If a GROQ_API_KEY is configured we ask a Groq-hosted
// model; otherwise we fall back to a deterministic keyword heuristic so the
// app keeps working with zero credentials.

import { writeLog } from "./logger";
import { getEnv } from "./env";

export type Sentiment = "interested" | "not_now" | "hard_no";

export const SENTIMENTS: Sentiment[] = ["interested", "not_now", "hard_no"];

const HARD_NO = [
  "unsubscribe", "stop emailing", "remove me", "opt out", "do not contact",
  "take me off", "not interested", "no thanks", "no thank you", "leave us alone",
];
const NOT_NOW = [
  "not right now", "maybe later", "circle back", "next quarter", "next year",
  "busy", "too busy", "follow up", "reach out later", "not at this time",
  "more info", "tell me more", "details", "send me",
];
const INTERESTED = [
  "interested", "sounds good", "let's talk", "lets talk", "book a call",
  "schedule", "demo", "yes", "happy to", "love to", "tell me when", "pricing",
];

export function classifyReplyHeuristic(text: string): Sentiment {
  const t = text.toLowerCase();
  if (HARD_NO.some((p) => t.includes(p))) return "hard_no";
  if (INTERESTED.some((p) => t.includes(p))) return "interested";
  if (NOT_NOW.some((p) => t.includes(p))) return "not_now";
  // Default: a neutral reply that engaged at all leans "not now" over a hard no.
  return "not_now";
}

/**
 * Classify reply sentiment. Uses Groq when GROQ_API_KEY is set, otherwise a
 * local heuristic. Always resolves to a valid Sentiment.
 */
export async function classifyReply(text: string): Promise<Sentiment> {
  const clean = (text || "").trim();
  if (!clean) return "not_now";

  const apiKey = getEnv("GROQ_API_KEY");
  if (!apiKey) {
    return classifyReplyHeuristic(clean);
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0,
        max_tokens: 4,
        messages: [
          {
            role: "system",
            content:
              "You classify cold-outreach email replies. Respond with EXACTLY one " +
              "word: 'interested' (wants to talk / learn more / positive), " +
              "'not_now' (neutral, busy, later, or asking to follow up another time), " +
              "or 'hard_no' (clear rejection, not interested, unsubscribe). " +
              "Output only the label.",
          },
          { role: "user", content: clean.slice(0, 2000) },
        ],
      }),
    });

    if (!res.ok) {
      writeLog("ERROR", `Groq classify failed (${res.status}) — using heuristic`);
      return classifyReplyHeuristic(clean);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = (data.choices?.[0]?.message?.content || "").toLowerCase();
    const match = SENTIMENTS.find((s) => raw.includes(s));
    return match || classifyReplyHeuristic(clean);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    writeLog("ERROR", `Groq classify error: ${msg} — using heuristic`);
    return classifyReplyHeuristic(clean);
  }
}
