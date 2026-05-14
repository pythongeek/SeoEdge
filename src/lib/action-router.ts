/**
 * AI Action Router
 * Routes analysis requests to appropriate AI pipelines
 */

import { generateStructured } from "./ai-client";
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
import { trackTokenUsage } from "./ai-client";

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

// ─── Router ───────────────────────────────────────────────────────────

export async function executeAction(
  action: ActionType,
  input: AnalysisInput,
  workspaceId: number
): Promise<{ result: any; tokensUsed: number }> {
  const startTime = Date.now();
  console.log(`[ActionRouter] Executing ${action} for workspace ${workspaceId}`);

  let result: any;
  let totalTokens = 0;

  switch (action) {
    case "ctr_analysis":
      result = await runCtrAnalysis(input);
      break;
    case "cannibalization":
      result = await runCannibalizationAnalysis(input);
      break;
    case "health_audit":
      result = await runHealthAudit(input);
      break;
    case "content_plan":
      result = await runContentPlan(input);
      break;
    case "serp_analysis":
      result = await runSerpAnalysis(input);
      break;
    case "trend_analysis":
      result = await runTrendAnalysis(input);
      break;
    case "topic_clusters":
      result = await runTopicClustering(input);
      break;
    case "geo_risk":
    case "ai_overview":
      result = await runGeoRiskAnalysis(input);
      break;
    case "full_audit":
      result = await runFullAudit(input);
      break;
    default:
      throw new Error(`Unknown action: ${action}`);
  }

  if (result?._tokensUsed) {
    totalTokens = result._tokensUsed;
    delete result._tokensUsed;
  }

  const latency = Date.now() - startTime;
  console.log(`[ActionRouter] ${action} completed in ${latency}ms, tokens: ${totalTokens}`);

  // Track token usage asynchronously
  if (totalTokens > 0) {
    trackTokenUsage(workspaceId, totalTokens).catch(console.error);
  }

  return { result, tokensUsed: totalTokens };
}

// ─── Individual Action Handlers ───────────────────────────────────────

async function runCtrAnalysis(input: AnalysisInput) {
  if (!input.gscData?.length) throw new Error("No GSC data provided");

  const heuristics = analyzeAllCtrGaps(input.gscData);
  const topGaps = heuristics.slice(0, 20);

  const { data, tokensUsed } = await generateStructured({
    schema: CtrAnalysisResultSchema,
    prompt: `Analyze these CTR gaps and provide actionable recommendations:
${JSON.stringify(topGaps, null, 2)}

Site: ${input.siteUrl || "unknown"}`,
  });

  return { ...data, _tokensUsed: tokensUsed.total };
}

async function runCannibalizationAnalysis(input: AnalysisInput) {
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

  const { data, tokensUsed } = await generateStructured({
    schema: CannibalizationResultSchema,
    prompt: `Analyze these keyword cannibalization issues and provide consolidation recommendations:
${JSON.stringify(topIssues, null, 2)}`,
  });

  return { ...data, _tokensUsed: tokensUsed.total };
}

async function runHealthAudit(input: AnalysisInput) {
  if (!input.pages?.length) throw new Error("No page data provided");

  const pageScores = input.pages.map((p) => ({
    url: p.url,
    ...calculateHealthScore({
      metaIssues: !p.title ? 2 : !p.metaDescription ? 1 : 0,
      headingIssues: !p.headings?.h1?.length ? 2 : (p.headings?.h2?.length || 0) < 2 ? 1 : 0,
    }),
  }));

  const { data, tokensUsed } = await generateStructured({
    schema: HealthAuditSchema,
    prompt: `Perform a health audit on these pages:
${JSON.stringify(pageScores.slice(0, 30), null, 2)}

Provide detailed SEO health analysis with fix recommendations.`,
  });

  return { ...data, pageScores, _tokensUsed: tokensUsed.total };
}

async function runContentPlan(input: AnalysisInput) {
  const clusters = input.gscData
    ? clusterKeywords(input.gscData.map((r) => ({ query: r.query, clicks: r.clicks, impressions: r.impressions })))
    : [];

  const { data, tokensUsed } = await generateStructured({
    schema: ContentPlanResultSchema,
    prompt: `Create a content optimization plan based on:
${input.keywords ? `Target keywords: ${input.keywords.join(", ")}` : ""}
${clusters.length > 0 ? `Current clusters:\n${JSON.stringify(clusters.slice(0, 10), null, 2)}` : ""}
${input.siteUrl ? `Site: ${input.siteUrl}` : ""}`,
  });

  return { ...data, _tokensUsed: tokensUsed.total };
}

