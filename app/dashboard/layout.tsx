import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { APP_VERSION, APP_STATUS } from "@/lib/version";
import { UserNav } from "@/components/dashboard/user-nav";
import { ActivitySidebar } from "@/components/dashboard/activity-sidebar";

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
    .select("role")
    .eq("id", user.id)
    .single();

  const isTeacher = profile?.role === "teacher";

  return (
    <div className="h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
      {/* Top Nav Bar */}
      <header className="h-[68px] border-b border-border/50 bg-background flex items-center justify-between px-6 shrink-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 group cursor-pointer transition-opacity hover:opacity-80">
            <div className="size-8 bg-primary rounded-md flex items-center justify-center">
              <span className="font-bold text-white text-xs tracking-tighter">AIT</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs font-medium">
              <span className="text-muted-foreground group-hover:text-primary transition-colors">root /</span>
              <span className="text-foreground font-bold">Inicio</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {!isTeacher && (
            <div className="flex items-center gap-4 uppercase font-mono tracking-widest text-[10px]">
              <Badge variant="outline" className="bg-orange-500/10 border-orange-500/20 text-orange-500 px-4 py-1.5 rounded-lg flex items-center gap-2 hover:bg-orange-500/20 transition-colors cursor-default">
                <Flame className="size-3 fill-orange-500" />
                <span className="font-bold">14 DÍAS ACTIVO</span>
              </Badge>

              <div className="flex items-center gap-1 bg-card border border-border/50 rounded-lg p-1 pr-3 hover:border-primary/50 transition-all cursor-default group">
                <div className="size-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold transition-all">
                  14
                </div>
                <span className="text-[9px] font-bold text-muted-foreground transition-colors">NVL</span>
              </div>
            </div>
          )}

          {/* New User Navigation */}
          <UserNav
            userEmail={user.email || ""}
            userName={user.user_metadata?.full_name || "Usuario"}
            isTeacher={isTeacher}
            userId={user.id}
          />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Activity Sidebar (Left) */}
        <ActivitySidebar
          appVersion={APP_VERSION}
          appStatus={APP_STATUS}
        />

        {/* Main Content Area - Added pl-24 gutter for sidebar toggle safe zone */}
        <main className="flex-1 bg-background overflow-y-auto pl-24 pr-24 py-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
}



