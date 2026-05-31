"use client";

import { useEffect, useState } from "react";

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
  const [exp, setExp] = useState<Experiments | null>(null);

  useEffect(() => {
    fetch("/api/experiments").then((r) => r.json()).then(setExp);
  }, []);

  const variants = exp?.variants ?? [];
  // Active tests = number of variants currently receiving sends (the live split).
  const activeTests = variants.filter((v) => v.sent > 0).length > 0 ? 1 : 0;
  const rates = variants.map((v) => v.replyRate);
  const bestRate = rates.length ? Math.max(...rates) : 0;
  const worstRate = rates.length ? Math.min(...rates) : 0;
  // Best lift = spread between the best and worst performing variant.
  const bestLift = Math.round((bestRate - worstRate) * 10) / 10;
  const maxRate = Math.max(1, ...rates);
  const winnerVariant = exp && exp.totalReplied > 0 ? exp.winner : null;

  return (
    <div>
      <div className="stat-row cols3">
        <div className="stat">
          <div className="stat-l">Active tests</div>
          <div className="stat-v">{activeTests}</div>
          <div className="stat-s">on subject lines</div>
        </div>
        <div className="stat featured">
          <div className="stat-l">Best lift</div>
          <div className="stat-v">+{bestLift}%</div>
          <div className="stat-s">
            reply rate{winnerVariant ? `, variant ${winnerVariant}` : ""}
          </div>
        </div>
        <div className="stat">
          <div className="stat-l">Sends in test</div>
          <div className="stat-v">{exp?.totalSent ?? 0}</div>
          <div className="stat-s">split {variants.length ? "50/50" : "—"}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <div>
            <div className="card-t">Subject line test — running</div>
            <div className="card-s">
              {variants.length
                ? `${exp?.totalSent ?? 0} sends across ${variants.length} variants · ${
                    winnerVariant ? "leader emerging" : "95% confidence not reached"
                  }`
                : "no sends yet"}
            </div>
          </div>
          <span className={`pill ${winnerVariant ? "p-green" : "p-amber"}`}>
            {winnerVariant ? "Winner applied" : "Running"}
          </span>
        </div>

        {variants.map((v) => {
          const isA = v.variant === "A";
          const isWinner = winnerVariant === v.variant;
          const lift = Math.round((v.replyRate - worstRate) * 10) / 10;
          const subject = v.template.replace(/\{name\}/g, "{{name}}");
          return (
            <div className="ab-variant" key={v.variant}>
              <div className="ab-head">
                <div className="ab-label">
                  <div className={`ab-tag ${isA ? "ab-a" : "ab-b"}`}>{v.variant}</div>
                  <span className="ab-subj">{subject}</span>
                  {isWinner && <span className="ab-winner">leading</span>}
                </div>
                <div className="ab-rate">{v.replyRate}%</div>
              </div>
              <div className="ab-bar-track">
                <div
                  className={`ab-bar-fill ${isA ? "ab-fill-a" : "ab-fill-b"}`}
                  style={{ width: `${Math.max(4, (v.replyRate / maxRate) * 100)}%` }}
                />
              </div>
              <div className="ab-meta">
                {v.sent} sent · {v.replied} replies · {v.replyRate}% reply rate
                {isWinner && lift > 0 ? ` · +${lift}pts` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
