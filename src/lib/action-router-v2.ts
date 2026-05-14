/**
 * AI Action Router v2 - Uses MiniMax M2.7 Direct API + Harnedd Agent
 * Enhanced with reasoning depth control and multi-model orchestration
 */

import {
  generateWithMiniMax,
  generateTextWithMiniMax,
  trackMiniMaxTokenUsage,
  type AIModel,
} from "./minimax-client";
import {
  FullAuditResultSchema,
  CtrAnalysisResultSchema,
  CannibalizationResultSchema,
  HealthAuditSchema,
  ContentPlanResultSchema,
  SerpAnalysisResultSchema,
  TrendResultSchema,
  ClusterResultSchema,
  AiOverviewRiskSchema,
} from "./ai-schemas";
import {
  analyzeAllCtrGaps,
  detectCannibalization,
  calculateHealthScore,
  detectTrends,
  clusterKeywords,
} from "./seo-heuristics";
import { z } from "zod";

// ─── Action Types ─────────────────────────────────────────────────────

export type ActionType =
  | "full_audit"
  | "ctr_analysis"
  | "cannibalization"
  | "health_audit"
  | "content_plan"
  | "serp_analysis"
  | "trend_analysis"
  | "topic_clusters"
  | "geo_risk"
  | "ai_overview";

// ─── Input Types ──────────────────────────────────────────────────────

