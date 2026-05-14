// ─── App Constants ───────────────────────────────────────────────────

export const APP_NAME = "SEOMaster";
export const APP_VERSION = "2.0.0";

// ─── Subscription Tiers ──────────────────────────────────────────────

export const TIER_LIMITS = {
  free: {
    name: "Free",
    maxWorkspaces: 1,
    maxTeamMembers: 1,
    aiTokensPerMonth: 5000,
    apiRequestsPerMonth: 500,
    maxGscRows: 1000,
    maxCrawlPages: 50,
    maxScheduledReports: 0,
    maxHistoryDays: 30,
    features: {
      aiAnalysis: false,
      serpIntelligence: false,
      geoOptimization: false,
      scheduledReports: false,
      apiAccess: false,
      teamCollaboration: false,
      customBranding: false,
      prioritySupport: false,
    },
  },
  pro: {
    name: "Pro",
    maxWorkspaces: 3,
    maxTeamMembers: 5,
    aiTokensPerMonth: 50000,
    apiRequestsPerMonth: 5000,
    maxGscRows: 25000,
    maxCrawlPages: 500,
    maxScheduledReports: 5,
    maxHistoryDays: 90,
    features: {
      aiAnalysis: true,
      serpIntelligence: true,
      geoOptimization: true,
      scheduledReports: true,
      apiAccess: true,
      teamCollaboration: true,
      customBranding: false,
      prioritySupport: false,
    },
  },
  business: {
    name: "Business",
    maxWorkspaces: 10,
    maxTeamMembers: 20,
    aiTokensPerMonth: 200000,
    apiRequestsPerMonth: 50000,
    maxGscRows: 100000,
    maxCrawlPages: 5000,
    maxScheduledReports: 20,
    maxHistoryDays: 365,
    features: {
      aiAnalysis: true,
      serpIntelligence: true,
      geoOptimization: true,
      scheduledReports: true,
      apiAccess: true,
      teamCollaboration: true,
      customBranding: true,
      prioritySupport: true,
    },
  },
} as const;

// ─── CTR Benchmarks by Position ──────────────────────────────────────

export const CTR_BENCHMARKS = {
  brand: {
    p1_3: 0.35,
    p4_7: 0.18,
    p8_10: 0.08,
    p10_plus: 0.03,
  },
  informational: {
    p1_3: 0.28,
    p4_7: 0.14,
    p8_10: 0.06,
    p10_plus: 0.02,
  },
  commercial: {
    p1_3: 0.22,
    p4_7: 0.11,
    p8_10: 0.05,
    p10_plus: 0.02,
  },
  transactional: {
    p1_3: 0.18,
    p4_7: 0.09,
    p8_10: 0.04,
    p10_plus: 0.015,
  },
  navigational: {
    p1_3: 0.45,
    p4_7: 0.2,
    p8_10: 0.1,
    p10_plus: 0.04,
  },
} as const;

// ─── Health Score Weights ────────────────────────────────────────────

export const HEALTH_WEIGHTS = {
  lcp: 0.25,
  fid: 0.25,
  cls: 0.2,
  meta_tags: 0.15,
  headings: 0.1,
  mobile_friendly: 0.05,
} as const;

// ─── Health Score Thresholds ─────────────────────────────────────────

export const HEALTH_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
} as const;

// ─── Retry Configuration ─────────────────────────────────────────────

export const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 30000,
} as const;

// ─── Pagination ──────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

// ─── AI Models ───────────────────────────────────────────────────────

export const AI_MODELS = {
  primary: "minimax/m1",
  fallback: "google/gemini-2.5-pro-exp-03-25:free",
  fast: "google/gemini-2.0-flash-001",
} as const;

// ─── GSC API ─────────────────────────────────────────────────────────

export const GSC_ROW_LIMIT = 25000;
export const GSC_DIMENSIONS = ["query", "page", "country", "device"] as const;

// ─── Job Processing ──────────────────────────────────────────────────

export const JOB_TIMEOUTS = {
  gsc_analysis: 5 * 60 * 1000,    // 5 min
  serp_fetch: 10 * 60 * 1000,     // 10 min
  crawl: 30 * 60 * 1000,          // 30 min
  ai_analysis: 10 * 60 * 1000,    // 10 min
  export: 2 * 60 * 1000,          // 2 min
  health_audit: 15 * 60 * 1000,   // 15 min
  content_plan: 10 * 60 * 1000,   // 10 min
} as const;
