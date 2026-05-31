"use client";

import { useEffect, useState, useRef } from "react";
import { IconSearch } from "@tabler/icons-react";

interface RunStatus {
  running: boolean;
  progress?: number;
  total?: number;
  current?: string;
  startedAt?: string;
  completedAt?: string;
  config?: {
    cuisine?: string;
    cities?: string;
    limit?: number;
    minScore?: number;
    minRating?: number;
    maxRating?: number;
    generateEmails?: boolean;
    sendEmails?: boolean;
  };
}

export default function FinderPage() {
  const [cuisine, setCuisine] = useState("all");
  const [cities, setCities] = useState("Austin, TX");
  const [radius, setRadius] = useState("10 miles");
  const [limit, setLimit] = useState(20);
  const [minScore, setMinScore] = useState(60);
  const [generateEmails, setGenerateEmails] = useState(true);
  const [sendEmails, setSendEmails] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [status, setStatus] = useState<RunStatus>({ running: false });
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/finder/status").then((r) => r.json()).then(setStatus);
  }, []);

  useEffect(() => {
    if (!status.running) return;

    const es = new EventSource("/api/finder/stream");
    es.onmessage = (e) => {
      const { line } = JSON.parse(e.data);
      setLogs((prev) => [...prev.slice(-50), line]);
    };

    const poll = setInterval(() => {
      fetch("/api/finder/status").then((r) => r.json()).then(setStatus);
    }, 1500);

    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [status.running]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  async function handleRun() {
    if (sendEmails && !confirm("Send emails is ON. This will send real emails to leads. Continue?")) return;

    const res = await fetch("/api/finder/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuisine, cities, limit, minScore, generateEmails, sendEmails }),
    });
    if (res.ok) {
      setStatus({ running: true, progress: 0, total: limit, current: "Starting..." });
      setLogs([]);
    }
  }

  function logClass(line: string) {
    if (line.includes("ERROR") || line.includes("error") || line.includes("Rate limit")) return "log-error";
    if (line.includes("SCRAPER") || line.includes("✓")) return "log-success";
    if (line.includes("IMAP") || line.includes("GROQ") || line.includes("BREVO")) return "log-warn";
    return "";
  }

  const pct = status.total ? Math.round(((status.progress || 0) / status.total) * 100) : 0;

  const isActive = status.running || logs.length > 0;

  // Derive last-run summary stats from streamed log lines (no fabricated persistence).
  const foundLines = logs.filter((l) => l.includes("SCRAPER") && l.includes("✓"));
  const dupLines = logs.filter((l) => l.includes("skipped"));
  const hotLines = logs.filter((l) => l.includes("HOT"));
  const lastRunDate = status.completedAt || status.startedAt;

  return (
    <div>
      <div className="finder-form">
        <div className="form-row">
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              value={cities}
              onChange={(e) => setCities(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Search radius</label>
            <select value={radius} onChange={(e) => setRadius(e.target.value)}>
              <option>City-wide</option>
              <option>10 miles</option>
              <option>25 miles</option>
              <option>Metro area</option>
            </select>
          </div>
          <div className="form-group">
            <label>Cuisine type</label>
            <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
              <option value="all">Any cuisine</option>
              <option value="cafe">Café / Coffee</option>
              <option value="american">American</option>
              <option value="italian">Italian</option>
              <option value="mexican">Mexican</option>
              <option value="japanese">Japanese</option>
              <option value="chinese">Chinese</option>
              <option value="thai">Thai</option>
              <option value="indian">Indian</option>
              <option value="mediterranean">Mediterranean</option>
            </select>
          </div>
        </div>

        <div className="range-row">
          <label>Min score</label>
          <input
            type="range"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
          <div className="range-val">{minScore}</div>
        </div>

        <div className="range-row">
          <label>Max leads</label>
          <input
            type="range"
            min={5}
            max={50}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
          <div className="range-val">{limit}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--ink-2)", cursor: "pointer" }}>
              <button
                type="button"
                className={`toggle${generateEmails ? " on" : ""}`}
                onClick={() => setGenerateEmails((v) => !v)}
              />
              Generate emails
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--ink-2)", cursor: "pointer" }}>
              <button
                type="button"
                className={`toggle${skipDuplicates ? " on" : ""}`}
                onClick={() => setSkipDuplicates((v) => !v)}
              />
              Skip duplicates
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: sendEmails ? "var(--red)" : "var(--ink-2)", cursor: "pointer" }}>
              <button
                type="button"
                className={`toggle${sendEmails ? " on" : ""}`}
                onClick={() => setSendEmails((v) => !v)}
              />
              Send emails (live)
            </label>
          </div>
          <button
            type="button"
            className="btn-green"
            style={{ padding: "9px 20px", fontSize: 13, opacity: status.running ? 0.5 : 1 }}
            disabled={status.running}
            onClick={handleRun}
          >
            <IconSearch size={14} />
            {status.running ? "Running…" : "Run finder now"}
          </button>
        </div>
      </div>

      {isActive && (
        <div className="card">
          <div className="card-h">
            <div>
              <div className="card-t">
                {status.running
                  ? `Current run — ${status.progress || 0} / ${status.total || "?"} leads`
                  : "Run complete"}
              </div>
              <div className="card-s">
                {status.running ? `Scraping: ${status.current || "…"}` : "Live log output"}
              </div>
            </div>
            {status.running ? (
              <span className="pill p-amber">Running</span>
            ) : (
              <span className="pill p-green">Completed</span>
            )}
          </div>

          {status.running && (
            <div style={{ height: 6, background: "var(--surface-3)", borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: "var(--green)",
                  borderRadius: 3,
                  transition: "width 0.5s ease-out",
                }}
              />
            </div>
          )}

          <div ref={logRef} className="log-box">
            {logs.map((line, i) => (
              <div key={i} className={`log-line ${logClass(line)}`}>
                <span style={{ color: "var(--ink-4)", marginRight: 10 }}>{line.slice(0, 8)}</span>
                {line.slice(10)}
              </div>
            ))}
          </div>
        </div>
      )}

      {!status.running && logs.length > 0 && (
        <div className="card">
          <div className="card-h">
            <div>
              <div className="card-t">Last run{lastRunDate ? ` — ${new Date(lastRunDate).toLocaleString()}` : ""}</div>
              <div className="card-s">
                {cities} · {foundLines.length} leads found · {dupLines.length} duplicates skipped
              </div>
            </div>
            <span className="pill p-green">Completed</span>
          </div>
          <div className="stat-row cols4" style={{ marginBottom: 0 }}>
            <div className="stat">
              <div className="stat-l">Found</div>
              <div className="stat-v">{foundLines.length}</div>
              <div className="stat-s">new leads</div>
            </div>
            <div className="stat">
              <div className="stat-l">Hot leads</div>
              <div className="stat-v">{hotLines.length}</div>
              <div className="stat-s pos">tier HOT</div>
            </div>
            <div className="stat">
              <div className="stat-l">Min score</div>
              <div className="stat-v">{status.config?.minScore ?? minScore}</div>
              <div className="stat-s">threshold</div>
            </div>
            <div className="stat">
              <div className="stat-l">Duplicates</div>
              <div className="stat-v">{dupLines.length}</div>
              <div className="stat-s">skipped</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
