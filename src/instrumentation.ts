/**
 * Next.js Instrumentation
 * Initializes observability on server startup
 */

import { initPostHog } from "./lib/observability";
import { initCronScheduler } from "./lib/cron-scheduler";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize PostHog for analytics
    initPostHog();

    // Start cron scheduler if enabled (skip in dev without explicit flag)
    if (process.env.ENABLE_CRON === "true" || process.env.NODE_ENV === "production") {
      console.log("[Instrumentation] Starting cron scheduler...");
      initCronScheduler();
    }

    console.log("[Instrumentation] Server initialization complete");
  }
}
