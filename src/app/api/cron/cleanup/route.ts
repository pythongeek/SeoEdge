/**
 * Cleanup Cron Endpoint
 * Hit by cron-job.org weekly (Sunday midnight)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { jobs } from '@/db/schema'
import { eq, lt, and } from 'drizzle-orm'

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
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Clean up old completed jobs
    const completedResult = await db
      .delete(jobs)
      .where(
        and(
          eq(jobs.status, 'completed'),
          lt(jobs.updatedAt, thirtyDaysAgo)
        )
      )

    // Clean up old failed jobs (keep for 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const failedResult = await db
      .delete(jobs)
      .where(
        and(
          eq(jobs.status, 'failed'),
          lt(jobs.updatedAt, sevenDaysAgo)
        )
      )

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: `Cleanup completed`,
      completedRemoved: completedResult.rowCount ?? 0,
      failedRemoved: failedResult.rowCount ?? 0,
      durationMs: duration,
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[Cron:Cleanup] Failed after ${duration}ms:`, error)

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