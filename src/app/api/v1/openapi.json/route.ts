/**
 * GET /api/v1/openapi.json - OpenAPI specification
 * Returns the OpenAPI 3.1 spec for n8n/Zapier integration
 */

import { NextResponse } from "next/server";
import { getOpenAPISpec } from "@/lib/openapi-spec";
import { version } from "@/../package.json";

export async function GET() {
  const spec = getOpenAPISpec();
  spec.info.version = version;

  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
