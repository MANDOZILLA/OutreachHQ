"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconLayoutDashboard,
  IconInbox,
  IconDatabase,
  IconSearch,
  IconCalendar,
  IconTerminal,
  IconSettings,
} from "@tabler/icons-react";

const navItems = [
  { href: "/", label: "Overview", icon: IconLayoutDashboard },
  { href: "/replies", label: "Replies", icon: IconInbox },
  { href: "/leads", label: "All leads", icon: IconDatabase },
  { type: "section" as const, label: "Lead finder" },
  { href: "/finder", label: "Run finder", icon: IconSearch },
  { href: "/schedule", label: "Schedule", icon: IconCalendar },
  { type: "section" as const, label: "System" },
  { href: "/logs", label: "Live logs", icon: IconTerminal },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] bg-bg-raised border-r border-border flex flex-col shrink-0">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
            <div className="w-3 h-3 rounded-sm bg-accent" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-txt-primary tracking-tight">OutreachHQ</div>
            <div className="text-[10px] text-txt-tertiary">dev dashboard</div>
          </div>
        </div>
      </div>
      <nav className="py-2 flex-1 px-2">
        {navItems.map((item, i) => {
          if ("type" in item && item.type === "section") {
            return (
              <div key={i} className="text-[10px] font-medium text-txt-muted uppercase tracking-widest px-3 pt-5 pb-1.5">
                {item.label}
              </div>
            );
          }
          if (!("href" in item)) return null;
          const Icon = item.icon!;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg cursor-pointer transition-all duration-150 ${
                active
                  ? "bg-accent/10 text-accent-text font-medium shadow-sm"
                  : "text-txt-secondary hover:bg-bg-elevated hover:text-txt-primary"
              }`}
            >
              <Icon size={16} stroke={1.75} className={active ? "text-accent" : ""} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-semibold text-accent">A</div>
          <div className="text-[11px] text-txt-tertiary truncate">arav@getstocksense.com</div>
        </div>
      </div>
    </aside>
  );
}
