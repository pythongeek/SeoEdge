/**
 * Scheduled Reports Cron Endpoint
 * Hit by cron-job.org weekly (Monday 9am)
 */

import { NextRequest, NextResponse } from 'next/server'
import { processScheduledReportsTask } from '@/lib/cron-tasks'

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
    const result = await processScheduledReportsTask()
    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: `Reports processed`,
      processed: result.processed,
      errors: result.errors,
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