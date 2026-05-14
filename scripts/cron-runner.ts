/**
 * Standalone Cron Runner
 * Runs node-cron scheduler independently from the Next.js app
 * Deploy this as a separate service for cron jobs
 */

import { initCronScheduler, stopAllCronJobs } from "../src/lib/cron-scheduler";

console.log("[CronRunner] Starting standalone cron scheduler...");

// Initialize all cron jobs
initCronScheduler();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("[CronRunner] Shutting down...");
  stopAllCronJobs();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("[CronRunner] Shutting down...");
  stopAllCronJobs();
  process.exit(0);
});

console.log("[CronRunner] Scheduler running. Press Ctrl+C to stop.");
