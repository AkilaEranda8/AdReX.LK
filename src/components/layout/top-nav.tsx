"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Menu, X, LogOut, Settings, AlertCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-context";
import { GlobalSearch } from "@/components/layout/global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { appBranding } from "@/lib/company";

interface AppHeaderProps {
  user: { name: string; role: string };
  title?: string;
}

interface OverdueItem {
  id: string;
  invoiceNumber: string;
  remainingBalance: number;
  dueDate: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/clients") return "Clients";
  if (pathname === "/clients/new") return "Create Client";
  if (pathname.match(/^\/clients\/[^/]+\/edit$/)) return "Edit Client";
  if (pathname.match(/^\/clients\/[^/]+$/)) return "View Client";
  if (pathname === "/invoices") return "Invoices";
  if (pathname === "/invoices/new") return "Create Invoice";
  if (pathname.match(/^\/invoices\/[^/]+\/edit$/)) return "Edit Invoice";
  if (pathname.match(/^\/invoices\/[^/]+$/)) return "View Invoice";
  if (pathname === "/quotations") return "Quotations";
  if (pathname === "/quotations/new") return "Create Quotation";
  if (pathname.match(/^\/quotations\/[^/]+\/edit$/)) return "Edit Quotation";
  if (pathname.match(/^\/quotations\/[^/]+$/)) return "View Quotation";
  if (pathname === "/credits") return "Customer Credit";
  if (pathname === "/reports") return "Reports";
  if (pathname === "/settings") return "Settings";
  if (pathname === "/recurring") return "Recurring Invoices";
  if (pathname === "/recurring/new") return "Create Recurring Invoice";
  if (pathname === "/audit") return "Audit Log";
  return "Dashboard";
}

export function AppHeader({ user, title }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { mobileOpen, setMobileOpen } = useSidebar();
  const pageTitle = title || getPageTitle(pathname);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [overdue, setOverdue] = useState<OverdueItem[]>([]);

  useEffect(() => {
    api.get("/dashboard").then((res) => {
      setOverdue(res.data.overdueInvoices || []);
    }).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    setNotifOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!notifOpen && !profileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [notifOpen, profileOpen]);

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
    <header className="sticky top-0 z-30 w-full border-b border-border bg-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75">
      <div className="flex h-[72px] w-full items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 shrink-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-all hover:bg-accent hover:text-foreground lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="min-w-0 max-w-[72px] sm:max-w-none">
            <p className="hidden text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:block">
              {appBranding.name}
            </p>
            <h1 className="truncate text-sm font-bold text-foreground sm:text-lg lg:text-xl">{pageTitle}</h1>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 px-2 sm:px-4 lg:px-8">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle compact className="hidden sm:flex" />

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-all hover:bg-accent hover:text-foreground sm:h-11 sm:w-11"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {overdue.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {overdue.length}
                </span>
              )}
            </button>
            {notifOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  aria-hidden
                  onClick={() => setNotifOpen(false)}
                />
                <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-border bg-card shadow-xl">
                  <div className="border-b border-border px-4 py-3">
                    <p className="font-semibold text-foreground">Notifications</p>
                    <p className="text-xs text-muted-foreground">Overdue invoices</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2">
                    {overdue.length === 0 ? (
                      <p className="px-2 py-6 text-center text-sm text-muted-foreground">No overdue invoices</p>
                    ) : (
                      overdue.map((inv) => (
                        <Link
                          key={inv.id}
                          href={`/invoices/${inv.id}`}
                          prefetch={false}
                          onClick={() => setNotifOpen(false)}
                          className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-accent"
                        >
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{inv.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              Due {formatDate(inv.dueDate)} · {formatCurrency(inv.remainingBalance)}
                            </p>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                  {overdue.length > 0 && (
                    <div className="border-t p-2">
                      <Link
                        href="/reports"
                        prefetch={false}
                        onClick={() => setNotifOpen(false)}
                        className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                      >
                        View all reports
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="hidden h-8 w-px bg-border sm:block" />

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotifOpen(false);
              }}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl border border-border bg-card py-1.5 pl-1.5 pr-2 shadow-sm transition-all hover:bg-accent sm:gap-3 sm:py-2 sm:pl-2 sm:pr-3"
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-md shadow-blue-500/25">
                {getInitials(user.name)}
              </div>
              <div className="hidden min-w-0 text-left lg:block">
                <p className="truncate text-sm font-semibold leading-tight text-foreground">{user.name}</p>
                <p className="truncate text-xs capitalize text-muted-foreground">{user.role.toLowerCase()}</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground lg:block" />
            </button>
            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  aria-hidden
                  onClick={() => setProfileOpen(false)}
                />
                <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-border bg-card py-1 shadow-xl">
                  <div className="border-b border-border px-4 py-3 lg:hidden">
                    <p className="font-semibold text-foreground">{user.name}</p>
                    <p className="text-xs capitalize text-muted-foreground">{user.role.toLowerCase()}</p>
                  </div>
                  <Link
                    href="/settings"
                    prefetch={false}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-accent"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function TopNav({ title, user }: { title: string; user?: { name: string; role: string } }) {
  if (!user) return null;
  return <AppHeader user={user} title={title} />;
}
