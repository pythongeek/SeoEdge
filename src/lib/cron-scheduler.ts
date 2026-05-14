/**
 * Node-Cron Based Scheduler
 * Free alternative to Vercel Cron Jobs
 * Runs scheduled tasks using node-cron (open source)
 * Designed for Railway/Render/Docker deployments
 */

import cron from "node-cron";

// ─── Types ────────────────────────────────────────────────────────────

interface CronJob {
  name: string;
  schedule: string;
  task: () => Promise<void>;
  enabled: boolean;
  runOnStart?: boolean;
}

interface CronRegistry {
  [name: string]: cron.ScheduledTask;
}

// ─── Registry ─────────────────────────────────────────────────────────

const jobs: CronRegistry = {};
let isInitialized = false;

// ─── Job Definitions ──────────────────────────────────────────────────

export function getDefaultJobs(): Omit<CronJob, "task">[] {
  return [
    {
      name: "process-scheduled-reports",
      schedule: "0 9 * * 1", // Every Monday at 9 AM
      enabled: true,
      runOnStart: false,
    },
    {
      name: "sync-gsc-data",
      schedule: "0 6 * * *", // Daily at 6 AM
      enabled: true,
      runOnStart: false,
    },
    {
      name: "cleanup-old-jobs",
      schedule: "0 2 * * 0", // Weekly on Sunday at 2 AM
      enabled: true,
      runOnStart: false,
    },
    {
      name: "reset-monthly-tokens",
      schedule: "0 0 1 * *", // First day of every month
      enabled: true,
      runOnStart: false,
    },
    {
      name: "health-check",
      schedule: "*/5 * * * *", // Every 5 minutes
      enabled: true,
      runOnStart: true,
    },
  ];
}

// ─── Task Implementations ─────────────────────────────────────────────

async function processScheduledReports() {
  console.log("[Cron] Processing scheduled reports...");
  try {
    const { processScheduledReportsTask } = await import("./cron-tasks");
    await processScheduledReportsTask();
    console.log("[Cron] Scheduled reports processed successfully");
  } catch (e: any) {
    console.error("[Cron] Scheduled reports failed:", e.message);
  }
}

async function syncGscData() {
  console.log("[Cron] Syncing GSC data...");
  try {
    const { syncGscDataTask } = await import("./cron-tasks");
    await syncGscDataTask();
    console.log("[Cron] GSC data synced successfully");
  } catch (e: any) {
    console.error("[Cron] GSC sync failed:", e.message);
  }
}

async function cleanupOldJobs() {
  console.log("[Cron] Cleaning up old jobs...");
  try {
    const { cleanupOldJobsTask } = await import("./cron-tasks");
    await cleanupOldJobsTask();
    console.log("[Cron] Old jobs cleaned up successfully");
  } catch (e: any) {
    console.error("[Cron] Cleanup failed:", e.message);
  }
}

async function resetMonthlyTokens() {
  console.log("[Cron] Resetting monthly tokens...");
  try {
    const { resetMonthlyTokensTask } = await import("./cron-tasks");
    await resetMonthlyTokensTask();
    console.log("[Cron] Monthly tokens reset successfully");
  } catch (e: any) {
    console.error("[Cron] Token reset failed:", e.message);
  }
}

async function healthCheckTask() {
  try {
    const { healthCheck } = await import("./observability");
    const result = await healthCheck();
    if (result.status !== "healthy") {
      console.warn("[Cron] Health check result:", result.status, result.checks);
    }
  } catch (e: any) {
    console.error("[Cron] Health check failed:", e.message);
  }
}

// ─── Task Map ─────────────────────────────────────────────────────────

const taskMap: Record<string, () => Promise<void>> = {
  "process-scheduled-reports": processScheduledReports,
  "sync-gsc-data": syncGscData,
  "cleanup-old-jobs": cleanupOldJobs,
  "reset-monthly-tokens": resetMonthlyTokens,
  "health-check": healthCheckTask,
};

// ─── Scheduler Init ───────────────────────────────────────────────────

export function initCronScheduler(customJobs?: CronJob[]) {
  if (isInitialized) {
    console.log("[Cron] Scheduler already initialized");
    return;
  }

  const jobDefinitions = customJobs || getDefaultJobs();

  for (const job of jobDefinitions) {
    if (!job.enabled) continue;

    const task = job.task || taskMap[job.name];
    if (!task) {
      console.warn(`[Cron] No task implementation for job: ${job.name}`);
      continue;
    }

    if (!cron.validate(job.schedule)) {
      console.warn(`[Cron] Invalid schedule for job ${job.name}: ${job.schedule}`);
      continue;
    }

    const scheduledTask = cron.schedule(
      job.schedule,
      async () => {
        console.log(`[Cron] Running job: ${job.name}`);
        const startTime = Date.now();
        try {
          await task();
          console.log(`[Cron] Job ${job.name} completed in ${Date.now() - startTime}ms`);
        } catch (e: any) {
          console.error(`[Cron] Job ${job.name} failed:`, e.message);
        }
      },
      {
        scheduled: true,
        timezone: process.env.CRON_TIMEZONE || "UTC",
      }
    );

    jobs[job.name] = scheduledTask;
    console.log(`[Cron] Registered job: ${job.name} (${job.schedule})`);

    // Run on start if configured
    if (job.runOnStart) {
      console.log(`[Cron] Running ${job.name} on startup...`);
      task().catch(console.error);
    }
  }

  isInitialized = true;
  console.log("[Cron] Scheduler initialized with", Object.keys(jobs).length, "jobs");
}

// ─── Job Management ───────────────────────────────────────────────────

export function stopCronJob(name: string) {
  const job = jobs[name];
  if (job) {
    job.stop();
    console.log(`[Cron] Stopped job: ${name}`);
  }
}

export function startCronJob(name: string) {
  const job = jobs[name];
  if (job) {
    job.start();
    console.log(`[Cron] Started job: ${name}`);
  }
}

export function stopAllCronJobs() {
  for (const [name, job] of Object.entries(jobs)) {
    job.stop();
    console.log(`[Cron] Stopped job: ${name}`);
  }
}

export function getCronStatus(): Array<{
  name: string;
  running: boolean;
  schedule: string;
}> {
  return Object.keys(jobs).map((name) => ({
    name,
    running: jobs[name].getStatus() === "scheduled",
    schedule: getDefaultJobs().find((j) => j.name === name)?.schedule || "unknown",
  }));
}

// ─── Manual Trigger ───────────────────────────────────────────────────

export async function triggerCronJob(name: string): Promise<boolean> {
  const task = taskMap[name];
  if (!task) {
    console.warn(`[Cron] No task found for: ${name}`);
    return false;
  }

  console.log(`[Cron] Manually triggering: ${name}`);
  try {
    await task();
    return true;
  } catch (e: any) {
    console.error(`[Cron] Manual trigger failed for ${name}:`, e.message);
    return false;
  }
}
