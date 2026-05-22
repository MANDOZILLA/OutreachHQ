"use client";

import { usePathname, useRouter } from "next/navigation";
import { IconPlayerPlay, IconRefresh } from "@tabler/icons-react";
import { useState } from "react";

const titles: Record<string, [string, string]> = {
  "/": ["Overview", "StockSense outreach system"],
  "/replies": ["Replies", "Kanban — filter by status"],
  "/leads": ["All leads", "Browse & manage scraped leads"],
  "/finder": ["Lead finder", "Run now or schedule"],
  "/schedule": ["Schedule", "Manage automated runs"],
  "/logs": ["Live logs", "System activity"],
  "/settings": ["Settings", "API keys & preferences"],
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [title, subtitle] = titles[pathname] || ["OutreachHQ", ""];
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/inbox/sync", { method: "POST" });
    } finally {
      setTimeout(() => setSyncing(false), 1500);
    }
  }

  return (
    <div className="bg-bg-raised border-b border-border px-6 py-3 flex items-center justify-between shrink-0">
      <div>
        <div className="text-[15px] font-semibold text-txt-primary tracking-tight">{title}</div>
        <div className="text-[11px] text-txt-tertiary mt-0.5">{subtitle}</div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-txt-muted font-mono">Last run: —</span>
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
