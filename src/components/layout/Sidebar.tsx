"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Settings,
  CreditCard,
  Users,
  Key,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useUser, UserButton } from "@clerk/nextjs";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useUser();

  const mainNav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/reports", label: "Reports", icon: FileText },
    { href: "/dashboard/jobs", label: "Jobs", icon: Zap },
  ];

  const settingsNav = [
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
    { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
    { href: "/dashboard/team", label: "Team", icon: Users },
    { href: "/dashboard/api-keys", label: "API Keys", icon: Key },
  ];

  return (
    <aside
      className={cn(
        "bg-gray-950 border-r border-gray-800 flex flex-col transition-all duration-200 relative",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="p-4 flex items-center gap-3 border-b border-gray-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg text-white tracking-tight">
            SEO<span className="text-blue-500">Master</span>
          </span>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <div className={cn("mb-2 px-3", collapsed && "px-1")}>
          {!collapsed && (
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Main
            </span>
          )}
        </div>
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600/15 text-blue-400 border border-blue-600/20"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-900",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}

        <div className={cn("mt-6 mb-2 px-3", collapsed && "px-1")}>
          {!collapsed && (
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Workspace
            </span>
          )}
        </div>
        {settingsNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600/15 text-blue-400 border border-blue-600/20"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-900",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-7 h-7 rounded-lg",
              },
            }}
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">
                {user?.fullName || user?.primaryEmailAddress?.emailAddress}
              </p>
              <p className="text-[10px] text-gray-500">Pro Plan</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-6 h-6 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
