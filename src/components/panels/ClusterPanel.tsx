"use client";

import { GitBranch, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Cluster {
  topic: string;
  keywords: string[];
  totalClicks: number;
  totalImpressions: number;
  coverage: number;
  priority: "high" | "medium" | "low";
}

export function ClusterPanel() {
  const clusters: Cluster[] = [
    {
      topic: "keyword research",
      keywords: [
        "keyword research tools",
        "how to do keyword research",
        "free keyword research",
        "keyword research for seo",
        "long tail keyword research",
        "keyword research checklist",
      ],
      totalClicks: 14500,
      totalImpressions: 180000,
      coverage: 0.65,
      priority: "high",
    },
    {
      topic: "technical seo",
      keywords: [
        "technical seo audit",
        "technical seo checklist",
        "technical seo guide",
        "crawl budget optimization",
        "xml sitemap best practices",
        "robots.txt guide",
      ],
      totalClicks: 12800,
      totalImpressions: 156000,
      coverage: 0.72,
      priority: "high",
    },
    {
      topic: "on-page seo",
      keywords: [
        "on page seo factors",
        "title tag optimization",
        "meta description best practices",
        "header tags seo",
        "internal linking strategy",
      ],
      totalClicks: 10200,
      totalImpressions: 134000,
      coverage: 0.58,
      priority: "medium",
    },
    {
      topic: "link building",
      keywords: [
        "link building strategies",
        "backlink analysis",
        "guest posting for seo",
        "broken link building",
        "earn backlinks",
      ],
      totalClicks: 8900,
      totalImpressions: 112000,
      coverage: 0.45,
      priority: "high",
    },
    {
      topic: "local seo",
      keywords: [
        "local seo checklist",
        "google business profile optimization",
        "local citations",
        "local seo ranking factors",
      ],
      totalClicks: 5200,
      totalImpressions: 78000,
      coverage: 0.52,
      priority: "medium",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-purple-400" />
          Topic Clusters
        </h2>
        <p className="text-sm text-gray-400 mt-1">Keyword clusters and coverage gaps</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clusters.map((cluster, i) => {
          const uncoveredCount = Math.floor(cluster.keywords.length * (1 - cluster.coverage));

          return (
            <div
              key={i}
              className={cn(
                "bg-gray-900/50 border rounded-xl overflow-hidden",
                cluster.priority === "high"
                  ? "border-red-500/20"
                  : cluster.priority === "medium"
                  ? "border-yellow-500/20"
                  : "border-gray-800"
              )}
            >
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-200 capitalize">
                      {cluster.topic}
                    </h3>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                        cluster.priority === "high"
                          ? "bg-red-500/20 text-red-400"
                          : cluster.priority === "medium"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-blue-500/20 text-blue-400"
                      )}
                    >
                      {cluster.priority}
                    </span>
                  </div>
                </div>

                {/* Coverage Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Coverage</span>
                    <span className={cn(
                      cluster.coverage > 0.7 ? "text-emerald-400" : cluster.coverage > 0.5 ? "text-yellow-400" : "text-red-400"
                    )}>
                      {Math.round(cluster.coverage * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        cluster.coverage > 0.7
                          ? "bg-emerald-500"
                          : cluster.coverage > 0.5
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      )}
                      style={{ width: `${cluster.coverage * 100}%` }}
                    />
                  </div>
                </div>

                {/* Keywords */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {cluster.keywords.map((kw, j) => (
                    <span
                      key={j}
                      className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full"
                    >
                      {kw}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>
                    Clicks: <span className="text-gray-300">{cluster.totalClicks.toLocaleString()}</span>
                  </span>
                  <span>
                    Impressions: <span className="text-gray-300">{cluster.totalImpressions.toLocaleString()}</span>
                  </span>
                  {uncoveredCount > 0 && (
                    <span className="text-red-400">
                      {uncoveredCount} gaps
                    </span>
                  )}
                </div>

                {uncoveredCount > 0 && (
                  <button className="mt-3 flex items-center gap-1.5 text-xs bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-3 py-1.5 rounded-lg transition-colors">
                    <Plus className="w-3 h-3" />
                    Create {uncoveredCount} missing pages
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
