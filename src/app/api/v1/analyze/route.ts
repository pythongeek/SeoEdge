/**
 * POST /api/v1/analyze - Run AI-powered SEO analysis
 * Uses MiniMax M2.7 direct API with Harnedd Agent + Gemini fallback
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { executeActionV2, type ActionType } from "@/lib/action-router-v2";
import { withWorkspaceApiAuth } from "@/lib/with-workspace-auth";
import { captureException } from "@/lib/observability";

export const POST = withWorkspaceApiAuth(async (req: Request, user: any, workspaceId: number) => {
  try {
    const body = await req.json();
    const { action, data, siteUrl, engine } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing 'action' parameter" },
        { status: 400 }
      );
    }

    const validActions: ActionType[] = [
      "full_audit",
      "ctr_analysis",
      "cannibalization",
      "health_audit",
      "content_plan",
      "serp_analysis",
      "trend_analysis",
      "topic_clusters",
      "geo_risk",
      "ai_overview",
    ];

    if (!validActions.includes(action as ActionType)) {
      return NextResponse.json(
        {
          error: `Invalid action. Valid: ${validActions.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    const { result, tokensUsed, model, reasoningSteps } = await executeActionV2(
      action as ActionType,
      {
        gscData: data?.gscData,
        pages: data?.pages,
        currentPeriod: data?.currentPeriod,
        previousPeriod: data?.previousPeriod,
        siteUrl: siteUrl || data?.siteUrl,
        language: data?.language,
        keywords: data?.keywords,
      },
      workspaceId
    );

    return NextResponse.json({
      success: true,
      result,
      meta: {
        tokensUsed,
        model,
        latencyMs: Date.now() - startTime,
        reasoningSteps: reasoningSteps || undefined,
      },
    });
  } catch (e: any) {
    console.error("[API v1/analyze] Error:", e);
    captureException(e, { action: "api_v1_analyze" });

    return NextResponse.json(
      {
        error: "Analysis failed",
        message: e.message,
        details: e instanceof z.ZodError ? e.errors : undefined,
      },
      { status: 500 }
    );
  }
}, { allowApiKey: true });
