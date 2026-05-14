"use client";

import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function TrendPanel() {
  const trends = [
    { query: "ai seo tools", direction: "rising" as const, change: 145, clicks: 3200, prevClicks: 1300 },
    { query: "google algorithm update 2025", direction: "rising" as const, change: 89, clicks: 1800, prevClicks: 950 },
    { query: "core web vitals guide", direction: "rising" as const, change: 67, clicks: 1200, prevClicks: 720 },
    { query: "schema markup generator", direction: "stable" as const, change: 5, clicks: 800, prevClicks: 760 },
    { query: "keyword density tool", direction: "falling" as const, change: -34, clicks: 450, prevClicks: 680 },
    { query: "meta tags importance", direction: "falling" as const, change: -28, clicks: 380, prevClicks: 530 },
    { query: "seo ranking factors 2024", direction: "falling" as const, change: -52, clicks: 290, prevClicks: 600 },
  ];

  const chartData = [
    { month: "Jan", impressions: 320000, clicks: 12000 },
    { month: "Feb", impressions: 340000, clicks: 13500 },
    { month: "Mar", impressions: 310000, clicks: 11800 },
    { month: "Apr", impressions: 380000, clicks: 15200 },
    { month: "May", impressions: 420000, clicks: 18200 },
    { month: "Jun", impressions: 450000, clicks: 21000 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Trend Intelligence
        </h2>
        <p className="text-sm text-gray-400 mt-1">Rising and falling search trends</p>
      </div>

      {/* Trend Chart */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">6-Month Trend</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" stroke="#475569" fontSize={12} />
            <YAxis stroke="#475569" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={2} dot={false} name="Impressions" />
            <Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} dot={false} name="Clicks" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-200">Query Trends</h3>
        </div>
        <div className="divide-y divide-gray-800/50">
          {trends.map((t, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-800/30 transition-colors">
              <div className="w-6 flex justify-center">
                {t.direction === "rising" && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                {t.direction === "falling" && <TrendingDown className="w-4 h-4 text-red-400" />}
                {t.direction === "stable" && <Minus className="w-4 h-4 text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-200 truncate">{t.query}</span>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span
                  className={cn(
                    "text-xs font-medium",
                    t.direction === "rising"
                      ? "text-emerald-400"
                      : t.direction === "falling"
                      ? "text-red-400"
                      : "text-gray-400"
                  )}
                >
                  {t.change > 0 ? "+" : ""}
                  {t.change}%
                </span>
                <div className="text-right">
                  <span className="text-xs text-gray-300">{t.clicks.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-500 ml-1">
                    ({t.prevClicks.toLocaleString()} prev.)
                  </span>
                </div>
                {t.direction === "rising" && (
                  <button className="text-xs bg-emerald-600/20 text-emerald-400 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-emerald-600/30 transition-colors">
                    <ArrowUpRight className="w-3 h-3" />
                    Create Content
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
