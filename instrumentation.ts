// Next.js instrumentation hook — runs once when the server boots.
// Starts the cron manager (follow-up sequencer, scheduled tasks, and the
// midnight Brevo quota reset).

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { CronManager } = await import("./src/lib/cron-manager");
    try {
      CronManager.init();
    } catch (err) {
      console.error("Failed to initialize CronManager:", err);
    }
  }
}
