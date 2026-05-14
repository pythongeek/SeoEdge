/**
 * GSC Sync Cron Endpoint
 * Hit by cron-job.org every hour
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { workspaces } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { syncGscDataTask } from '@/lib/cron-tasks'

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
    // Get all workspaces with auto-sync enabled
    const workspacesWithSync = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.gscAutoSync, true))

    console.log(`[Cron:GSC] Syncing ${workspacesWithSync.length} workspaces`)

    let successCount = 0
    let errorCount = 0

    for (const workspace of workspacesWithSync) {
      try {
        await syncGscDataTask(workspace.id, workspace.gscSiteUrl!)
        successCount++
      } catch (error) {
        console.error(`[Cron:GSC] Failed for workspace ${workspace.id}:`, error)
        errorCount++
      }
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: errorCount === 0,
      message: `GSC sync completed: ${successCount} success, ${errorCount} errors`,
      durationMs: duration,
      workspaceCount: workspacesWithSync.length,
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[Cron:GSC] Failed after ${duration}ms:`, error)

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