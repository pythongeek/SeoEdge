/**
 * Scheduled Reports Cron Endpoint
 * Hit by cron-job.org weekly (Monday 9am)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { scheduledReports } from '@/db/schema'
import { eq, and, lte } from 'drizzle-orm'
import { enqueueJob } from '@/lib/queue-adapter'

export const maxDuration = 120

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

    const dueReports = await db
      .select()
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.isActive, true),
          lte(scheduledReports.nextRunAt, now)
        )
      )

    console.log(`[Cron:Reports] Found ${dueReports.length} reports to process`)

    let enqueuedCount = 0

    for (const report of dueReports) {
      try {
        // Enqueue report generation job
        await enqueueJob({
          type: 'scheduled_report',
          workspaceId: report.workspaceId,
          payload: {
            reportId: report.id,
            format: report.format,
            recipients: report.recipients,
          },
        })

        // Calculate next run date
        const nextRun = new Date()
        if (report.frequency === 'weekly') {
          nextRun.setDate(nextRun.getDate() + 7)
        } else if (report.frequency === 'monthly') {
          nextRun.setMonth(nextRun.getMonth() + 1)
        } else {
          nextRun.setDate(nextRun.getDate() + 7)
        }

        await db
          .update(scheduledReports)
          .set({
            lastRunAt: now,
            nextRunAt: nextRun,
          })
          .where(eq(scheduledReports.id, report.id))

        enqueuedCount++
      } catch (error) {
        console.error(`[Cron:Reports] Failed to process report ${report.id}:`, error)
      }
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: `Enqueued ${enqueuedCount} reports`,
      totalFound: dueReports.length,
      durationMs: duration,
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[Cron:Reports] Failed after ${duration}ms:`, error)

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