import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = { name: session.name, role: session.role };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar user={user} />
        <DashboardShell user={user}>{children}</DashboardShell>
      </div>
    </SidebarProvider>
  );
}
