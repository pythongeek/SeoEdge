/**
 * Clerk Webhook
 * Handles user/org creation and syncs to DB
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, workspaces, workspaceMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const type = payload.type;

  try {
    switch (type) {
      case "user.created": {
        const userData = payload.data;
        await db.insert(users).values({
          clerkUserId: userData.id,
          email: userData.email_addresses?.[0]?.email_address || "",
          name: `${userData.first_name || ""} ${userData.last_name || ""}`.trim() || null,
          avatarUrl: userData.image_url,
          role: "owner",
        });
        break;
      }
      case "user.updated": {
        const userData = payload.data;
        await db
          .update(users)
          .set({
            email: userData.email_addresses?.[0]?.email_address || "",
            name: `${userData.first_name || ""} ${userData.last_name || ""}`.trim() || null,
            avatarUrl: userData.image_url,
          })
          .where(eq(users.clerkUserId, userData.id));
        break;
      }
      case "organization.created": {
        const org = payload.data;
        const [workspace] = await db
          .insert(workspaces)
          .values({
            clerkOrgId: org.id,
            name: org.name,
            slug: org.slug || org.name.toLowerCase().replace(/\s+/g, "-"),
            tier: "free",
          })
          .returning();

        // Set as default workspace for creator
        await db
          .update(users)
          .set({ defaultWorkspaceId: workspace.id })
          .where(eq(users.clerkUserId, org.created_by));
        break;
      }
      case "organizationMembership.created": {
        const membership = payload.data;
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.clerkUserId, membership.public_user_data?.user_id))
          .limit(1);

        const [ws] = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.clerkOrgId, membership.organization?.id))
          .limit(1);

        if (user && ws) {
          await db.insert(workspaceMembers).values({
            workspaceId: ws.id,
            userId: user.id,
            role: membership.role === "admin" ? "admin" : "member",
          });
        }
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Clerk Webhook] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
