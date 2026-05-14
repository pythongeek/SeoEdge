/**
 * MiniMax M2.7 Direct API Client
 * Uses Anthropic-compatible endpoint with global token authentication
 * Supports Harnedd Agent for structured reasoning
 * Self-healing retries, token tracking, streaming support
 */

import { z, type ZodSchema } from "zod";
import { RETRY_CONFIG } from "./constants";

// ─── Types ────────────────────────────────────────────────────────────

export type AIModel = "minimax-m2.7" | "minimax-m1" | "gemini-2.5-pro" | "gemini-2.0-flash";

interface MinimaxCallOptions<T extends ZodSchema> {
  schema: T;
  prompt: string;
  system?: string;
  model?: AIModel;
  maxRetries?: number;
  temperature?: number;
  maxTokens?: number;
  useHarneddAgent?: boolean;
  harneddAgentConfig?: HarneddAgentConfig;
}

interface HarneddAgentConfig {
  agentType: "seo_analyst" | "content_strategist" | "technical_auditor" | "geo_specialist";
  tools?: string[];
  maxSteps?: number;
  reasoningDepth?: "quick" | "standard" | "deep";
}

interface MinimaxCallResult<T> {
  data: z.infer<T>;
  tokensUsed: { prompt: number; completion: number; total: number };
  model: AIModel;
  latencyMs: number;
  harneddAgentUsed?: boolean;
  reasoningSteps?: string[];
}

interface MinimaxMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface MinimaxResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: Array<{ type: "text"; text: string }>;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    input_tokens_details?: { cached_tokens: number };
    output_tokens_details?: { reasoning_tokens: number };
  };
  stop_reason: string | null;
  stop_sequence: string | null;
}

// ─── Configuration ────────────────────────────────────────────────────

function getApiConfig() {
  const apiKey = process.env.MINIMAX_AUTH_TOKEN || process.env.ANTHROPIC_AUTH_TOKEN || "";
  const baseUrl = process.env.MINIMAX_BASE_URL || process.env.ANTHROPIC_BASE_URL || "https://api.minimax.chat/v1";

  if (!apiKey) {
    console.warn("[MiniMax] No API key configured. Using Gemini fallback only.");
  }

  return { apiKey, baseUrl };
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    console.warn("[Gemini] No API key configured.");
  }
  return { apiKey };
}

// ─── Core API Call ────────────────────────────────────────────────────

async function callMiniMaxAPI(
  messages: MinimaxMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    system?: string;
  }
): Promise<MinimaxResponse> {
  const { apiKey, baseUrl } = getApiConfig();

  if (!apiKey) {
    throw new Error("MiniMax API key not configured");
  }

  const modelName = options.model || "MiniMax-M2.7";
  const temperature = options.temperature ?? 0.3;
  const maxTokens = options.maxTokens || 4000;

  const requestBody: Record<string, any> = {
    model: modelName,
    messages,
    temperature,
    max_tokens: maxTokens,
    top_p: 0.95,
  };

  // Add system message if provided
  if (options.system) {
    requestBody.system = options.system;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MiniMax API error (${response.status}): ${error}`);
  }

  const data = await response.json();

  // Normalize response to MinimaxResponse format
  const normalized: MinimaxResponse = {
    id: data.id || "",
    type: "message",
    role: "assistant",
    content: data.choices?.[0]?.message?.content
      ? [{ type: "text", text: data.choices[0].message.content }]
      : [],
    model: data.model || modelName,
    usage: {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
    },
    stop_reason: data.choices?.[0]?.finish_reason || null,
    stop_sequence: null,
  };

  return normalized;
}

// ─── Gemini Fallback ──────────────────────────────────────────────────

async function callGeminiAPI(
  prompt: string,
  system: string,
  options: { temperature?: number; maxTokens?: number }
): Promise<{ text: string; usage: { prompt: number; completion: number; total: number } }> {
  const { apiKey } = getGeminiConfig();

  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const model = "gemini-2.0-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${system}\n\n${prompt}` }],
          },
        ],
        generationConfig: {
          temperature: options.temperature ?? 0.3,
          maxOutputTokens: options.maxTokens || 4000,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const usage = data.usageMetadata || {};

  return {
    text,
    usage: {
      prompt: usage.promptTokenCount || 0,
      completion: usage.candidatesTokenCount || 0,
      total: usage.totalTokenCount || 0,
    },
  };
}

// ─── Structured Output Parser ─────────────────────────────────────────

function extractJsonFromResponse(text: string): string {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) return jsonMatch[1].trim();

  // Try to find JSON array or object directly
  const arrayMatch = text.match(/(\[[\s\S]*\])/);
  if (arrayMatch) return arrayMatch[1].trim();

  const objectMatch = text.match(/(\{[\s\S]*\})/);
  if (objectMatch) return objectMatch[1].trim();

  return text.trim();
}

// ─── Harnedd Agent Integration ────────────────────────────────────────

