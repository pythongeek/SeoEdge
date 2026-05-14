/**
 * AI Analysis API
 * Structured SEO analysis with Vercel AI SDK
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { executeAction, type ActionType } from "@/lib/action-router";
import { apiLimiter } from "@/lib/rate-limiter";
import { TIER_LIMITS } from "@/lib/constants";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";

const analyzeSchema = z.object({
  action: z.enum([
    "full_audit",
    "ctr_analysis",
    "cannibalization",
    "health_audit",
    "content_plan",
    "serp_analysis",
    "trend_analysis",
    "topic_clusters",
    "geo_risk",
  ]),
  workspaceId: z.number(),
  data: z.record(z.any()),
  engine: z.enum(["openrouter", "gemini"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limiting
    const identifier = userId;
    const { success, limit, reset, remaining } = await apiLimiter.limit(identifier);
    if (!success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "X-RateLimit-Reset": String(reset) } }
      );
    }

    const body = await req.json();
    const { action, workspaceId, data, engine } = analyzeSchema.parse(body);

    // Check workspace tier allows AI
    const [ws] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const tier = TIER_LIMITS[ws.tier || "free"];
    if (!tier.features.aiAnalysis) {
      return NextResponse.json(
        { error: "AI analysis requires Pro plan", upgradeRequired: true },
        { status: 403 }
      );
    }

    // Execute action
    const startTime = Date.now();
    const { result, tokensUsed } = await executeAction(
      action as ActionType,
      data,
      workspaceId
    );

    return NextResponse.json(
      {
        success: true,
        action,
        result,
        tokensUsed,
        latencyMs: Date.now() - startTime,
      },
      {
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
        },
      }
    );
  } catch (error: any) {
    console.error("[AI API] Error:", error);
    return NextResponse.json(
      { error: error.message, stack: process.env.NODE_ENV === "development" ? error.stack : undefined },
      { status: 500 }
    );
  }
}
