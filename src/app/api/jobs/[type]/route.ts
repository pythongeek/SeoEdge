/**
 * Dynamic Job Handler - QStash Webhook Receiver
 * Receives job messages from Upstash QStash and processes them
 * 
 * QStash delivers to: /api/jobs/{jobType}
 * e.g.: /api/jobs/gsc_analysis, /api/jobs/ai_analysis, /api/jobs/full_audit
 */

import { NextRequest, NextResponse } from "next/server";
import { handleQStashWebhook } from "@/lib/queue-adapter";
import { db } from "@/db";
import { jobs, reports, workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { executeActionV2 } from "@/lib/action-router-v2";
import { sql } from "drizzle-orm";
import { z } from "zod";

// ─── Max Duration for Vercel ──────────────────────────────────────────
export const maxDuration = 120;

// ─── Job Payload Schema ───────────────────────────────────────────────

const JobPayloadSchema = z.object({
  jobType: z.string(),
  workspaceId: z.string(),
  userId: z.string().optional(),
  payload: z.record(z.any()).optional(),
});

// ─── GET - Check job status ───────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const url = new URL(req.url);
  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  try {
    const [job] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.jobId, jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST - Handle QStash job delivery ───────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  // ── Verify QStash signature ────────────────────────────────────────
  const webhookError = await handleQStashWebhook(req);
  if (webhookError) return webhookError;

  // ── Parse job payload ───────────────────────────────────────────────
  let body: z.infer<typeof JobPayloadSchema>;
  try {
    const raw = await req.json();
    body = JobPayloadSchema.parse(raw);
  } catch (e) {
    return NextResponse.json({ error: "Invalid job payload" }, { status: 400 });
  }

  const { workspaceId, userId, payload } = body;
  const jobType = type;

  console.log(`[JobHandler:${jobType}] Starting job for workspace ${workspaceId}`);

  // ── Create job record in DB ──────────────────────────────────────────
  let jobRecord: any;
  try {
    const [created] = await db
      .insert(jobs)
      .values({
        jobId: `${jobType}:${workspaceId}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
        workspaceId: parseInt(workspaceId),
        type: jobType,
        status: "processing",
        payload: payload || {},
        startedAt: new Date(),
      })
      .returning();
    jobRecord = created;
  } catch (e: any) {
    console.error(`[JobHandler:${jobType}] Failed to create job record:`, e.message);
    return NextResponse.json({ error: "Failed to create job record" }, { status: 500 });
  }

  let result: any;
  let errorMessage: string | undefined;

  try {
    // ── Execute job based on type ─────────────────────────────────────
    switch (jobType) {
      case "gsc_analysis":
        result = await handleGscAnalysis(workspaceId, payload);
        break;

      case "ai_analysis":
        result = await handleAiAnalysis(workspaceId, userId, payload);
        break;

      case "health_audit":
        result = await handleHealthAudit(workspaceId, payload);
        break;

      case "content_plan":
        result = await handleContentPlan(workspaceId, payload);
        break;

      case "full_audit":
        result = await handleFullAudit(workspaceId, payload);
        break;

      case "scheduled_report":
        result = await handleScheduledReport(workspaceId, payload);
        break;

      case "ctr_analysis":
      case "cannibalization":
      case "serp_analysis":
      case "trend_analysis":
      case "topic_clusters":
      case "geo_risk":
        result = await handleAnalysisJob(jobType, workspaceId, payload);
        break;

      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }

    // ── Mark job completed ────────────────────────────────────────────
    await db
      .update(jobs)
      .set({
        status: "completed",
        progress: 100,
        result,
        completedAt: new Date(),
      })
      .where(eq(jobs.id, jobRecord.id));

    console.log(`[JobHandler:${jobType}] Job completed successfully`);

    return NextResponse.json({
      success: true,
      jobId: jobRecord.jobId,
      result,
    });
  } catch (e: any) {
    errorMessage = e.message;
    console.error(`[JobHandler:${jobType}] Job failed:`, e.message);

    // ── Mark job failed ───────────────────────────────────────────────
    await db
      .update(jobs)
      .set({
        status: "failed",
        error: errorMessage,
        completedAt: new Date(),
      })
      .where(eq(jobs.id, jobRecord.id));

    return NextResponse.json(
      { success: false, jobId: jobRecord.jobId, error: errorMessage },
      { status: 500 }
    );
  }
}

// ─── Job Handlers ─────────────────────────────────────────────────────

async function handleGscAnalysis(workspaceId: string, payload?: Record<string, any>) {
  const { analyzeAllCtrGaps, detectCannibalization } = await import("@/lib/seo-heuristics");
  const { executeActionV2 } = await import("@/lib/action-router-v2");

  const gscData = payload?.gscData;
  if (!gscData?.length) {
    throw new Error("No GSC data provided");
  }

  const ctrGaps = analyzeAllCtrGaps(gscData).slice(0, 100);
  const cannibalization = detectCannibalization(gscData);

  // Run AI analysis
  const { result, tokensUsed } = await executeActionV2("ctr_analysis", {
    gscData,
    siteUrl: payload?.siteUrl,
  }, parseInt(workspaceId));

  // Save report
  const [report] = await db
    .insert(reports)
    .values({
      workspaceId: parseInt(workspaceId),
      title: `GSC Analysis - ${new Date().toISOString().split("T")[0]}`,
      type: "gsc_analysis",
      summary: result.summary,
      actions: result.prioritizedActions,
      ctrGaps: result.ctrGaps,
      cannibalization: result.cannibalization,
      opportunities: result.opportunities,
      healthScore: result.healthScore,
      aiTokensUsed: tokensUsed,
    })
    .returning();

  return { reportId: report.id, tokensUsed, ...result };
}

async function handleAiAnalysis(workspaceId: string, userId?: string, payload?: Record<string, any>) {
  const { action, data } = payload || {};
  if (!action) throw new Error("No action specified");

  const { result, tokensUsed } = await executeActionV2(action, data || {}, parseInt(workspaceId));

  const [report] = await db
    .insert(reports)
    .values({
      workspaceId: parseInt(workspaceId),
      userId: userId ? parseInt(userId) : null,
      title: `AI Analysis: ${action} - ${new Date().toISOString().split("T")[0]}`,
      type: action,
      summary: result.summary || "Analysis complete",
      actions: result.prioritizedActions || [],
      opportunities: result.opportunities || [],
      aiTokensUsed: tokensUsed,
    })
    .returning();

  return { reportId: report.id, tokensUsed, ...result };
}

async function handleHealthAudit(workspaceId: string, payload?: Record<string, any>) {
  const { result, tokensUsed } = await executeActionV2("health_audit", {
    pages: payload?.pages,
  }, parseInt(workspaceId));

  const [report] = await db
    .insert(reports)
    .values({
      workspaceId: parseInt(workspaceId),
      title: `Health Audit - ${new Date().toISOString().split("T")[0]}`,
      type: "health_audit",
      summary: result.summary,
      pageHealth: result.categories,
      healthScore: result.overallScore,
      aiTokensUsed: tokensUsed,
    })
    .returning();

  return { reportId: report.id, tokensUsed, ...result };
}

async function handleContentPlan(workspaceId: string, payload?: Record<string, any>) {
  const { result, tokensUsed } = await executeActionV2("content_plan", {
    gscData: payload?.gscData,
    keywords: payload?.keywords,
  }, parseInt(workspaceId));

  const [report] = await db
    .insert(reports)
    .values({
      workspaceId: parseInt(workspaceId),
      title: `Content Plan - ${new Date().toISOString().split("T")[0]}`,
      type: "content_plan",
      summary: result.summary,
      contentPlan: result.items,
      aiTokensUsed: tokensUsed,
    })
    .returning();

  return { reportId: report.id, tokensUsed, ...result };
}

async function handleFullAudit(workspaceId: string, payload?: Record<string, any>) {
  const { result, tokensUsed } = await executeActionV2("full_audit", {
    gscData: payload?.gscData,
    siteUrl: payload?.siteUrl,
    pages: payload?.pages,
  }, parseInt(workspaceId));

  const [report] = await db
    .insert(reports)
    .values({
      workspaceId: parseInt(workspaceId),
      title: `Full SEO Audit - ${new Date().toISOString().split("T")[0]}`,
      type: "full_audit",
      summary: result.summary,
      actions: result.prioritizedActions,
      opportunities: result.opportunities,
      healthScore: result.healthScore,
      aiTokensUsed: tokensUsed,
    })
    .returning();

  return { reportId: report.id, tokensUsed, ...result };
}

async function handleScheduledReport(workspaceId: string, payload?: Record<string, any>) {
  const { result, tokensUsed } = await executeActionV2("full_audit", {
    gscData: payload?.gscData,
    siteUrl: payload?.siteUrl,
  }, parseInt(workspaceId));

  const [report] = await db
    .insert(reports)
    .values({
      workspaceId: parseInt(workspaceId),
      title: `Scheduled Report - ${new Date().toISOString().split("T")[0]}`,
      type: "scheduled_report",
      summary: result.summary,
      actions: result.prioritizedActions,
      aiTokensUsed: tokensUsed,
    })
    .returning();

  return { reportId: report.id, reportGenerated: true, ...result };
}

async function handleAnalysisJob(jobType: string, workspaceId: string, payload?: Record<string, any>) {
  const actionMap: Record<string, string> = {
    ctr_analysis: "ctr_analysis",
    cannibalization: "cannibalization",
    serp_analysis: "serp_analysis",
    trend_analysis: "trend_analysis",
    topic_clusters: "topic_clusters",
    geo_risk: "geo_risk",
  };

  const action = actionMap[jobType];
  if (!action) throw new Error(`Unknown analysis job type: ${jobType}`);

  const { result, tokensUsed } = await executeActionV2(action, payload || {}, parseInt(workspaceId));

  const [report] = await db
    .insert(reports)
    .values({
      workspaceId: parseInt(workspaceId),
      title: `${action.replace("_", " ").toUpperCase()} - ${new Date().toISOString().split("T")[0]}`,
      type: jobType,
      summary: result.summary || "Analysis complete",
      actions: result.prioritizedActions || [],
      opportunities: result.opportunities || [],
      aiTokensUsed: tokensUsed,
    })
    .returning();

  return { reportId: report.id, tokensUsed, ...result };
}