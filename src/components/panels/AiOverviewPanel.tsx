"use client";

import { Sparkles, AlertTriangle, Shield, ArrowUpRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeoRisk {
  query: string;
  riskLevel: "high" | "medium" | "low" | "none";
  estimatedImpact: number;
  triggers: string[];
  recommendations: string[];
}

export function AiOverviewPanel() {
  const risks: GeoRisk[] = [
    {
      query: "how to do keyword research",
      riskLevel: "high",
      estimatedImpact: -35,
      triggers: ["how-to query", "informational intent", "list format potential"],
      recommendations: [
        "Add original data and statistics",
        "Include expert quotes and citations",
        "Create downloadable checklist PDF",
        "Add video tutorial embed",
      ],
    },
    {
      query: "best seo tools comparison",
      riskLevel: "high",
      estimatedImpact: -28,
      triggers: ["comparison intent", "commercial investigation", "feature list"],
      recommendations: [
        "Add interactive comparison table",
        "Include real performance benchmarks",
        "Add user testimonial videos",
        "Create free tool alternative",
      ],
    },
    {
      query: "what is schema markup",
      riskLevel: "medium",
      estimatedImpact: -18,
      triggers: ["definition query", "educational intent"],
      recommendations: [
        "Add interactive schema generator",
        "Include code examples with live preview",
        "Add FAQ schema to the page",
      ],
    },
    {
      query: "technical seo audit template",
      riskLevel: "low",
      estimatedImpact: -8,
      triggers: ["template intent", "downloadable asset"],
      recommendations: [
        "Make template interactive (not just PDF)",
        "Add step-by-step wizard",
      ],
    },
  ];

  const stats = {
    highRiskQueries: 2,
    mediumRiskQueries: 1,
    lowRiskQueries: 1,
    totalAtRisk: 4,
    totalTrafficImpact: -91,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            AI Overview & GEO
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Generative Engine Optimization — protect your traffic from AI Overviews
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-400 font-medium">High Risk</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.highRiskQueries}</p>
          <p className="text-xs text-gray-500 mt-1">Queries</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-yellow-400 font-medium">Medium Risk</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.mediumRiskQueries}</p>
          <p className="text-xs text-gray-500 mt-1">Queries</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-400 font-medium">Low Risk</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.lowRiskQueries}</p>
          <p className="text-xs text-gray-500 mt-1">Queries</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-4 h-4 text-red-400 rotate-180" />
            <span className="text-xs text-gray-400 font-medium">Est. Impact</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{stats.totalTrafficImpact}%</p>
          <p className="text-xs text-gray-500 mt-1">Potential traffic loss</p>
        </div>
      </div>

      {/* Risk Details */}
      <div className="space-y-3">
        {risks.map((risk, i) => (
          <div
            key={i}
            className={cn(
              "bg-gray-900/50 border rounded-xl overflow-hidden transition-colors",
              risk.riskLevel === "high"
                ? "border-red-500/20 hover:border-red-500/40"
                : risk.riskLevel === "medium"
                ? "border-yellow-500/20 hover:border-yellow-500/40"
                : "border-blue-500/20 hover:border-blue-500/40"
            )}
          >
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-200">
                      {risk.query}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full uppercase",
                        risk.riskLevel === "high"
                          ? "bg-red-500/20 text-red-400"
                          : risk.riskLevel === "medium"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-blue-500/20 text-blue-400"
                      )}
                    >
                      {risk.riskLevel} risk
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {risk.triggers.map((trigger, j) => (
                      <span
                        key={j}
                        className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full"
                      >
                        {trigger}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-red-400">
                    {risk.estimatedImpact > 0 ? "+" : ""}
                    {risk.estimatedImpact}%
                  </p>
                  <p className="text-[10px] text-gray-500">est. impact</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-400" />
                  GEO Recommendations
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {risk.recommendations.map((rec, j) => (
                    <div
                      key={j}
                      className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2"
                    >
                      <span className="text-[10px] text-blue-400 font-mono">
                        {j + 1}
                      </span>
                      <span className="text-xs text-gray-300">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
