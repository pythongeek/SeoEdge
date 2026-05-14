/**
 * Unified AI Client with Vercel AI SDK v6
 * Primary: OpenRouter (OpenAI-compatible) | Fallback: Gemini
 * Structured output, self-healing retries, token tracking
 */

import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { z, type ZodSchema } from "zod";
import { RETRY_CONFIG } from "./constants";

// ─── Types ────────────────────────────────────────────────────────────

export type AIEngine = "openrouter" | "gemini";

interface AICallOptions<T extends ZodSchema> {
  schema: T;
  prompt: string;
  system?: string;
  engine?: AIEngine;
  maxRetries?: number;
  temperature?: number;
  maxTokens?: number;
}

interface AICallResult<T> {
  data: z.infer<T>;
  tokensUsed: { prompt: number; completion: number; total: number };
  engine: AIEngine;
  model: string;
  latencyMs: number;
}

// ─── Model Factory ────────────────────────────────────────────────────

function createModel(engine: AIEngine) {
  if (engine === "gemini") {
    return google("gemini-2.0-flash-001");
  }
  // OpenRouter via OpenAI-compatible API
  return openai("minimax/m1", {
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "",
    },
  });
}

// ─── Structured Generation with Self-Healing ──────────────────────────

export async function generateStructured<T extends ZodSchema>(
  options: AICallOptions<T>
): Promise<AICallResult<z.infer<T>>> {
  const {
    schema,
    prompt,
    system = "You are an expert SEO analyst. Provide accurate, actionable insights based on data.",
    engine = "openrouter",
    maxRetries = RETRY_CONFIG.maxRetries,
    temperature = 0.3,
    maxTokens = 4000,
  } = options;

  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const currentEngine = attempt > 0 ? "gemini" : engine;

    try {
      const model = createModel(currentEngine);
      const result = await generateObject({
        model,
        schema,
        prompt,
        system,
        temperature,
        maxTokens,
      });

      return {
        data: result.object,
        tokensUsed: {
          prompt: result.usage?.promptTokens ?? 0,
          completion: result.usage?.completionTokens ?? 0,
          total: result.usage?.totalTokens ?? 0,
        },
        engine: currentEngine,
        model: currentEngine === "gemini" ? "gemini-2.0-flash" : "minimax/m1",
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      lastError = error;
      console.warn(`[AI] Attempt ${attempt + 1} failed (${currentEngine}):`, error.message);

      // Self-healing for malformed JSON
      if (error.message?.includes("JSON") || error.message?.includes("parse")) {
        try {
          const healingModel = createModel("gemini");
          const healingResult = await generateObject({
            model: healingModel,
            schema,
            prompt: `${prompt}\n\nCRITICAL: Respond with ONLY valid JSON. No markdown, no extra text.`,
            system,
            temperature: 0.1,
            maxTokens,
          });

          return {
            data: healingResult.object,
            tokensUsed: {
              prompt: healingResult.usage?.promptTokens ?? 0,
              completion: healingResult.usage?.completionTokens ?? 0,
              total: healingResult.usage?.totalTokens ?? 0,
            },
            engine: "gemini",
            model: "gemini-2.0-flash",
            latencyMs: Date.now() - startTime,
          };
        } catch {
          // Continue to next retry
        }
      }

      if (attempt < maxRetries - 1) {
        const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
        await sleep(delay);
      }
    }
  }

  throw new Error(`[AI] All ${maxRetries} attempts failed: ${lastError?.message}`);
}

// ─── Text Generation ──────────────────────────────────────────────────

export async function generateAnalysisText(
  prompt: string,
  system?: string,
  engine: AIEngine = "openrouter"
): Promise<{ text: string; tokensUsed: number; engine: AIEngine }> {
  const model = createModel(engine);

  const result = await generateText({
    model,
    prompt,
    system: system || "You are an expert SEO strategist with 15+ years of experience.",
    temperature: 0.4,
    maxTokens: 2000,
  });

  return {
    text: result.text,
    tokensUsed: result.usage?.totalTokens ?? 0,
    engine,
  };
}

// ─── Utility ──────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Token Tracking ───────────────────────────────────────────────────

export async function trackTokenUsage(
  workspaceId: number,
  tokensUsed: number
): Promise<{ allowed: boolean; newTotal: number }> {
  try {
    const { db } = await import("@/db");
    const { workspaces } = await import("@/db/schema");
    const { eq, sql } = await import("drizzle-orm");

    const result = await db
      .update(workspaces)
      .set({
        tokensUsedThisMonth: sql`${workspaces.tokensUsedThisMonth} + ${tokensUsed}`,
      })
      .where(eq(workspaces.id, workspaceId))
      .returning({ tokensUsedThisMonth: workspaces.tokensUsedThisMonth });

    if (result.length === 0) return { allowed: false, newTotal: 0 };

    const ws = await db
      .select({ limit: workspaces.tokensLimit })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    const limit = ws[0]?.limit ?? 10000;
    const newTotal = result[0].tokensUsedThisMonth ?? 0;

    return { allowed: newTotal <= limit, newTotal };
  } catch (error) {
    console.error("[TokenTracking] Failed:", error);
    return { allowed: true, newTotal: 0 };
  }
}
