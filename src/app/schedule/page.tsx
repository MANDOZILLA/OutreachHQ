"use client";

import { useEffect, useState } from "react";
import { IconPlus, IconCheck, IconPlayerPlay } from "@tabler/icons-react";

interface Schedule {
  id: number;
  name: string;
  description: string;
  task_type: string;
  cron_expr: string;
  enabled: number;
  last_run: string | null;
}

interface SequenceStep {
  id: number;
  step_index: number;
  day_offset: number;
  label: string;
  enabled: number;
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [taskType, setTaskType] = useState("scrape_email");
  const [frequency, setFrequency] = useState("daily");
  const [time, setTime] = useState("09:00");
  const [customName, setCustomName] = useState("");
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [savingSeq, setSavingSeq] = useState(false);
  const [savedSeq, setSavedSeq] = useState(false);
  const [runResult, setRunResult] = useState<string>("");

  function load() {
    fetch("/api/schedules").then((r) => r.json()).then(setSchedules);
  }

  function loadSequence() {
    fetch("/api/sequence").then((r) => r.json()).then((d) => setSteps(d.steps || []));
  }

  useEffect(() => { load(); loadSequence(); }, []);

  function updateStep(id: number, patch: Partial<SequenceStep>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function saveSequence() {
    setSavingSeq(true);
    await fetch("/api/sequence", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steps: steps.map((s) => ({ id: s.id, day_offset: s.day_offset, enabled: s.enabled })) }),
    });
    setSavingSeq(false);
    setSavedSeq(true);
    setTimeout(() => setSavedSeq(false), 2000);
  }

  async function runSequenceNow() {
    setRunResult("Running…");
    const res = await fetch("/api/sequence/run", { method: "POST" }).then((r) => r.json());
    setRunResult(`${res.sent} sent · ${res.paused} paused (replied) · ${res.skipped} not due`);
  }

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
        <div className="flex items-center justify-between mb-1">
          <div className={labelClass}>Follow-up sequence</div>
          <button
            onClick={runSequenceNow}
            className="text-[11px] text-txt-secondary hover:text-txt-primary flex items-center gap-1.5 border border-border-strong rounded-lg px-2.5 py-1.5 hover:bg-bg-elevated transition-colors"
          >
            <IconPlayerPlay size={12} /> Run sequence now
          </button>
        </div>
        <div className="text-[11px] text-txt-tertiary mb-4">
          Editable drip cadence. Each follow-up fires this many days after first contact.
          Leads that reply, opt out, or are blacklisted are skipped automatically.
        </div>
        <div className="space-y-2">
          {steps.map((s) => (
            <div key={s.id} className="bg-bg-elevated border border-border-subtle rounded-lg p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.enabled ? "bg-green shadow-[0_0_6px_rgba(34,197,94,0.4)]" : "bg-txt-muted"}`} />
                <div className="text-[13px] font-medium text-txt-primary truncate">{s.label}</div>
                {s.step_index === 0 && (
                  <span className="pill p-blue shrink-0">Intro</span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-txt-tertiary">Day</span>
                  <input
                    type="number"
                    min={0}
                    value={s.day_offset}
                    disabled={s.step_index === 0}
                    onChange={(e) => updateStep(s.id, { day_offset: Math.max(0, Number(e.target.value)) })}
                    className="w-16 px-2.5 py-1.5 bg-bg-card border border-border rounded-lg text-[13px] text-txt-primary font-mono focus:outline-none focus:border-accent/50 disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={() => updateStep(s.id, { enabled: s.enabled ? 0 : 1 })}
                  className={`w-9 h-5 rounded-full relative cursor-pointer transition-all duration-200 shrink-0 ${s.enabled ? "bg-accent shadow-glow" : "bg-bg-card border border-border-strong"}`}
                >
                  <span className={`absolute w-3.5 h-3.5 rounded-full top-[3px] transition-all duration-200 ${s.enabled ? "right-[3px] bg-white" : "left-[3px] bg-txt-muted"}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={saveSequence}
            disabled={savingSeq}
            className={`border-none rounded-lg px-4 py-2.5 text-[12px] font-medium cursor-pointer flex items-center gap-2 transition-all disabled:opacity-40 ${savedSeq ? "bg-green text-white" : "bg-accent text-white hover:bg-accent-hover shadow-glow"}`}
          >
            {savedSeq ? <><IconCheck size={13} /> Saved</> : savingSeq ? "Saving…" : "Save sequence"}
          </button>
          {runResult && <span className="text-[11px] text-txt-tertiary font-mono">{runResult}</span>}
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
