/**
 * GET /api/v1/health - System health check
 * Returns database, AI engine, and Redis status
 */

import { NextResponse } from "next/server";
import { healthCheck } from "@/lib/observability";
import { version } from "@/../package.json";

export async function GET(req: Request) {
  const result = await healthCheck();

  const statusCode =
    result.status === "healthy" ? 200 : result.status === "degraded" ? 200 : 503;

  return NextResponse.json(
    {
      status: result.status,
      version,
      checks: result.checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
