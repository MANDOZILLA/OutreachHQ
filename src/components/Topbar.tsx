"use client";

import { usePathname, useRouter } from "next/navigation";
import { IconRefresh, IconMail, IconTestPipe, IconSearch } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { useToast } from "./Toast";

const titles: Record<string, [string, string]> = {
  "/": ["Dashboard", "Your outreach pipeline at a glance"],
  "/replies": ["Replies", "Auto-classified inbound responses"],
  "/leads": ["Leads", "Click any row to view profile"],
  "/pipeline": ["A/B tests", "Subject line experiments"],
  "/map": ["Coverage map", "National lead distribution"],
  "/finder": ["Run finder", "Scrape new restaurant leads"],
  "/schedule": ["Sequences", "Build and edit your email cadence"],
  "/logs": ["Live logs", "Real-time output from the send job"],
  "/settings": ["Settings", "Configure limits, scoring, schedule, automation"],
};

interface Quota {
  sent: number;
  limit: number;
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
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
    }).catch(() => {});
    loadQuota();
    const t = setInterval(loadQuota, 30000);
    return () => clearInterval(t);
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/inbox/sync", { method: "POST" });
      toast("Replies synced");
    } finally {
      loadQuota();
      setTimeout(() => setSyncing(false), 1500);
    }
  }

  const quotaPct = quota && quota.limit > 0 ? Math.min(100, Math.round((quota.sent / quota.limit) * 100)) : 0;
  const quotaColor = quotaPct >= 90 ? "bg-red" : quotaPct >= 70 ? "bg-amber" : "bg-green";

  return (
    <div className="bg-bg-raised border-b border-border px-[22px] py-[13px] flex items-center justify-between shrink-0">
      <div>
        <div className="text-[17px] font-semibold text-txt-primary tracking-tight">{title}</div>
        <div className="text-[11.5px] text-txt-muted mt-px">{subtitle}</div>
      </div>
      <div className="flex items-center gap-[7px]">
        {testMode && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-surface border border-amber/30 rounded-md">
            <IconTestPipe size={13} className="text-amber" />
            <span className="text-[11px] font-medium text-amber">Test mode</span>
          </div>
        )}
        {quota && (
          <div
            className="flex items-center gap-[7px] px-[11px] py-[5px] bg-surface-2 border border-border-strong/60 rounded-md text-[11px] text-txt-tertiary"
            title={`Brevo daily send quota — ${quota.sent} of ${quota.limit} emails sent today`}
          >
            <IconMail size={13} />
            <span className="font-mono text-txt-secondary">{quota.sent}/{quota.limit}</span>
            <div className="w-[46px] h-[5px] bg-surface-3 rounded-[3px] overflow-hidden">
              <div className={`h-full ${quotaColor} rounded-[3px] transition-all`} style={{ width: `${quotaPct}%` }} />
            </div>
          </div>
        )}
        <button onClick={handleSync} disabled={syncing} className="btn-ghost disabled:opacity-40">
          <IconRefresh size={14} className={syncing ? "animate-spin" : ""} />
          Sync replies
        </button>
        <button onClick={() => router.push("/finder")} className="btn-green shadow-glow">
          <IconSearch size={14} />
          Run finder
        </button>
      </div>
    </div>
  );
}
