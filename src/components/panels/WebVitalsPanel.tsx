"use client";

import { Gauge, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export function WebVitalsPanel() {
  const vitals = [
    { name: "LCP", value: 2.4, threshold: 2.5, unit: "s", status: "good" as const, score: 92 },
    { name: "INP", value: 178, threshold: 200, unit: "ms", status: "needs-improvement" as const, score: 78 },
    { name: "CLS", value: 0.08, threshold: 0.1, unit: "", status: "good" as const, score: 95 },
    { name: "TTFB", value: 450, threshold: 800, unit: "ms", status: "good" as const, score: 88 },
    { name: "FCP", value: 1.2, threshold: 1.8, unit: "s", status: "good" as const, score: 90 },
    { name: "TBT", value: 120, threshold: 200, unit: "ms", status: "good" as const, score: 85 },
  ];

  const radarData = vitals.map((v) => ({ metric: v.name, score: v.score }));

  const issues = [
    {
      page: "/blog/keyword-research-guide",
      metric: "INP",
      value: 320,
      recommendation: "Optimize JavaScript bundle, defer non-critical scripts",
      impact: "high",
    },
    {
      page: "/tools/schema-generator",
      metric: "LCP",
      value: 3.8,
      recommendation: "Use next-gen image format, implement responsive images",
      impact: "medium",
    },
    {
      page: "/case-studies",
      metric: "CLS",
      value: 0.25,
      recommendation: "Set explicit width/height on images, reserve space for dynamic content",
      impact: "medium",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Gauge className="w-5 h-5 text-cyan-400" />
          Core Web Vitals
        </h2>
        <p className="text-sm text-gray-400 mt-1">Performance metrics and optimization</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Performance Score</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={12} />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#06b6d4"
                fill="#06b6d4"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Vitals Cards */}
        <div className="grid grid-cols-2 gap-3">
          {vitals.map((vital, i) => {
            const StatusIcon =
              vital.status === "good"
                ? CheckCircle2
                : vital.status === "needs-improvement"
                ? AlertCircle
                : XCircle;

            return (
              <div
                key={i}
                className={cn(
                  "bg-gray-900/50 border rounded-xl p-4",
                  vital.status === "good"
                    ? "border-emerald-500/20"
                    : vital.status === "needs-improvement"
                    ? "border-yellow-500/20"
                    : "border-red-500/20"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">{vital.name}</span>
                  <StatusIcon
                    className={cn(
                      "w-4 h-4",
                      vital.status === "good"
                        ? "text-emerald-400"
                        : vital.status === "needs-improvement"
                        ? "text-yellow-400"
                        : "text-red-400"
                    )}
                  />
                </div>
                <p className="text-xl font-bold text-white">
                  {vital.value}
                  <span className="text-xs text-gray-500 ml-0.5">{vital.unit}</span>
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  Threshold: {vital.threshold}
                  {vital.unit}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Issues Table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-200">Issues Requiring Attention</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                <th className="px-5 py-3 font-medium">Page</th>
                <th className="px-5 py-3 font-medium">Metric</th>
                <th className="px-5 py-3 font-medium text-right">Value</th>
                <th className="px-5 py-3 font-medium">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-5 py-3 text-gray-300 text-xs max-w-[200px] truncate">
                    {issue.page}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        issue.impact === "high"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      )}
                    >
                      {issue.metric}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-red-400 font-medium text-xs">
                    {issue.value}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs max-w-[300px]">
                    {issue.recommendation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
