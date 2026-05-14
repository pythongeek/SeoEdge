import { z } from "zod";

// ─── Core SEO Analysis Schemas ────────────────────────────────────────

export const CtrGapSchema = z.object({
  query: z.string(),
  currentCtr: z.number(),
  benchmarkCtr: z.number(),
  gap: z.number(),
  reason: z.string(),
  recommendation: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  estimatedTrafficGain: z.number().optional(),
});

export const CannibalizationIssueSchema = z.object({
  keyword: z.string(),
  affectedPages: z.array(z.string()),
  overlapScore: z.number().min(0).max(1),
  recommendation: z.string(),
  priority: z.enum(["high", "medium", "low"]),
});

export const PageHealthSchema = z.object({
  url: z.string(),
  score: z.number().min(0).max(100),
  grade: z.enum(["A", "B", "C", "D", "F"]),
  issues: z.array(
    z.object({
      type: z.string(),
      severity: z.enum(["critical", "warning", "info"]),
      message: z.string(),
      fix: z.string(),
    })
  ),
  lcp: z.number().optional(),
  fid: z.number().optional(),
  cls: z.number().optional(),
});

export const OpportunitySchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string(),
  category: z.enum([
    "ctr_optimization",
    "content_gap",
    "technical_seo",
    "keyword_cannibalization",
    "link_building",
    "ai_overview_risk",
    "trend_opportunity",
    "geo_optimization",
    "core_web_vitals",
  ]),
  impact: z.enum(["high", "medium", "low"]),
  effort: z.enum(["high", "medium", "low"]),
  priority: z.number().min(1).max(100),
  affectedPages: z.array(z.string()).optional(),
  affectedQueries: z.array(z.string()).optional(),
  potentialTrafficGain: z.number().optional(),
  actionPlan: z.array(z.string()).optional(),
  estimatedTimeToImplement: z.string().optional(),
  resourcesNeeded: z.array(z.string()).optional(),
});

export const ContentPlanItemSchema = z.object({
  topic: z.string(),
  targetKeywords: z.array(z.string()),
  contentType: z.enum([
    "blog_post",
    "product_page",
    "landing_page",
    "faq",
    "guide",
    "comparison",
    "video",
  ]),
  priority: z.enum(["high", "medium", "low"]),
  estimatedWordCount: z.number(),
  internalLinks: z.array(z.string()).optional(),
  outline: z.array(z.string()).optional(),
  ee_at_signals: z.array(z.string()).optional(),
  publishingDate: z.string().optional(),
});

export const SerpFeatureSchema = z.object({
  type: z.enum([
    "featured_snippet",
    "people_also_ask",
    "video_carousel",
    "image_pack",
    "knowledge_panel",
    "local_pack",
    "top_stories",
    "shopping_results",
    "site_links",
    "rich_results",
    "ai_overview",
  ]),
  present: z.boolean(),
  opportunity: z.boolean(),
  difficulty: z.enum(["high", "medium", "low"]).optional(),
  recommendation: z.string().optional(),
});

export const AiOverviewRiskSchema = z.object({
  query: z.string(),
  riskLevel: z.enum(["high", "medium", "low", "none"]),
  estimatedTrafficImpact: z.number(),
  aiOverviewTriggers: z.array(z.string()),
  geoRecommendations: z.array(z.string()),
  contentStrategy: z.string().optional(),
});

export const TrendAnalysisSchema = z.object({
  query: z.string(),
  direction: z.enum(["rising", "falling", "stable"]),
  changePercent: z.number(),
  seasonality: z.enum(["seasonal", "trending", "evergreen", "declining"]).optional(),
  recommendation: z.string(),
  urgency: z.enum(["high", "medium", "low"]),
});

export const TopicClusterSchema = z.object({
  topic: z.string(),
  keywords: z.array(z.string()),
  totalVolume: z.number(),
  avgDifficulty: z.number(),
  coverage: z.number().min(0).max(1),
  gaps: z.array(z.string()),
  pillarPage: z.string().optional(),
  clusterPages: z.array(z.string()).optional(),
  priority: z.enum(["high", "medium", "low"]),
});

export const HealthAuditSchema = z.object({
  overallScore: z.number().min(0).max(100),
  categories: z.array(
    z.object({
      name: z.string(),
      score: z.number().min(0).max(100),
      issues: z.array(
        z.object({
          type: z.string(),
          severity: z.enum(["critical", "warning", "info"]),
          message: z.string(),
          fix: z.string(),
          estimatedImpact: z.string().optional(),
        })
      ),
    })
  ),
  recommendations: z.array(z.string()),
});

// ─── AI Action Result Schemas ────────────────────────────────────────

export const CtrAnalysisResultSchema = z.object({
  gaps: z.array(CtrGapSchema),
  summary: z.string(),
  topOpportunities: z.array(z.string()),
});

export const CannibalizationResultSchema = z.object({
  issues: z.array(CannibalizationIssueSchema),
  summary: z.string(),
  consolidationPlan: z.array(z.string()).optional(),
});

export const ContentPlanResultSchema = z.object({
  items: z.array(ContentPlanItemSchema),
  summary: z.string(),
  timeline: z.array(z.string()).optional(),
});

export const SerpAnalysisResultSchema = z.object({
  features: z.array(SerpFeatureSchema),
  summary: z.string(),
  opportunities: z.array(z.string()),
});

export const TrendResultSchema = z.object({
  trends: z.array(TrendAnalysisSchema),
  summary: z.string(),
  actionItems: z.array(z.string()),
});

export const ClusterResultSchema = z.object({
  clusters: z.array(TopicClusterSchema),
  summary: z.string(),
  recommendations: z.array(z.string()),
});

export const FullAuditResultSchema = z.object({
  healthScore: z.number().min(0).max(100),
  opportunities: z.array(OpportunitySchema),
  ctrGaps: z.array(CtrGapSchema),
  cannibalization: z.array(CannibalizationIssueSchema),
  pageHealth: z.array(PageHealthSchema),
  geoRisks: z.array(AiOverviewRiskSchema).optional(),
  trendInsights: z.array(TrendAnalysisSchema).optional(),
  contentPlan: ContentPlanResultSchema.optional(),
  summary: z.string(),
  prioritizedActions: z.array(z.string()),
});

// ─── Export Types ────────────────────────────────────────────────────

export type CtrGap = z.infer<typeof CtrGapSchema>;
export type CannibalizationIssue = z.infer<typeof CannibalizationIssueSchema>;
export type PageHealth = z.infer<typeof PageHealthSchema>;
export type Opportunity = z.infer<typeof OpportunitySchema>;
export type ContentPlanItem = z.infer<typeof ContentPlanItemSchema>;
export type SerpFeature = z.infer<typeof SerpFeatureSchema>;
export type AiOverviewRisk = z.infer<typeof AiOverviewRiskSchema>;
export type TrendAnalysis = z.infer<typeof TrendAnalysisSchema>;
export type TopicCluster = z.infer<typeof TopicClusterSchema>;
export type HealthAudit = z.infer<typeof HealthAuditSchema>;
export type FullAuditResult = z.infer<typeof FullAuditResultSchema>;
