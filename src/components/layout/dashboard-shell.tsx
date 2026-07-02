"use client";

import { AppHeader } from "@/components/layout/top-nav";
import { useSidebar } from "@/components/layout/sidebar-context";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  user: { name: string; role: string };
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const { collapsed } = useSidebar();

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col transition-all duration-300 ease-out",
        collapsed ? "lg:pl-[72px]" : "lg:pl-[252px]"
      )}
    >
      <AppHeader user={user} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
