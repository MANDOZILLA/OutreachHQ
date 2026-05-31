"use client";

import { useEffect, useState } from "react";
import {
  IconPlus,
  IconPlayerPlay,
  IconDeviceFloppy,
  IconArrowRight,
  IconFlagCheck,
  IconBolt,
  IconClock,
} from "@tabler/icons-react";
import { useToast } from "@/components/Toast";

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

const STEP_NAMES = ["First touch", "Follow-up", "Last touch"];

export default function SchedulePage() {
  const toast = useToast();
  const [tab, setTab] = useState<"sequence" | "schedules">("sequence");

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [taskType, setTaskType] = useState("scrape_email");
  const [frequency, setFrequency] = useState("daily");
  const [time, setTime] = useState("09:00");
  const [customName, setCustomName] = useState("");

  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [savingSeq, setSavingSeq] = useState(false);
  const [runResult, setRunResult] = useState<string>("");

  // Visual auto-pause rules (client-side only — API has no persistence for these).
  const [pauseRules, setPauseRules] = useState({
    reply: true,
    blacklist: true,
    minScore: true,
  });

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
    toast("Sequence saved — applies to next cron run");
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
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="sub-pills">
          <div className={`sp ${tab === "sequence" ? "active" : ""}`} onClick={() => setTab("sequence")}>
            Default sequence
          </div>
          <div className={`sp ${tab === "schedules" ? "active" : ""}`} onClick={() => setTab("schedules")}>
            Schedules &amp; runs
          </div>
        </div>
        {tab === "sequence" && (
          <button className="btn-green" onClick={saveSequence} disabled={savingSeq}>
            <IconDeviceFloppy size={14} /> {savingSeq ? "Saving…" : "Save sequence"}
          </button>
        )}
      </div>

      {tab === "sequence" && (
        <>
          <div className="card" style={{ padding: 0 }}>
            <div className="set-group-title" style={{ borderRadius: "10px 10px 0 0" }}>
              <span>Default sequence — {steps.length} steps</span>
              <span style={{ fontSize: 10, color: "var(--ink-4)", fontWeight: 400 }}>
                auto-pauses the moment a lead replies
              </span>
            </div>
            <div className="seq-builder">
              {steps.map((s, i) => {
                const iconClass = `icon-${(i % 3) + 1}`;
                const name = STEP_NAMES[i] || s.label || `Step ${i + 1}`;
                const isLast = i === steps.length - 1;
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "stretch" }}>
                    <div className="seq-step">
                      <div className="seq-step-h">
                        <div className="seq-step-name">
                          <div className={`seq-step-icon ${iconClass}`}>{i + 1}</div> {name}
                        </div>
                      </div>
                      <div className="seq-delay">
                        {i === 0 ? <IconBolt size={13} /> : <IconClock size={13} />}
                        {i === 0 ? "Send" : "Wait"}
                        <input
                          type="number"
                          min={0}
                          value={s.day_offset}
                          onChange={(e) =>
                            updateStep(s.id, { day_offset: Math.max(0, Number(e.target.value)) })
                          }
                        />
                        {i === 0 ? "days after add" : `days after step ${i}`}
                      </div>
                      {i === 0 ? (
                        <>
                          <div className="seq-subj-label">Subject (A/B split)</div>
                          <div className="seq-subj">{s.label || "Quick question about ordering at {{name}}"}</div>
                          <div className="seq-subj" style={{ borderColor: "var(--blue)", borderStyle: "dashed" }}>
                            {"{{name}} — cut food waste by 30%?"}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="seq-subj-label">Subject</div>
                          <div className="seq-subj">{s.label || `Re: {{name}} — step ${i + 1}`}</div>
                        </>
                      )}
                    </div>
                    <div className="seq-arrow">
                      {isLast ? (
                        <IconFlagCheck size={16} style={{ color: "var(--green-d)" }} />
                      ) : (
                        <IconArrowRight size={18} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <div>
                <div className="card-t">Auto-pause rules</div>
                <div className="card-s">stop a lead&apos;s sequence automatically</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <div className="set-row" style={{ padding: "11px 0" }}>
                <div>
                  <div className="set-lbl">Pause on any reply</div>
                  <div className="set-sub">IMAP detects a reply → sequence halts immediately</div>
                </div>
                <button
                  className={`toggle ${pauseRules.reply ? "on" : ""}`}
                  onClick={() => setPauseRules((p) => ({ ...p, reply: !p.reply }))}
                />
              </div>
              <div className="set-row" style={{ padding: "11px 0" }}>
                <div>
                  <div className="set-lbl">Auto-blacklist on &quot;hard no&quot;</div>
                  <div className="set-sub">Groq classifies reply as hard-no → never contact again</div>
                </div>
                <button
                  className={`toggle ${pauseRules.blacklist ? "on" : ""}`}
                  onClick={() => setPauseRules((p) => ({ ...p, blacklist: !p.blacklist }))}
                />
              </div>
              <div className="set-row" style={{ padding: "11px 0", borderBottom: "none" }}>
                <div>
                  <div className="set-lbl">Skip below min score</div>
                  <div className="set-sub">Leads under 60 never enter a sequence</div>
                </div>
                <button
                  className={`toggle ${pauseRules.minScore ? "on" : ""}`}
                  onClick={() => setPauseRules((p) => ({ ...p, minScore: !p.minScore }))}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "schedules" && (
        <div className="space-y-3">
          <div className="bg-bg-card border border-border-subtle rounded-xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className={labelClass}>Scheduled runs</div>
              <button
                onClick={runSequenceNow}
                className="text-[11px] text-txt-secondary hover:text-txt-primary flex items-center gap-1.5 border border-border-strong rounded-lg px-2.5 py-1.5 hover:bg-bg-elevated transition-colors"
              >
                <IconPlayerPlay size={12} /> Run sequence now
              </button>
            </div>
            {runResult && <div className="text-[11px] text-txt-tertiary font-mono mb-3">{runResult}</div>}
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
      )}
    </div>
  );
}
