/**
 * Health Check Cron Endpoint
 * Hit by cron-job.org every 5 minutes
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'

export const maxDuration = 30

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization')
  const secret = process.env.CRON_SECRET

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      responseTime: 'unknown',
    },
  }

  try {
    // Database check
    const dbStart = Date.now()
    await db.execute({ sql: 'SELECT 1' })
    health.checks.database = 'ok'
    health.checks.responseTime = `${Date.now() - dbStart}ms`
  } catch (error) {
    health.status = 'degraded'
    health.checks.database = 'error'
  }

  const duration = Date.now() - startTime

  const statusCode = health.status === 'ok' ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
}