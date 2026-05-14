/**
 * Observability Layer
 * Error tracking + PostHog analytics
 * Zero-config fallbacks for missing env vars
 */

// ─── Sentry-compatible Error Tracking (Manual) ────────────────────────

interface ErrorContext {
  [key: string]: any;
}

class SimpleErrorTracker {
  private errors: Array<{ error: Error; context?: ErrorContext; timestamp: string }> = [];
  private maxErrors = 100;

  captureException(error: Error, context?: ErrorContext) {
    const entry = { error, context, timestamp: new Date().toISOString() };
    this.errors.push(entry);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorTracker]", error.message, context);
    }

    // If Sentry DSN is configured, could send there
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      this.sendToSentry(error, context);
    }
  }

  captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
    const entry = {
      error: new Error(message),
      context: { level },
      timestamp: new Date().toISOString(),
    };
    this.errors.push(entry);

    if (process.env.NODE_ENV === "development") {
      console[level === "error" ? "error" : "log"](`[ErrorTracker] ${message}`);
    }
  }

  getRecentErrors() {
    return this.errors.slice(-20);
  }

  private async sendToSentry(error: Error, context?: ErrorContext) {
    try {
      // Lightweight Sentry-compatible reporting
      await fetch("https://sentry.io/api/store/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${process.env.NEXT_PUBLIC_SENTRY_DSN?.split("//")[1]?.split("@")[0] || ""}`,
        },
        body: JSON.stringify({
          message: error.message,
          extra: context,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // Silently fail
    }
  }
}

const errorTracker = new SimpleErrorTracker();

export function captureException(error: Error, context?: ErrorContext) {
  errorTracker.captureException(error, context);
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  errorTracker.captureMessage(message, level);
}

// ─── PostHog Client (Browser) ─────────────────────────────────────────

interface PostHogConfig {
  apiKey: string;
  apiHost?: string;
  personProfiles?: "always" | "identified_only";
}

let posthogClient: any = null;

export function initPostHog(config?: PostHogConfig) {
  if (typeof window === "undefined") return null;

  const apiKey = config?.apiKey || process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) {
    console.log("[Observability] PostHog key not configured");
    return null;
  }

  try {
    const posthogJs = require("posthog-js");
    posthogClient = posthogJs.default || posthogJs;

    posthogClient.init(apiKey, {
      api_host: config?.apiHost || "https://app.posthog.com",
      person_profiles: config?.personProfiles || "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      session_recording: {
        recordCrossOriginIframes: false,
      },
    });

    console.log("[Observability] PostHog initialized");
    return posthogClient;
  } catch (e) {
    console.warn("[Observability] PostHog init failed:", e);
    return null;
  }
}

export function getPostHog() {
  return posthogClient;
}

// ─── Event Tracking ───────────────────────────────────────────────────

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  try {
    if (posthogClient) {
      posthogClient.capture(eventName, properties);
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[PostHog] Track failed:", e);
    }
  }
}

export function identifyUser(userId: string, traits?: Record<string, any>) {
  try {
    if (posthogClient) {
      posthogClient.identify(userId, traits);
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[PostHog] Identify failed:", e);
    }
  }
}

export function trackPageView(url: string) {
  try {
    if (posthogClient) {
      posthogClient.capture("$pageview", { $current_url: url });
    }
  } catch {
    // Silent
  }
}

// ─── Performance Monitoring ───────────────────────────────────────────

export function startTransaction(name: string, op: string) {
  return { name, op, startTime: Date.now(), finish: () => {} };
}

export function startSpan<T>(name: string, callback: () => T): T {
  return callback();
}

// ─── Health Check ─────────────────────────────────────────────────────

export async function healthCheck(): Promise<{
  status: "healthy" | "degraded" | "unhealthy";
  checks: Record<string, { status: "ok" | "fail"; latency?: number; message?: string }>;
}> {
  const checks: Record<string, { status: "ok" | "fail"; latency?: number; message?: string }> = {};

  // DB check
  try {
    const start = Date.now();
    const { getDb } = await import("@/db");
    const db = getDb();
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "ok", latency: Date.now() - start };
  } catch (e: any) {
    checks.database = { status: "fail", message: e.message };
  }

  // AI check
  try {
    const start = Date.now();
    const hasMiniMax = !!process.env.MINIMAX_AUTH_TOKEN;
    const hasGemini = !!process.env.GEMINI_API_KEY;
    checks.ai_engine = {
      status: hasMiniMax || hasGemini ? "ok" : "fail",
      latency: Date.now() - start,
      message: !hasMiniMax && !hasGemini ? "No AI API keys configured" : undefined,
    };
  } catch (e: any) {
    checks.ai_engine = { status: "fail", message: e.message };
  }

  // Redis check
  try {
    const start = Date.now();
    const { redisConnection } = await import("./job-queue");
    await redisConnection.ping();
    checks.redis = { status: "ok", latency: Date.now() - start };
  } catch (e: any) {
    checks.redis = { status: "fail", message: e.message };
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok");
  const someOk = Object.values(checks).some((c) => c.status === "ok");

  return {
    status: allOk ? "healthy" : someOk ? "degraded" : "unhealthy",
    checks,
  };
}
