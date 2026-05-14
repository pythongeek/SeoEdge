/**
 * Cron Adapter for cron-job.org
 * Handles incoming webhook calls from cron-job.org
 * 
 * cron-job.org hits these endpoints on schedule:
 *   - /api/cron/gsc-sync        → GSC data fetch
 *   - /api/cron/reports         → Generate scheduled reports
 *   - /api/cron/cleanup         → Clean old jobs/results
 *   - /api/cron/token-reset     → Reset monthly token quotas
 *   - /api/cron/health-check    → Health monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { workspaces } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { processScheduledReports } from './cron-tasks'
import { syncGscData } from './cron-tasks'
import { cleanupOldJobs } from './cron-tasks'
import { resetMonthlyTokens } from './cron-tasks'

// ─── Verify cron-job.org request ──────────────────────────────────────

function verifyCronSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-cron-secret')
  const expectedSecret = process.env.CRON_SECRET
  
  if (!expectedSecret) {
    console.warn('[Cron] CRON_SECRET not set - skipping verification')
    return true
  }
  
  return secret === expectedSecret
}

// ─── Generic cron handler wrapper ─────────────────────────────────────

async function cronHandler(
  request: NextRequest,
  handler: () => Promise<{ success: boolean; message: string }>
): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const startTime = Date.now()
  
  try {
    const result = await handler()
    const duration = Date.now() - startTime
    
    console.log(`[Cron] Completed in ${duration}ms: ${result.message}`)
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[Cron] Failed after ${duration}ms:`, error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      },
      { status: 500 }
    )
  }
}

// ─── Individual cron routes ────────────────────────────────────────────

export async function GSC_SYNC(request: NextRequest) {
  return cronHandler(request, async () => {
    // Get all workspaces with auto-sync enabled
    const workspacesWithSync = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.gscAutoSync, true))
    
    console.log(`[Cron:GSC] Syncing ${workspacesWithSync.length} workspaces`)
    
    for (const workspace of workspacesWithSync) {
      try {
        await syncGscData(workspace.id)
      } catch (error) {
        console.error(`[Cron:GSC] Failed for workspace ${workspace.id}:`, error)
      }
    }
    
    return {
      success: true,
      message: `GSC sync completed for ${workspacesWithSync.length} workspaces`,
    }
  })
}

export async function SCHEDULED_REPORTS(request: NextRequest) {
  return cronHandler(request, async () => {
    await processScheduledReports()
    return {
      success: true,
      message: 'Scheduled reports processed',
    }
  })
}

export async function CLEANUP(request: NextRequest) {
  return cronHandler(request, async () => {
    const cleaned = await cleanupOldJobs()
    return {
      success: true,
      message: `Cleanup completed: ${cleaned} items removed`,
    }
  })
}

export async function TOKEN_RESET(request: NextRequest) {
  return cronHandler(request, async () => {
    await resetMonthlyTokens()
    return {
      success: true,
      message: 'Monthly token quotas reset',
    }
  })
}

export async function HEALTH_CHECK(request: NextRequest) {
  const unauthorized = verifyCronSecret(request)
  if (!unauthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const checks = {
    timestamp: new Date().toISOString(),
    status: 'ok',
    checks: {
      database: 'unknown',
    }
  }

  try {
    // Quick DB check
    await db.execute({ sql: 'SELECT 1' })
    checks.checks.database = 'ok'
  } catch (error) {
    checks.checks.database = 'error'
    checks.status = 'degraded'
  }

  return NextResponse.json(checks)
}