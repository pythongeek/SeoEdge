/**
 * Core SEO Scoring Algorithms
 * CTR benchmarks, gap detection, health scoring
 */

import { CTR_BENCHMARKS, HEALTH_THRESHOLDS, HEALTH_WEIGHTS } from "./constants";

// ─── Types ────────────────────────────────────────────────────────────

interface GscRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  device?: string;
  country?: string;
}

interface CtrBenchmark {
  expected: number;
  range: string;
}

interface CtrGapResult {
  query: string;
  currentCtr: number;
  benchmarkCtr: number;
  gap: number;
  opportunityScore: number;
  impressions: number;
  position: number;
}

// ─── Intent Classification ────────────────────────────────────────────

export function classifyIntent(query: string): keyof typeof CTR_BENCHMARKS {
  const q = query.toLowerCase();

  if (/\b(buy|price|deal|discount|coupon|order|shop|purchase|cheap|best price)\b/.test(q)) {
    return "transactional";
  }
  if (/\b(vs|versus|compare|best|top|review|reviews|rating)\b/.test(q)) {
    return "commercial";
  }
  if (/\b(brand|site|login|signin|homepage|official)\b/.test(q)) {
    return "navigational";
  }
  if (/\b(how|what|why|when|where|who|guide|tutorial|learn|meaning|definition)\b/.test(q)) {
    return "informational";
  }
  // Check if brand-like (short, single word, domain-like)
  if (q.split(" ").length <= 2 && !q.includes(" ")) {
    return "navigational";
  }
  return "informational";
}

// ─── CTR Benchmark Calculation ────────────────────────────────────────

export function getPositionRange(position: number): string {
  if (position <= 3) return "p1_3";
  if (position <= 7) return "p4_7";
  if (position <= 10) return "p8_10";
  return "p10_plus";
}

export function getCtrBenchmark(
  query: string,
  position: number
): CtrBenchmark {
  const intent = classifyIntent(query);
  const range = getPositionRange(position);
  const benchmarks = CTR_BENCHMARKS[intent];
  const expected = benchmarks[range as keyof typeof benchmarks];

  return { expected, range };
}

// ─── CTR Gap Analysis ─────────────────────────────────────────────────

export function calculateCtrGap(row: GscRow): CtrGapResult {
  const benchmark = getCtrBenchmark(row.query, row.position);
  const gap = benchmark.expected - row.ctr;
  const opportunityScore = gap * row.impressions; // Absolute gap × impressions

  return {
    query: row.query,
    currentCtr: row.ctr,
    benchmarkCtr: benchmark.expected,
    gap: Math.round(gap * 10000) / 10000,
    opportunityScore: Math.round(opportunityScore * 100) / 100,
    impressions: row.impressions,
    position: row.position,
  };
}

export function analyzeAllCtrGaps(rows: GscRow[]): CtrGapResult[] {
  return rows
    .map(calculateCtrGap)
    .filter((r) => r.gap > 0.001) // Only positive gaps (underperforming)
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
}

// ─── Keyword Cannibalization Detection ────────────────────────────────

export function detectCannibalization(rows: GscRow[]): Array<{
  query: string;
  pages: Array<{ url: string; clicks: number; impressions: number; position: number }>;
  totalImpressions: number;
  overlapScore: number;
}> {
  const queryPages: Record<string, typeof rows> = {};

  for (const row of rows) {
    if (!queryPages[row.query]) queryPages[row.query] = [];
    queryPages[row.query].push(row);
  }

  const results = [];
  for (const [query, pages] of Object.entries(queryPages)) {
    if (pages.length < 2) continue;

    const sorted = pages.sort((a, b) => b.clicks - a.clicks);
    const totalImpressions = pages.reduce((s, p) => s + p.impressions, 0);

    // Overlap score: high when multiple pages have significant impressions
    const topPageShare = sorted[0].impressions / totalImpressions;
    const overlapScore = Math.round((1 - topPageShare) * 100) / 100;

    if (overlapScore > 0.15) {
      results.push({
        query,
        pages: sorted.map((p) => ({
          url: p.page,
          clicks: p.clicks,
          impressions: p.impressions,
          position: p.position,
        })),
        totalImpressions,
        overlapScore,
      });
    }
  }

  return results.sort((a, b) => b.overlapScore - a.overlapScore);
}

// ─── Health Score Calculation ─────────────────────────────────────────

interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  metaIssues?: number;
  headingIssues?: number;
  mobileFriendly?: boolean;
}

export function calculateHealthScore(metrics: PerformanceMetrics): {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  breakdown: Record<string, number>;
} {
  const { lcp, fid, cls, metaIssues = 0, headingIssues = 0, mobileFriendly = true } = metrics;

  // LCP score (0-100)
  let lcpScore = 100;
  if (lcp) {
    if (lcp <= HEALTH_THRESHOLDS.lcp.good) lcpScore = 100;
    else if (lcp <= HEALTH_THRESHOLDS.lcp.poor) lcpScore = 60;
    else lcpScore = 20;
  }

  // FID score (0-100)
  let fidScore = 100;
  if (fid) {
    if (fid <= HEALTH_THRESHOLDS.fid.good) fidScore = 100;
    else if (fid <= HEALTH_THRESHOLDS.fid.poor) fidScore = 60;
    else fidScore = 20;
  }

  // CLS score (0-100)
  let clsScore = 100;
  if (cls !== undefined) {
    if (cls <= HEALTH_THRESHOLDS.cls.good) clsScore = 100;
    else if (cls <= HEALTH_THRESHOLDS.cls.poor) clsScore = 60;
    else clsScore = 20;
  }

  // Meta score
  const metaScore = Math.max(0, 100 - metaIssues * 15);

  // Headings score
  const headingsScore = Math.max(0, 100 - headingIssues * 10);

  // Mobile score
  const mobileScore = mobileFriendly ? 100 : 0;

  const score = Math.round(
    lcpScore * HEALTH_WEIGHTS.lcp +
    fidScore * HEALTH_WEIGHTS.fid +
    clsScore * HEALTH_WEIGHTS.cls +
    metaScore * HEALTH_WEIGHTS.meta_tags +
    headingsScore * HEALTH_WEIGHTS.headings +
    mobileScore * HEALTH_WEIGHTS.mobile_friendly
  );

  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 50 ? "D" : "F";

  return {
    score,
    grade,
    breakdown: {
      lcp: lcpScore,
      fid: fidScore,
      cls: clsScore,
      metaTags: metaScore,
      headings: headingsScore,
      mobile: mobileScore,
    },
  };
}