function buildHarneddSystemPrompt(config: HarneddAgentConfig): string {
  const agentPrompts: Record<string, string> = {
    seo_analyst: `You are an expert SEO Analyst with 15+ years of experience. You specialize in:
- Technical SEO audits and site architecture analysis
- Search intent analysis and keyword strategy
- Content optimization and on-page SEO
- Search engine algorithm changes and their impact
- Data-driven SEO recommendations

Follow these reasoning steps:
1. Analyze the input data thoroughly
2. Identify patterns, anomalies, and opportunities
3. Apply SEO best practices and industry benchmarks
4. Prioritize recommendations by impact and effort
5. Provide specific, actionable insights with estimated outcomes`,

    content_strategist: `You are a Content Strategy Expert specializing in:
- Topic cluster architecture and content gap analysis
- Search intent matching and content optimization
- E-E-A-T signal enhancement
- Content calendar planning and editorial strategy
- Competitive content analysis

Follow these reasoning steps:
1. Map keywords to search intent categories
2. Identify content gaps and opportunities
3. Recommend content types, formats, and angles
4. Suggest internal linking strategies
5. Outline content briefs with target word counts and structure`,

    technical_auditor: `You are a Technical SEO Auditor specializing in:
- Core Web Vitals optimization
- JavaScript SEO and rendering issues
- Schema markup and structured data
- Indexation and crawl budget optimization
- Mobile-first optimization

Follow these reasoning steps:
1. Identify technical bottlenecks and issues
2. Prioritize by SEO impact and implementation effort
3. Provide specific fix instructions with code examples where relevant
4. Estimate performance improvements
5. Recommend monitoring and validation approaches`,

    geo_specialist: `You are a GEO (Generative Engine Optimization) Specialist focusing on:
- AI Overview risk assessment and impact analysis
- Content optimization for AI-driven search results
- Entity optimization and knowledge graph presence
- Structured data for AI consumption
- Counter-strategies for AI Overview traffic loss

Follow these reasoning steps:
1. Assess AI Overview presence probability for queries
2. Identify content vulnerability to AI summarization
3. Recommend GEO-specific optimization strategies
4. Suggest unique value-adds that AI can't replicate
5. Estimate traffic protection/recovery potential`,
  };

  const basePrompt = agentPrompts[config.agentType] || agentPrompts.seo_analyst;

  const reasoningDepth = config.reasoningDepth || "standard";
  const maxSteps = config.maxSteps || (reasoningDepth === "deep" ? 8 : reasoningDepth === "quick" ? 3 : 5);

  return `${basePrompt}

Reasoning Configuration:
- Depth: ${reasoningDepth}
- Max reasoning steps: ${maxSteps}
- Available tools: ${config.tools?.join(", ") || "data analysis, pattern recognition, benchmark comparison"}

CRITICAL: You must respond with ONLY valid JSON. No markdown, no extra text, no explanations outside the JSON structure. Your entire response must be parseable as JSON.`;
}

// ─── Main Structured Generation ───────────────────────────────────────

export async function generateWithMiniMax<T extends ZodSchema>(
  options: MinimaxCallOptions<T>
): Promise<MinimaxCallResult<z.infer<T>>> {
  const {
    schema,
    prompt,
    system = "You are an expert SEO analyst. Provide accurate, actionable insights based on data.",
    model = "minimax-m2.7",
    maxRetries = RETRY_CONFIG.maxRetries,
    temperature = 0.3,
    maxTokens = 4000,
    useHarneddAgent = false,
    harneddAgentConfig,
  } = options;

  const startTime = Date.now();
  let lastError: Error | null = null;
  let reasoningSteps: string[] | undefined;

  // Use Harnedd Agent system prompt if configured
  const effectiveSystem = useHarneddAgent && harneddAgentConfig
    ? buildHarneddAgentSystemPrompt(harneddAgentConfig)
    : system;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const isFallbackAttempt = attempt > 0;
    const currentModel = isFallbackAttempt && model.startsWith("minimax") ? "gemini-2.0-flash" : model;

    try {
      let rawText: string;
      let tokensUsed: { prompt: number; completion: number; total: number };

      if (currentModel.startsWith("gemini")) {
        // Use Gemini fallback
        const result = await callGeminiAPI(prompt, effectiveSystem, { temperature, maxTokens });
        rawText = result.text;
        tokensUsed = result.usage;
      } else {
        // Use MiniMax direct API
        const messages: MinimaxMessage[] = [
          { role: "user", content: prompt },
        ];

        const response = await callMiniMaxAPI(messages, {
          model: currentModel === "minimax-m2.7" ? "MiniMax-M2.7" : "MiniMax-M1",
          temperature,
          maxTokens,
          system: effectiveSystem,
        });

        rawText = response.content.map((c) => c.text).join("");
        tokensUsed = {
          prompt: response.usage.input_tokens,
          completion: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens,
        };

        // Extract reasoning steps if harnedd agent was used
        if (useHarneddAgent) {
          const reasoningMatch = rawText.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
          if (reasoningMatch) {
            reasoningSteps = reasoningMatch[1].split("\n").filter((s) => s.trim());
            rawText = rawText.replace(/<reasoning>[\s\S]*?<\/reasoning>/g, "");
          }
        }
      }

      // Extract and parse JSON
      const jsonText = extractJsonFromResponse(rawText);
      const parsed = JSON.parse(jsonText);

      // Validate with Zod schema
      const validated = schema.parse(parsed);

      return {
        data: validated,
        tokensUsed,
        model: currentModel as AIModel,
        latencyMs: Date.now() - startTime,
        harneddAgentUsed: useHarneddAgent && !isFallbackAttempt,
        reasoningSteps,
      };
    } catch (error: any) {
      lastError = error;
      console.warn(
        `[MiniMax] Attempt ${attempt + 1} failed (${currentModel}):`,
        error.message
      );

      // Self-healing for JSON parse errors
      if (error instanceof SyntaxError || error.message?.includes("JSON")) {
        try {
          const healingResult = await callGeminiAPI(
            `${prompt}\n\nCRITICAL: Your previous response was not valid JSON. Respond with ONLY valid JSON. No markdown, no extra text. Ensure all strings are properly escaped and the JSON is complete.`,
            effectiveSystem,
            { temperature: 0.1, maxTokens }
          );

          const healingJson = extractJsonFromResponse(healingResult.text);
          const healingParsed = JSON.parse(healingJson);
          const healingValidated = schema.parse(healingParsed);

          return {
            data: healingValidated,
            tokensUsed: healingResult.usage,
            model: "gemini-2.0-flash",
            latencyMs: Date.now() - startTime,
            harneddAgentUsed: false,
          };
        } catch {
          // Continue to next retry
        }
      }

      if (attempt < maxRetries - 1) {
        const delay =
          RETRY_CONFIG.initialDelay *
          Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
        await sleep(delay);
      }
    }
  }

  throw new Error(
    `[MiniMax] All ${maxRetries} attempts failed: ${lastError?.message}`
  );
}

