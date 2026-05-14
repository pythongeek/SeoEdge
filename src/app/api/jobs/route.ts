/**
 * Jobs API - CRUD + status tracking
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const workspaceId = parseInt(url.searchParams.get("workspaceId") || "0");
    const status = url.searchParams.get("status");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const conditions = [eq(jobs.workspaceId, workspaceId)];
    if (status) {
      // @ts-ignore
      conditions.push(eq(jobs.status, status));
    }

    const data = await db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ jobs: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { workspaceId, type, status = "pending", payload, scheduledFor } = body;

    const [job] = await db
      .insert(jobs)
      .values({
        jobId: `${type}:${workspaceId}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
        workspaceId,
        type,
        status,
        result: payload,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      })
      .returning();

    return NextResponse.json({ job });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
