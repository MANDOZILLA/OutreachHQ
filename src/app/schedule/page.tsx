"use client";

import { useEffect, useState } from "react";
import { IconPlus } from "@tabler/icons-react";

interface Schedule {
  id: number;
  name: string;
  description: string;
  task_type: string;
  cron_expr: string;
  enabled: number;
  last_run: string | null;
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [taskType, setTaskType] = useState("scrape_email");
  const [frequency, setFrequency] = useState("daily");
  const [time, setTime] = useState("09:00");
  const [customName, setCustomName] = useState("");

  function load() {
    fetch("/api/schedules").then((r) => r.json()).then(setSchedules);
  }

  useEffect(() => { load(); }, []);

  async function toggleSchedule(id: number, enabled: number) {
    await fetch(`/api/schedules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: enabled ? 0 : 1 }),
    });
    load();
  }

  async function addSchedule() {
    const [h, m] = time.split(":");
    let cron = "";
    if (frequency === "daily") cron = `${m} ${h} * * *`;
    else if (frequency === "weekly") cron = `${m} ${h} * * 1`;
    else cron = `${m} ${h} * * *`;

    const typeNames: Record<string, string> = {
      scrape_email: "Scrape + email",
      follow_up: "Follow-ups only",
      inbox_sync: "Inbox sync",
    };

    await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: customName || typeNames[taskType] || taskType,
        description: `${frequency} at ${time}`,
        task_type: taskType,
        cron_expr: cron,
        enabled: 1,
      }),
    });
    setCustomName("");
    load();
  }

  async function deleteSchedule(id: number) {
    if (!confirm("Remove this schedule?")) return;
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    load();
  }

  const fieldClass = "px-3.5 py-2.5 bg-bg-elevated border border-border rounded-lg text-[13px] text-txt-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all";
  const labelClass = "text-[10px] font-medium text-txt-muted uppercase tracking-widest";

  return (
    <div className="space-y-3">
      <div className="bg-bg-card border border-border-subtle rounded-xl p-5 shadow-card">
        <div className={`${labelClass} mb-4`}>Scheduled runs</div>
        <div className="space-y-2">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="bg-bg-elevated border border-border-subtle rounded-lg p-4 flex items-center justify-between hover:border-border-strong transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.enabled ? "bg-green shadow-[0_0_6px_rgba(34,197,94,0.4)]" : "bg-txt-muted"}`} />
                <div>
                  <div className="text-[13px] font-medium text-txt-primary">{s.name}</div>
                  <div className="text-[11px] text-txt-tertiary mt-0.5">{s.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => deleteSchedule(s.id)}
                  className="text-[11px] text-txt-muted hover:text-red transition-colors"
                >
                  Remove
                </button>
                <button
                  onClick={() => toggleSchedule(s.id, s.enabled)}
                  className={`w-9 h-5 rounded-full relative cursor-pointer transition-all duration-200 shrink-0 ${
                    s.enabled ? "bg-accent shadow-glow" : "bg-bg-card border border-border-strong"
                  }`}
                >
                  <span className={`absolute w-3.5 h-3.5 rounded-full top-[3px] transition-all duration-200 ${
                    s.enabled
                      ? "right-[3px] bg-white"
                      : "left-[3px] bg-txt-muted"
                  }`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl p-5 shadow-card">
        <div className={`${labelClass} mb-4`}>Add custom schedule</div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Task</label>
            <select value={taskType} onChange={(e) => setTaskType(e.target.value)} className={fieldClass}>
              <option value="scrape_email">Scrape + email</option>
              <option value="follow_up">Follow-ups only</option>
              <option value="inbox_sync">Inbox sync</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={fieldClass}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom cron</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldClass} />
          </div>
        </div>
        <button onClick={addSchedule} className="bg-accent text-white border-none rounded-lg px-4 py-2.5 text-[12px] font-medium cursor-pointer flex items-center gap-2 hover:bg-accent-hover transition-all shadow-glow">
          <IconPlus size={13} /> Add schedule
        </button>
      </div>
    </div>
  );
}
