/**
 * Cron API - Legacy manual trigger endpoint
 * (Used by GitHub Actions cron, not cron-job.org)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { scheduledReports, workspaces } from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { enqueueJob } from "@/lib/queue-adapter";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    scheduledJobs: 0,
    tokensReset: 0,
  };

  try {
    // 1. Process scheduled reports
    const dueReports = await db
      .select()
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.isActive, true),
          lte(scheduledReports.nextRunAt, new Date())
        )
      );

    for (const report of dueReports) {
      await enqueueJob({
        type: "scheduled_report",
        workspaceId: String(report.workspaceId),
        payload: { reportId: report.id, format: report.format },
      });

      // Update next run
      const nextRun = new Date();
      if (report.frequency === "weekly") nextRun.setDate(nextRun.getDate() + 7);
      else if (report.frequency === "monthly") nextRun.setMonth(nextRun.getMonth() + 1);

      await db
        .update(scheduledReports)
        .set({
          lastRunAt: new Date(),
          nextRunAt: nextRun,
        })
        .where(eq(scheduledReports.id, report.id));

      results.scheduledJobs++;
    }

    // 2. Reset monthly token usage (1st of month)
    const now = new Date();
    if (now.getDate() === 1) {
      await db
        .update(workspaces)
        .set({ tokensUsedThisMonth: 0, apiRequestsThisMonth: 0 });
      results.tokensReset = 1;
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("[Cron] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}