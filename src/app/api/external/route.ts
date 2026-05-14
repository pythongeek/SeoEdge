/**
 * External API for n8n/Zapier integration
 * API key authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys, workspaces, reports, gscData } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { hashApiKey } from "@/lib/crypto-utils";
import { externalApiLimiter } from "@/lib/rate-limiter";
import { executeAction } from "@/lib/action-router";

async function validateApiKey(req: NextRequest) {
  const key = req.headers.get("x-api-key");
  if (!key) return null;

  const hashed = hashApiKey(key);
  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.hashedKey, hashed), eq(apiKeys.isActive, true)))
    .limit(1);

  if (!apiKey) return null;

  // Update last used
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id));

  return apiKey;
}

// ─── Run Analysis ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const apiKey = await validateApiKey(req);
    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Rate limiting
    const { success } = await externalApiLimiter.limit(`api:${apiKey.id}`);
    if (!success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json();
    const { action, data } = body;

    // Check workspace tier
    const [ws] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, apiKey.workspaceId))
      .limit(1);

    if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    // Execute analysis
    const { result, tokensUsed } = await executeAction(
      action || "full_audit",
      data || {},
      apiKey.workspaceId
    );

    return NextResponse.json({
      success: true,
      result,
      tokensUsed,
      workspace: ws.slug,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── Get Reports ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const apiKey = await validateApiKey(req);
    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

    let conditions = eq(reports.workspaceId, apiKey.workspaceId);
    // @ts-ignore
    if (type) conditions = and(conditions, eq(reports.type, type));

    const data = await db
      .select()
      .from(reports)
      .where(conditions)
      .limit(limit)
      .orderBy(sql`${reports.createdAt} desc`);

    return NextResponse.json({ reports: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
