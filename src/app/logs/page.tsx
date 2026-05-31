"use client";

import { useEffect, useState, useRef } from "react";

type ChipId = "all" | "errors" | "sends" | "ai";

const CHIPS: { id: ChipId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "errors", label: "Errors only" },
  { id: "sends", label: "Sends only" },
  { id: "ai", label: "AI classify" },
];

function logClass(line: string) {
  const l = line.toUpperCase();
  if (l.includes("ERROR")) return "log-error";
  if (l.includes("WARN") || l.includes("QUOTA") || l.includes("BLACKLIST")) return "log-warn";
  if (l.includes("SCRAPER") || l.includes("[SEND]") || l.includes("BREVO") || l.includes("SENT") || l.includes("SUCCESS") || l.includes("COMPLETE")) return "log-success";
  if (l.includes("GROQ") || l.includes("[AI]") || l.includes("CLASSIF")) return "log-ai";
  return "log-info";
}

function matchesChip(line: string, chip: ChipId) {
  const l = line.toUpperCase();
  switch (chip) {
    case "errors":
      return l.includes("ERROR");
    case "sends":
      return l.includes("[SEND]") || l.includes("BREVO") || l.includes("SENT");
    case "ai":
      return l.includes("GROQ") || l.includes("[AI]") || l.includes("CLASSIF");
    default:
      return true;
  }
}

function splitTime(line: string): { time: string; msg: string } {
  // Lines are formatted like "HH:MM:SS message" (8 char time + space).
  const m = line.match(/^(\d{2}:\d{2}:\d{2})\s+(.*)$/);
  if (m) return { time: m[1], msg: m[2] };
  return { time: "", msg: line };
}

export default function LogsPage() {
  const [lines, setLines] = useState<string[]>([]);
  const [chip, setChip] = useState<ChipId>("all");
  const [paused, setPaused] = useState(false);
  const [live, setLive] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/logs/stream");
    es.onopen = () => setLive(true);
    es.onmessage = (e) => {
      const { line } = JSON.parse(e.data);
      setLines((prev) => [...prev.slice(-500), line]);
    };
    es.onerror = () => setLive(false);
    return () => es.close();
  }, []);

  useEffect(() => {
    if (!paused && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines, paused]);

  const filtered = lines.filter((l) => matchesChip(l, chip));

  return (
    <div className="page" id="page-logs">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div className="sub-pills">
          {CHIPS.map((c) => (
            <div
              key={c.id}
              className={`sp${chip === c.id ? " active" : ""}`}
              onClick={() => setChip(c.id)}
            >
              {c.label}
            </div>
          ))}
        </div>
        <div style={{ display: "inline-flex", gap: 6 }}>
          <button
            className="btn-ghost"
            style={{ fontSize: 11 }}
            onClick={() => setPaused((p) => !p)}
          >
            <i className={`ti ${paused ? "ti-player-play" : "ti-player-pause"}`} />
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            className="btn-ghost"
            style={{ fontSize: 11 }}
            onClick={() => setLines([])}
          >
            <i className="ti ti-trash" /> Clear
          </button>
        </div>
      </div>

      <div className="log-box" id="log-box" ref={logRef}>
        {filtered.map((line, i) => {
          const { time, msg } = splitTime(line);
          return (
            <div className="log-line" key={i}>
              {time && <span className="log-time">{time}</span>}
              <span className={logClass(line)}>{msg}</span>
            </div>
          );
        })}
        {live && !paused && (
          <div className="log-line">
            <span className="log-time log-info">waiting for next run </span>
            <span className="log-cursor" />
          </div>
        )}
      </div>
    </div>
  );
}
