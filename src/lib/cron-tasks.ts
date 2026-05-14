/**
 * Cron Task Implementations
 * Actual business logic for scheduled jobs
 */

import { db } from "@/db";
import { scheduledReports, workspaces, jobs } from "@/db/schema";
import { eq, and, lte, lt } from "drizzle-orm";
import { enqueueJob } from "./job-queue";
import { sql } from "drizzle-orm";

// ─── Process Scheduled Reports ────────────────────────────────────────

export async function processScheduledReportsTask() {
  const now = new Date();

  const dueReports = await db
    .select()
    .from(scheduledReports)
    .where(
      and(
        eq(scheduledReports.isActive, true),
        lte(scheduledReports.nextRunAt, now)
      )
    );

  console.log(`[CronTask] Found ${dueReports.length} scheduled reports to process`);

  for (const report of dueReports) {
    try {
      // Enqueue analysis job
      await enqueueJob(
        "scheduled_report",
        report.workspaceId,
        { reportId: report.id, format: report.format, recipients: report.recipients },
        { priority: 3 }
      );

      // Calculate next run date
      const nextRun = new Date();
      if (report.frequency === "weekly") {
        nextRun.setDate(nextRun.getDate() + 7);
      } else if (report.frequency === "monthly") {
        nextRun.setMonth(nextRun.getMonth() + 1);
      } else {
        // Default to weekly
        nextRun.setDate(nextRun.getDate() + 7);
      }

      await db
        .update(scheduledReports)
        .set({
          lastRunAt: now,
          nextRunAt: nextRun,
        })
        .where(eq(scheduledReports.id, report.id));

      console.log(`[CronTask] Scheduled report ${report.id} enqueued, next run: ${nextRun.toISOString()}`);
    } catch (e: any) {
      console.error(`[CronTask] Failed to process report ${report.id}:`, e.message);
    }
  }
}

// ─── Sync GSC Data ────────────────────────────────────────────────────

export async function syncGscDataTask() {
  // Find all workspaces with auto-sync enabled
  const syncWorkspaces = await db
    .select()
    .from(workspaces)
    .where(
      and(
        sql`${workspaces.settings}->>'autoSync' = 'true'`,
        sql`${workspaces.gscSiteUrl} IS NOT NULL`
      )
    )
    .limit(50);

  console.log(`[CronTask] Found ${syncWorkspaces.length} workspaces to sync GSC data`);

  for (const ws of syncWorkspaces) {
    try {
      const syncFrequency = ws.settings?.syncFrequency || "daily";

      // Check if sync is needed based on frequency
      const lastSync = ws.updatedAt;
      const now = new Date();
      const hoursSinceSync = lastSync ? (now.getTime() - new Date(lastSync).getTime()) / (1000 * 60 * 60) : Infinity;

      const shouldSync =
        syncFrequency === "daily" && hoursSinceSync >= 24 ||
        syncFrequency === "weekly" && hoursSinceSync >= 168 ||
        syncFrequency === "hourly" && hoursSinceSync >= 1;

      if (!shouldSync) {
        continue;
      }

      // Enqueue GSC sync job
      await enqueueJob(
        "gsc_analysis",
        ws.id,
        {
          siteUrl: ws.gscSiteUrl,
          dateRange: "28d",
          triggerAnalysis: true,
        },
        { priority: 2 }
      );

      console.log(`[CronTask] Enqueued GSC sync for workspace ${ws.id}`);
    } catch (e: any) {
      console.error(`[CronTask] GSC sync failed for workspace ${ws.id}:`, e.message);
    }
  }
}

// ─── Cleanup Old Jobs ─────────────────────────────────────────────────

export async function cleanupOldJobsTask() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Delete completed jobs older than 30 days
  const deletedJobs = await db
    .delete(jobs)
    .where(
      and(
        eq(jobs.status, "completed"),
        lt(jobs.completedAt, thirtyDaysAgo)
      )
    )
    .returning({ id: jobs.id });

  // Delete failed jobs older than 14 days
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const deletedFailed = await db
    .delete(jobs)
    .where(
      and(
        eq(jobs.status, "failed"),
        lt(jobs.completedAt, fourteenDaysAgo)
      )
    )
    .returning({ id: jobs.id });

  console.log(
    `[CronTask] Cleaned up ${deletedJobs.length} completed and ${deletedFailed.length} failed jobs`
  );
}

// ─── Reset Monthly Tokens ─────────────────────────────────────────────

export async function resetMonthlyTokensTask() {
  const result = await db
    .update(workspaces)
    .set({
      tokensUsedThisMonth: 0,
      apiRequestsThisMonth: 0,
    })
    .returning({ id: workspaces.id });

  console.log(`[CronTask] Reset monthly tokens for ${result.length} workspaces`);
}

// ─── Generate Weekly Digest ───────────────────────────────────────────

export async function generateWeeklyDigestTask() {
  const workspacesList = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.tier, "pro"))
    .or(eq(workspaces.tier, "business"))
    .limit(100);

  for (const ws of workspacesList) {
    try {
      await enqueueJob(
        "scheduled_report",
        ws.id,
        {
          type: "weekly_digest",
          format: "email",
        },
        { priority: 2 }
      );

      console.log(`[CronTask] Weekly digest enqueued for workspace ${ws.id}`);
    } catch (e: any) {
      console.error(`[CronTask] Weekly digest failed for workspace ${ws.id}:`, e.message);
    }
  }
}
