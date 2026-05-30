import cron, { ScheduledTask } from "node-cron";
import { getDb } from "./db";
import { writeLog } from "./logger";
import { runSequence } from "./sequencer";
import { resetQuota } from "./quota";

interface CronJob {
  task: ScheduledTask;
  scheduleId: number;
}

const jobs: Map<number, CronJob> = new Map();
let quotaResetTask: ScheduledTask | null = null;

// Run the work for a given schedule task type when its cron fires.
function runTask(taskType: string, name: string) {
  switch (taskType) {
    case "follow_up":
      // Sends due follow-ups; auto-pauses any lead that has replied.
      runSequence();
      break;
    case "inbox_sync":
      // Real IMAP sync needs request context/creds; left to the manual/route
      // path. Logged so the schedule is visibly firing.
      writeLog("IMAP", `Scheduled inbox sync due (${name}) — run from dashboard`);
      break;
    case "scrape_email":
      writeLog("SCRAPER", `Scheduled scrape + email due (${name})`);
      break;
    default:
      writeLog("SYSTEM", `Scheduled task '${taskType}' fired (${name})`);
  }
}

export const CronManager = {
  init() {
    const db = getDb();
    const schedules = db.prepare("SELECT * FROM schedules WHERE enabled = 1").all() as Array<{
      id: number;
      name: string;
      cron_expr: string;
      task_type: string;
    }>;

    for (const s of schedules) {
      this.start(s.id, s.cron_expr, s.name, s.task_type);
    }

    // Reset the Brevo daily quota counter at midnight.
    if (!quotaResetTask) {
      quotaResetTask = cron.schedule("0 0 * * *", () => resetQuota());
    }

    writeLog("SYSTEM", `Cron manager initialized with ${schedules.length} active jobs`);
  },

  start(id: number, cronExpr: string, name: string, taskType = "") {
    if (jobs.has(id)) this.stop(id);

    if (!cron.validate(cronExpr)) {
      writeLog("ERROR", `Invalid cron expression for schedule ${id}: ${cronExpr}`);
      return;
    }

    const task = cron.schedule(cronExpr, () => {
      writeLog("SYSTEM", `Schedule triggered: ${name}`);
      const db = getDb();
      db.prepare("UPDATE schedules SET last_run = datetime('now') WHERE id = ?").run(id);
      try {
        runTask(taskType, name);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        writeLog("ERROR", `Task '${taskType}' failed: ${msg}`);
      }
    });

    jobs.set(id, { task, scheduleId: id });
  },

  stop(id: number) {
    const job = jobs.get(id);
    if (job) {
      job.task.stop();
      jobs.delete(id);
    }
  },

  restart(id: number) {
    const db = getDb();
    const schedule = db.prepare("SELECT * FROM schedules WHERE id = ?").get(id) as {
      id: number;
      name: string;
      cron_expr: string;
      task_type: string;
      enabled: number;
    } | undefined;

    if (!schedule) return;

    if (schedule.enabled) {
      this.start(schedule.id, schedule.cron_expr, schedule.name, schedule.task_type);
    } else {
      this.stop(id);
    }
  },

  stopAll() {
    jobs.forEach((_, id) => {
      this.stop(id);
    });
  },
};
