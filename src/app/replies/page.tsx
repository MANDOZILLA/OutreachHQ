"use client";

import { useEffect, useState, useCallback } from "react";
import { timeAgo } from "@/lib/utils";

interface Lead {
  id: number;
  name: string;
  city: string;
  price_level: string;
  rating: number;
  hook_type: string;
  hook_text: string;
  replied_at: string;
  status: string;
  email_address: string;
  opted_out: number;
}

interface Grouped {
  interested: Lead[];
  needs_info: Lead[];
  not_interested: Lead[];
}

export default function RepliesPage() {
  const [grouped, setGrouped] = useState<Grouped>({ interested: [], needs_info: [], not_interested: [] });
  const [cities, setCities] = useState<Array<{ city: string }>>([]);
  const [hooks, setHooks] = useState<Array<{ hook_type: string }>>([]);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [hook, setHook] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (city) params.set("city", city);
    if (hook) params.set("hook", hook);
    fetch(`/api/replies?${params}`).then((r) => r.json()).then((d) => {
      setGrouped(d.grouped);
      setCities(d.cities);
      setHooks(d.hooks);
    });
  }, [search, city, hook]);

  useEffect(() => { load(); }, [load]);

  async function handleDrop(newStatus: string) {
    if (dragId === null) return;
    await fetch(`/api/leads/${dragId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setDragId(null);
    load();
  }

  const columns = [
    { key: "interested", label: "Interested", accent: "border-l-2 border-l-green", dot: "bg-green" },
    { key: "needs_info", label: "Needs info", accent: "border-l-2 border-l-amber", dot: "bg-amber" },
    { key: "not_interested", label: "Not interested", accent: "", dot: "bg-txt-muted" },
  ] as const;

  return (
    <div className="space-y-3">
      <div className="flex gap-2.5 items-center">
        <input
          type="text"
          placeholder="Search restaurants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3.5 py-2.5 bg-bg-card border border-border rounded-lg text-[13px] text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
        />
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="px-3 py-2.5 bg-bg-card border border-border rounded-lg text-[13px] text-txt-secondary focus:outline-none focus:border-accent/50"
        >
          <option value="">All cities</option>
          {cities.map((c) => <option key={c.city} value={c.city}>{c.city}</option>)}
        </select>
        <select
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          className="px-3 py-2.5 bg-bg-card border border-border rounded-lg text-[13px] text-txt-secondary focus:outline-none focus:border-accent/50"
        >
          <option value="">All hooks</option>
          {hooks.map((h) => <option key={h.hook_type} value={h.hook_type}>{h.hook_type}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {columns.map((col) => {
          const items = grouped[col.key];
          return (
            <div
              key={col.key}
              className="bg-bg-raised rounded-xl p-3 min-h-[200px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.key)}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="text-[12px] font-medium text-txt-primary">{col.label}</span>
                </div>
                <span className="text-[11px] font-mono text-txt-muted bg-bg-elevated border border-border-subtle rounded-md px-2 py-0.5">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragId(lead.id)}
                    className={`bg-bg-card border border-border-subtle rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-border-strong transition-all duration-150 ${col.accent} ${col.accent ? "rounded-l-none" : ""}`}
                  >
                    <div className="text-[13px] font-medium text-txt-primary mb-1">{lead.name}</div>
                    <div className="text-[11px] text-txt-tertiary mb-2">
                      {lead.city} · {lead.price_level || "$$"} · ★ {lead.rating?.toFixed(1) || "—"}
                    </div>
                    <div className="text-[11px] text-txt-secondary border-l-2 border-border-strong pl-2 mb-2.5 leading-relaxed">
                      {lead.hook_text || lead.hook_type || "—"}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-txt-muted font-mono">{timeAgo(lead.replied_at)}</span>
                      {lead.opted_out ? (
                        <span className="text-[10px] text-txt-muted">Opted out</span>
                      ) : (
                        <a
                          href={`mailto:${lead.email_address || ""}`}
                          className="text-[11px] text-accent hover:text-accent-text transition-colors"
                        >
                          Reply →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-[12px] text-txt-muted text-center py-8">No leads</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
