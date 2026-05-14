/**
 * BullMQ Job Processor
 * Handles all background job types with progress tracking
 */

import { Worker } from "bullmq";
import { redisConnection, QUEUE_NAMES } from "./job-queue";
import { executeAction } from "./action-router";
import { db } from "@/db";
import { jobs, reports } from "@/db/schema";
import { eq } from "drizzle-orm";
import { JOB_TIMEOUTS } from "./constants";

// ─── Worker Setup ─────────────────────────────────────────────────────

export function createWorker(concurrency: number = 2): Worker {
  const worker = new Worker(
    QUEUE_NAMES.main,
    async (job) => {
      const startTime = Date.now();
      const { type, workspaceId, userId, payload } = job.data;

      console.log(`[Worker] Processing ${type} job ${job.id} for workspace ${workspaceId}`);

      // Update job status in DB
      await db
        .update(jobs)
        .set({ status: "processing", startedAt: new Date() })
        .where(eq(jobs.jobId, job.id || ""));

      try {
        await job.updateProgress(10);

        let result: any;

        switch (type) {
          case "gsc_analysis":
            result = await handleGscAnalysis(job, workspaceId, payload);
            break;
          case "ai_analysis":
            result = await handleAiAnalysis(job, workspaceId, userId, payload);
            break;
          case "health_audit":
            result = await handleHealthAudit(job, workspaceId, payload);
            break;
          case "content_plan":
            result = await handleContentPlan(job, workspaceId, payload);
            break;
          case "export":
            result = await handleExport(job, workspaceId, payload);
            break;
          case "crawl":
            result = await handleCrawl(job, workspaceId, payload);
            break;
          case "serp_fetch":
            result = await handleSerpFetch(job, workspaceId, payload);
            break;
          case "scheduled_report":
            result = await handleScheduledReport(job, workspaceId, payload);
            break;
          default:
            throw new Error(`Unknown job type: ${type}`);
        }

        await job.updateProgress(100);

        // Update job as completed
        await db
          .update(jobs)
          .set({
            status: "completed",
            progress: 100,
            result,
            completedAt: new Date(),
          })
          .where(eq(jobs.jobId, job.id || ""));

        const duration = Date.now() - startTime;
        console.log(`[Worker] Job ${job.id} completed in ${duration}ms`);

        return result;
      } catch (error: any) {
        console.error(`[Worker] Job ${job.id} failed:`, error);

        // Update job as failed
        await db
          .update(jobs)
          .set({
            status: "failed",
            error: error.message,
            completedAt: new Date(),
          })
          .where(eq(jobs.jobId, job.id || ""));

        // Move to dead letter queue after max retries
        if (job.attemptsMade >= (job.opts?.attempts || 3) - 1) {
          console.log(`[Worker] Job ${job.id} moved to dead letter queue`);
        }

        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency,
      limiter: {
        max: 10,
        duration: 60000, // 10 jobs per minute
      },
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  return worker;
}

// ─── Job Handlers ─────────────────────────────────────────────────────

async function handleGscAnalysis(job: any, workspaceId: number, payload: any) {
  await job.updateProgress(30);

  // Run heuristics
  const heuristics = await import("./seo-heuristics");
  const { analyzeAllCtrGaps, detectCannibalization, detectTrends, clusterKeywords } = heuristics;

  const { gscData } = payload;
  const ctrGaps = analyzeAllCtrGaps(gscData);
  const cannibalization = detectCannibalization(gscData);

  await job.updateProgress(60);

  // Run AI enrichment
  const { result, tokensUsed } = await executeAction("full_audit", {
    gscData: gscData.slice(0, 100),
    siteUrl: payload.siteUrl,
  }, workspaceId);

  await job.updateProgress(90);

  // Save report
  const [report] = await db
    .insert(reports)
    .values({
      workspaceId,
      title: `GSC Analysis - ${new Date().toISOString().split("T")[0]}`,
      type: "gsc_analysis",
      summary: result.summary,
      actions: result.prioritizedActions,
      ctrGaps: result.ctrGaps,
      cannibalization: result.cannibalization,
      opportunities: result.opportunities,
      trendAnalysis: result.trendInsights,
      healthScore: result.healthScore,
      aiTokensUsed: tokensUsed,
    })
    .returning();

  return { reportId: report.id, tokensUsed, ...result };
}

async function handleAiAnalysis(job: any, workspaceId: number, userId: number | undefined, payload: any) {
  await job.updateProgress(20);

  const { action, data } = payload;
  const { result, tokensUsed } = await executeAction(action, data, workspaceId);

  await job.updateProgress(80);

  // Save results as report
  const [report] = await db
    .insert(reports)
    .values({
      workspaceId,
      userId: userId || null,
      title: `AI Analysis: ${action} - ${new Date().toISOString().split("T")[0]}`,
      type: action,
      summary: result.summary || "Analysis complete",
      actions: result.prioritizedActions || [],
      opportunities: result.opportunities || [],
      aiTokensUsed: tokensUsed,
    })
    .returning();

  await job.updateProgress(100);
  return { reportId: report.id, tokensUsed, ...result };
}

async function handleHealthAudit(job: any, workspaceId: number, payload: any) {
  await job.updateProgress(25);

  const { pages } = payload;
  const { result, tokensUsed } = await executeAction("health_audit", { pages }, workspaceId);

  await job.updateProgress(90);

  const [report] = await db
    .insert(reports)
    .values({
      workspaceId,
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

async function handleContentPlan(job: any, workspaceId: number, payload: any) {
  await job.updateProgress(30);

  const { gscData, keywords } = payload;
  const { result, tokensUsed } = await executeAction("content_plan", { gscData, keywords }, workspaceId);

  await job.updateProgress(90);

  const [report] = await db
    .insert(reports)
    .values({
      workspaceId,
      title: `Content Plan - ${new Date().toISOString().split("T")[0]}`,
      type: "content_plan",
      summary: result.summary,
      contentPlan: result.items,
      aiTokensUsed: tokensUsed,
    })
    .returning();

  return { reportId: report.id, tokensUsed, ...result };
}

async function handleExport(job: any, workspaceId: number, payload: any) {
  await job.updateProgress(50);

  const { reportId, format } = payload;

  // Get report data
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);

  if (!report) throw new Error("Report not found");

  await job.updateProgress(80);

  // Generate export
  const { generateExport } = await import("./export-engine");
  const exportData = await generateExport(report, format);

  await job.updateProgress(100);
  return { exportUrl: exportData.url, format };
}

async function handleCrawl(job: any, workspaceId: number, payload: any) {
  await job.updateProgress(10);
  // Crawl implementation would go here
  // For now, return a placeholder
  await job.updateProgress(100);
  return { pagesCrawled: 0, issues: [] };
}

async function handleSerpFetch(job: any, workspaceId: number, payload: any) {
  await job.updateProgress(10);
  // SERP fetch implementation would go here
  // For now, return a placeholder
  await job.updateProgress(100);
  return { queries: 0, features: [] };
}

async function handleScheduledReport(job: any, workspaceId: number, payload: any) {
  await job.updateProgress(10);

  // Trigger full analysis
  const { result } = await executeAction("full_audit", payload, workspaceId);

  await job.updateProgress(80);

  // Generate export
  // TODO: Email sending logic

  await job.updateProgress(100);
  return { reportGenerated: true, ...result };
}