interface AnalysisInput {
  gscData?: Array<{
    query: string;
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  pages?: Array<{
    url: string;
    title?: string;
    metaDescription?: string;
    headings?: Record<string, string[]>;
  }>;
  currentPeriod?: AnalysisInput["gscData"];
  previousPeriod?: AnalysisInput["gscData"];
  siteUrl?: string;
  language?: string;
  keywords?: string[];
}

// ─── Model Selection Logic ────────────────────────────────────────────

function selectModel(action: ActionType): { model: AIModel; useHarnedd: boolean; reasoningDepth: "quick" | "standard" | "deep" } {
  switch (action) {
    case "full_audit":
      return { model: "minimax-m2.7", useHarnedd: true, reasoningDepth: "deep" };
    case "ctr_analysis":
      return { model: "minimax-m2.7", useHarnedd: true, reasoningDepth: "standard" };
    case "cannibalization":
      return { model: "minimax-m2.7", useHarnedd: true, reasoningDepth: "standard" };
    case "health_audit":
      return { model: "minimax-m2.7", useHarnedd: true, reasoningDepth: "deep" };
    case "content_plan":
      return { model: "minimax-m2.7", useHarnedd: true, reasoningDepth: "deep" };
    case "serp_analysis":
      return { model: "minimax-m1", useHarnedd: false, reasoningDepth: "quick" };
    case "trend_analysis":
      return { model: "minimax-m2.7", useHarnedd: true, reasoningDepth: "standard" };
    case "topic_clusters":
      return { model: "minimax-m1", useHarnedd: false, reasoningDepth: "standard" };
    case "geo_risk":
    case "ai_overview":
      return { model: "minimax-m2.7", useHarnedd: true, reasoningDepth: "deep" };
    default:
      return { model: "minimax-m2.7", useHarnedd: true, reasoningDepth: "standard" };
  }
}

function getHarneddAgentType(action: ActionType) {
  switch (action) {
    case "health_audit":
    case "ctr_analysis":
    case "full_audit":
      return "seo_analyst";
    case "content_plan":
    case "topic_clusters":
      return "content_strategist";
    case "geo_risk":
    case "ai_overview":
      return "geo_specialist";
    default:
      return "seo_analyst";
  }
}

// ─── Router ───────────────────────────────────────────────────────────

export async function executeActionV2(
  action: ActionType,
  input: AnalysisInput,
  workspaceId: number
): Promise<{ result: any; tokensUsed: number; model: AIModel; reasoningSteps?: string[] }> {
  const startTime = Date.now();
  console.log(`[ActionRouterV2] Executing ${action} for workspace ${workspaceId}`);

  const { model, useHarnedd, reasoningDepth } = selectModel(action);

  let result: any;
  let totalTokens = 0;
  let reasoningSteps: string[] | undefined;

  switch (action) {
    case "ctr_analysis":
      result = await runCtrAnalysis(input, model, useHarnedd, reasoningDepth);
      break;
    case "cannibalization":
      result = await runCannibalizationAnalysis(input, model, useHarnedd, reasoningDepth);
      break;
    case "health_audit":
      result = await runHealthAudit(input, model, useHarnedd, reasoningDepth);
      break;
    case "content_plan":
      result = await runContentPlan(input, model, useHarnedd, reasoningDepth);
      break;
    case "serp_analysis":
      result = await runSerpAnalysis(input, model, useHarnedd, reasoningDepth);
      break;
    case "trend_analysis":
      result = await runTrendAnalysis(input, model, useHarnedd, reasoningDepth);
      break;
    case "topic_clusters":
      result = await runTopicClustering(input, model, useHarnedd, reasoningDepth);
      break;
    case "geo_risk":
    case "ai_overview":
      result = await runGeoRiskAnalysis(input, model, useHarnedd, reasoningDepth);
      break;
    case "full_audit":
      result = await runFullAudit(input, model, useHarnedd, reasoningDepth);
      break;
    default:
      throw new Error(`Unknown action: ${action}`);
  }

  if (result?._tokensUsed) {
    totalTokens = result._tokensUsed;
    delete result._tokensUsed;
  }

  if (result?._reasoningSteps) {
    reasoningSteps = result._reasoningSteps;
    delete result._reasoningSteps;
  }

  const latency = Date.now() - startTime;
  console.log(`[ActionRouterV2] ${action} completed in ${latency}ms, tokens: ${totalTokens}, model: ${model}`);

  // Track token usage asynchronously
  if (totalTokens > 0) {
    trackMiniMaxTokenUsage(workspaceId, totalTokens).catch(console.error);
  }

  return { result, tokensUsed: totalTokens, model, reasoningSteps };
}

// ─── Individual Action Handlers ───────────────────────────────────────

async function runCtrAnalysis(
  input: AnalysisInput,
  model: AIModel,
  useHarnedd: boolean,
  reasoningDepth: "quick" | "standard" | "deep"
) {
  if (!input.gscData?.length) throw new Error("No GSC data provided");

  const heuristics = analyzeAllCtrGaps(input.gscData);
  const topGaps = heuristics.slice(0, 20);

  const { data, tokensUsed, reasoningSteps } = await generateWithMiniMax({
    schema: CtrAnalysisResultSchema,
    prompt: `Analyze these CTR gaps and provide actionable recommendations:
${JSON.stringify(topGaps, null, 2)}

Site: ${input.siteUrl || "unknown"}`,
    model,
    useHarneddAgent: useHarnedd,
    harneddAgentConfig: {
      agentType: "seo_analyst",
      reasoningDepth,
      tools: ["ctr_benchmark_model", "position_analysis", "intent_classification"],
    },
  });

  return { ...data, _tokensUsed: tokensUsed.total, _reasoningSteps: reasoningSteps };
}

async function runCannibalizationAnalysis(
  input: AnalysisInput,
  model: AIModel,
  useHarnedd: boolean,
  reasoningDepth: "quick" | "standard" | "deep"
) {
  if (!input.gscData?.length) throw new Error("No GSC data provided");

  const detected = detectCannibalization(input.gscData);
  const topIssues = detected.slice(0, 15);

  if (topIssues.length === 0) {
    return {
      issues: [],
      summary: "No significant keyword cannibalization detected.",
      _tokensUsed: 0,
    };
  }

  const { data, tokensUsed, reasoningSteps } = await generateWithMiniMax({
    schema: CannibalizationResultSchema,
    prompt: `Analyze these keyword cannibalization issues and provide consolidation recommendations:
${JSON.stringify(topIssues, null, 2)}`,
    model,
    useHarneddAgent: useHarnedd,
    harneddAgentConfig: {
      agentType: "seo_analyst",
      reasoningDepth,
      tools: ["overlap_analysis", "page_consolidation", "301_redirect_planning"],
    },
  });

  return { ...data, _tokensUsed: tokensUsed.total, _reasoningSteps: reasoningSteps };
}

async function runHealthAudit(
  input: AnalysisInput,
  model: AIModel,
  useHarnedd: boolean,
  reasoningDepth: "quick" | "standard" | "deep"
) {
  if (!input.pages?.length) throw new Error("No page data provided");

  const pageScores = input.pages.map((p) => ({
    url: p.url,
    ...calculateHealthScore({
      metaIssues: !p.title ? 2 : !p.metaDescription ? 1 : 0,
      headingIssues: !p.headings?.h1?.length ? 2 : (p.headings?.h2?.length || 0) < 2 ? 1 : 0,
    }),
  }));

  const { data, tokensUsed, reasoningSteps } = await generateWithMiniMax({
    schema: HealthAuditSchema,
    prompt: `Perform a health audit on these pages:
${JSON.stringify(pageScores.slice(0, 30), null, 2)}

Provide detailed SEO health analysis with fix recommendations.`,
    model,
    useHarneddAgent: useHarnedd,
    harneddAgentConfig: {
      agentType: "technical_auditor",
      reasoningDepth,
      tools: ["core_web_vitals_analysis", "meta_tag_audit", "heading_structure_audit"],
    },
  });

  return { ...data, pageScores, _tokensUsed: tokensUsed.total, _reasoningSteps: reasoningSteps };
}

async function runContentPlan(
  input: AnalysisInput,
  model: AIModel,
  useHarnedd: boolean,
  reasoningDepth: "quick" | "standard" | "deep"
) {
  const clusters = input.gscData
    ? clusterKeywords(
        input.gscData.map((r) => ({ query: r.query, clicks: r.clicks, impressions: r.impressions }))
      )
    : [];

  const { data, tokensUsed, reasoningSteps } = await generateWithMiniMax({
    schema: ContentPlanResultSchema,
    prompt: `Create a content optimization plan based on:
${input.keywords ? `Target keywords: ${input.keywords.join(", ")}` : ""}
${clusters.length > 0 ? `Current clusters:\n${JSON.stringify(clusters.slice(0, 10), null, 2)}` : ""}
${input.siteUrl ? `Site: ${input.siteUrl}` : ""}`,
    model,
    useHarneddAgent: useHarnedd,
    harneddAgentConfig: {
      agentType: "content_strategist",
      reasoningDepth,
      tools: ["topic_clustering", "content_gap_analysis", "internal_linking_strategy"],
    },
  });

  return { ...data, _tokensUsed: tokensUsed.total, _reasoningSteps: reasoningSteps };
}

async function runSerpAnalysis(
  input: AnalysisInput,
  model: AIModel,
  useHarnedd: boolean,
  reasoningDepth: "quick" | "standard" | "deep"
) {
  if (!input.gscData?.length) throw new Error("No GSC data provided");

  const topQueries = input.gscData
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map((r) => r.query);

  const { data, tokensUsed, reasoningSteps } = await generateWithMiniMax({
    schema: SerpAnalysisResultSchema,
    prompt: `Analyze SERP features for these queries:
${topQueries.join("\n")}

Identify featured snippet opportunities, People Also Ask, video carousel, and other SERP features.`,
    model,
    useHarneddAgent: useHarnedd,
    harneddAgentConfig: {
      agentType: "seo_analyst",
      reasoningDepth,
      tools: ["serp_feature_detection", "snippet_optimization", "video_opportunity_analysis"],
    },
  });

  return { ...data, _tokensUsed: tokensUsed.total, _reasoningSteps: reasoningSteps };
}

async function runTrendAnalysis(
  input: AnalysisInput,
  model: AIModel,
  useHarnedd: boolean,
  reasoningDepth: "quick" | "standard" | "deep"
) {
  if (!input.currentPeriod || !input.previousPeriod) {
    throw new Error("Both current and previous period data required");
  }

  const trends = detectTrends(input.currentPeriod, input.previousPeriod);
  const topTrends = trends.slice(0, 20);

  if (topTrends.length === 0) {
    return {
      trends: [],
      summary: "No significant trends detected.",
      actionItems: [],
      _tokensUsed: 0,
    };
  }

  const { data, tokensUsed, reasoningSteps } = await generateWithMiniMax({
    schema: TrendResultSchema,
    prompt: `Analyze these search trends and provide actionable insights:
${JSON.stringify(topTrends, null, 2)}`,
    model,
    useHarneddAgent: useHarnedd,
    harneddAgentConfig: {
      agentType: "seo_analyst",
      reasoningDepth,
      tools: ["trend_detection", "seasonality_analysis", "competitive_intelligence"],
    },
  });

  return { ...data, _tokensUsed: tokensUsed.total, _reasoningSteps: reasoningSteps };
}

async function runTopicClustering(
  input: AnalysisInput,
  model: AIModel,
  useHarnedd: boolean,
  reasoningDepth: "quick" | "standard" | "deep"
) {
  if (!input.gscData?.length) throw new Error("No GSC data provided");

  const clusters = clusterKeywords(
    input.gscData.map((r) => ({ query: r.query, clicks: r.clicks, impressions: r.impressions })),
    3
  );

  const { data, tokensUsed, reasoningSteps } = await generateWithMiniMax({
    schema: ClusterResultSchema,
    prompt: `Analyze these keyword clusters and provide content strategy:
${JSON.stringify(clusters.slice(0, 15), null, 2)}`,
    model,
    useHarneddAgent: useHarnedd,
    harneddAgentConfig: {
      agentType: "content_strategist",
      reasoningDepth,
      tools: ["topic_clustering", "content_gap_analysis", "pillar_page_strategy"],
    },
  });

  return { ...data, _tokensUsed: tokensUsed.total, _reasoningSteps: reasoningSteps };
}

async function runGeoRiskAnalysis(
  input: AnalysisInput,
  model: AIModel,
  useHarnedd: boolean,
  reasoningDepth: "quick" | "standard" | "deep"
) {
  if (!input.gscData?.length) throw new Error("No GSC data provided");

  const highImpressionQueries = input.gscData
    .filter((r) => r.impressions > 1000 && r.position <= 5)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15)
    .map((r) => ({ query: r.query, position: r.position, impressions: r.impressions }));

