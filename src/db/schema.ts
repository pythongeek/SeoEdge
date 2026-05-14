import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
  bigint,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "trialing",
]);

export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "free",
  "pro",
  "business",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "retrying",
  "cancelled",
]);

export const jobTypeEnum = pgEnum("job_type", [
  "gsc_analysis",
  "serp_fetch",
  "crawl",
  "ai_analysis",
  "export",
  "health_audit",
  "content_plan",
]);

// ─── Workspaces (Multi-Tenancy Root) ────────────────────────────────

export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  clerkOrgId: varchar("clerk_org_id", { length: 255 }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  tier: subscriptionTierEnum("tier").default("free").notNull(),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default(
    "trialing"
  ),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  currentPeriodEnd: timestamp("current_period_end"),
  gscSiteUrl: text("gsc_site_url"),
  gscEncryptedToken: text("gsc_encrypted_token"),
  gscTokenExpiresAt: timestamp("gsc_token_expires_at"),
  settings: jsonb("settings").default({
    autoSync: false,
    syncFrequency: "daily",
    emailReports: false,
    alertThreshold: 0.1,
  }),
  tokensUsedThisMonth: integer("tokens_used_this_month").default(0),
  tokensLimit: integer("tokens_limit").default(10000),
  apiRequestsThisMonth: integer("api_requests_this_month").default(0),
  apiRequestsLimit: integer("api_requests_limit").default(1000),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Users ───────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    avatarUrl: text("avatar_url"),
    role: varchar("role", { length: 20 }).default("member").notNull(), // owner, admin, member
    defaultWorkspaceId: integer("default_workspace_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("users_workspace_idx").on(table.defaultWorkspaceId),
  ]
);

// ─── Workspace Members (RBAC) ───────────────────────────────────────

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).default("member").notNull(), // owner, admin, member, viewer
    invitedBy: integer("invited_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("workspace_user_unique_idx").on(
      table.workspaceId,
      table.userId
    ),
  ]
);

// ─── API Keys (External API Access) ──────────────────────────────────

export const apiKeys = pgTable(
  "api_keys",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    hashedKey: varchar("hashed_key", { length: 255 }).notNull(),
    prefix: varchar("prefix", { length: 16 }).notNull(),
    scopes: jsonb("scopes").default(["read"]),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("api_keys_workspace_idx").on(table.workspaceId)]
);

// ─── GSC Data (Workspace-Isolated) ──────────────────────────────────

export const gscData = pgTable(
  "gsc_data",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 10 }).notNull(), // "query" | "page"
    dimension: text("dimension").notNull(), // query string or page URL
    clicks: integer("clicks").notNull(),
    impressions: integer("impressions").notNull(),
    ctr: real("ctr").notNull(),
    position: real("position").notNull(),
    dateRange: text("date_range"),
    siteUrl: text("site_url"),
    device: varchar("device", { length: 20 }),
    country: varchar("country", { length: 10 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("gsc_workspace_idx").on(table.workspaceId),
    index("gsc_dimension_idx").on(table.dimension),
    index("gsc_type_idx").on(table.type),
    index("gsc_date_idx").on(table.createdAt),
  ]
);

// ─── Reports ─────────────────────────────────────────────────────────

export const reports = pgTable(
  "reports",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id),
    title: text("title").notNull(),
    summary: text("summary"),
    type: varchar("type", { length: 50 }).default("full_audit").notNull(),
    actions: jsonb("actions").default([]),
    ctrGaps: jsonb("ctr_gaps").default([]),
    cannibalization: jsonb("cannibalization").default([]),
    pageHealth: jsonb("page_health").default([]),
    opportunities: jsonb("opportunities").default([]),
    contentPlan: jsonb("content_plan"),
    geoAnalysis: jsonb("geo_analysis"),
    serpFeatures: jsonb("serp_features"),
    trendAnalysis: jsonb("trend_analysis"),
    topicClusters: jsonb("topic_clusters"),
    healthScore: integer("health_score"),
    aiTokensUsed: integer("ai_tokens_used").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("reports_workspace_idx").on(table.workspaceId)]
);

// ─── Jobs (BullMQ Tracking) ─────────────────────────────────────────

export const jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),
    jobId: varchar("job_id", { length: 128 }).notNull().unique(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id),
    type: jobTypeEnum("type").notNull(),
    status: jobStatusEnum("status").default("pending").notNull(),
    priority: integer("priority").default(0),
    progress: integer("progress").default(0),
    progressMessage: text("progress_message"),
    result: jsonb("result"),
    error: text("error"),
    retryCount: integer("retry_count").default(0),
    maxRetries: integer("max_retries").default(3),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    scheduledFor: timestamp("scheduled_for"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("jobs_workspace_idx").on(table.workspaceId),
    index("jobs_status_idx").on(table.status),
    index("jobs_type_idx").on(table.type),
    index("jobs_created_idx").on(table.createdAt),
  ]
);

// ─── Crawl Data ──────────────────────────────────────────────────────

export const crawlData = pgTable(
  "crawl_data",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    metaDescription: text("meta_description"),
    headings: jsonb("headings"),
    statusCode: integer("status_code"),
    issues: jsonb("issues").default([]),
    performance: jsonb("performance"),
    aiAnalysis: jsonb("ai_analysis"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("crawl_workspace_idx").on(table.workspaceId)]
);

// ─── SERP Data ───────────────────────────────────────────────────────

export const serpData = pgTable(
  "serp_data",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    features: jsonb("features").default([]),
    aiOverview: jsonb("ai_overview"),
    competitors: jsonb("competitors"),
    intent: varchar("intent", { length: 20 }),
    difficulty: integer("difficulty"),
    volume: integer("volume"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("serp_workspace_idx").on(table.workspaceId)]
);

// ─── Health History ──────────────────────────────────────────────────

export const healthHistory = pgTable(
  "health_history",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    date: timestamp("date").defaultNow().notNull(),
    overallScore: integer("overall_score").notNull(),
    ctrScore: integer("ctr_score"),
    healthScore: integer("health_score"),
    trendScore: integer("trend_score"),
    geoScore: integer("geo_score"),
    details: jsonb("details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("health_workspace_idx").on(table.workspaceId),
    index("health_date_idx").on(table.date),
  ]
);

// ─── Activity Log (Audit Trail) ─────────────────────────────────────

export const activityLog = pgTable(
  "activity_log",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id),
    action: varchar("action", { length: 50 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: integer("entity_id"),
    metadata: jsonb("metadata"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("activity_workspace_idx").on(table.workspaceId),
    index("activity_created_idx").on(table.createdAt),
  ]
);

// ─── Scheduled Reports ───────────────────────────────────────────────

export const scheduledReports = pgTable(
  "scheduled_reports",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    frequency: varchar("frequency", { length: 20 }).notNull(), // weekly, monthly
    format: varchar("format", { length: 10 }).default("pdf").notNull(),
    recipients: jsonb("recipients").default([]),
    lastRunAt: timestamp("last_run_at"),
    nextRunAt: timestamp("next_run_at"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("scheduled_workspace_idx").on(table.workspaceId)]
);

// ─── Relations ───────────────────────────────────────────────────────

export const workspaceRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  gscData: many(gscData),
  reports: many(reports),
  jobs: many(jobs),
  crawlData: many(crawlData),
  serpData: many(serpData),
  healthHistory: many(healthHistory),
  activityLog: many(activityLog),
  apiKeys: many(apiKeys),
  scheduledReports: many(scheduledReports),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(workspaceMembers),
}));

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
    user: one(users, {
      fields: [workspaceMembers.userId],
      references: [users.id],
    }),
  })
);
