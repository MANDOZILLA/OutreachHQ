"use client";

import { useEffect, useState } from "react";
import { IconCheck } from "@tabler/icons-react";
import { useToast } from "@/components/Toast";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

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
    toast("Settings saved");
  }

  const testMode = settings.TEST_MODE === "true";
  const connected = (key: string) => Boolean(settings[key]);

  return (
    <div className="max-w-2xl">
      <div className="set-group">
        <div className="set-group-title">Send limits &amp; quota</div>
        <div className="set-row">
          <div>
            <div className="set-lbl">Daily email limit</div>
            <div className="set-sub">Brevo free tier cap · resets midnight UTC</div>
          </div>
          <input
            className="set-input"
            type="number"
            value={settings.DAILY_EMAIL_LIMIT || ""}
            onChange={(e) => update("DAILY_EMAIL_LIMIT", e.target.value)}
          />
        </div>
        <div className="set-row">
          <div>
            <div className="set-lbl">Min lead score to email</div>
            <div className="set-sub">Leads below this score are skipped</div>
          </div>
          <input
            className="set-input"
            type="number"
            value={settings.MIN_SCORE_TO_EMAIL || ""}
            onChange={(e) => update("MIN_SCORE_TO_EMAIL", e.target.value)}
          />
        </div>
      </div>

      <div className="set-group">
        <div className="set-group-title">Sender identity</div>
        <div className="set-row">
          <div>
            <div className="set-lbl">Sender name</div>
            <div className="set-sub">Display name on outgoing email</div>
          </div>
          <input
            className="set-input"
            type="text"
            value={settings.SENDER_NAME || ""}
            onChange={(e) => update("SENDER_NAME", e.target.value)}
            style={{ width: 160 }}
          />
        </div>
        <div className="set-row">
          <div>
            <div className="set-lbl">Sender email</div>
            <div className="set-sub">From address on outgoing email</div>
          </div>
          <input
            className="set-input"
            type="email"
            value={settings.SENDER_EMAIL || ""}
            onChange={(e) => update("SENDER_EMAIL", e.target.value)}
            style={{ width: 200 }}
          />
        </div>
      </div>

      <div className="set-group">
        <div className="set-group-title">AI &amp; automation</div>
        <div className="set-row">
          <div>
            <div className="set-lbl">Test mode</div>
            <div className="set-sub">Redirect all sends to a test address instead of real leads</div>
          </div>
          <button
            className={`toggle ${testMode ? "on" : ""}`}
            onClick={() => update("TEST_MODE", testMode ? "false" : "true")}
            aria-pressed={testMode}
          />
        </div>
        {testMode && (
          <div className="set-row">
            <div>
              <div className="set-lbl">Test email recipient</div>
              <div className="set-sub">Where redirected emails are delivered</div>
            </div>
            <input
              className="set-input"
              type="email"
              value={settings.TEST_EMAIL || ""}
              onChange={(e) => update("TEST_EMAIL", e.target.value)}
              placeholder="you@gmail.com"
              style={{ width: 200 }}
            />
          </div>
        )}
      </div>

      <div className="set-group">
        <div className="set-group-title">Connections</div>
        <div className="set-row">
          <div>
            <div className="set-lbl">Brevo API key</div>
            <div className="set-sub">Transactional email delivery</div>
          </div>
          {connected("BREVO_API_KEY") ? (
            <span className="pill p-green">Connected</span>
          ) : (
            <input
              className="set-input"
              type="password"
              value={settings.BREVO_API_KEY || ""}
              onChange={(e) => update("BREVO_API_KEY", e.target.value)}
              style={{ width: 200 }}
            />
          )}
        </div>
        <div className="set-row">
          <div>
            <div className="set-lbl">Groq API key</div>
            <div className="set-sub">llama-3.3-70b · reply classification</div>
          </div>
          {connected("GROQ_API_KEY") ? (
            <span className="pill p-green">Connected</span>
          ) : (
            <input
              className="set-input"
              type="password"
              value={settings.GROQ_API_KEY || ""}
              onChange={(e) => update("GROQ_API_KEY", e.target.value)}
              style={{ width: 200 }}
            />
          )}
        </div>
        <div className="set-row">
          <div>
            <div className="set-lbl">Gmail IMAP</div>
            <div className="set-sub">Inbox polling for replies</div>
          </div>
          <input
            className="set-input"
            type="text"
            value={settings.IMAP_EMAIL || ""}
            onChange={(e) => update("IMAP_EMAIL", e.target.value)}
            placeholder="you@gmail.com"
            style={{ width: 200 }}
          />
        </div>
        <div className="set-row">
          <div>
            <div className="set-lbl">IMAP app password</div>
            <div className="set-sub">App-specific password for inbox access</div>
          </div>
          {connected("IMAP_PASSWORD") ? (
            <span className="pill p-green">Connected</span>
          ) : (
            <input
              className="set-input"
              type="password"
              value={settings.IMAP_PASSWORD || ""}
              onChange={(e) => update("IMAP_PASSWORD", e.target.value)}
              style={{ width: 200 }}
            />
          )}
        </div>
      </div>

      <button className="btn-green" onClick={save} disabled={saving}>
        <IconCheck size={14} />
        {saving ? "Saving..." : "Save settings"}
      </button>
    </div>
  );
}
