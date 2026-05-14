"use client";

import { Activity, User, Bot, Zap, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function ActivityLogPanel() {
  const activities = [
    { action: "AI analysis completed", entity: "full_audit", user: "AI Engine", time: "2 min ago", icon: Bot, type: "ai" },
    { action: "GSC data synced", entity: "25,432 rows", user: "System", time: "15 min ago", icon: Zap, type: "system" },
    { action: "Report generated", entity: "Monthly SEO Report", user: "John Doe", time: "1 hour ago", icon: FileText, type: "user" },
    { action: "New opportunity found", entity: "CTR optimization", user: "AI Engine", time: "1 hour ago", icon: Bot, type: "ai" },
    { action: "Team member added", entity: "jane@example.com", user: "Admin", time: "3 hours ago", icon: User, type: "user" },
    { action: "Scheduled report sent", entity: "Weekly Digest", user: "System", time: "1 day ago", icon: Zap, type: "system" },
    { action: "Health score updated", entity: "Score: 76/100", user: "AI Engine", time: "1 day ago", icon: Bot, type: "ai" },
    { action: "API key created", entity: "Production Key", user: "Admin", time: "2 days ago", icon: User, type: "user" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Activity Log
        </h2>
        <p className="text-sm text-gray-400 mt-1">Audit trail of all workspace activities</p>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="divide-y divide-gray-800/50">
          {activities.map((activity, i) => {
            const Icon = activity.icon;
            return (
              <div key={i} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-800/30 transition-colors">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    activity.type === "ai" && "bg-purple-500/20",
                    activity.type === "user" && "bg-blue-500/20",
                    activity.type === "system" && "bg-gray-500/20"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4",
                      activity.type === "ai" && "text-purple-400",
                      activity.type === "user" && "text-blue-400",
                      activity.type === "system" && "text-gray-400"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.entity}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">{activity.user}</p>
                  <p className="text-[10px] text-gray-600">{activity.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
