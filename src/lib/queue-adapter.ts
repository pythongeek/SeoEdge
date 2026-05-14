/**
 * QStash Queue Adapter
 * Replaces BullMQ with Upstash QStash for Vercel serverless compatibility
 * 
 * Usage:
 *   import { enqueueJob, receiveJob } from './queue-adapter'
 */

import { Client, Receiver } from '@upstash/qstash'

// ─── QStash Client (for publishing) ──────────────────────────────────

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
})

// ─── QStash Receiver (for consuming webhooks) ─────────────────────────

export const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  verificationKey: process.env.QSTASH_VERIFICATION_KEY!,
})

// ─── Job Types ────────────────────────────────────────────────────────

export type JobType = 
  | 'gsc_analysis'
  | 'ai_analysis'
  | 'health_audit'
  | 'content_plan'
  | 'export'
  | 'scheduled_report'
  | 'full_audit'

export interface QueuedJob<T = unknown> {
  type: JobType
  workspaceId: string
  userId?: string
  payload: T
  priority?: number
}

// ─── Enqueue a Job ────────────────────────────────────────────────────

export async function enqueueJob(
  job: QueuedJob,
  options?: {
    delay?: number // Unix timestamp for delayed jobs
    retries?: number
  }
): Promise<{ messageId: string }> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/${job.type}`

  const response = await qstash.publishJSON({
    url,
    body: {
      jobType: job.type,
      workspaceId: job.workspaceId,
      userId: job.userId,
      payload: job.payload,
    },
    retries: options?.retries ?? 3,
    ...(options?.delay && { delay: options.delay }),
  })

  return { messageId: response.messageId }
}

// ─── Enqueue Full Audit (Optimized - 1 message for all agents) ────────

export async function enqueueFullAudit(params: {
  workspaceId: string
  userId?: string
  siteUrl: string
  agents?: Array<'seo_analyst' | 'content_strategist' | 'technical_auditor' | 'geo_specialist'>
}): Promise<{ messageId: string }> {
  return enqueueJob({
    type: 'full_audit',
    workspaceId: params.workspaceId,
    userId: params.userId,
    payload: {
      siteUrl: params.siteUrl,
      agents: params.agents ?? ['seo_analyst', 'content_strategist', 'technical_auditor', 'geo_specialist'],
    },
  })
}

// ─── Verify QStash Signature ──────────────────────────────────────────

export async function verifyQStashSignature(
  signature: string,
  body: string
): Promise<boolean> {
  try {
    const isValid = await qstashReceiver.verify({
      signature,
      body,
    })
    return isValid
  } catch {
    return false
  }
}

// ─── QStash Webhook Handler ──────────────────────────────────────────

export interface QStashContext {
  messageId: string
  body: unknown
  headers: Record<string, string>
}

export async function handleQStashWebhook(
  request: Request
): Promise<Response | null> {
  const signature = request.headers.get('upstash-signature')
  const body = await request.text()

  if (!signature) {
    return new Response('Missing signature', { status: 401 })
  }

  const isValid = await verifyQStashSignature(signature, body)
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 })
  }

  return null // Continue to handler
}