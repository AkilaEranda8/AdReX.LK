"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  FileSpreadsheet,
  CreditCard,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Receipt,
  BarChart3,
  Settings,
  RefreshCw,
  History,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useSidebar } from "@/components/layout/sidebar-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { appBranding } from "@/lib/company";

export { AppHeader, TopNav } from "@/components/layout/top-nav";

const navGroups = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Billing",
    items: [
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/invoices", label: "Invoices", icon: FileText },
      { href: "/quotations", label: "Quotations", icon: FileSpreadsheet },
      { href: "/credits", label: "Customer Credit", icon: CreditCard },
      { href: "/recurring", label: "Recurring", icon: RefreshCw },
    ],
  },
  {
    label: "Finance",
    items: [{ href: "/expenses", label: "Expenses", icon: Banknote }],
  },
  {
    label: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/audit", label: "Audit Log", icon: History },
    ],
  },
  {
    label: "System",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface SidebarProps {
  user: { name: string; role: string };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { mobileOpen, setMobileOpen, collapsed, setCollapsed } = useSidebar();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      toast.success("Logged out successfully");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to logout");
    }
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-all duration-300 ease-out lg:translate-x-0",
          "border-slate-200/80 bg-white text-slate-700 shadow-lg shadow-slate-200/40",
          "dark:border-slate-800 dark:bg-[#0f1419] dark:text-slate-200 dark:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-[72px]" : "w-[252px]"
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-slate-200/80 px-4 dark:border-slate-800",
            collapsed && "justify-center px-2"
          )}
        >
          <div className={cn("flex min-w-0 flex-1 items-center gap-3", collapsed && "flex-none")}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
              <Receipt className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold text-slate-900 dark:text-white">{appBranding.name}</h1>
                <p className="truncate text-[11px] text-muted-foreground">{appBranding.tagline}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              className="ml-1 hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800 lg:flex"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="hidden border-b border-slate-200/80 p-2 dark:border-slate-800 lg:block">
            <button
              type="button"
              className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        onClick={(e) => {
                          setMobileOpen(false);
                          if (pendingHref) {
                            e.preventDefault();
                            return;
                          }
                          if (pathname !== item.href && !pathname.startsWith(`${item.href}/`)) {
                            setPendingHref(item.href);
                          }
                        }}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-100",
                          collapsed && "justify-center px-2"
                        )}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.25 : 2} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200/80 p-3 dark:border-slate-800">
          {!collapsed ? (
            <div className="mb-3" suppressHydrationWarning>
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Appearance
              </p>
              <ThemeToggle />
            </div>
          ) : (
            <div className="mb-2 flex justify-center" suppressHydrationWarning>
              <ThemeToggle compact />
            </div>
          )}

          <div
            className={cn(
              "mb-2 flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50",
              collapsed && "justify-center border-0 bg-transparent p-1"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
              {getInitials(user.name)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                <p className="truncate text-xs capitalize text-muted-foreground">{user.role.toLowerCase()}</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              "text-slate-600 hover:bg-red-50 hover:text-red-600",
              "dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}
