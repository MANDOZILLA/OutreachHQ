"use client";

import { useEffect, useState, useRef } from "react";
import { IconPlayerPlay } from "@tabler/icons-react";

interface RunStatus {
  running: boolean;
  progress?: number;
  total?: number;
  current?: string;
}

export default function FinderPage() {
  const [cuisine, setCuisine] = useState("all");
  const [cities, setCities] = useState("all");
  const [limit, setLimit] = useState(200);
  const [minScore, setMinScore] = useState(50);
  const [minRating, setMinRating] = useState(3.5);
  const [maxRating, setMaxRating] = useState(4.4);
  const [generateEmails, setGenerateEmails] = useState(true);
  const [sendEmails, setSendEmails] = useState(false);
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
      body: JSON.stringify({ cuisine, cities, limit, minScore, minRating, maxRating, generateEmails, sendEmails }),
    });
    if (res.ok) {
      setStatus({ running: true, progress: 0, total: limit, current: "Starting..." });
      setLogs([]);
    }
  }

  function logColor(line: string) {
    if (line.includes("ERROR") || line.includes("error") || line.includes("Rate limit")) return "text-red";
    if (line.includes("SCRAPER") && line.includes("skipped")) return "text-txt-muted";
    if (line.includes("SCRAPER") || line.includes("✓")) return "text-green";
    if (line.includes("GROQ") || line.includes("BREVO")) return "text-accent";
    if (line.includes("IMAP")) return "text-amber";
    return "text-txt-tertiary";
  }

  const pct = status.total ? Math.round(((status.progress || 0) / status.total) * 100) : 0;

  const fieldClass = "px-3.5 py-2.5 bg-bg-elevated border border-border rounded-lg text-[13px] text-txt-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all";
  const labelClass = "text-[10px] font-medium text-txt-muted uppercase tracking-widest";

  return (
    <div className="space-y-3">
      <div className="bg-bg-card border border-border-subtle rounded-xl p-5 shadow-card">
        <div className={`${labelClass} mb-4`}>Run lead finder now</div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Cuisine", el: <select value={cuisine} onChange={(e) => setCuisine(e.target.value)} className={fieldClass}><option value="all">All cuisines</option><option value="italian">Italian</option><option value="mexican">Mexican</option><option value="american">American</option><option value="japanese">Japanese</option><option value="chinese">Chinese</option><option value="thai">Thai</option><option value="indian">Indian</option></select> },
            { label: "Cities", el: <select value={cities} onChange={(e) => setCities(e.target.value)} className={fieldClass}><option value="all">All US cities</option><option value="northeast">Northeast only</option><option value="custom">Custom list</option></select> },
            { label: "Limit", el: <input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className={fieldClass} /> },
            { label: "Min score", el: <input type="number" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className={fieldClass} /> },
          ].map((f) => (
            <div key={f.label} className="flex flex-col gap-1.5">
              <label className={labelClass}>{f.label}</label>
              {f.el}
            </div>
          ))}
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Min rating</label>
            <input type="number" value={minRating} step={0.1} onChange={(e) => setMinRating(Number(e.target.value))} className={`${fieldClass} w-[80px]`} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Max rating</label>
            <input type="number" value={maxRating} step={0.1} onChange={(e) => setMaxRating(Number(e.target.value))} className={`${fieldClass} w-[80px]`} />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-txt-secondary cursor-pointer ml-4 pb-1">
            <input type="checkbox" checked={generateEmails} onChange={(e) => setGenerateEmails(e.target.checked)} className="accent-accent w-4 h-4 rounded" />
            Generate emails
          </label>
          <label className="flex items-center gap-2 text-[13px] text-txt-secondary cursor-pointer pb-1">
            <input type="checkbox" checked={sendEmails} onChange={(e) => setSendEmails(e.target.checked)} className="accent-red w-4 h-4 rounded" />
            <span className={sendEmails ? "text-red" : ""}>Send emails</span>
          </label>
          <div className="flex-1" />
          <button
            onClick={handleRun}
            disabled={status.running}
            className="bg-accent text-white border-none rounded-lg px-4 py-2.5 text-[12px] font-medium cursor-pointer flex items-center gap-2 hover:bg-accent-hover disabled:opacity-40 transition-all shadow-glow"
          >
            <IconPlayerPlay size={12} />
            {status.running ? "Running..." : "Run now"}
          </button>
        </div>
      </div>

      {(status.running || logs.length > 0) && (
        <div className="bg-bg-card border border-border-subtle rounded-xl p-5 shadow-card">
          <div className={`${labelClass} mb-3`}>
            {status.running
              ? `Current run — ${status.progress || 0} / ${status.total || "?"} leads`
              : "Last run complete"}
          </div>
          {status.running && (
            <>
              <div className="h-1.5 bg-bg-elevated rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-500 ease-out shadow-glow" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[12px] text-txt-tertiary mb-3 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Scraping: {status.current || "..."}
              </div>
            </>
          )}
          <div ref={logRef} className="max-h-[220px] overflow-y-auto bg-bg-raised rounded-lg p-3">
            {logs.map((line, i) => (
              <div key={i} className="text-[12px] font-mono py-1 flex gap-3 leading-relaxed">
                <span className="text-txt-muted shrink-0 select-none">{line.slice(0, 8)}</span>
                <span className={logColor(line)}>{line.slice(10)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
