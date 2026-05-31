"use client";

import { useEffect, useState } from "react";
import { timeAgo, sentimentLabel, statusColor, statusLabel } from "@/lib/utils";
import {
  IconAlertTriangle,
  IconClock,
  IconMessage,
  IconTrendingUp,
  IconThumbUp,
  IconPlayerPause,
  IconBan,
} from "@tabler/icons-react";

interface Stats {
  total: number;
  emailed: number;
  replies: number;
  interested: number;
  replyRate: string;
  projectedMrr: number;
  closeRate: number;
  notNowRate: number;
  planPrice: number;
  interestedMrr: number;
  notNowMrr: number;
  weightedMrr: number;
  sequencePipeline: { notSent: number; inSequence: number; pausedReplied: number; complete: number };
  sentimentSplit: { interested: number; not_now: number; hard_no: number };
  sentimentTotal: number;
  replyByWeek: Array<{ label: string; rate: number; sent: number; replied: number }>;
  actionNeeded: Array<{ id: number; name: string; city: string; reason: string; kind: string }>;
  recentActivity: Array<{
    id: number; name: string; city: string; state: string; score: number;
    status: string; sentiment: string | null; replied_at: string | null; emailed_at: string | null; activity_at: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="stat-row cols5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="stat animate-pulse">
            <div className="h-3 w-16 bg-surface-3 rounded mb-3" />
            <div className="h-7 w-12 bg-surface-3 rounded mb-2" />
            <div className="h-3 w-20 bg-surface-3 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const sp = stats.sequencePipeline;
  const ss = stats.sentimentSplit;
  const sentTotal = stats.sentimentTotal || 1;
  const maxRate = Math.max(...stats.replyByWeek.map((w) => w.rate), 1);

  return (
    <div>
      {/* ACTION NEEDED */}
      {stats.actionNeeded.length > 0 && (
        <div className="action-needed">
          <div className="action-needed-h">
            <IconAlertTriangle size={15} /> {stats.actionNeeded.length} lead{stats.actionNeeded.length === 1 ? "" : "s"} need action today
          </div>
          {stats.actionNeeded.map((a) => (
            <div key={`${a.kind}-${a.id}`} className="action-item">
              {a.kind === "reply" ? <IconMessage size={13} /> : <IconClock size={13} />}
              {a.name}{a.city ? ` (${a.city})` : ""} — {a.reason}
            </div>
          ))}
        </div>
      )}

      {/* STATS */}
      <div className="stat-row cols5">
        <div className="stat">
          <div className="stat-l">Total leads</div>
          <div className="stat-v">{stats.total.toLocaleString()}</div>
          <div className="stat-s pos"><IconTrendingUp size={11} /> all leads</div>
        </div>
        <div className="stat featured">
          <div className="stat-l">Reply rate</div>
          <div className="stat-v">{stats.replyRate}%</div>
          <div className="stat-s">{stats.replies} of {stats.emailed} replied</div>
        </div>
        <div className="stat">
          <div className="stat-l">Emails sent</div>
          <div className="stat-v">{stats.emailed.toLocaleString()}</div>
          <div className="stat-s">total sent</div>
        </div>
        <div className="stat">
          <div className="stat-l">Interested</div>
          <div className="stat-v">{stats.interested}</div>
          <div className="stat-s pos">auto-classified</div>
        </div>
        <div className="stat featured-purple">
          <div className="stat-l">Projected MRR</div>
          <div className="stat-v">${stats.projectedMrr.toLocaleString()}</div>
          <div className="stat-s">{stats.interested} × {Math.round(stats.closeRate * 100)}% × ${stats.planPrice}</div>
        </div>
      </div>

      {/* REPLY CHART + REVENUE PIPELINE */}
      <div className="grid grid-cols-[1.4fr_1fr] gap-3 mb-3.5">
        <div className="card mb-0">
          <div className="card-h">
            <div>
              <div className="card-t">Reply rate — last 8 weeks</div>
              <div className="card-s">emails sent vs replies received</div>
            </div>
          </div>
          <div className="chart-box">
            {stats.replyByWeek.map((w, i) => {
              const last = i === stats.replyByWeek.length - 1;
              return (
                <div
                  key={i}
                  className="chart-bar mx-px"
                  title={`${w.label}: ${w.rate}% (${w.replied}/${w.sent})`}
                  style={{
                    height: `${Math.max(6, (w.rate / maxRate) * 100)}%`,
                    ...(last ? { borderColor: "var(--green)", background: "rgba(124,184,66,.2)" } : {}),
                  }}
                />
              );
            })}
          </div>
          <div className="chart-labels">
            {stats.replyByWeek.map((w, i) => (
              <div key={i} className="chart-label">{w.label}</div>
            ))}
          </div>
        </div>

        <div className="card mb-0">
          <div className="card-h">
            <div>
              <div className="card-t">Revenue pipeline</div>
              <div className="card-s">projected MRR by reply sentiment</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-[11px] py-[9px] bg-surface-2 rounded-[7px]">
              <div className="flex items-center gap-2">
                <span className="sent-badge sent-interested"><IconThumbUp size={11} /></span>
                <span className="text-[12px] text-txt-secondary">Interested ({ss.interested})</span>
              </div>
              <div className="font-mono text-[13px] text-green-text">${stats.interestedMrr.toLocaleString()}</div>
            </div>
            <div className="flex items-center justify-between px-[11px] py-[9px] bg-surface-2 rounded-[7px]">
              <div className="flex items-center gap-2">
                <span className="sent-badge sent-notnow"><IconClock size={11} /></span>
                <span className="text-[12px] text-txt-secondary">Not now ({ss.not_now})</span>
              </div>
              <div className="font-mono text-[13px] text-amber">${stats.notNowMrr.toLocaleString()}</div>
            </div>
            <div className="flex items-center justify-between p-[11px] bg-purple-surface border border-[#2a1d40] rounded-[7px] mt-0.5">
              <div className="text-[12px] text-[#c4a5e8] font-semibold">Weighted MRR</div>
              <div className="font-mono text-[18px] text-[#c4a5e8]">${stats.weightedMrr.toLocaleString()}<span className="text-[11px] text-[#7a5cae]">/mo</span></div>
            </div>
            <div className="text-[10px] text-txt-muted text-center mt-0.5">
              interested ×{Math.round(stats.closeRate * 100)}% · not-now ×{Math.round(stats.notNowRate * 100)}% · ${stats.planPrice} ARPU
            </div>
          </div>
        </div>
      </div>

      {/* SEQUENCE PIPELINE + SENTIMENT */}
      <div className="grid grid-cols-2 gap-3 mb-3.5">
        <div className="card mb-0">
          <div className="card-h">
            <div>
              <div className="card-t">Sequence pipeline</div>
              <div className="card-s">where your leads are</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <PipelineRow label="Not sent" value={sp.notSent} pill="p-gray" pillText="step 0" />
            <PipelineRow label="In sequence" value={sp.inSequence} pill="p-amber" pillText="active" />
            <PipelineRow label="Paused — replied" value={sp.pausedReplied} pill="p-blue" pillText="auto" icon />
            <PipelineRow label="Complete" value={sp.complete} pill="p-green" pillText="done" />
          </div>
        </div>

        <div className="card mb-0">
          <div className="card-h">
            <div>
              <div className="card-t">Reply sentiment</div>
              <div className="card-s">Groq auto-classification · {stats.sentimentTotal} replies</div>
            </div>
            <span className="ai-tag">AI</span>
          </div>
          <div className="flex flex-col gap-[11px] mt-1">
            <SentimentBar color="text-green-text" fill="var(--green)" label="Interested" count={ss.interested} pct={Math.round((ss.interested / sentTotal) * 100)} />
            <SentimentBar color="text-amber" fill="var(--amber)" label="Not now" count={ss.not_now} pct={Math.round((ss.not_now / sentTotal) * 100)} />
            <SentimentBar color="text-red" fill="var(--red)" label="Hard no" count={ss.hard_no} pct={Math.round((ss.hard_no / sentTotal) * 100)} />
            <div className="text-[10px] text-txt-muted text-center mt-0.5">hard-no replies are auto-blacklisted</div>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="card">
        <div className="card-h">
          <div className="card-t">Recent activity</div>
          <div className="card-s">latest events</div>
        </div>
        {stats.recentActivity.length === 0 ? (
          <div className="text-[13px] text-txt-tertiary py-6 text-center">No activity yet</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>Restaurant</th><th>City</th><th>Event</th><th>Score</th><th>Time</th></tr>
            </thead>
            <tbody>
              {stats.recentActivity.map((r) => (
                <tr key={r.id}>
                  <td className="name">{r.name}</td>
                  <td className="text-txt-tertiary">{r.city}{r.state ? `, ${r.state}` : ""}</td>
                  <td><ActivityEvent r={r} /></td>
                  <td className="mono">{r.score ?? "—"}</td>
                  <td className="text-txt-muted">{timeAgo(r.activity_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PipelineRow({ label, value, pill, pillText, icon }: { label: string; value: number; pill: string; pillText: string; icon?: boolean }) {
  return (
    <div className="flex items-center justify-between px-[11px] py-[9px] bg-surface-2 rounded-[7px]">
      <div className="flex items-center gap-[7px] text-[12px] text-txt-secondary">
        {label}
        {icon && <IconPlayerPause size={12} className="text-blue" />}
      </div>
      <div className="flex items-center gap-2">
        <div className="font-mono text-[16px] text-txt-primary">{value}</div>
        <span className={`pill ${pill}`}>{pillText}</span>
      </div>
    </div>
  );
}

function SentimentBar({ color, fill, label, count, pct }: { color: string; fill: string; label: string; count: number; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-[11.5px] mb-[5px]">
        <span className={color}>{label}</span>
        <span className="mono">{count} · {pct}%</span>
      </div>
      <div className="ab-bar-track"><div className="ab-bar-fill" style={{ width: `${pct}%`, background: fill }} /></div>
    </div>
  );
}

function ActivityEvent({ r }: { r: { sentiment: string | null; status: string; replied_at: string | null } }) {
  if (r.replied_at && r.sentiment) {
    if (r.sentiment === "hard_no") {
      return <span className="sent-badge sent-hardno"><IconBan size={11} /> Hard no → blacklisted</span>;
    }
    const cls = r.sentiment === "interested" ? "sent-interested" : "sent-notnow";
    const Icon = r.sentiment === "interested" ? IconThumbUp : IconClock;
    return <span className={`sent-badge ${cls}`}><Icon size={11} /> {sentimentLabel(r.sentiment)}</span>;
  }
  return <span className={`pill ${statusColor(r.status)}`}>{statusLabel(r.status)}</span>;
}