// ─── Text Generation ──────────────────────────────────────────────────

export async function generateTextWithMiniMax(
  prompt: string,
  system?: string,
  model: AIModel = "minimax-m2.7"
): Promise<{
  text: string;
  tokensUsed: number;
  model: AIModel;
  latencyMs: number;
}> {
  const startTime = Date.now();

  if (model.startsWith("gemini")) {
    const result = await callGeminiAPI(
      prompt,
      system || "You are an expert SEO strategist with 15+ years of experience.",
      { temperature: 0.4, maxTokens: 2000 }
    );

    return {
      text: result.text,
      tokensUsed: result.usage.total,
      model,
      latencyMs: Date.now() - startTime,
    };
  }

  const messages: MinimaxMessage[] = [{ role: "user", content: prompt }];
  const response = await callMiniMaxAPI(messages, {
    model: model === "minimax-m2.7" ? "MiniMax-M2.7" : "MiniMax-M1",
    temperature: 0.4,
    maxTokens: 2000,
    system,
  });

  const text = response.content.map((c) => c.text).join("");

  return {
    text,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    model,
    latencyMs: Date.now() - startTime,
  };
}

// ─── Streaming Support ────────────────────────────────────────────────

export async function* streamWithMiniMax(
  prompt: string,
  system?: string,
  model: AIModel = "minimax-m2.7"
): AsyncGenerator<string, void, unknown> {
  const { apiKey, baseUrl } = getApiConfig();

  if (!apiKey) {
    throw new Error("MiniMax API key not configured");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model === "minimax-m2.7" ? "MiniMax-M2.7" : "MiniMax-M1",
      messages: [{ role: "user", content: prompt }],
      system: system || "You are an expert SEO analyst.",
      stream: true,
      temperature: 0.4,
      max_tokens: 4000,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Streaming failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Skip unparsable lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Utility ──────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Token Tracking ───────────────────────────────────────────────────

export async function trackMiniMaxTokenUsage(
  workspaceId: number,
  tokensUsed: number
): Promise<{ allowed: boolean; newTotal: number }> {
  try {
    const { getDb } = await import("@/db");
    const db = getDb();
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
    console.error("[MiniMax TokenTracking] Failed:", error);
    return { allowed: true, newTotal: 0 };
  }
}

// ─── Model Info ───────────────────────────────────────────────────────

export function getModelInfo(): Array<{
  id: AIModel;
  name: string;
  description: string;
  contextWindow: number;
  strengths: string[];
}> {
  return [
    {
      id: "minimax-m2.7",
      name: "MiniMax M2.7",
      description: "Primary model - excellent reasoning and SEO analysis",
      contextWindow: 262144,
      strengths: ["Complex analysis", "Multi-step reasoning", "Large context"],
    },
    {
      id: "minimax-m1",
      name: "MiniMax M1",
      description: "Fast model for quick insights",
      contextWindow: 131072,
      strengths: ["Speed", "Cost efficiency", "Simple queries"],
    },
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      description: "Fallback for complex analysis",
      contextWindow: 1048576,
      strengths: ["Massive context", "Code analysis", "Multimodal"],
    },
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      description: "Fast fallback for simple queries",
      contextWindow: 1048576,
      strengths: ["Speed", "Self-healing JSON", "Reliable fallback"],
    },
  ];
}
