"use client";

import { useEffect, useState } from "react";
import { timeAgo, statusColor, statusLabel } from "@/lib/utils";

interface Stats {
  total: number;
  emailed: number;
  replies: number;
  interested: number;
  needsInfo: number;
  notInterested: number;
  replyRate: string;
  projectedMrr: number;
  closeRate: number;
  planPrice: number;
  hotReplies: Array<{
    id: number;
    name: string;
    city: string;
    hook_type: string;
    replied_at: string;
    status: string;
  }>;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-bg-card rounded-xl p-4 animate-pulse">
            <div className="h-3 w-16 bg-bg-elevated rounded mb-3" />
            <div className="h-7 w-12 bg-bg-elevated rounded mb-2" />
            <div className="h-3 w-20 bg-bg-elevated rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Total scraped", value: stats.total.toLocaleString(), sub: "all leads", color: "" },
          { label: "Emails sent", value: stats.emailed.toLocaleString(), sub: "total sent", color: "" },
          { label: "Replies", value: stats.replies.toString(), sub: `${stats.replyRate}% reply rate`, color: "text-green" },
          { label: "Interested", value: stats.interested.toString(), sub: "awaiting response", color: "text-accent" },
          { label: "Projected MRR", value: `$${stats.projectedMrr.toLocaleString()}`, sub: `${stats.interested} × ${Math.round(stats.closeRate * 100)}% × $${stats.planPrice}`, color: "text-green" },
        ].map((s) => (
          <div key={s.label} className="bg-bg-card border border-border-subtle rounded-xl p-4 shadow-card">
            <div className="text-[10px] font-medium text-txt-muted uppercase tracking-widest mb-2">{s.label}</div>
            <div className={`text-2xl font-semibold font-mono tracking-tight ${s.color || "text-txt-primary"}`}>{s.value}</div>
            <div className={`text-[11px] mt-1 ${s.color || "text-txt-tertiary"}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl p-5 shadow-card">
        <div className="text-[10px] font-medium text-txt-muted uppercase tracking-widest mb-4">Pipeline summary</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-4 bg-green-surface rounded-xl border border-green/10">
            <div className="text-2xl font-semibold text-green-text font-mono">{stats.interested}</div>
            <div className="text-[11px] text-green mt-1">Interested</div>
          </div>
          <div className="text-center p-4 bg-amber-surface rounded-xl border border-amber/10">
            <div className="text-2xl font-semibold text-amber-text font-mono">{stats.needsInfo}</div>
            <div className="text-[11px] text-amber mt-1">Needs info</div>
          </div>
          <div className="text-center p-4 bg-bg-elevated rounded-xl border border-border-subtle">
            <div className="text-2xl font-semibold text-txt-secondary font-mono">{stats.notInterested}</div>
            <div className="text-[11px] text-txt-tertiary mt-1">Not interested</div>
          </div>
        </div>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl p-5 shadow-card">
        <div className="text-[10px] font-medium text-txt-muted uppercase tracking-widest mb-4">Recent hot replies</div>
        {stats.hotReplies.length === 0 ? (
          <div className="text-sm text-txt-tertiary py-6 text-center">No replies yet</div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {[["Restaurant", "35%"], ["City", "20%"], ["Hook used", "20%"], ["Replied", "15%"], ["Status", "10%"]].map(([h, w]) => (
                  <th key={h} className="text-[10px] font-medium text-txt-muted uppercase tracking-widest py-2.5 px-3 text-left border-b border-border" style={{ width: w }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.hotReplies.map((r) => (
                <tr key={r.id} className="hover:bg-bg-elevated/50 transition-colors duration-100">
                  <td className="py-3 px-3 border-b border-border-subtle font-medium text-txt-primary">{r.name}</td>
                  <td className="py-3 px-3 border-b border-border-subtle text-txt-secondary">{r.city}</td>
                  <td className="py-3 px-3 border-b border-border-subtle text-txt-secondary">{r.hook_type || "—"}</td>
                  <td className="py-3 px-3 border-b border-border-subtle font-mono text-txt-tertiary text-[12px]">{timeAgo(r.replied_at)}</td>
                  <td className="py-3 px-3 border-b border-border-subtle">
                    <span className={`pill ${statusColor(r.status)}`}>{statusLabel(r.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
