"use client";

import { useEffect, useState, useCallback } from "react";
import { timeAgo } from "@/lib/utils";
import {
  IconMapPin,
  IconMail,
  IconStar,
  IconX,
  IconChartBar,
  IconClock,
  IconEye,
  IconArrowRight,
  IconSend,
  IconCheck,
} from "@tabler/icons-react";

interface Lead {
  id: number;
  name: string;
  city: string;
  cuisine: string;
  price_level: string;
  rating: number;
  score: number;
  tier: string;
  hook_type: string;
  hook_text: string;
  replied_at: string;
  reply_text: string | null;
  status: string;
  email_address: string;
  email_body: string | null;
  emailed_at: string | null;
  opted_out: number;
}

interface Grouped {
  interested: Lead[];
  needs_info: Lead[];
  not_interested: Lead[];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function tierLabel(tier: string) {
  if (tier === "hot") return "Hot lead";
  if (tier === "warm") return "Warm lead";
  return "Cold lead";
}

function tierPill(tier: string) {
  if (tier === "hot") return "bg-green-surface text-green-text";
  if (tier === "warm") return "bg-amber-surface text-amber-text";
  return "bg-bg-elevated text-txt-muted";
}

function hookIcon(hookType: string) {
  if (hookType.toLowerCase().includes("price")) return <IconChartBar size={15} className="text-amber shrink-0 mt-0.5" />;
  if (hookType.toLowerCase().includes("rating")) return <IconStar size={15} className="text-red shrink-0 mt-0.5" />;
  return <IconClock size={15} className="text-amber shrink-0 mt-0.5" />;
}

function hookBg(hookType: string) {
  if (hookType.toLowerCase().includes("rating")) return "bg-red-surface";
  return "bg-amber-surface";
}

export default function RepliesPage() {
  const [grouped, setGrouped] = useState<Grouped>({ interested: [], needs_info: [], not_interested: [] });
  const [cities, setCities] = useState<Array<{ city: string }>>([]);
  const [hooks, setHooks] = useState<Array<{ hook_type: string }>>([]);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [hook, setHook] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

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
                    onClick={() => { setSelected(lead); setShowEmail(false); setShowReply(false); setReplyText(""); setSent(false); setSendError(""); }}
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
                        <span className="text-[11px] text-accent">View →</span>
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

      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="w-full max-w-[480px] mx-4 bg-bg-card border border-border rounded-xl overflow-hidden shadow-elevated" onClick={(e) => e.stopPropagation()}>

            <div className="bg-[#0C2340] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#185FA5] flex items-center justify-center text-[15px] font-medium text-[#B5D4F4] shrink-0">
                  {initials(selected.name)}
                </div>
                <div>
                  <div className="text-[15px] font-medium text-[#B5D4F4]">{selected.name}</div>
                  <div className="text-[12px] text-[#378ADD] mt-0.5">
                    {selected.cuisine || "Restaurant"} · {selected.city}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[18px] font-medium text-[#B5D4F4] font-mono flex items-center gap-1 justify-end">
                  <IconStar size={16} className="text-[#B5D4F4]" /> {selected.rating?.toFixed(1) || "—"}
                </div>
                <div className="text-[11px] text-[#378ADD]">{selected.price_level || "$$"}</div>
              </div>
            </div>

            <div className="px-5 py-3.5 grid grid-cols-2 gap-2.5 border-b border-border-subtle">
              <div className="flex items-center gap-2 text-[12px] text-txt-tertiary">
                <IconMapPin size={14} className="text-txt-muted shrink-0" />
                {selected.city}
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <IconMail size={14} className="text-txt-muted shrink-0" />
                <a href={`mailto:${selected.email_address}`} className="text-[#378ADD] truncate hover:underline">
                  {selected.email_address || "—"}
                </a>
              </div>
            </div>

            {selected.hook_text && (
              <div className="px-5 py-4 border-b border-border-subtle">
                <div className="text-[10px] font-medium text-txt-muted uppercase tracking-widest mb-2.5">Where they need help</div>
                <div className={`flex items-start gap-2.5 ${hookBg(selected.hook_type)} rounded-lg p-3`}>
                  {hookIcon(selected.hook_type)}
                  <div>
                    <div className="text-[12px] font-medium text-amber-text">{selected.hook_type}</div>
                    <div className="text-[11px] text-txt-tertiary mt-1 leading-relaxed">{selected.hook_text}</div>
                  </div>
                </div>
              </div>
            )}

            {selected.reply_text && (
              <div className="px-5 py-4 border-b border-border-subtle">
                <div className="text-[10px] font-medium text-txt-muted uppercase tracking-widest mb-2.5">Their reply</div>
                <pre className="text-[12px] text-txt-secondary whitespace-pre-wrap font-sans leading-relaxed bg-bg-elevated rounded-lg p-3">
                  {selected.reply_text}
                </pre>
              </div>
            )}

            {showEmail && selected.email_body && (
              <div className="px-5 py-4 border-b border-border-subtle">
                <div className="text-[10px] font-medium text-txt-muted uppercase tracking-widest mb-2.5">Email sent</div>
                <pre className="text-[12px] text-txt-secondary whitespace-pre-wrap font-sans leading-relaxed bg-bg-elevated rounded-lg p-3 max-h-[200px] overflow-y-auto">
                  {selected.email_body}
                </pre>
              </div>
            )}

            {showReply && (
              <div className="px-5 py-4 border-b border-border-subtle">
                <div className="text-[10px] font-medium text-txt-muted uppercase tracking-widest mb-2.5">Your reply</div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Write your reply to ${selected.name}...`}
                  rows={5}
                  className="w-full px-3.5 py-2.5 bg-bg-elevated border border-border rounded-lg text-[13px] text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all resize-none leading-relaxed"
                />
                {sendError && (
                  <div className="text-[12px] text-red mt-2">{sendError}</div>
                )}
                <div className="flex items-center justify-end gap-2 mt-3">
                  <button
                    onClick={() => { setShowReply(false); setReplyText(""); setSendError(""); }}
                    className="px-3 py-1.5 text-[12px] rounded-lg border border-border-strong bg-transparent text-txt-secondary hover:text-txt-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!replyText.trim()) return;
                      setSending(true);
                      setSendError("");
                      try {
                        const res = await fetch(`/api/leads/${selected.id}/reply`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ message: replyText, subject: `Re: ${selected.name}` }),
                        });
                        const data = await res.json();
                        if (data.ok) {
                          setSent(true);
                          setTimeout(() => {
                            setSent(false);
                            setShowReply(false);
                            setReplyText("");
                          }, 2000);
                        } else {
                          setSendError(data.error || "Failed to send");
                        }
                      } catch {
                        setSendError("Network error — check your connection");
                      } finally {
                        setSending(false);
                      }
                    }}
                    disabled={sending || sent || !replyText.trim()}
                    className={`px-4 py-1.5 text-[12px] font-medium rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40 ${
                      sent
                        ? "bg-green text-white"
                        : "bg-[#185FA5] text-[#B5D4F4] hover:bg-[#1a6abb]"
                    }`}
                  >
                    {sent ? <><IconCheck size={13} /> Sent</> : sending ? "Sending..." : <><IconSend size={13} /> Send reply</>}
                  </button>
                </div>
              </div>
            )}

            <div className="px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`pill ${tierPill(selected.tier)}`}>{tierLabel(selected.tier)}</span>
                <span className="pill bg-bg-elevated text-txt-muted">Score: {selected.score}</span>
                <span className="pill bg-bg-elevated text-txt-muted">{selected.price_level || "$$"}</span>
              </div>
              <div className="flex items-center gap-2">
                {selected.email_body && (
                  <button
                    onClick={() => setShowEmail(!showEmail)}
                    className="px-3 py-1.5 text-[12px] rounded-lg border border-border-strong bg-transparent text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated transition-colors flex items-center gap-1.5"
                  >
                    <IconEye size={13} />
                    {showEmail ? "Hide email" : "View email"}
                  </button>
                )}
                {!selected.opted_out && selected.email_address && !showReply && (
                  <button
                    onClick={() => { setShowReply(true); setSent(false); setSendError(""); }}
                    className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-[#185FA5] text-[#B5D4F4] hover:bg-[#1a6abb] transition-colors flex items-center gap-1.5"
                  >
                    Reply <IconArrowRight size={13} />
                  </button>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg text-txt-muted hover:text-txt-primary hover:bg-bg-elevated transition-colors"
                >
                  <IconX size={16} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
