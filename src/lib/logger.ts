import fs from "fs";
import path from "path";

const LOG_PATH = path.join(process.cwd(), "data", "system.log");

function ensureLogDir() {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
}

export type LogProcess = "SCRAPER" | "GROQ" | "BREVO" | "IMAP" | "SYSTEM" | "ERROR";

export function writeLog(process: LogProcess, message: string) {
  const ts = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const line = `${ts}  ${process.padEnd(8)} ${message}\n`;
  ensureLogDir();
  fs.appendFileSync(LOG_PATH, line);
}

export function readLastLines(n: number = 200): string[] {
  if (!fs.existsSync(LOG_PATH)) return [];
  const content = fs.readFileSync(LOG_PATH, "utf-8");
  const lines = content.split("\n").filter(Boolean);
  return lines.slice(-n);
}
