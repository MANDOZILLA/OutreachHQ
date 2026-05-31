"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconLayoutDashboard,
  IconUsers,
  IconMessages,
  IconMap2,
  IconRoute,
  IconTestPipe,
  IconSearch,
  IconTerminal,
  IconSettings,
  Icon,
} from "@tabler/icons-react";

type NavItem = { href: string; label: string; icon: Icon; badge?: "leads" | "replies" };

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: IconLayoutDashboard },
  { href: "/leads", label: "Leads", icon: IconUsers, badge: "leads" },
  { href: "/replies", label: "Replies", icon: IconMessages, badge: "replies" },
  { href: "/map", label: "Coverage map", icon: IconMap2 },
  { href: "/schedule", label: "Sequences", icon: IconRoute },
  { href: "/pipeline", label: "A/B tests", icon: IconTestPipe },
  { href: "/finder", label: "Run finder", icon: IconSearch },
  { href: "/logs", label: "Live logs", icon: IconTerminal },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [quota, setQuota] = useState<{ sent: number; limit: number } | null>(null);
  const [badges, setBadges] = useState<{ leads: number; replies: number }>({ leads: 0, replies: 0 });
  const [nextRun, setNextRun] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/quota").then((r) => r.json()).then(setQuota).catch(() => {});
    fetch("/api/stats").then((r) => r.json()).then((s) => {
      setBadges({ leads: s.actionNeeded?.length ?? 0, replies: s.sentimentSplit?.interested ?? 0 });
    }).catch(() => {});
    fetch("/api/schedules").then((r) => r.json()).then((d) => {
      const next = Array.isArray(d) ? d.find((x) => x.enabled && x.next_run) : d?.schedules?.find?.((x: { enabled: boolean; next_run: string }) => x.enabled && x.next_run);
      if (next?.next_run) setNextRun(next.next_run);
    }).catch(() => {});
  }, []);

  const quotaPct = quota && quota.limit > 0 ? Math.min(100, Math.round((quota.sent / quota.limit) * 100)) : 0;
  const quotaClass = quotaPct >= 90 ? "bg-red" : quotaPct >= 70 ? "bg-amber" : "bg-green";

  return (
    <aside className="w-[200px] bg-bg-raised border-r border-border flex flex-col shrink-0">
      <div className="px-3.5 py-4 border-b border-border flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-[7px] bg-green flex items-center justify-center text-[13px] font-bold text-[#0a1a02] shrink-0">O</div>
        <div className="text-[14px] font-semibold text-txt-primary tracking-tight">OutreachHQ</div>
      </div>

      <nav className="px-2 py-2.5 flex-1 flex flex-col gap-px overflow-y-auto">
        {navItems.map((item) => {
          const Ico = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const badgeVal = item.badge ? badges[item.badge] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 text-[13px] rounded-[7px] font-medium transition-all duration-100 ${
                active ? "bg-green-surface text-green-text" : "text-txt-tertiary hover:bg-bg-elevated hover:text-txt-secondary"
              }`}
            >
              <Ico size={16} stroke={1.75} className="shrink-0" />
              <span>{item.label}</span>
              {item.badge && badgeVal > 0 && (
                <span
                  className={`ml-auto text-[9px] font-semibold px-1.5 py-px rounded-[10px] min-w-[18px] text-center text-white ${
                    item.badge === "leads" ? "bg-green-dim" : "bg-red"
                  }`}
                >
                  {badgeVal}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-2.5 py-3 border-t border-border">
        <div className="flex flex-col gap-1.5">
          <StatusRow label="Brevo" dot="bg-green" state="connected" />
          <StatusRow label="IMAP" dot="bg-green" state="connected" />
          <StatusRow label="Cron" dot="bg-amber" state="idle" />
          {quota && (
            <div className="mt-2 px-2 py-[7px] bg-bg-elevated rounded-[5px]">
              <div className="flex justify-between text-[10px] text-txt-tertiary mb-[5px] font-mono">
                <span>Brevo today</span>
                <span>{quota.sent} / {quota.limit}</span>
              </div>
              <div className="h-[5px] bg-surface-3 rounded-[3px] overflow-hidden">
                <div className={`h-full rounded-[3px] ${quotaClass}`} style={{ width: `${quotaPct}%` }} />
              </div>
            </div>
          )}
          <div className="text-[10px] text-txt-muted mt-1 px-2 py-[5px] bg-bg-elevated rounded-[5px] font-mono">
            next run: {nextRun ? new Date(nextRun).toLocaleString("en-US", { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}
          </div>
        </div>
      </div>
    </aside>
  );
}

function StatusRow({ label, dot, state }: { label: string; dot: string; state: string }) {
  return (
    <div className="flex items-center justify-between text-[11px] text-txt-muted">
      <div className="flex items-center gap-[5px] text-txt-tertiary">
        <div className={`w-[7px] h-[7px] rounded-full shrink-0 ${dot}`} />
        {label}
      </div>
      <span className="text-[10px] text-txt-muted">{state}</span>
    </div>
  );
}
