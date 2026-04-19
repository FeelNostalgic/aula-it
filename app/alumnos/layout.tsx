import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { APP_VERSION, APP_STATUS } from "@/lib/version";
import { BreadcrumbProvider } from "@/components/dashboard/layout/breadcrumb-context";
import { DashboardBreadcrumb } from "@/components/dashboard/layout/dashboard-breadcrumb";
import { UserNav } from "@/components/dashboard/layout/user-nav";
import { DashboardShell } from "@/components/dashboard/layout/dashboard-shell";
import { SessionTimeoutGuard } from "@/components/auth/session-timeout-guard";

export default async function AlumnosLayout({
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

  if (profile?.role !== "teacher") redirect("/dashboard");

  return (
    <BreadcrumbProvider>
      <SessionTimeoutGuard>
        <div className="h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
          <header className="h-[68px] border-b border-border/50 bg-background flex items-center justify-between px-6 shrink-0 z-40">
            <DashboardBreadcrumb />
            <div className="flex items-center gap-6">
              <UserNav
                userEmail={user.email || ""}
                userName={user.user_metadata?.full_name || "Usuario"}
                isTeacher={true}
                userId={user.id}
                userAvatar={user.user_metadata?.avatar_url}
              />
            </div>
          </header>
          
          <DashboardShell
            appVersion={APP_VERSION}
            appStatus={APP_STATUS}
            isTeacher={true}
          >
            {children}
          </DashboardShell>
        </div>
      </SessionTimeoutGuard>
    </BreadcrumbProvider>
  );
}
