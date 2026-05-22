"use client";

import { useEffect, useState, useRef } from "react";

export default function LogsPage() {
  const [lines, setLines] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [paused, setPaused] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/logs/stream");
    es.onmessage = (e) => {
      const { line } = JSON.parse(e.data);
      setLines((prev) => [...prev.slice(-500), line]);
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (!paused && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines, paused]);

  function logColor(line: string) {
    if (line.includes("ERROR")) return "text-red";
    if (line.includes("SCRAPER")) return "text-green";
    if (line.includes("GROQ") || line.includes("BREVO")) return "text-accent";
    if (line.includes("IMAP")) return "text-amber";
    if (line.includes("SYSTEM")) return "text-txt-secondary";
    return "text-txt-tertiary";
  }

  const filtered = filter
    ? lines.filter((l) => l.toUpperCase().includes(filter.toUpperCase()))
    : lines;

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl shadow-card overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            <span className="text-[10px] font-medium text-txt-muted uppercase tracking-widest">Live system logs</span>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-bg-elevated border border-border rounded-lg text-[11px] text-txt-secondary focus:outline-none focus:border-accent/50"
          >
            <option value="">All</option>
            <option value="SCRAPER">Scraper</option>
            <option value="GROQ">Groq</option>
            <option value="BREVO">Brevo</option>
            <option value="IMAP">IMAP</option>
            <option value="SYSTEM">System</option>
            <option value="ERROR">Errors</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLines([])}
            className="px-3 py-1.5 text-[11px] bg-bg-elevated border border-border rounded-lg text-txt-secondary hover:bg-bg-card hover:text-txt-primary transition-colors"
          >
            Clear display
          </button>
          <button
            onClick={() => setPaused(!paused)}
            className={`px-3 py-1.5 text-[11px] border rounded-lg transition-colors ${
              paused
                ? "border-amber/30 bg-amber-surface text-amber"
                : "border-border bg-bg-elevated text-txt-secondary hover:bg-bg-card"
            }`}
          >
            {paused ? "Resume" : "Pause scroll"}
          </button>
          <span className="text-[10px] text-txt-muted font-mono">1s refresh</span>
        </div>
      </div>

      <div ref={logRef} className="max-h-[calc(100vh-230px)] overflow-y-auto p-1 bg-bg-raised">
        {filtered.length === 0 ? (
          <div className="text-[13px] text-txt-muted text-center py-12">No log entries yet. Run the finder or sync inbox to generate logs.</div>
        ) : (
          filtered.map((line, i) => (
            <div key={i} className="text-[12px] font-mono py-1.5 px-3 flex gap-4 hover:bg-bg-elevated/40 rounded transition-colors leading-relaxed">
              <span className="text-txt-muted shrink-0 select-none">{line.slice(0, 8)}</span>
              <span className={logColor(line)}>{line.slice(10)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
