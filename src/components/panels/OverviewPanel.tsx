"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointerClick,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn, formatNumber } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  accent: string;
}

function MetricCard({ title, value, change, icon: Icon, accent }: MetricCardProps) {
  const positive = change >= 0;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", accent)}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
            positive
              ? "text-emerald-400 bg-emerald-400/10"
              : "text-red-400 bg-red-400/10"
          )}
        >
          {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(change)}%
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{title}</p>
    </div>
  );
}

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

export function OverviewPanel() {
  const [metrics, setMetrics] = useState({
    impressions: "1.2M",
    clicks: "45.2K",
    ctr: "3.78%",
    position: "4.2",
    impressionChange: 12.5,
    clickChange: 8.3,
    ctrChange: -2.1,
    positionChange: 0.4,
  });

  const chartData = [
    { date: "Mon", impressions: 42000, clicks: 1500 },
    { date: "Tue", impressions: 45000, clicks: 1680 },
    { date: "Wed", impressions: 48000, clicks: 1850 },
    { date: "Thu", impressions: 44000, clicks: 1620 },
    { date: "Fri", impressions: 52000, clicks: 2100 },
    { date: "Sat", impressions: 38000, clicks: 1250 },
    { date: "Sun", impressions: 35000, clicks: 1100 },
  ];

  const deviceData = [
    { name: "Desktop", value: 55 },
    { name: "Mobile", value: 35 },
    { name: "Tablet", value: 10 },
  ];

  const topQueries = [
    { query: "best seo tools 2025", clicks: 1200, impressions: 15000, position: 3.2 },
    { query: "seo audit checklist", clicks: 980, impressions: 12000, position: 2.8 },
    { query: "google search console tutorial", clicks: 750, impressions: 9800, position: 4.1 },
    { query: "technical seo guide", clicks: 620, impressions: 8200, position: 3.5 },
    { query: "keyword research tools", clicks: 540, impressions: 7100, position: 5.2 },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Impressions"
          value={metrics.impressions}
          change={metrics.impressionChange}
          icon={Eye}
          accent="bg-blue-500/20 text-blue-400"
        />
        <MetricCard
          title="Clicks"
          value={metrics.clicks}
          change={metrics.clickChange}
          icon={MousePointerClick}
          accent="bg-emerald-500/20 text-emerald-400"
        />
        <MetricCard
          title="Avg. CTR"
          value={metrics.ctr}
          change={metrics.ctrChange}
          icon={Target}
          accent="bg-purple-500/20 text-purple-400"
        />
        <MetricCard
          title="Avg. Position"
          value={metrics.position}
          change={metrics.positionChange}
          icon={BarChart3}
          accent="bg-amber-500/20 text-amber-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">
            Performance Trend (7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="imp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#475569" fontSize={12} />
              <YAxis stroke="#475569" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="impressions"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#imp)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">
            Device Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={deviceData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
              >
                {deviceData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {deviceData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: COLORS[i] }}
                />
                <span className="text-xs text-gray-400">
                  {d.name} {d.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Queries Table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-200">Top Performing Queries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                <th className="px-5 py-3 font-medium">Query</th>
                <th className="px-5 py-3 font-medium text-right">Clicks</th>
                <th className="px-5 py-3 font-medium text-right">Impressions</th>
                <th className="px-5 py-3 font-medium text-right">CTR</th>
                <th className="px-5 py-3 font-medium text-right">Position</th>
              </tr>
            </thead>
            <tbody>
              {topQueries.map((q, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-5 py-3 text-gray-200">{q.query}</td>
                  <td className="px-5 py-3 text-right text-gray-300">
                    {formatNumber(q.clicks)}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-300">
                    {formatNumber(q.impressions)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-emerald-400">
                      {((q.clicks / q.impressions) * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-300">
                    {q.position.toFixed(1)}
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
