import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Home,
  BookOpen,
  BarChart2,
  HelpCircle,
  Settings,
  LogOut,
  Flame,
  Search,
  MoreHorizontal,
  GraduationCap
} from "lucide-react";

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

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans overflow-hidden">
      {/* Top Nav Bar */}
      <header className="h-[68px] border-b border-border-subtle bg-background flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-accent-blue rounded-md flex items-center justify-center">
              <span className="font-bold text-white text-xs tracking-tighter">AIT</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs font-medium">
              <span className="text-text-muted">root /</span>
              <span className="text-white">Aula IT</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 uppercase font-mono tracking-widest text-[10px]">
          <div className="bg-accent-orange/10 border border-accent-orange/20 text-accent-orange px-4 py-2 rounded-lg flex items-center gap-2">
            <Flame className="size-3 fill-accent-orange" />
            <span className="font-bold">14 DAYS UPTIME</span>
          </div>
          <button className="size-10 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-text-muted hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">person</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-[240px] bg-background border-r border-border-subtle flex flex-col shrink-0">
          <div className="p-6">
            <div className="text-[10px] font-mono font-bold text-text-muted uppercase tracking-[0.2em] mb-4">
              EDUCATION
            </div>
            <nav className="flex flex-col gap-1">
              <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface border border-border-subtle text-white text-sm transition-all group">
                <Home className="size-4" />
                <span className="font-medium">Inicio</span>
              </Link>
              <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:text-white text-sm transition-all hover:bg-surface-dark group">
                <BookOpen className="size-4" />
                <span className="font-medium">Mis Cursos</span>
              </Link>
              <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:text-white text-sm transition-all hover:bg-surface-dark group">
                <BarChart2 className="size-4" />
                <span className="font-medium">Progreso</span>
              </Link>
              <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:text-white text-sm transition-all hover:bg-surface-dark group">
                <HelpCircle className="size-4" />
                <span className="font-medium">Recursos</span>
              </Link>
            </nav>
          </div>

          <div className="mt-auto p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-dark transition-colors cursor-pointer group border border-transparent hover:border-border-subtle">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-text-muted group-hover:text-white">home</span>
                <span className="text-sm font-medium text-text-muted group-hover:text-white">Inicio</span>
              </div>
            </div>
            <div className="px-3">
              <div className="font-mono text-[10px] text-text-muted tracking-widest uppercase opacity-40">
                v2.4.0 (stable)
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-background overflow-y-auto px-10 py-8 relative">
          {children}
        </main>

        {/* Right Sidebar - Activity History */}
        <aside className="w-[320px] bg-background border-l border-border-subtle flex flex-col shrink-0 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-sm">Activity History</h3>
            <button className="text-text-muted hover:text-white transition-colors">
              <MoreHorizontal className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-8 flex-1">
            <div className="relative pl-6 border-l border-border-subtle space-y-8">
              {/* Event 1 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 size-[9px] rounded-full bg-accent-blue ring-4 ring-background" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-text-muted uppercase">10m ago</span>
                  <h4 className="text-xs font-bold">Module <span className="text-accent-blue">SOR</span> Access</h4>
                  <div className="mt-2 p-3 rounded-lg bg-surface border border-border-subtle">
                    <p className="text-[10px] font-mono text-text-muted">
                      [INFO] Completed Quiz 101: 92% Score
                    </p>
                  </div>
                </div>
              </div>

              {/* Event 2 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 size-[9px] rounded-full bg-accent-green ring-4 ring-background" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-text-muted uppercase">2h ago</span>
                  <h4 className="text-xs font-bold text-white">Assignment Uploaded</h4>
                  <div className="mt-2 p-3 rounded-lg bg-surface border border-border-subtle">
                    <p className="text-[10px] font-mono text-text-muted">
                      Student uploaded Unit 3 Network Topology project
                    </p>
                  </div>
                </div>
              </div>

              {/* Event 3 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 size-[9px] rounded-full bg-accent-amber ring-4 ring-background" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-text-muted uppercase">5h ago</span>
                  <h4 className="text-xs font-bold text-white">Exam Reminder</h4>
                  <div className="mt-2 p-3 rounded-lg bg-surface border border-border-subtle text-text-muted">
                    <p className="text-[10px] font-mono">
                      [WARN] Homework overdue: CSS Grid Layout
                    </p>
                  </div>
                </div>
              </div>

              {/* Event 4 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 size-[9px] rounded-full bg-accent-purple ring-4 ring-background" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-text-muted uppercase">1d ago</span>
                  <h4 className="text-xs font-bold text-white">Achievement</h4>
                  <div className="mt-2 p-3 rounded-lg bg-surface border border-border-subtle flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-accent-purple">verified_user</span>
                    <p className="text-[10px] font-mono text-white">
                      Unlocked: Git Master
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-border-subtle grid grid-cols-2 gap-4 uppercase font-mono tracking-tighter">
          </div>
        </aside>
      </div>
    </div>
  );
}

