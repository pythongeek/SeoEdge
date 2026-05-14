"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewPanel } from "@/components/panels/OverviewPanel";
import { CtrLabPanel } from "@/components/panels/CtrLabPanel";
import { AiOverviewPanel } from "@/components/panels/AiOverviewPanel";
import { TrendPanel } from "@/components/panels/TrendPanel";
import { ClusterPanel } from "@/components/panels/ClusterPanel";
import { WebVitalsPanel } from "@/components/panels/WebVitalsPanel";
import { HealthScorePanel } from "@/components/panels/HealthScorePanel";
import { ActivityLogPanel } from "@/components/panels/ActivityLogPanel";
import {
  LayoutDashboard,
  BarChart3,
  Sparkles,
  TrendingUp,
  GitBranch,
  Gauge,
  HeartPulse,
  Activity,
} from "lucide-react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "ctr", label: "CTR Lab", icon: BarChart3 },
    { id: "ai", label: "AI Overview", icon: Sparkles },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "clusters", label: "Clusters", icon: GitBranch },
    { id: "vitals", label: "Core Web Vitals", icon: Gauge },
    { id: "health", label: "Health Score", icon: HeartPulse },
    { id: "activity", label: "Activity", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">SEO Command Center</h1>
          <p className="text-sm text-gray-400 mt-1">
            AI-powered insights for your search performance
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-900/80 border border-gray-800 p-1 flex flex-wrap gap-1 h-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-3 py-2 text-xs font-medium flex items-center gap-1.5"
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview" className="animate-fade-in">
          <OverviewPanel />
        </TabsContent>

        <TabsContent value="ctr" className="animate-fade-in">
          <CtrLabPanel />
        </TabsContent>

        <TabsContent value="ai" className="animate-fade-in">
          <AiOverviewPanel />
        </TabsContent>

        <TabsContent value="trends" className="animate-fade-in">
          <TrendPanel />
        </TabsContent>

        <TabsContent value="clusters" className="animate-fade-in">
          <ClusterPanel />
        </TabsContent>

        <TabsContent value="vitals" className="animate-fade-in">
          <WebVitalsPanel />
        </TabsContent>

        <TabsContent value="health" className="animate-fade-in">
          <HealthScorePanel />
        </TabsContent>

        <TabsContent value="activity" className="animate-fade-in">
          <ActivityLogPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