// ─── Opportunity Scoring ──────────────────────────────────────────────

interface OpportunityInput {
  type: string;
  impact: "high" | "medium" | "low";
  effort: "high" | "medium" | "low";
  potentialTrafficGain: number;
  affectedQueries: number;
}

const IMPACT_WEIGHTS = { high: 1.0, medium: 0.6, low: 0.3 };
const EFFORT_WEIGHTS = { high: 0.5, medium: 0.8, low: 1.0 };

export function calculatePriorityScore(opp: OpportunityInput): number {
  const impactScore = IMPACT_WEIGHTS[opp.impact];
  const effortScore = EFFORT_WEIGHTS[opp.effort];
  const trafficScore = Math.min(opp.potentialTrafficGain / 1000, 1); // Normalize to 0-1
  const queryScore = Math.min(opp.affectedQueries / 50, 1); // Normalize to 0-1

  const priority = (impactScore * effortScore * 0.4 + trafficScore * 0.3 + queryScore * 0.3) * 100;
  return Math.round(Math.min(priority, 100));
}

// ─── Trend Detection ──────────────────────────────────────────────────

export function detectTrends(
  currentPeriod: GscRow[],
  previousPeriod: GscRow[]
): Array<{
  query: string;
  direction: "rising" | "falling" | "stable";
  changePercent: number;
  currentClicks: number;
  previousClicks: number;
}> {
  const currentMap = new Map(currentPeriod.map((r) => [r.query, r.clicks]));
  const previousMap = new Map(previousPeriod.map((r) => [r.query, r.clicks]));
  const allQueries = new Set([...currentMap.keys(), ...previousMap.keys()]);

  const results = [];
  for (const query of allQueries) {
    const current = currentMap.get(query) || 0;
    const previous = previousMap.get(query) || 0;

    if (previous === 0 && current === 0) continue;

    const changePercent =
      previous === 0 ? 100 : Math.round(((current - previous) / previous) * 10000) / 100;

    let direction: "rising" | "falling" | "stable";
    if (changePercent > 15) direction = "rising";
    else if (changePercent < -15) direction = "falling";
    else direction = "stable";

    if (direction !== "stable" || current > 0) {
      results.push({ query, direction, changePercent, currentClicks: current, previousClicks: previous });
    }
  }

  return results.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

// ─── Topic Clustering ─────────────────────────────────────────────────

export function clusterKeywords(
  queries: Array<{ query: string; clicks: number; impressions: number }>,
  minClusterSize: number = 3
): Array<{
  topic: string;
  keywords: typeof queries;
  totalClicks: number;
  totalImpressions: number;
}> {
  // Extract n-grams and group by similarity
  const groups: Record<string, typeof queries> = {};

  for (const q of queries) {
    const words = q.query.toLowerCase().split(/\s+/);
    const keyPhrases: string[] = [];

    // Generate bigrams and trigrams
    for (let i = 0; i < words.length - 1; i++) {
      keyPhrases.push(words.slice(i, i + 2).join(" "));
      if (i < words.length - 2) {
        keyPhrases.push(words.slice(i, i + 3).join(" "));
      }
    }

    for (const phrase of keyPhrases) {
      if (!groups[phrase]) groups[phrase] = [];
      if (!groups[phrase].find((k) => k.query === q.query)) {
        groups[phrase].push(q);
      }
    }
  }

  // Sort clusters by total impressions
  const clusters = Object.entries(groups)
    .map(([topic, keywords]) => ({
      topic,
      keywords,
      totalClicks: keywords.reduce((s, k) => s + k.clicks, 0),
      totalImpressions: keywords.reduce((s, k) => s + k.impressions, 0),
    }))
    .filter((c) => c.keywords.length >= minClusterSize)
    .sort((a, b) => b.totalImpressions - a.totalImpressions);

  // Merge overlapping clusters
  const merged: typeof clusters = [];
  for (const cluster of clusters) {
    const similar = merged.find(
      (m) =>
        m.topic.includes(cluster.topic) ||
        cluster.topic.includes(m.topic) ||
        m.keywords.some((k) => cluster.keywords.some((c) => c.query === k.query))
    );

    if (similar && Math.abs(similar.keywords.length - cluster.keywords.length) < 3) {
      similar.keywords = [...new Set([...similar.keywords, ...cluster.keywords])];
      similar.totalClicks += cluster.totalClicks;
      similar.totalImpressions += cluster.totalImpressions;
    } else {
      merged.push(cluster);
    }
  }

  return merged.slice(0, 20); // Top 20 clusters
}
