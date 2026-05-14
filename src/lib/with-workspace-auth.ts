/**
 * Workspace Authentication Middleware
 * Supports both Clerk session and API key authentication
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────

type AuthHandler = (
  req: NextRequest,
  user: { id: string; workspaceId: number; tier: string },
  workspaceId: number
) => Promise<Response>;

interface AuthOptions {
  allowApiKey?: boolean;
  requirePro?: boolean;
}

// ─── Workspace Resolution ─────────────────────────────────────────────

async function resolveWorkspace(userId: string) {
  // Find or create workspace for user
  let [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.ownerId, userId))
    .limit(1);

  if (!ws) {
    // Auto-create workspace on first API call
    const [newWs] = await db
      .insert(workspaces)
      .values({
        name: "Default Workspace",
        slug: `workspace-${Date.now()}`,
        ownerId: userId,
        tier: "free",
        tokensUsedThisMonth: 0,
        apiRequestsThisMonth: 0,
        tokensLimit: 10000,
        settings: {},
      })
      .returning();
    ws = newWs;
  }

  return ws;
}

// ─── API Key Authentication ───────────────────────────────────────────

async function authenticateByApiKey(req: NextRequest): Promise<{ workspaceId: number; tier: string } | null> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return null;

  try {
    // Hash the API key for lookup
    const { hashApiKey } = await import("./crypto-utils");
    const hashedKey = hashApiKey(apiKey);

    const [ws] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.apiKey, hashedKey))
      .limit(1);

    if (!ws) return null;

    // Update last used
    await db
      .update(workspaces)
      .set({ updatedAt: new Date() })
      .where(eq(workspaces.id, ws.id));

    return { workspaceId: ws.id, tier: ws.tier || "free" };
  } catch {
    return null;
  }
}

// ─── Middleware Factory ───────────────────────────────────────────────

export function withWorkspaceApiAuth(handler: AuthHandler, options: AuthOptions = {}) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      let userId: string | null = null;
      let workspaceId: number;
      let tier = "free";

      // Try Clerk authentication first
      try {
        const authResult = await auth();
        userId = authResult.userId;
      } catch {
        // Clerk not configured or auth failed
      }

      if (userId) {
        // Clerk auth succeeded
        const ws = await resolveWorkspace(userId);
        workspaceId = ws.id;
        tier = ws.tier || "free";
      } else if (options.allowApiKey) {
        // Try API key auth
        const apiAuth = await authenticateByApiKey(req);
        if (!apiAuth) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        workspaceId = apiAuth.workspaceId;
        tier = apiAuth.tier;
        userId = `api-${workspaceId}`;
      } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Check Pro requirement
      if (options.requirePro && tier === "free") {
        return NextResponse.json(
          { error: "Pro plan required", upgradeRequired: true },
          { status: 403 }
        );
      }

      // Track API request
      try {
        await db
          .update(workspaces)
          .set({
            apiRequestsThisMonth: sql`${workspaces.apiRequestsThisMonth} + 1`,
          })
          .where(eq(workspaces.id, workspaceId));
      } catch {
        // Non-critical
      }

      const user = { id: userId, workspaceId, tier };
      return await handler(req, user, workspaceId);
    } catch (error: any) {
      console.error("[WorkspaceAuth] Error:", error);
      return NextResponse.json(
        { error: "Authentication failed", message: error.message },
        { status: 500 }
      );
    }
  };
}
