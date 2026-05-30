// Small helper for reading runtime config. Settings are persisted to
// .env.local by the Settings UI; this reads that file (falling back to
// process.env) so server code can pick up changes without a restart.

import fs from "fs";
import path from "path";

const ENV_PATH = path.join(process.cwd(), ".env.local");

export function parseEnvFile(): Record<string, string> {
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

/** Read a single config value, preferring .env.local then process.env. */
export function getEnv(key: string): string | undefined {
  const fromFile = parseEnvFile()[key];
  if (fromFile != null && fromFile !== "") return fromFile;
  return process.env[key];
}

/** Read a numeric config value with a fallback. */
export function getEnvNumber(key: string, fallback: number): number {
  const v = getEnv(key);
  const n = v != null ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}
