"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  RefreshCw,
  Download,
  Plus,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function TopBar() {
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/gsc/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: 1,
          siteUrl: "https://example.com",
          triggerAnalysis: true,
        }),
      });
    } catch (e) {
      // demo
    }
    setTimeout(() => setSyncing(false), 2000);
  };

  const handleConnectGSC = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/gsc/oauth");
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setConnecting(false);
    }
  };

  return (
    <header className="h-14 bg-gray-950/90 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-3 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search queries, pages, reports..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleConnectGSC}
          disabled={connecting}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30"
          )}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          Connect GSC
        </button>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
          {syncing ? "Syncing..." : "Sync"}
        </button>

        <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
