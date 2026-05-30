"use client";

import { useEffect, useState } from "react";
import { IconTrophy, IconArrowRight } from "@tabler/icons-react";

interface Stats {
  total: number;
  emailed: number;
  replies: number;
  interested: number;
  replyRate: string;
  projectedMrr: number;
  closeRate: number;
  planPrice: number;
}

interface Variant {
  variant: string;
  template: string;
  sent: number;
  replied: number;
  replyRate: number;
}

interface Experiments {
  variants: Variant[];
  totalSent: number;
  totalReplied: number;
  winner: string | null;
}

export default function PipelinePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [exp, setExp] = useState<Experiments | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
    fetch("/api/experiments").then((r) => r.json()).then(setExp);
  }, []);

  const labelClass = "text-[10px] font-medium text-txt-muted uppercase tracking-widest";

  const funnel = stats
    ? [
        { label: "Emailed", value: stats.emailed, color: "bg-accent" },
        { label: "Replied", value: stats.replies, color: "bg-amber" },
        { label: "Interested", value: stats.interested, color: "bg-green" },
        { label: "Projected closes", value: Math.round(stats.interested * stats.closeRate), color: "bg-green-text" },
      ]
    : [];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <div className="space-y-3">
      {/* Revenue pipeline */}
      <div className="bg-bg-card border border-border-subtle rounded-xl p-5 shadow-card">
        <div className={`${labelClass} mb-4`}>Revenue pipeline</div>
        {!stats ? (
          <div className="h-24 animate-pulse bg-bg-elevated rounded-lg" />
        ) : (
          <>
            <div className="flex items-end gap-3 mb-5">
              <div className="text-4xl font-semibold font-mono text-green-text tracking-tight">
                ${stats.projectedMrr.toLocaleString()}
              </div>
              <div className="text-[12px] text-txt-tertiary mb-1.5">projected MRR</div>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-txt-secondary mb-5 font-mono">
              <span className="text-green-text font-semibold">{stats.interested}</span>
              <span className="text-txt-muted">interested</span>
              <span className="text-txt-muted">×</span>
              <span className="text-txt-secondary">{Math.round(stats.closeRate * 100)}%</span>
              <span className="text-txt-muted">close rate</span>
              <span className="text-txt-muted">×</span>
              <span className="text-txt-secondary">${stats.planPrice}/mo</span>
              <span className="text-txt-muted">=</span>
              <span className="text-green-text font-semibold">${stats.projectedMrr.toLocaleString()}</span>
            </div>

            <div className="space-y-2.5">
              {funnel.map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <div className="w-28 text-[12px] text-txt-tertiary shrink-0">{f.label}</div>
                  <div className="flex-1 h-6 bg-bg-elevated rounded-md overflow-hidden">
                    <div
                      className={`h-full ${f.color} rounded-md transition-all duration-500 flex items-center justify-end px-2`}
                      style={{ width: `${Math.max(6, (f.value / funnelMax) * 100)}%` }}
                    >
                      <span className="text-[11px] font-mono font-semibold text-bg">{f.value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* A/B subject line testing */}
      <div className="bg-bg-card border border-border-subtle rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-1">
          <div className={labelClass}>A/B subject line test</div>
          {exp && (
            <span className="text-[11px] text-txt-tertiary font-mono">
              {exp.totalSent} sends · {exp.totalReplied} replies
            </span>
          )}
        </div>
        <div className="text-[11px] text-txt-tertiary mb-4">Reply rate per subject-line variant.</div>
        {!exp ? (
          <div className="h-24 animate-pulse bg-bg-elevated rounded-lg" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {exp.variants.map((v) => {
              const isWinner = exp.winner === v.variant && exp.totalReplied > 0;
              return (
                <div
                  key={v.variant}
                  className={`rounded-xl p-4 border ${isWinner ? "border-green/40 bg-green-surface" : "border-border-subtle bg-bg-elevated"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-semibold text-txt-primary">Variant {v.variant}</span>
                    {isWinner && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-green-text">
                        <IconTrophy size={12} /> Winning
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-txt-secondary italic mb-3 leading-relaxed">
                    &ldquo;{v.template.replace("{name}", "[restaurant]")}&rdquo;
                  </div>
                  <div className="flex items-end gap-2 mb-2">
                    <div className={`text-2xl font-semibold font-mono ${isWinner ? "text-green-text" : "text-txt-primary"}`}>
                      {v.replyRate}%
                    </div>
                    <div className="text-[11px] text-txt-tertiary mb-1">reply rate</div>
                  </div>
                  <div className="h-1.5 bg-bg-card rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${isWinner ? "bg-green" : "bg-accent"}`}
                      style={{ width: `${Math.min(100, v.replyRate)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-txt-muted font-mono">
                    {v.replied} / {v.sent} replied
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <a href="/replies" className="inline-flex items-center gap-1.5 text-[12px] text-accent mt-4 hover:underline">
          View replies <IconArrowRight size={13} />
        </a>
      </div>
    </div>
  );
}
