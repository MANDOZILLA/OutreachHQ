import { NextRequest, NextResponse } from "next/server";
import { writeLog } from "@/lib/logger";
import fs from "fs";
import path from "path";

const STATUS_FILE = path.join(process.cwd(), "data", "finder-status.json");

function getStatus() {
  if (!fs.existsSync(STATUS_FILE)) return { running: false };
  return JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8"));
}

function setStatus(status: Record<string, unknown>) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(status));
}

export async function POST(req: NextRequest) {
  const current = getStatus();
  if (current.running) {
    return NextResponse.json({ error: "A run is already in progress" }, { status: 409 });
  }

  const body = await req.json();
  const {
    cuisine = "all",
    cities = "all",
    limit = 200,
    minScore = 50,
    minRating = 3.5,
    maxRating = 4.4,
    generateEmails = true,
    sendEmails = false,
  } = body;

  writeLog("SYSTEM", `Finder run started: cuisine=${cuisine}, cities=${cities}, limit=${limit}`);

  setStatus({
    running: true,
    startedAt: new Date().toISOString(),
    config: { cuisine, cities, limit, minScore, minRating, maxRating, generateEmails, sendEmails },
    progress: 0,
    total: limit,
    current: "",
  });

  // Simulate a run in the background — in production this would spawn
  // the RestaurantLeads scraper as a child process
  simulateRun(limit);

  return NextResponse.json({ ok: true, message: "Finder run started" });
}

async function simulateRun(total: number) {
  const names = [
    "Oleana", "Area Four", "Little Donkey", "Tatte Bakery", "Waypoint",
    "Harvest", "Giulia", "Pammy's", "Café Sushi", "Loyal Nine",
    "The Smoke Shop", "Sarma", "Bondir", "Alden & Harlow", "Park Restaurant",
  ];
  const cities = ["Cambridge MA", "Boston MA", "Somerville MA", "Brookline MA"];

  for (let i = 1; i <= Math.min(total, 30); i++) {
    await new Promise((r) => setTimeout(r, 800));
    const name = names[i % names.length];
    const city = cities[i % cities.length];
    const score = Math.floor(Math.random() * 40) + 50;
    const tier = score >= 70 ? "HOT" : score >= 50 ? "WARM" : "COLD";

    if (Math.random() > 0.85) {
      writeLog("SCRAPER", `[${i}/${total}] ${name} — ${city} — skipped (duplicate)`);
    } else {
      writeLog("SCRAPER", `[${i}/${total}] ${name} — ${city} ✓ score: ${score} ${tier}`);
    }

    setStatus({
      running: i < Math.min(total, 30),
      progress: i,
      total,
      current: `${name} — ${city}`,
    });
  }

  writeLog("SYSTEM", "Finder run completed");
  setStatus({ running: false, completedAt: new Date().toISOString() });
}
