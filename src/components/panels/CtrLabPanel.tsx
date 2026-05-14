"use client";

import { useState } from "react";
import { Target, TrendingUp, Lightbulb, ArrowRight } from "lucide-react";
import { cn, formatPercent } from "@/lib/utils";

interface CtrGap {
  query: string;
  currentCtr: number;
  benchmarkCtr: number;
  gap: number;
  opportunityScore: number;
  impressions: number;
  position: number;
  recommendation: string;
}

export function CtrLabPanel() {
  const [gaps] = useState<CtrGap[]>([
    {
      query: "seo optimization tools free",
      currentCtr: 0.018,
      benchmarkCtr: 0.035,
      gap: 0.017,
      opportunityScore: 245,
      impressions: 14400,
      position: 4.2,
      recommendation: "Add compelling meta description with action words",
    },
    {
      query: "how to improve google ranking",
      currentCtr: 0.025,
      benchmarkCtr: 0.042,
      gap: 0.017,
      opportunityScore: 510,
      impressions: 30000,
      position: 3.8,
      recommendation: "Include year and 'step-by-step' in title tag",
    },
    {
      query: "best free seo audit tool",
      currentCtr: 0.032,
      benchmarkCtr: 0.055,
      gap: 0.023,
      opportunityScore: 460,
      impressions: 20000,
      position: 3.1,
      recommendation: "Add rich snippet schema for software app",
    },
    {
      query: "technical seo checklist 2025",
      currentCtr: 0.045,
      benchmarkCtr: 0.068,
      gap: 0.023,
      opportunityScore: 138,
      impressions: 6000,
      position: 2.5,
      recommendation: "Add table of contents for featured snippet",
    },
    {
      query: "local seo tips small business",
      currentCtr: 0.022,
      benchmarkCtr: 0.038,
      gap: 0.016,
      opportunityScore: 192,
      impressions: 12000,
      position: 4.5,
      recommendation: "Include location and case study in title",
    },
  ]);

  const benchmarks = [
    { range: "Position 1-3", informational: "28%", commercial: "22%", transactional: "18%" },
    { range: "Position 4-7", informational: "14%", commercial: "11%", transactional: "9%" },
    { range: "Position 8-10", informational: "6%", commercial: "5%", transactional: "4%" },
    { range: "Position 10+", informational: "2%", commercial: "2%", transactional: "1.5%" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            CTR Lab
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Identify underperforming queries and close the CTR gap
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Lightbulb className="w-4 h-4" />
            AI Fix Suggestions
          </button>
        </div>
      </div>

      {/* CTR Gaps */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200">
            CTR Gaps — Underperforming Queries
          </h3>
          <span className="text-xs text-gray-500">{gaps.length} opportunities found</span>
        </div>
        <div className="divide-y divide-gray-800/50">
          {gaps.map((gap, i) => {
            const gapPercent = (gap.gap * 100).toFixed(1);
            const severity = gap.opportunityScore > 400 ? "high" : gap.opportunityScore > 150 ? "medium" : "low";

            return (
              <div key={i} className="px-5 py-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200 truncate">
                        {gap.query}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                          severity === "high"
                            ? "bg-red-500/20 text-red-400"
                            : severity === "medium"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-blue-500/20 text-blue-400"
                        )}
                      >
                        {severity}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-500">
                        Pos: <span className="text-gray-300">{gap.position.toFixed(1)}</span>
                      </span>
                      <span className="text-xs text-gray-500">
                        Impressions: <span className="text-gray-300">{gap.impressions.toLocaleString()}</span>
                      </span>
                      <span className="text-xs text-gray-500">
                        Score: <span className="text-amber-400">{gap.opportunityScore}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {formatPercent(gap.currentCtr)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gray-600" />
                      <span className="text-xs text-emerald-400 font-medium">
                        {formatPercent(gap.benchmarkCtr)}
                      </span>
                    </div>
                    <p className="text-xs text-red-400 mt-1">
                      Gap: +{gapPercent}%
                    </p>
                  </div>
                </div>
                <p className="text-xs text-blue-400 mt-2 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  {gap.recommendation}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Benchmark Table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-200">CTR Benchmarks by Intent</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                <th className="px-5 py-3 font-medium">Position Range</th>
                <th className="px-5 py-3 font-medium text-right">Informational</th>
                <th className="px-5 py-3 font-medium text-right">Commercial</th>
                <th className="px-5 py-3 font-medium text-right">Transactional</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="px-5 py-3 text-gray-300">{b.range}</td>
                  <td className="px-5 py-3 text-right text-blue-400">{b.informational}</td>
                  <td className="px-5 py-3 text-right text-purple-400">{b.commercial}</td>
                  <td className="px-5 py-3 text-right text-amber-400">{b.transactional}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
