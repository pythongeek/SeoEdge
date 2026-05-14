/**
 * BullMQ Worker - Standalone Process
 * Run with: npm run worker
 * Docker: docker build -t seomaster-worker -f Dockerfile.worker .
 */

import { createWorker } from "../src/lib/job-processor";

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || "2");
console.log(`[Worker] Starting with concurrency: ${concurrency}`);

const worker = createWorker(concurrency);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("[Worker] Shutting down...");
  await worker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[Worker] Shutting down...");
  await worker.close();
  process.exit(0);
});
