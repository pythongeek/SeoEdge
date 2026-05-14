/**
 * OpenAPI 3.1 Specification for SEOMaster External API
 * Compatible with n8n, Zapier, Make.com, and other automation tools
 */

export const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "SEOMaster API",
    description: `Enterprise-grade SEO analytics API with AI-powered insights. 
    
## Authentication
All API requests require an API key passed in the \\\`X-API-Key\\\` header.

## Rate Limiting
- Pro tier: 1,000 requests/hour
- Business tier: 50,000 requests/hour

## n8n Integration
Use the HTTP Request node with:
- Authentication: Generic Auth Type → Header Auth → Name: \\\`X-API-Key\\\`
- Base URL: Your app URL

## Webhooks
Subscribe to events via \\\`POST /api/v1/webhooks/subscribe\\\``,
    version: "2.0.0",
    contact: {
      name: "SEOMaster Support",
      email: "support@seomaster.app",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "{baseUrl}",
      variables: {
        baseUrl: {
          default: "https://api.seomaster.app",
          description: "Your SEOMaster instance URL",
        },
      },
    },
  ],
  tags: [
    { name: "Analysis", description: "SEO analysis endpoints" },
    { name: "Reports", description: "Report management" },
    { name: "Data", description: "GSC data operations" },
    { name: "Webhooks", description: "Webhook management" },
    { name: "Health", description: "System health checks" },
  ],
  paths: {
    "/api/v1/analyze": {
      post: {
        tags: ["Analysis"],
        summary: "Run SEO analysis",
        description: "Execute AI-powered SEO analysis with specified action type",
        operationId: "runAnalysis",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: {
                    type: "string",
                    enum: [
                      "full_audit",
                      "ctr_analysis",
                      "cannibalization",
                      "health_audit",
                      "content_plan",
                      "serp_analysis",
                      "trend_analysis",
                      "topic_clusters",
                      "geo_risk",
                    ],
                    description: "Type of analysis to perform",
                  },
                  data: {
                    type: "object",
                    description: "Analysis input data (GSC rows, pages, etc.)",
                  },
                  siteUrl: {
                    type: "string",
                    description: "Target site URL",
                  },
                  engine: {
                    type: "string",
                    enum: ["minimax-m2.7", "minimax-m1", "gemini-2.0-flash"],
                    default: "minimax-m2.7",
                    description: "AI model to use",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Analysis completed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    result: { type: "object" },
                    tokensUsed: { type: "integer" },
                    model: { type: "string" },
                    latencyMs: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid API key" },
          "429": { description: "Rate limit exceeded" },
          "500": { description: "Server error" },
        },
      },
    },
    "/api/v1/reports": {
      get: {
        tags: ["Reports"],
        summary: "List reports",
        description: "Get all reports for the authenticated workspace",
        operationId: "listReports",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50, maximum: 100 },
            description: "Number of reports to return",
          },
          {
            name: "offset",
            in: "query",
            schema: { type: "integer", default: 0 },
            description: "Pagination offset",
          },
          {
            name: "type",
            in: "query",
            schema: {
              type: "string",
              enum: ["full_audit", "ctr_analysis", "health_audit", "content_plan"],
            },
            description: "Filter by report type",
          },
        ],
        responses: {
          "200": {
            description: "List of reports",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    reports: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Report" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Invalid API key" },
        },
      },
    },
    "/api/v1/reports/{id}": {
      get: {
        tags: ["Reports"],
        summary: "Get report by ID",
        operationId: "getReport",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "Report details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Report" },
              },
            },
          },
          "404": { description: "Report not found" },
        },
      },
    },
    "/api/v1/reports/{id}/export": {
      post: {
        tags: ["Reports"],
        summary: "Export report",
        description: "Export a report as DOCX or CSV",
        operationId: "exportReport",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["format"],
                properties: {
                  format: {
                    type: "string",
                    enum: ["docx", "csv"],
                  },
                  email: {
                    type: "string",
                    description: "Optional: Email to send the export to",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Export generated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    downloadUrl: { type: "string" },
                    format: { type: "string" },
                    expiresAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/gsc/data": {
      get: {
        tags: ["Data"],
        summary: "Get GSC data",
        description: "Retrieve stored Google Search Console data",
        operationId: "getGscData",
        parameters: [
          {
            name: "type",
            in: "query",
            schema: { type: "string", enum: ["query", "page"], default: "query" },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 100, maximum: 1000 },
          },
          {
            name: "dateRange",
            in: "query",
            schema: {
              type: "string",
              enum: ["7d", "28d", "3m", "6m", "12m"],
              default: "28d",
            },
          },
        ],
        responses: {
          "200": {
            description: "GSC data retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { type: "object" } },
                    total: { type: "integer" },
                    dateRange: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Data"],
        summary: "Fetch fresh GSC data",
        description: "Trigger a fresh fetch from Google Search Console API",
        operationId: "fetchGscData",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["siteUrl"],
                properties: {
                  siteUrl: { type: "string", description: "GSC property URL" },
                  dateRange: {
                    type: "string",
                    enum: ["7d", "28d", "3m", "6m", "12m"],
                    default: "28d",
                  },
                  triggerAnalysis: {
                    type: "boolean",
                    default: false,
                    description: "Automatically run AI analysis after fetch",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "GSC data fetched",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    rowsFetched: { type: "integer" },
                    jobId: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/jobs": {
      get: {
        tags: ["Analysis"],
        summary: "List jobs",
        description: "Get background job statuses",
        operationId: "listJobs",
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["pending", "processing", "completed", "failed"],
            },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 50 },
          },
        ],
        responses: {
          "200": {
            description: "List of jobs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    jobs: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Job" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/jobs/{id}": {
      get: {
        tags: ["Analysis"],
        summary: "Get job status",
        operationId: "getJob",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Job status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Job" },
              },
            },
          },
        },
      },
    },
    "/api/v1/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description: "Check system health status",
        operationId: "healthCheck",
        responses: {
          "200": {
            description: "Health status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
                    version: { type: "string" },
                    checks: { type: "object" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/webhooks/subscribe": {
      post: {
        tags: ["Webhooks"],
        summary: "Subscribe to webhook",
        description: "Subscribe to events via webhook",
        operationId: "subscribeWebhook",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["url", "events"],
                properties: {
                  url: {
                    type: "string",
                    format: "uri",
                    description: "Webhook endpoint URL",
                  },
                  events: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: [
                        "report.completed",
                        "analysis.started",
                        "analysis.completed",
                        "gsc.sync.completed",
                        "opportunity.found",
                      ],
                    },
                    description: "Events to subscribe to",
                  },
                  secret: {
                    type: "string",
                    description: "Optional secret for HMAC signature verification",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Webhook created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    url: { type: "string" },
                    events: { type: "array", items: { type: "string" } },
                    status: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Report: {
        type: "object",
        properties: {
          id: { type: "integer" },
          workspaceId: { type: "integer" },
          title: { type: "string" },
          type: { type: "string" },
          summary: { type: "string" },
          healthScore: { type: "integer" },
          actions: { type: "array", items: { type: "object" } },
          opportunities: { type: "array", items: { type: "object" } },
          aiTokensUsed: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Job: {
        type: "object",
        properties: {
          id: { type: "integer" },
          jobId: { type: "string" },
          type: { type: "string" },
          status: { type: "string" },
          progress: { type: "integer" },
          result: { type: "object" },
          error: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        description: "Your SEOMaster API key",
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
};

export function getOpenAPISpec() {
  return OPENAPI_SPEC;
}
