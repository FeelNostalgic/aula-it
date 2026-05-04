import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { APP_VERSION, APP_STATUS } from "@/lib/version";
import { UserNav } from "@/components/dashboard/layout/user-nav";
import { DashboardBreadcrumb } from "@/components/dashboard/layout/dashboard-breadcrumb";
import { DashboardShell } from "@/components/dashboard/layout/dashboard-shell";
import { BreadcrumbProvider } from "@/components/dashboard/layout/breadcrumb-context";
import { SessionTimeoutGuard } from "@/components/auth/session-timeout-guard";
import { QueryParamHandler } from "@/components/dashboard/shared/query-param-handler";
import { PresenceProvider } from "@/components/dashboard/shared/presence-context";
import { Suspense } from "react";


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch role from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", user.id)
    .single();

  if (profile?.must_change_password) {
    redirect("/cambiar-contrasena");
  }

  if (profile?.role === "admin") {
    redirect("/admin");
  }

  const isTeacher = profile?.role === "teacher";
  const isAdmin = false;

  return (
    <BreadcrumbProvider>
      <SessionTimeoutGuard>
        <Suspense fallback={null}>
          <QueryParamHandler />
        </Suspense>
        <PresenceProvider userId={user.id}>
          <div className="h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
            {/* Top Nav Bar */}
            <header className="h-[68px] border-b border-border/50 bg-background flex items-center justify-between gap-4 px-6 shrink-0 z-40 overflow-hidden">
              <div className="min-w-0 flex-1 overflow-hidden">
                <DashboardBreadcrumb />
              </div>

              <div className="flex shrink-0 items-center gap-6">
                {/* User Navigation */}
                <UserNav
                  userEmail={user.email || ""}
                  userName={user.user_metadata?.full_name || "Usuario"}
                  isTeacher={isTeacher}
                  isAdmin={isAdmin}
                  userId={user.id}
                  userAvatar={user.user_metadata?.avatar_url}
                />
              </div>
            </header>

            <DashboardShell
              appVersion={APP_VERSION}
              appStatus={APP_STATUS}
              isTeacher={isTeacher}
            >
              {children}
            </DashboardShell>
          </div>
        </PresenceProvider>
      </SessionTimeoutGuard>
    </BreadcrumbProvider>
  );
}
