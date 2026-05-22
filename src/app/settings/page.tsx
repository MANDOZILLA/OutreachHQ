"use client";

import { useEffect, useState } from "react";
import { IconCheck } from "@tabler/icons-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
  }, []);

  function update(key: string, val: string) {
    setSettings((prev) => ({ ...prev, [key]: val }));
  }

  async function save() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const fieldClass = "px-3.5 py-2.5 bg-bg-elevated border border-border rounded-lg text-[13px] text-txt-primary focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all w-full";
  const labelClass = "text-[10px] font-medium text-txt-muted uppercase tracking-widest";

  return (
    <div className="space-y-3 max-w-2xl">
      <div className="bg-bg-card border border-border-subtle rounded-xl p-5 shadow-card">
        <div className={`${labelClass} mb-4`}>Email settings</div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: "SENDER_NAME", label: "Sender name", type: "text" },
            { key: "SENDER_EMAIL", label: "Sender email", type: "email" },
            { key: "DAILY_EMAIL_LIMIT", label: "Daily email limit", type: "number" },
            { key: "MIN_SCORE_TO_EMAIL", label: "Min lead score to email", type: "number" },
          ].map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className={labelClass}>{f.label}</label>
              <input
                type={f.type}
                value={settings[f.key] || ""}
                onChange={(e) => update(f.key, e.target.value)}
                className={fieldClass}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl p-5 shadow-card">
        <div className={`${labelClass} mb-4`}>API keys</div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: "GROQ_API_KEY", label: "Groq API key", type: "password" },
            { key: "BREVO_API_KEY", label: "Brevo API key", type: "password" },
            { key: "IMAP_EMAIL", label: "IMAP email", type: "text" },
            { key: "IMAP_PASSWORD", label: "IMAP app password", type: "password" },
          ].map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className={labelClass}>{f.label}</label>
              <input
                type={f.type}
                value={settings[f.key] || ""}
                onChange={(e) => update(f.key, e.target.value)}
                className={fieldClass}
              />
            </div>
          ))}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className={`mt-5 border-none rounded-lg px-4 py-2.5 text-[12px] font-medium cursor-pointer flex items-center gap-2 transition-all disabled:opacity-40 ${
            saved
              ? "bg-green text-white"
              : "bg-accent text-white hover:bg-accent-hover shadow-glow"
          }`}
        >
          {saved ? <><IconCheck size={13} /> Saved</> : saving ? "Saving..." : "Save settings"}
        </button>
      </div>
    </div>
  );
}
