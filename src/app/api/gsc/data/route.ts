/**
 * GSC Data Fetch API
 * Fetches search analytics with encrypted token
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workspaces, gscData, jobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchSearchAnalytics, getDateRange, decryptTokenForUse } from "@/lib/gsc-fetcher";
import { enqueueJob } from "@/lib/queue-adapter";
import { z } from "zod";

const fetchSchema = z.object({
  workspaceId: z.number(),
  siteUrl: z.string().url(),
  dateRange: z.enum(["7d", "28d", "3m", "6m", "12m"]).default("28d"),
  dimensions: z.array(z.enum(["query", "page", "country", "device"])).default(["query", "page"]),
  triggerAnalysis: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workspaceId, siteUrl, dateRange, dimensions, triggerAnalysis } = fetchSchema.parse(body);

    // Get workspace with encrypted token
    const [ws] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!ws?.gscEncryptedToken) {
      return NextResponse.json({ error: "GSC not connected" }, { status: 400 });
    }

    const dates = getDateRange(dateRange);

    // Fetch from GSC API
    const rows = await fetchSearchAnalytics(
      {
        type: "oauth",
        refreshToken: decryptTokenForUse(ws.gscEncryptedToken),
      },
      siteUrl,
      {
        startDate: dates.startDate,
        endDate: dates.endDate,
        dimensions,
        rowLimit: ws.tier === "free" ? 1000 : ws.tier === "pro" ? 25000 : 100000,
      }
    );

    // Store in DB
    await db.delete(gscData).where(eq(gscData.workspaceId, workspaceId));

    const insertData = rows.map((row) => ({
      workspaceId,
      type: dimensions.includes("query") ? "query" : "page",
      dimension: row.query || row.page || "",
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      dateRange,
      siteUrl,
      device: row.device,
      country: row.country,
    }));

    // Batch insert in chunks
    const chunkSize = 1000;
    for (let i = 0; i < insertData.length; i += chunkSize) {
      await db.insert(gscData).values(insertData.slice(i, i + chunkSize));
    }

    // Update workspace
    await db
      .update(workspaces)
      .set({ gscSiteUrl: siteUrl, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId));

    // Trigger background analysis
    let jobId: string | undefined;
    if (triggerAnalysis) {
      jobId = await enqueueJob({
        type: "gsc_analysis",
        workspaceId: String(workspaceId),
        payload: { gscData: rows.slice(0, 1000), siteUrl },
      });
    }

    return NextResponse.json({
      success: true,
      rowsFetched: rows.length,
      dateRange,
      jobId,
    });
  } catch (error: any) {
    console.error("[GSC Data] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const workspaceId = parseInt(url.searchParams.get("workspaceId") || "0");
    const type = url.searchParams.get("type") || "query";

    const data = await db
      .select()
      .from(gscData)
      .where(eq(gscData.workspaceId, workspaceId))
      .limit(1000);

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
