import cron, { ScheduledTask } from "node-cron";
import { getDb } from "./db";
import { writeLog } from "./logger";

interface CronJob {
  task: ScheduledTask;
  scheduleId: number;
}

const jobs: Map<number, CronJob> = new Map();

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
      this.start(s.id, s.cron_expr, s.name);
    }
    writeLog("SYSTEM", `Cron manager initialized with ${schedules.length} active jobs`);
  },

  start(id: number, cronExpr: string, name: string) {
    if (jobs.has(id)) this.stop(id);

    if (!cron.validate(cronExpr)) {
      writeLog("ERROR", `Invalid cron expression for schedule ${id}: ${cronExpr}`);
      return;
    }

    const task = cron.schedule(cronExpr, () => {
      writeLog("SYSTEM", `Schedule triggered: ${name}`);
      const db = getDb();
      db.prepare("UPDATE schedules SET last_run = datetime('now') WHERE id = ?").run(id);
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
      this.start(schedule.id, schedule.cron_expr, schedule.name);
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