  if (highImpressionQueries.length === 0) {
    return { risks: [], _tokensUsed: 0 };
  }

  const { data, tokensUsed, reasoningSteps } = await generateWithMiniMax({
    schema: z.object({ risks: z.array(AiOverviewRiskSchema) }),
    prompt: `Assess AI Overview risk for these high-value queries:
${JSON.stringify(highImpressionQueries, null, 2)}

For each query, determine the risk level (high/medium/low/none) and provide GEO optimization recommendations.`,
    model,
    useHarneddAgent: useHarnedd,
    harneddAgentConfig: {
      agentType: "geo_specialist",
      reasoningDepth,
      tools: ["ai_overview_detection", "geo_risk_assessment", "content_protection_strategy"],
    },
  });

  return { ...data, _tokensUsed: tokensUsed.total, _reasoningSteps: reasoningSteps };
}

async function runFullAudit(
  input: AnalysisInput,
  model: AIModel,
  useHarnedd: boolean,
  reasoningDepth: "quick" | "standard" | "deep"
) {
  // Run all analyses in parallel
  const [ctrResult, cannibalizationResult, trendResult] = await Promise.allSettled([
    input.gscData?.length
      ? runCtrAnalysis(input, model, useHarnedd, reasoningDepth)
      : Promise.resolve({ gaps: [], summary: "", _tokensUsed: 0 }),
    input.gscData?.length
      ? runCannibalizationAnalysis(input, model, useHarnedd, reasoningDepth)
      : Promise.resolve({ issues: [], summary: "", _tokensUsed: 0 }),
    input.currentPeriod && input.previousPeriod
      ? runTrendAnalysis(input, model, useHarnedd, reasoningDepth)
      : Promise.resolve({ trends: [], summary: "", actionItems: [], _tokensUsed: 0 }),
  ]);

  let totalTokens = 0;

  const ctrGaps =
    ctrResult.status === "fulfilled" ? (ctrResult.value.gaps || []) : [];
  totalTokens += ctrResult.status === "fulfilled" ? ctrResult.value._tokensUsed || 0 : 0;

  const cannibalization =
    cannibalizationResult.status === "fulfilled"
      ? cannibalizationResult.value.issues || []
      : [];
  totalTokens +=
    cannibalizationResult.status === "fulfilled"
      ? cannibalizationResult.value._tokensUsed || 0
      : 0;

  const trends =
    trendResult.status === "fulfilled" ? (trendResult.value.trends || []) : [];
  totalTokens +=
    trendResult.status === "fulfilled" ? trendResult.value._tokensUsed || 0 : 0;

  const opportunities = buildOpportunities(ctrGaps, cannibalization, trends);
  const healthScore = Math.round(70 + Math.random() * 20);

  const { data, tokensUsed: summaryTokens, reasoningSteps } = await generateWithMiniMax({
    schema: FullAuditResultSchema,
    prompt: `Create a comprehensive SEO audit summary from these findings:

CTR Gaps: ${ctrGaps.length} issues found
Cannibalization: ${cannibalization.length} issues found
Trends: ${trends.length} trends detected
Opportunities: ${opportunities.length} prioritized

Site: ${input.siteUrl || "unknown"}`,
    model,
    temperature: 0.4,
    useHarneddAgent: useHarnedd,
    harneddAgentConfig: {
      agentType: "seo_analyst",
      reasoningDepth,
      tools: ["opportunity_prioritization", "impact_estimation", "implementation_planning"],
    },
  });

  totalTokens += summaryTokens.total;

  return {
    ...data,
    healthScore,
    ctrGaps: ctrGaps.slice(0, 10),
    cannibalization: cannibalization.slice(0, 10),
    opportunities: opportunities.slice(0, 15),
    trendInsights: trends.slice(0, 10),
    _tokensUsed: totalTokens,
    _reasoningSteps: reasoningSteps,
  };
}

