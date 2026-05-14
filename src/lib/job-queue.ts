/**
 * BullMQ Job Queue Setup
 * Production-ready with Redis from Upstash or Railway
 */

import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";

// ─── Redis Connection ─────────────────────────────────────────────────

function createRedisConnection(): IORedis {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    return new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  // Fallback to Upstash REST (not ideal for BullMQ, but works with prefix)
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    return new IORedis({
      host: upstashUrl.replace("https://", ""),
      port: 443,
      tls: {},
      password: upstashToken,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  // Return a mock connection for build time
  console.warn("[Queue] No Redis URL configured - using mock connection");
  return new IORedis("redis://localhost:6379", {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
}

export const redisConnection = createRedisConnection();

// ─── Queue Names ──────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  main: "seomaster-main",
  deadLetter: "seomaster-dead-letter",
  scheduled: "seomaster-scheduled",
} as const;

// ─── Queues ───────────────────────────────────────────────────────────

export const mainQueue = new Queue(QUEUE_NAMES.main, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const deadLetterQueue = new Queue(QUEUE_NAMES.deadLetter, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 500 },
  },
});

// ─── Job Types ────────────────────────────────────────────────────────

export type JobType =
  | "gsc_analysis"
  | "serp_fetch"
  | "crawl"
  | "ai_analysis"
  | "export"
  | "health_audit"
  | "content_plan"
  | "scheduled_report";

interface JobData {
  type: JobType;
  workspaceId: number;
  userId?: number;
  payload: Record<string, any>;
  priority?: number;
}

// ─── Enqueue ──────────────────────────────────────────────────────────

export async function enqueueJob(
  type: JobType,
  workspaceId: number,
  payload: Record<string, any>,
  options: {
    userId?: number;
    priority?: number;
    delay?: number;
    jobId?: string;
  } = {}
): Promise<string> {
  const job = await mainQueue.add(
    type,
    {
      type,
      workspaceId,
      userId: options.userId,
      payload,
    } as JobData,
    {
      priority: options.priority || 0,
      delay: options.delay,
      jobId: options.jobId || `${type}-${workspaceId}-${Date.now()}`,
    }
  );

  console.log(`[Queue] Enqueued ${type} job ${job.id} for workspace ${workspaceId}`);
  return job.id || "";
}

// ─── Job Status ───────────────────────────────────────────────────────

export async function getJobStatus(jobId: string): Promise<{
  status: string;
  progress: number;
  result?: any;
  error?: string;
}> {
  const job = await mainQueue.getJob(jobId);
  if (!job) {
    return { status: "not_found", progress: 0 };
  }

  const state = await job.getState();
  const progress = job.progress as number;

  return {
    status: state,
    progress: progress || 0,
    result: job.returnvalue,
    error: job.failedReason,
  };
}

// ─── Queue Metrics ────────────────────────────────────────────────────

export async function getQueueMetrics(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    mainQueue.getWaitingCount(),
    mainQueue.getActiveCount(),
    mainQueue.getCompletedCount(),
    mainQueue.getFailedCount(),
    mainQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

// ─── Pause/Resume ─────────────────────────────────────────────────────

export async function pauseQueue(): Promise<void> {
  await mainQueue.pause();
  console.log("[Queue] Paused");
}

export async function resumeQueue(): Promise<void> {
  await mainQueue.resume();
  console.log("[Queue] Resumed");
}

// ─── Cleanup ──────────────────────────────────────────────────────────

export async function closeQueues(): Promise<void> {
  await mainQueue.close();
  await deadLetterQueue.close();
  await redisConnection.quit();
}
