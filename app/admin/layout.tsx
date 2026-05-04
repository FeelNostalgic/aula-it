import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BreadcrumbProvider } from "@/components/dashboard/layout/breadcrumb-context";
import { DashboardBreadcrumb } from "@/components/dashboard/layout/dashboard-breadcrumb";
import { UserNav } from "@/components/dashboard/layout/user-nav";
import { SessionTimeoutGuard } from "@/components/auth/session-timeout-guard";
import { AdminSidebar } from "./admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <BreadcrumbProvider>
      <SessionTimeoutGuard>
        <div className="h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
          <header className="h-[68px] border-b border-border/50 bg-background flex items-center justify-between gap-4 px-6 shrink-0 z-40 overflow-hidden">
            <div className="min-w-0 flex-1 overflow-hidden">
              <DashboardBreadcrumb />
            </div>
            <div className="shrink-0">
              <UserNav
              userEmail={user.email || ""}
              userName={user.user_metadata?.full_name || "Admin"}
              isTeacher={false}
              isAdmin={true}
              userId={user.id}
              userAvatar={user.user_metadata?.avatar_url}
              />
            </div>
          </header>
          <div className="flex flex-1 overflow-hidden">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto px-16 py-8">
              {children}
            </main>
          </div>
        </div>
      </SessionTimeoutGuard>
    </BreadcrumbProvider>
  );
}