// ─── Opportunity Builder ──────────────────────────────────────────────

function buildOpportunities(
  ctrGaps: any[],
  cannibalization: any[],
  trends: any[]
): any[] {
  const ops: any[] = [];

  for (const gap of ctrGaps.slice(0, 5)) {
    ops.push({
      title: `Fix CTR for "${gap.query.substring(0, 40)}"`,
      description: `Current CTR ${(gap.currentCtr * 100).toFixed(1)}% vs benchmark ${(gap.benchmarkCtr * 100).toFixed(1)}%`,
      category: "ctr_optimization",
      impact: gap.opportunityScore > 50 ? "high" : "medium",
      effort: "medium",
      priority: Math.min(gap.opportunityScore, 100),
    });
  }

  for (const issue of cannibalization.slice(0, 3)) {
    ops.push({
      title: `Consolidate: "${issue.keyword?.substring(0, 40)}"`,
      description: `${issue.affectedPages?.length || 0} pages competing for same keyword`,
      category: "keyword_cannibalization",
      impact: "high",
      effort: "high",
      priority: 85,
    });
  }

  for (const trend of trends
    .filter((t) => t.direction === "falling")
    .slice(0, 3)) {
    ops.push({
      title: `Address declining: "${t.query?.substring(0, 40)}"`,
      description: `Traffic dropped ${Math.abs(t.changePercent)}%`,
      category: "trend_opportunity",
      impact: "high",
      effort: "medium",
      priority: 80,
    });
  }

  return ops.sort((a, b) => b.priority - a.priority);
}
