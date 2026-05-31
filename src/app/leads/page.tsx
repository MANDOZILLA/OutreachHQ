"use client";

import { useEffect, useState, useCallback } from "react";
import {
  tierColor,
  statusColor,
  statusLabel,
  sentimentLabel,
} from "@/lib/utils";
import { Panel } from "@/components/Panel";
import { useToast } from "@/components/Toast";
import {
  IconDownload,
  IconChevronRight,
  IconThumbUp,
  IconClock,
  IconBan,
  IconWorld,
  IconStar,
  IconPhone,
  IconDeviceDesktop,
  IconPlayerPause,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";

interface Lead {
  id: number;
  name: string;
  city: string;
  state: string | null;
  score: number;
  lead_score: number | null;
  tier: string;
  hook_type: string;
  status: string;
  emailed_at: string | null;
  replied_at: string | null;
  opted_out: number;
  blacklisted: number;
  sentiment: string | null;
  email_body: string | null;
  sequence_step: number;
  sequence_complete: number;
  first_contacted_at: string | null;
  // Not selected by the list query, but present on the full detail record.
  // Optional here so list rows and detail records share isOverdue/SeqTrack.
  last_contacted_at?: string | null;
}

// Full lead record returned by GET /api/leads/[id] (SELECT *).
interface LeadDetail extends Lead {
  rating: number | null;
  price_level: string | null;
  email_address: string | null;
  email_subject?: string | null;
  reply_text: string | null;
  hook_text: string | null;
  last_contacted_at: string | null;
  has_website: number;
  has_phone: number;
  has_reviews: number;
  uses_competitor_pos: number;
}

// Days since last contact — used to flag overdue sequence steps.
function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

// A lead with an active (not complete, not replied/opted-out) sequence whose
// last contact was more than 7 days ago is treated as having an overdue email.
function isOverdue(lead: Lead): boolean {
  if (lead.blacklisted || lead.opted_out || lead.replied_at) return false;
  if (lead.sequence_complete === 1) return false;
  if (!lead.emailed_at) return false;
  const d = daysSince(lead.last_contacted_at ?? lead.emailed_at);
  return d != null && d >= 7;
}

// Status pill / sentiment badge shown in the table's Status column.
function StatusCell({ lead }: { lead: Lead }) {
  if (lead.blacklisted) return <span className="pill p-red">Blacklisted</span>;
  if (lead.replied_at && lead.sentiment) {
    const map: Record<string, { cls: string; icon: typeof IconThumbUp; label: string }> = {
      interested: { cls: "sent-interested", icon: IconThumbUp, label: sentimentLabel("interested") },
      not_now: { cls: "sent-notnow", icon: IconClock, label: sentimentLabel("not_now") },
      hard_no: { cls: "sent-hardno", icon: IconBan, label: sentimentLabel("hard_no") },
    };
    const m = map[lead.sentiment];
    if (m) {
      const Icon = m.icon;
      return (
        <span className={`sent-badge ${m.cls}`}>
          <Icon size={11} /> {m.label}
        </span>
      );
    }
  }
  if (lead.opted_out) return <span className="pill p-gray">Opted out</span>;
  if (isOverdue(lead)) {
    const step = Math.min((lead.sequence_step || 0) + 1, 3);
    return <span className="pill p-amber">Email {step} due</span>;
  }
  if (lead.sequence_complete === 1) return <span className="pill p-green">Complete</span>;
  if (lead.sequence_step >= 1)
    return <span className="pill p-blue">Email {lead.sequence_step} sent</span>;
  return <span className={`pill ${statusColor(lead.status)}`}>{statusLabel(lead.status)}</span>;
}

// 3-dot sequence track reflecting sequence_step / sequence_complete / paused.
function SeqTrack({ lead, big = false }: { lead: Lead; big?: boolean }) {
  const paused = !!lead.replied_at && lead.sequence_complete !== 1;
  const overdue = isOverdue(lead);
  const dots = [1, 2, 3];
  const dotStyle = big ? { width: 10, height: 10 } : undefined;
  const lineStyle = big ? { width: 20 } : undefined;
  return (
    <div className="seq-track" style={big ? { gap: 5 } : undefined}>
      {dots.map((i) => {
        let cls = "";
        if (i <= lead.sequence_step) {
          if (paused && i === lead.sequence_step) cls = "paused";
          else if (overdue && i === lead.sequence_step) cls = "active";
          else cls = "done";
        }
        return (
          <span key={`d${i}`} className="contents">
            <div className={`seq-dot ${cls}`} style={dotStyle} />
            {i < 3 && (
              <div className={`seq-line ${i < lead.sequence_step ? "done" : ""}`} style={lineStyle} />
            )}
          </span>
        );
      })}
    </div>
  );
}

export default function LeadsPage() {
  const toast = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [blacklistedCount, setBlacklistedCount] = useState(0);
  const [page, setPage] = useState(1);
  const [cities, setCities] = useState<Array<{ city: string }>>([]);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [blacklisted, setBlacklisted] = useState(""); // "" active-only, "include", "1" only

  const [selected, setSelected] = useState<LeadDetail | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (search) params.set("search", search);
    if (tier) params.set("tier", tier);
    if (status) params.set("status", status);
    if (city) params.set("city", city);
    // "" => active only (blacklisted=0); "1" => blacklisted only; "include" => no filter
    if (blacklisted === "") params.set("blacklisted", "0");
    else if (blacklisted === "1") params.set("blacklisted", "1");
    fetch(`/api/leads?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.leads);
        setTotal(d.total);
        setCities(d.cities);
      });
    // Separate count of blacklisted leads for the summary line.
    fetch(`/api/leads?blacklisted=1&limit=1`)
      .then((r) => r.json())
      .then((d) => setBlacklistedCount(d.total));
  }, [page, search, tier, status, city, blacklisted]);

  useEffect(() => {
    load();
  }, [load]);

  async function openLead(id: number) {
    const r = await fetch(`/api/leads/${id}`);
    if (!r.ok) return;
    const d = (await r.json()) as LeadDetail;
    setSelected(d);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
  }

  async function handleBlacklist(lead: LeadDetail) {
    const next = lead.blacklisted ? 0 : 1;
    await fetch(`/api/leads/${lead.id}/blacklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blacklisted: next }),
    });
    toast(
      next
        ? `${lead.name} blacklisted — removed from all sequences`
        : `${lead.name} removed from blacklist`
    );
    setSelected({ ...lead, blacklisted: next });
    load();
  }

  async function handleSendOverdue(lead: LeadDetail) {
    const res = await fetch(`/api/leads/${lead.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: lead.email_body || `Following up with ${lead.name}.`,
        subject: lead.email_subject || `Re: ${lead.name}`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) toast("Email sent via Brevo");
    else toast(data.error || "Send failed");
  }

  async function handleOptOut(lead: LeadDetail) {
    await fetch(`/api/leads/${lead.id}/optout`, { method: "PATCH" });
    toast(`${lead.name} marked opted out`);
    setSelected({ ...lead, opted_out: 1, status: "opted_out" });
    load();
  }

  async function handleDelete(id: number) {
    setConfirmDelete(null);
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    toast("Lead deleted");
    if (selected?.id === id) closePanel();
    load();
  }

  function exportCSV() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (tier) params.set("tier", tier);
    if (status) params.set("status", status);
    if (city) params.set("city", city);
    if (blacklisted === "0" || blacklisted === "") params.set("blacklisted", "0");
    else if (blacklisted === "1") params.set("blacklisted", "1");
    params.set("limit", "10000");
    fetch(`/api/leads?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const rows = d.leads.map((l: Lead) =>
          [l.name, l.city, l.score, l.tier, l.hook_type, l.status, l.emailed_at || ""].join(",")
        );
        const csv = "Restaurant,City,Score,Tier,Hook,Status,Emailed\n" + rows.join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "leads-export.csv";
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  const totalPages = Math.ceil(total / 50);

  const selectStyle =
    "px-2.5 py-[7px] bg-[var(--surface)] border border-[var(--border-2)] rounded-[7px] text-[12px] text-[var(--ink-2)] outline-none";

  return (
    <div>
      {/* FILTER ROW */}
      <div className="flex items-center gap-2 mb-3.5 flex-wrap">
        <input
          type="text"
          placeholder="Search leads..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-[220px] px-[11px] py-[7px] bg-[var(--surface)] border border-[var(--border-2)] rounded-[7px] text-[12.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-4)] focus:border-[var(--green-d)]"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={selectStyle}
        >
          <option value="">All steps</option>
          <option value="not_emailed">Not sent</option>
          <option value="emailed">Emailed</option>
          <option value="replied">Replied</option>
          <option value="opted_out">Opted out</option>
        </select>
        <select
          value={tier}
          onChange={(e) => {
            setTier(e.target.value);
            setPage(1);
          }}
          className={selectStyle}
        >
          <option value="">All scores</option>
          <option value="hot">Hot (80+)</option>
          <option value="warm">Warm (60–79)</option>
          <option value="cold">Cold (&lt;60)</option>
        </select>
        <select
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setPage(1);
          }}
          className={selectStyle}
        >
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c.city} value={c.city}>
              {c.city}
            </option>
          ))}
        </select>
        <select
          value={blacklisted}
          onChange={(e) => {
            setBlacklisted(e.target.value);
            setPage(1);
          }}
          className={selectStyle}
        >
          <option value="">Active only</option>
          <option value="include">Include blacklisted</option>
          <option value="1">Blacklisted only</option>
        </select>
        <button
          onClick={exportCSV}
          className="btn-ghost"
          title="Export current view to CSV"
        >
          <IconDownload size={14} /> Export CSV
        </button>
        <div className="ml-auto text-[11px] text-[var(--ink-4)]">
          {total} leads · {blacklistedCount} blacklisted
        </div>
      </div>

      {/* TABLE */}
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ paddingLeft: 18 }}>Restaurant</th>
              <th>Score</th>
              <th>Sequence</th>
              <th>Days since</th>
              <th>City</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "32px 0", color: "var(--ink-4)" }}>
                  No leads found
                </td>
              </tr>
            ) : (
              leads.map((l) => {
                const overdue = isOverdue(l);
                const cityLabel = [l.city, l.state].filter(Boolean).join(", ") || "—";
                const days = daysSince(l.last_contacted_at ?? l.emailed_at);
                return (
                  <tr
                    key={l.id}
                    onClick={() => openLead(l.id)}
                    style={l.blacklisted ? { opacity: 0.5 } : undefined}
                  >
                    <td className="name" style={{ paddingLeft: 18 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        {l.name}
                        {l.blacklisted ? (
                          <IconBan size={11} style={{ color: "var(--red)" }} />
                        ) : null}
                      </span>
                    </td>
                    <td>
                      <span className={`pill ${tierColor(l.tier)}`}>
                        {l.score} {l.tier || "—"}
                      </span>
                    </td>
                    <td>
                      <SeqTrack lead={l} />
                    </td>
                    <td className="mono" style={overdue ? { color: "var(--amber)" } : undefined}>
                      {days == null ? "—" : `${days}d${overdue ? " ⚠" : ""}`}
                    </td>
                    <td style={{ color: "var(--ink-3)" }}>{cityLabel}</td>
                    <td>
                      <StatusCell lead={l} />
                    </td>
                    <td style={{ textAlign: "right", paddingRight: 18 }}>
                      <IconChevronRight size={14} style={{ color: "var(--ink-4)" }} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3.5">
          <span className="text-[11px] text-[var(--ink-4)]">
            {total} leads total · Page {page} of {totalPages}
          </span>
          <div className="flex gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="btn-ghost disabled:opacity-30"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="btn-ghost disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* SLIDE-OUT LEAD PANEL */}
      <Panel open={panelOpen} title={selected?.name || "Lead Profile"} onClose={closePanel}>
        {selected && <LeadPanelBody lead={selected} onBlacklist={handleBlacklist} onSend={handleSendOverdue} onOptOut={handleOptOut} onDelete={(id) => setConfirmDelete(id)} />}
      </Panel>

      {/* DELETE CONFIRM */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="card" style={{ maxWidth: 360, width: "100%", margin: "0 16px" }}>
            <div className="text-[15px] font-semibold text-[var(--ink)] mb-2">Delete lead?</div>
            <p className="text-[12.5px] text-[var(--ink-3)] mb-5">
              This will soft-delete the lead. It won&apos;t appear in lists anymore.
            </p>
            <div className="flex gap-2.5 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="btn-red">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Score-breakdown signal definitions, labelled per src/lib/scoring.ts weights.
const SCORE_SIGNALS: Array<{
  key: "has_website" | "has_phone" | "has_reviews";
  icon: typeof IconWorld;
  label: string;
  pts: number;
}> = [
  { key: "has_website", icon: IconWorld, label: "Has website", pts: 3 },
  { key: "has_phone", icon: IconPhone, label: "Has phone", pts: 2 },
  { key: "has_reviews", icon: IconStar, label: "Has Google reviews", pts: 3 },
];

function LeadPanelBody({
  lead,
  onBlacklist,
  onSend,
  onOptOut,
  onDelete,
}: {
  lead: LeadDetail;
  onBlacklist: (l: LeadDetail) => void;
  onSend: (l: LeadDetail) => void;
  onOptOut: (l: LeadDetail) => void;
  onDelete: (id: number) => void;
}) {
  const cityLabel = [lead.city, lead.state].filter(Boolean).join(", ") || "—";
  const overdue = isOverdue(lead);
  const paused = !!lead.replied_at && lead.sequence_complete !== 1;
  const days = daysSince(lead.last_contacted_at ?? lead.emailed_at);

  const info: Array<[string, string]> = [
    ["Score", `${lead.score} — ${lead.tier ? lead.tier[0].toUpperCase() + lead.tier.slice(1) : "—"}`],
    ["Lead fit", lead.lead_score != null ? `${lead.lead_score}/10` : "—"],
    ["Rating", lead.rating != null ? `★ ${lead.rating}` : "—"],
    ["Price level", lead.price_level || "—"],
    ["City", cityLabel],
    ["POS detected", lead.uses_competitor_pos ? "Competitor POS" : "none"],
    ["Email", lead.email_address || "—"],
  ];

  let seqStatus: string;
  if (lead.blacklisted) seqStatus = "Blacklisted — removed from sequences";
  else if (lead.opted_out) seqStatus = "Opted out";
  else if (paused)
    seqStatus = `Paused — replied${lead.sentiment ? ` (${sentimentLabel(lead.sentiment)})` : ""}`;
  else if (overdue)
    seqStatus = `Email ${Math.min((lead.sequence_step || 0) + 1, 3)} overdue${days != null ? ` (day ${days})` : ""}`;
  else if (lead.sequence_complete === 1) seqStatus = "Sequence complete";
  else if (lead.sequence_step >= 1) seqStatus = `Email ${lead.sequence_step} sent`;
  else seqStatus = "Not sent yet";

  const statusColorVar = overdue ? "var(--amber)" : paused ? "var(--blue)" : "var(--ink-3)";

  // Email sequence cards built from the lead's generated body / reply.
  const emails: Array<{ step: string; status: string; body: string; overdue: boolean }> = [];
  for (let i = 1; i <= 3; i++) {
    let st = "Not sent yet";
    let isOver = false;
    if (i < lead.sequence_step || (i === lead.sequence_step && !paused && !overdue)) st = "Sent";
    else if (i === lead.sequence_step && paused) st = "Paused — lead replied";
    else if (i === lead.sequence_step + (lead.sequence_step > 0 ? 1 : 0) && overdue) {
      st = "⚠ Overdue — send now";
      isOver = true;
    }
    let body = "";
    if (i === 1) body = lead.email_body || "";
    if (paused && i === lead.sequence_step) body = lead.reply_text || "(sequence auto-paused when they replied)";
    emails.push({ step: `Email ${i}`, status: st, body, overdue: isOver });
  }

  return (
    <>
      <div className="p-section">
        <div className="p-section-t">Lead info</div>
        {info.map(([l, v]) => (
          <div className="p-row" key={l}>
            <span className="lbl">{l}</span>
            <span className="val">{v}</span>
          </div>
        ))}
      </div>

      {/* SCORE BREAKDOWN */}
      <div className="p-section">
        <div className="p-section-t">Lead score breakdown</div>
        <div className="score-breakdown">
          {SCORE_SIGNALS.map((sig) => {
            const on = !!lead[sig.key];
            const Icon = sig.icon;
            return (
              <div className="score-line" key={sig.key}>
                <span className="sl-label">
                  <Icon size={13} /> {sig.label}
                </span>
                <span className={`sl-val ${on ? "sl-plus" : "sl-minus"}`}>
                  {on ? `+${sig.pts}` : "0"}
                </span>
              </div>
            );
          })}
          <div className="score-line">
            <span className="sl-label">
              <IconDeviceDesktop size={13} />{" "}
              {lead.uses_competitor_pos ? "Uses competitor POS" : "No POS lock-in"}
            </span>
            <span className={`sl-val ${lead.uses_competitor_pos ? "sl-minus" : "sl-plus"}`}>
              {lead.uses_competitor_pos ? "0" : "+2"}
            </span>
          </div>
          <div className="score-total">
            <span>Total fit score</span>
            <span className="mono">{lead.lead_score != null ? `${lead.lead_score}/10` : "—"}</span>
          </div>
        </div>
      </div>

      {/* REPLY SENTIMENT */}
      {lead.replied_at && lead.sentiment && (
        <div className="p-section">
          <div className="p-section-t">
            Reply sentiment <span className="ai-tag">AI</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: 10,
              background: "var(--surface-2)",
              borderRadius: 7,
            }}
          >
            <span
              className={`sent-badge ${
                lead.sentiment === "not_now"
                  ? "sent-notnow"
                  : lead.sentiment === "hard_no"
                  ? "sent-hardno"
                  : "sent-interested"
              }`}
            >
              {lead.sentiment === "not_now" ? (
                <IconClock size={11} />
              ) : lead.sentiment === "hard_no" ? (
                <IconBan size={11} />
              ) : (
                <IconThumbUp size={11} />
              )}{" "}
              {sentimentLabel(lead.sentiment)}
            </span>
            <span style={{ fontSize: 11, color: "var(--ink-4)" }}>Groq · auto-classified</span>
          </div>
        </div>
      )}

      {/* SEQUENCE STATUS */}
      <div className="p-section">
        <div className="p-section-t">Sequence status</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 10,
            background: "var(--surface-2)",
            borderRadius: 7,
            marginBottom: 10,
          }}
        >
          <SeqTrack lead={lead} big />
          <span style={{ fontSize: 11, color: statusColorVar, display: "inline-flex", alignItems: "center", gap: 4 }}>
            {paused && <IconPlayerPause size={12} />}
            {seqStatus}
          </span>
        </div>
      </div>

      {/* EMAIL SEQUENCE */}
      <div className="p-section">
        <div className="p-section-t">Email sequence</div>
        {emails.map((e) => (
          <div
            className="email-preview"
            key={e.step}
            style={e.overdue ? { borderColor: "var(--amber)", background: "var(--amber-bg)" } : undefined}
          >
            <div className="email-preview-h">
              <span className="email-preview-step">{e.step}</span>
              <span
                className="email-preview-status"
                style={{
                  fontSize: 10,
                  color: e.overdue
                    ? "var(--amber)"
                    : e.status.startsWith("Sent")
                    ? "var(--green)"
                    : "var(--ink-4)",
                }}
              >
                {e.status}
              </span>
            </div>
            {e.body ? (
              <div className="email-body" style={{ whiteSpace: "pre-line" }}>
                {e.body}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "var(--ink-4)" }}>Not yet generated</div>
            )}
          </div>
        ))}
      </div>

      {overdue && !lead.blacklisted && (
        <button className="send-btn" onClick={() => onSend(lead)}>
          <IconSend size={13} /> Send overdue email now
        </button>
      )}

      <button className="blacklist-btn" onClick={() => onBlacklist(lead)}>
        <IconBan size={13} />
        {lead.blacklisted ? "Remove from blacklist" : "Blacklist this lead"}
      </button>

      {!lead.opted_out && (
        <button className="blacklist-btn" onClick={() => onOptOut(lead)} style={{ color: "var(--amber)", borderColor: "#3a2800" }}>
          <IconClock size={13} /> Mark opted out
        </button>
      )}

      <button className="blacklist-btn" onClick={() => onDelete(lead.id)}>
        <IconTrash size={13} /> Delete lead
      </button>
    </>
  );
}
