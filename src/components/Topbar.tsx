"use client";

import { usePathname, useRouter } from "next/navigation";
import { IconPlayerPlay, IconRefresh, IconTestPipe, IconMailbox } from "@tabler/icons-react";
import { useState, useEffect } from "react";

const titles: Record<string, [string, string]> = {
  "/": ["Overview", "StockSense outreach system"],
  "/replies": ["Replies", "Kanban — filter by status"],
  "/leads": ["All leads", "Browse & manage scraped leads"],
  "/pipeline": ["Revenue pipeline", "Projected MRR & A/B subject tests"],
  "/map": ["Coverage map", "Leads by city across the US"],
  "/finder": ["Lead finder", "Run now or schedule"],
  "/schedule": ["Schedule", "Manage automated runs & cadence"],
  "/logs": ["Live logs", "System activity"],
  "/settings": ["Settings", "API keys & preferences"],
};

interface Quota {
  sent: number;
  limit: number;
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [title, subtitle] = titles[pathname] || ["OutreachHQ", ""];
  const [syncing, setSyncing] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);

  function loadQuota() {
    fetch("/api/quota").then((r) => r.json()).then(setQuota).catch(() => {});
  }

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((s) => {
      setTestMode(s.TEST_MODE === "true");
    });
    loadQuota();
    const t = setInterval(loadQuota, 30000);
    return () => clearInterval(t);
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/inbox/sync", { method: "POST" });
    } finally {
      loadQuota();
      setTimeout(() => setSyncing(false), 1500);
    }
  }

  const quotaPct = quota && quota.limit > 0 ? Math.min(100, Math.round((quota.sent / quota.limit) * 100)) : 0;
  const quotaColor = quotaPct >= 90 ? "bg-red" : quotaPct >= 70 ? "bg-amber" : "bg-accent";

  return (
    <div className="bg-bg-raised border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
      <div>
        <div className="text-[15px] font-semibold text-txt-primary tracking-tight">{title}</div>
        <div className="text-[11px] text-txt-tertiary mt-0.5">{subtitle}</div>
      </div>
      <div className="flex items-center gap-3">
        {testMode && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-surface border border-amber/30 rounded-lg">
            <IconTestPipe size={13} className="text-amber" />
            <span className="text-[11px] font-medium text-amber">Test mode</span>
          </div>
        )}
        {quota && (
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 bg-bg-elevated border border-border-subtle rounded-lg"
            title={`Brevo daily quota — ${quota.sent} of ${quota.limit} emails sent today`}
          >
            <IconMailbox size={13} className="text-txt-tertiary" />
            <span className="text-[11px] font-mono text-txt-secondary">
              {quota.sent}<span className="text-txt-muted">/{quota.limit}</span>
            </span>
            <div className="w-12 h-1.5 bg-bg-card rounded-full overflow-hidden">
              <div className={`h-full ${quotaColor} rounded-full transition-all`} style={{ width: `${quotaPct}%` }} />
            </div>
          </div>
        )}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-bg-elevated border border-border-strong rounded-lg px-3.5 py-2 text-[12px] text-txt-secondary cursor-pointer flex items-center gap-2 hover:bg-bg-card hover:text-txt-primary transition-all duration-150 disabled:opacity-40"
        >
          <IconRefresh size={13} className={syncing ? "animate-spin" : ""} />
          Sync inbox
        </button>
        <button
          onClick={() => router.push("/finder")}
          className="bg-accent text-white border-none rounded-lg px-3.5 py-2 text-[12px] font-medium cursor-pointer flex items-center gap-2 hover:bg-accent-hover transition-all duration-150 shadow-glow"
        >
          <IconPlayerPlay size={12} />
          Run now
        </button>
      </div>
    </div>
  );
}
