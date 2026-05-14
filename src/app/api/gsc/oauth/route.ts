/**
 * GSC OAuth - Initiate and callback
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encryptTokenForStorage } from "@/lib/gsc-fetcher";

const oauth2Client = new google.auth.OAuth2(
  process.env.GSC_CLIENT_ID,
  process.env.GSC_CLIENT_SECRET,
  process.env.GSC_REDIRECT_URI
);

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

// ─── Initiate OAuth ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "callback") {
    return handleCallback(req);
  }

  // Generate auth URL
  const state = Buffer.from(
    JSON.stringify({ userId, redirect: "/dashboard/settings" })
  ).toString("base64");

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state,
    prompt: "consent",
  });

  return NextResponse.json({ url: authUrl });
}

// ─── OAuth Callback ───────────────────────────────────────────────────

async function handleCallback(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;
    const accessToken = tokens.access_token;
    const expiryDate = tokens.expiry_date;

    if (!refreshToken) {
      return NextResponse.json({ error: "No refresh token" }, { status: 400 });
    }

    // Get user's workspace
    const stateData = JSON.parse(Buffer.from(state || "", "base64").toString());
    const { userId } = stateData;

    // Get user's default workspace from DB
    const { users } = await import("@/db/schema");
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    if (!user?.defaultWorkspaceId) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    // Encrypt and store tokens
    const encryptedRefresh = encryptTokenForStorage(refreshToken);

    await db
      .update(workspaces)
      .set({
        gscEncryptedToken: encryptedRefresh,
        gscTokenExpiresAt: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 3600 * 1000),
      })
      .where(eq(workspaces.id, user.defaultWorkspaceId));

    // Redirect back to dashboard
    return NextResponse.redirect(new URL("/dashboard/settings?gsc=connected", process.env.NEXT_PUBLIC_APP_URL));
  } catch (error: any) {
    console.error("[GSC OAuth] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
