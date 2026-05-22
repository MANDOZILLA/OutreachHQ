"use client";

import { useEffect, useState, useCallback } from "react";
import { timeAgo, tierColor, statusColor, statusLabel } from "@/lib/utils";
import { IconDownload, IconEye, IconBan, IconTrash } from "@tabler/icons-react";

interface Lead {
  id: number;
  name: string;
  city: string;
  score: number;
  tier: string;
  hook_type: string;
  status: string;
  emailed_at: string | null;
  opted_out: number;
  email_body: string | null;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [cities, setCities] = useState<Array<{ city: string }>>([]);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [emailModal, setEmailModal] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (search) params.set("search", search);
    if (tier) params.set("tier", tier);
    if (status) params.set("status", status);
    if (city) params.set("city", city);
    fetch(`/api/leads?${params}`).then((r) => r.json()).then((d) => {
      setLeads(d.leads);
      setTotal(d.total);
      setCities(d.cities);
    });
  }, [page, search, tier, status, city]);

  useEffect(() => { load(); }, [load]);

  async function handleOptOut(id: number) {
    if (!confirm("Mark this lead as opted out? They will never be emailed again.")) return;
    await fetch(`/api/leads/${id}/optout`, { method: "PATCH" });
    load();
  }

  async function handleDelete(id: number) {
    setConfirmDelete(null);
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    load();
  }

  function exportCSV() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (tier) params.set("tier", tier);
    if (status) params.set("status", status);
    if (city) params.set("city", city);
    params.set("limit", "10000");
    fetch(`/api/leads?${params}`).then((r) => r.json()).then((d) => {
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

  return (
    <div className="space-y-3">
      <div className="flex gap-2.5 flex-wrap">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-[160px] px-3.5 py-2.5 bg-bg-card border border-border rounded-lg text-[13px] text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
        />
        {[
          { val: tier, set: (v: string) => { setTier(v); setPage(1); }, opts: [["", "All tiers"], ["hot", "Hot"], ["warm", "Warm"], ["cold", "Cold"]] },
          { val: status, set: (v: string) => { setStatus(v); setPage(1); }, opts: [["", "All statuses"], ["not_emailed", "Not emailed"], ["emailed", "Emailed"], ["replied", "Replied"], ["opted_out", "Opted out"]] },
        ].map((f, i) => (
          <select key={i} value={f.val} onChange={(e) => f.set(e.target.value)} className="px-3 py-2.5 bg-bg-card border border-border rounded-lg text-[13px] text-txt-secondary focus:outline-none focus:border-accent/50">
            {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <select value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }} className="px-3 py-2.5 bg-bg-card border border-border rounded-lg text-[13px] text-txt-secondary focus:outline-none focus:border-accent/50">
          <option value="">All cities</option>
          {cities.map((c) => <option key={c.city} value={c.city}>{c.city}</option>)}
        </select>
        <button onClick={exportCSV} className="bg-bg-elevated border border-border-strong rounded-lg px-3.5 py-2.5 text-[12px] text-txt-secondary cursor-pointer flex items-center gap-2 hover:bg-bg-card hover:text-txt-primary transition-all">
          <IconDownload size={13} /> Export CSV
        </button>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl shadow-card overflow-hidden">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-bg-elevated/50">
              {["Restaurant", "City", "Score", "Tier", "Hook", "Status", "Emailed", "Actions"].map((h) => (
                <th key={h} className="text-[10px] font-medium text-txt-muted uppercase tracking-widest py-3 px-3.5 text-left border-b border-border">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-txt-tertiary text-sm">No leads found</td></tr>
            ) : (
              leads.map((l) => (
                <tr key={l.id} className="hover:bg-bg-elevated/30 transition-colors duration-100">
                  <td className="py-3 px-3.5 border-b border-border-subtle font-medium text-txt-primary">{l.name}</td>
                  <td className="py-3 px-3.5 border-b border-border-subtle text-txt-secondary">{l.city}</td>
                  <td className="py-3 px-3.5 border-b border-border-subtle font-mono text-[12px] text-txt-secondary">{l.score}</td>
                  <td className="py-3 px-3.5 border-b border-border-subtle">
                    <span className={`pill ${tierColor(l.tier)}`}>{l.tier ? l.tier.charAt(0).toUpperCase() + l.tier.slice(1) : "—"}</span>
                  </td>
                  <td className="py-3 px-3.5 border-b border-border-subtle text-txt-secondary">{l.hook_type || "—"}</td>
                  <td className="py-3 px-3.5 border-b border-border-subtle">
                    <span className={`pill ${statusColor(l.status)}`}>{statusLabel(l.status)}</span>
                  </td>
                  <td className="py-3 px-3.5 border-b border-border-subtle font-mono text-[12px] text-txt-tertiary">{timeAgo(l.emailed_at)}</td>
                  <td className="py-3 px-3.5 border-b border-border-subtle">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => setEmailModal(l.email_body)} className="p-1.5 hover:bg-bg-elevated rounded-md text-txt-muted hover:text-txt-primary transition-colors" title="View email">
                        <IconEye size={14} />
                      </button>
                      {!l.opted_out && (
                        <button onClick={() => handleOptOut(l.id)} className="p-1.5 hover:bg-amber-surface rounded-md text-txt-muted hover:text-amber transition-colors" title="Mark opted out">
                          <IconBan size={14} />
                        </button>
                      )}
                      <button onClick={() => setConfirmDelete(l.id)} className="p-1.5 hover:bg-red-surface rounded-md text-txt-muted hover:text-red transition-colors" title="Delete lead">
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-txt-tertiary">{total} leads total · Page {page} of {totalPages}</span>
          <div className="flex gap-1.5">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3.5 py-1.5 text-[12px] bg-bg-elevated border border-border rounded-lg disabled:opacity-30 hover:bg-bg-card text-txt-secondary transition-colors">Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3.5 py-1.5 text-[12px] bg-bg-elevated border border-border rounded-lg disabled:opacity-30 hover:bg-bg-card text-txt-secondary transition-colors">Next</button>
          </div>
        </div>
      )}

      {emailModal !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setEmailModal(null)}>
          <div className="bg-bg-card rounded-2xl p-6 max-w-lg w-full mx-4 border border-border shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <div className="text-[10px] font-medium text-txt-muted uppercase tracking-widest mb-4">Email preview</div>
            <pre className="text-[13px] text-txt-secondary whitespace-pre-wrap font-sans leading-relaxed">{emailModal || "No email body generated"}</pre>
            <button onClick={() => setEmailModal(null)} className="mt-5 bg-accent text-white border-none rounded-lg px-4 py-2 text-[12px] font-medium cursor-pointer hover:bg-accent-hover transition-colors">Close</button>
          </div>
        </div>
      )}

      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bg-card rounded-2xl p-6 max-w-sm w-full mx-4 border border-border shadow-elevated">
            <div className="text-[15px] font-semibold text-txt-primary mb-2">Delete lead?</div>
            <p className="text-[13px] text-txt-secondary mb-5">This will soft-delete the lead. It won&apos;t appear in lists anymore.</p>
            <div className="flex gap-2.5 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-[12px] bg-bg-elevated border border-border rounded-lg text-txt-secondary hover:bg-bg-card transition-colors">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 text-[12px] bg-red text-white rounded-lg font-medium hover:bg-red-dim transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
