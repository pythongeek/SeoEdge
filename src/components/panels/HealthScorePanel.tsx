"use client";

import { HeartPulse, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export function HealthScorePanel() {
  const overallScore = 76;
  const scoreColor = overallScore >= 80 ? "emerald" : overallScore >= 60 ? "yellow" : "red";

  const categories = [
    { name: "CTR", score: 72, weight: 25 },
    { name: "Health", score: 85, weight: 20 },
    { name: "Trends", score: 68, weight: 20 },
    { name: "GEO", score: 82, weight: 20 },
    { name: "Vitals", score: 75, weight: 15 },
  ];

  const history = [
    { date: "Week 1", score: 68 },
    { date: "Week 2", score: 70 },
    { date: "Week 3", score: 69 },
    { date: "Week 4", score: 72 },
    { date: "Week 5", score: 74 },
    { date: "Week 6", score: 76 },
  ];

  const insights = [
    {
      type: "positive",
      message: "Technical SEO score improved 8% this month",
      detail: "Core web vitals optimization is paying off",
    },
    {
      type: "warning",
      message: "CTR declining for top 10 queries",
      detail: "Avg. CTR dropped from 4.2% to 3.8% — check title tags",
    },
    {
      type: "positive",
      message: "3 new pages ranking in top 10",
      detail: "Content plan execution is working",
    },
    {
      type: "warning",
      message: "AI Overview risk detected for 2 queries",
      detail: "Consider GEO optimization for 'how-to' content",
    },
  ];

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-rose-400" />
          Health Score
        </h2>
        <p className="text-sm text-gray-400 mt-1">Overall SEO health tracking</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Overall Score */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 flex flex-col items-center justify-center">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" stroke="#1e293b" strokeWidth="8" fill="none" />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke={scoreColor === "emerald" ? "#10b981" : scoreColor === "yellow" ? "#f59e0b" : "#ef4444"}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(overallScore / 100) * 264} 264`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{overallScore}</span>
              <span className="text-[10px] text-gray-500 uppercase">Health</span>
            </div>
          </div>
          <p className="text-sm text-gray-300 mt-3 font-medium">
            {overallScore >= 80 ? "Excellent" : overallScore >= 60 ? "Good" : "Needs Work"}
          </p>
        </div>

        {/* Category Breakdown */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Category Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#475569" fontSize={12} domain={[0, 100]} />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={60} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                {categories.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Score History */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">6-Week Trend</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#475569" fontSize={11} />
            <YAxis stroke="#475569" fontSize={11} domain={[50, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AI Insights */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-3">AI-Generated Insights</h3>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3">
              {insight.type === "positive" ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="text-sm text-gray-200">{insight.message}</p>
                <p className="text-xs text-gray-500 mt-0.5">{insight.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
