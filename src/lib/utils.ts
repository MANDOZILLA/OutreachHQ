export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function tierColor(tier: string) {
  switch (tier?.toLowerCase()) {
    case "hot": return "p-green";
    case "warm": return "p-amber";
    case "cold": return "p-gray";
    default: return "p-gray";
  }
}

export function statusColor(status: string) {
  switch (status) {
    case "interested": return "p-green";
    case "needs_info": return "p-amber";
    case "not_interested": return "p-gray";
    case "emailed": return "p-blue";
    case "opted_out": return "p-gray";
    default: return "p-gray";
  }
}

export function sentimentLabel(s: string | null | undefined) {
  switch (s) {
    case "interested": return "Interested";
    case "not_now": return "Not now";
    case "hard_no": return "Hard no";
    default: return "—";
  }
}

export function sentimentPill(s: string | null | undefined) {
  switch (s) {
    case "interested": return "p-green";
    case "not_now": return "p-amber";
    case "hard_no": return "p-red";
    default: return "p-gray";
  }
}

export function statusLabel(status: string) {
  switch (status) {
    case "interested": return "Interested";
    case "needs_info": return "Needs info";
    case "not_interested": return "Not interested";
    case "not_emailed": return "Not emailed";
    case "emailed": return "Emailed";
    case "replied": return "Replied";
    case "opted_out": return "Opted out";
    default: return status;
  }
}
