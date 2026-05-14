/**
 * Token Reset Cron Endpoint
 * Hit by cron-job.org monthly (1st of month)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { workspaces } from '@/db/schema'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization')
  const secret = process.env.CRON_SECRET

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    // Reset monthly token usage for all workspaces
    const result = await db
      .update(workspaces)
      .set({
        tokensUsedThisMonth: 0,
        apiRequestsThisMonth: 0,
        updatedAt: new Date(),
      })

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: 'Monthly token quotas reset',
      durationMs: duration,
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[Cron:TokenReset] Failed after ${duration}ms:`, error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        durationMs: duration,
      },
      { status: 500 }
    )
  }
}