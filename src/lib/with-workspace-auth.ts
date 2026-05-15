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
  // Find user by clerkUserId, then get their workspace via workspaceMembers
  let ws = null;

  // First try: find user by clerkUserId
  const { users, workspaceMembers } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (user) {
    // Get user's workspaces via workspaceMembers (prefer default workspace)
    const memberships = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, user.id))
      .orderBy(workspaceMembers.createdAt)
      .limit(10);

    if (memberships.length > 0) {
      // Use default workspace or first membership
      const targetWorkspaceId = user.defaultWorkspaceId || memberships[0].workspaceId;
      [ws] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, targetWorkspaceId))
        .limit(1);
    }
  }

  if (!ws) {
    // Auto-create workspace on first API call
    // First create the user if they don't exist
    let userRecord = user;
    if (!userRecord) {
      [userRecord] = await db
        .insert(users)
        .values({
          clerkUserId: userId,
          email: `user-${userId}@clerk.local`,
          name: "Auto-created User",
        })
        .returning();
    }

    // Create default workspace
    const [newWs] = await db
      .insert(workspaces)
      .values({
        name: "Default Workspace",
        slug: `workspace-${Date.now()}`,
        tier: "free",
        tokensUsedThisMonth: 0,
        apiRequestsThisMonth: 0,
        tokensLimit: 10000,
        settings: {},
      })
      .returning();
    ws = newWs;

    // Add user as owner member
    await db.insert(workspaceMembers).values({
      workspaceId: ws.id,
      userId: userRecord.id,
      role: "owner",
    });
  }

  return ws;
}

// ─── API Key Authentication ───────────────────────────────────────────

async function authenticateByApiKey(req: NextRequest): Promise<{ workspaceId: number; tier: string } | null> {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return null;

  try {
    const { hashApiKey } = await import("./crypto-utils");
    const hashedKey = hashApiKey(apiKey);

    // Look up in apiKeys table (not workspaces)
    const { apiKeys } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");

    const [keyRecord] = await db
      .select({ workspaceId: apiKeys.workspaceId })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.hashedKey, hashedKey),
          eq(apiKeys.isActive, true)
        )
      )
      .limit(1);

    if (!keyRecord) return null;

    // Get workspace
    const [ws] = await db
      .select({ id: workspaces.id, tier: workspaces.tier })
      .from(workspaces)
      .where(eq(workspaces.id, keyRecord.workspaceId))
      .limit(1);

    if (!ws) return null;

    // Update last used
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.workspaceId, keyRecord.workspaceId));

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
