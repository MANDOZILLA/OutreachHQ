"use client";

import { useEffect, useState, useCallback } from "react";
import { timeAgo, tierColor } from "@/lib/utils";
import { useToast } from "@/components/Toast";
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
  IconThumbUp,
  IconBan,
  IconCalendar,
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

type ColumnKey = "interested" | "needs_info" | "not_interested";

const COLUMNS: Array<{
  key: ColumnKey;
  label: string;
  color: string;
  icon: typeof IconThumbUp;
  sentClass: string;
  sentIcon: typeof IconThumbUp;
}> = [
  { key: "interested", label: "Interested", color: "var(--green-2)", icon: IconThumbUp, sentClass: "sent-interested", sentIcon: IconThumbUp },
  { key: "needs_info", label: "Not now", color: "var(--amber)", icon: IconClock, sentClass: "sent-notnow", sentIcon: IconClock },
  { key: "not_interested", label: "Hard no", color: "var(--red)", icon: IconBan, sentClass: "sent-hardno", sentIcon: IconBan },
];

export default function RepliesPage() {
  const toast = useToast();
  const [grouped, setGrouped] = useState<Grouped>({ interested: [], needs_info: [], not_interested: [] });
  const [cities, setCities] = useState<Array<{ city: string }>>([]);
  const [hooks, setHooks] = useState<Array<{ hook_type: string }>>([]);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [hook, setHook] = useState("");
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

  function openLead(lead: Lead) {
    setSelected(lead);
    setShowEmail(false);
    setShowReply(false);
    setReplyText("");
    setSent(false);
    setSendError("");
  }

  async function markWon(lead: Lead) {
    try {
      await fetch(`/api/leads/${lead.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "interested" }),
      });
      toast(`${lead.name} marked as won`);
      load();
    } catch {
      toast("Failed to update");
    }
  }

  async function snooze(lead: Lead) {
    try {
      await fetch(`/api/leads/${lead.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "needs_info" }),
      });
      toast(`${lead.name} snoozed`);
      load();
    } catch {
      toast("Failed to update");
    }
  }

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

      <div className="flex items-center justify-between">
        <div style={{ fontSize: "11.5px", color: "var(--ink-4)", display: "flex", alignItems: "center", gap: "7px" }}>
          <span className="ai-tag">AI</span>
          Replies auto-classified by Groq on IMAP ingest · sequences auto-pause on any reply
        </div>
      </div>

      <div className="kanban">
        {COLUMNS.map((col) => {
          const items = grouped[col.key] || [];
          const ColIcon = col.icon;
          const isHardNo = col.key === "not_interested";
          return (
            <div key={col.key} className="kol">
              <div className="kol-head">
                <div className="kol-title" style={{ color: col.color }}>
                  <ColIcon size={14} />
                  {col.label}
                  <span className="kol-count">{items.length}</span>
                </div>
              </div>
              <div className="kol-body">
                {items.map((lead) => {
                  const SentIcon = col.sentIcon;
                  return (
                    <div key={lead.id} className="kcard" onClick={() => openLead(lead)}>
                      <div className="kcard-top">
                        <div className="kcard-name">{lead.name}</div>
                        <span className={`sent-badge ${col.sentClass}`}>
                          <SentIcon size={11} />
                        </span>
                      </div>
                      <div
                        className="kcard-snippet"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {lead.reply_text || lead.hook_text || "—"}
                      </div>
                      <div className="kcard-foot">
                        {isHardNo ? (
                          <span className="pill p-red">auto-blacklisted</span>
                        ) : (
                          <span className={`pill ${tierColor(lead.tier)}`}>
                            {lead.score} {lead.tier} · {lead.city}
                          </span>
                        )}
                        <span className="kcard-time">{timeAgo(lead.replied_at)}</span>
                      </div>
                      {!isHardNo && (
                        <div className="kcard-actions" onClick={(e) => e.stopPropagation()}>
                          <div className="kc-btn go" onClick={() => openLead(lead)}>
                            <IconSend size={11} /> Reply
                          </div>
                          {col.key === "interested" ? (
                            <div className="kc-btn" onClick={() => markWon(lead)}>
                              <IconCheck size={11} /> Won
                            </div>
                          ) : (
                            <div className="kc-btn" onClick={() => snooze(lead)}>
                              <IconCalendar size={11} /> Snooze
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                          toast(`Reply sent to ${selected.name}`);
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