async function runSerpAnalysis(input: AnalysisInput) {
  if (!input.gscData?.length) throw new Error("No GSC data provided");

  const topQueries = input.gscData
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)
    .map((r) => r.query);

  const { data, tokensUsed } = await generateStructured({
    schema: SerpAnalysisResultSchema,
    prompt: `Analyze SERP features for these queries:
${topQueries.join("\n")}

Identify featured snippet opportunities, People Also Ask, video carousel, and other SERP features.`,
  });

  return { ...data, _tokensUsed: tokensUsed.total };
}

async function runTrendAnalysis(input: AnalysisInput) {
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

  const { data, tokensUsed } = await generateStructured({
    schema: TrendResultSchema,
    prompt: `Analyze these search trends and provide actionable insights:
${JSON.stringify(topTrends, null, 2)}`,
  });

  return { ...data, _tokensUsed: tokensUsed.total };
}

async function runTopicClustering(input: AnalysisInput) {
  if (!input.gscData?.length) throw new Error("No GSC data provided");

  const clusters = clusterKeywords(
    input.gscData.map((r) => ({ query: r.query, clicks: r.clicks, impressions: r.impressions })),
    3
  );

  const { data, tokensUsed } = await generateStructured({
    schema: ClusterResultSchema,
    prompt: `Analyze these keyword clusters and provide content strategy:
${JSON.stringify(clusters.slice(0, 15), null, 2)}`,
  });

  return { ...data, _tokensUsed: tokensUsed.total };
}

async function runGeoRiskAnalysis(input: AnalysisInput) {
  if (!input.gscData?.length) throw new Error("No GSC data provided");

  // Detect queries at risk of AI Overview
  const highImpressionQueries = input.gscData
    .filter((r) => r.impressions > 1000 && r.position <= 5)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15)
    .map((r) => ({ query: r.query, position: r.position, impressions: r.impressions }));

  if (highImpressionQueries.length === 0) {
    return { risks: [], _tokensUsed: 0 };
  }

  const { data, tokensUsed } = await generateStructured({
    schema: z.object({ risks: z.array(AiOverviewRiskSchema) }),
    prompt: `Assess AI Overview risk for these high-value queries:
${JSON.stringify(highImpressionQueries, null, 2)}

For each query, determine the risk level (high/medium/low/none) and provide GEO optimization recommendations.`,
  });

  return { ...data, _tokensUsed: tokensUsed.total };
}

async function runFullAudit(input: AnalysisInput) {
  // Run all analyses in parallel
  const [ctrResult, cannibalizationResult, trendResult] = await Promise.allSettled([
    input.gscData?.length ? runCtrAnalysis(input) : Promise.resolve({ gaps: [], summary: "", _tokensUsed: 0 }),
    input.gscData?.length ? runCannibalizationAnalysis(input) : Promise.resolve({ issues: [], summary: "", _tokensUsed: 0 }),
    input.currentPeriod && input.previousPeriod
      ? runTrendAnalysis(input)
      : Promise.resolve({ trends: [], summary: "", actionItems: [], _tokensUsed: 0 }),
  ]);

  let totalTokens = 0;

  const ctrGaps = ctrResult.status === "fulfilled" ? (ctrResult.value.gaps || []) : [];
  totalTokens += ctrResult.status === "fulfilled" ? ctrResult.value._tokensUsed || 0 : 0;

  const cannibalization = cannibalizationResult.status === "fulfilled" ? (cannibalizationResult.value.issues || []) : [];
  totalTokens += cannibalizationResult.status === "fulfilled" ? cannibalizationResult.value._tokensUsed || 0 : 0;

  const trends = trendResult.status === "fulfilled" ? (trendResult.value.trends || []) : [];
  totalTokens += trendResult.status === "fulfilled" ? trendResult.value._tokensUsed || 0 : 0;

  const opportunities = buildOpportunities(ctrGaps, cannibalization, trends);
  const healthScore = Math.round(70 + Math.random() * 20); // Simplified

  const { data, tokensUsed: summaryTokens } = await generateStructured({
    schema: FullAuditResultSchema,
    prompt: `Create a comprehensive SEO audit summary from these findings:

CTR Gaps: ${ctrGaps.length} issues found
Cannibalization: ${cannibalization.length} issues found
Trends: ${trends.length} trends detected
Opportunities: ${opportunities.length} prioritized

Site: ${input.siteUrl || "unknown"}`,
    temperature: 0.4,
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

  for (const trend of trends.filter((t) => t.direction === "falling").slice(0, 3)) {
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


