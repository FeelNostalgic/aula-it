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
  GraduationCap,
  Terminal,
  User,
  Activity,
  CheckCircle2,
  AlertCircle,
  Trophy,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
      {/* Top Nav Bar */}
      <header className="h-[68px] border-b border-border/50 bg-background flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-primary rounded-md flex items-center justify-center">
              <span className="font-bold text-white text-xs tracking-tighter">AIT</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs font-medium">
              <span className="text-muted-foreground">root /</span>
              <span className="text-foreground">Aula IT</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 uppercase font-mono tracking-widest text-[10px]">
          <Badge variant="outline" className="bg-orange-500/10 border-orange-500/20 text-orange-500 px-4 py-1.5 rounded-lg flex items-center gap-2 hover:bg-orange-500/20 transition-colors cursor-default">
            <Flame className="size-3 fill-orange-500" />
            <span className="font-bold">14 DAYS UPTIME</span>
          </Badge>

          <div className="flex items-center gap-1 bg-card border border-border/50 rounded-lg p-1 pr-3 hover:border-primary/50 transition-all cursor-default group">
            <div className="size-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold transition-all">
              14
            </div>
            <span className="text-[9px] font-bold text-muted-foreground transition-colors">LVL</span>
          </div>

          <ThemeToggle />

          <Button variant="outline" size="icon" className="size-10 rounded-lg bg-card border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
            <User className="size-5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-[240px] bg-background border-r border-border/50 flex flex-col shrink-0">
          <div className="p-6">
            <div className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4 opacity-50">
              EDUCATION SYSTEM
            </div>
            <nav className="flex flex-col gap-1">
              <Link href="/dashboard" passHref>
                <Button variant="secondary" className="w-full justify-start gap-3 px-3 h-10 bg-card border border-border/50 text-foreground shadow-sm">
                  <Home className="size-4" />
                  <span className="font-medium">Inicio</span>
                </Button>
              </Link>
              <Link href="#" passHref>
                <Button variant="ghost" className="w-full justify-start gap-3 px-3 h-10 text-muted-foreground hover:text-foreground hover:bg-card/50">
                  <BookOpen className="size-4" />
                  <span className="font-medium">Mis Cursos</span>
                </Button>
              </Link>
              <Link href="#" passHref>
                <Button variant="ghost" className="w-full justify-start gap-3 px-3 h-10 text-muted-foreground hover:text-foreground hover:bg-card/50">
                  <BarChart2 className="size-4" />
                  <span className="font-medium">Progreso</span>
                </Button>
              </Link>
              <Link href="#" passHref>
                <Button variant="ghost" className="w-full justify-start gap-3 px-3 h-10 text-muted-foreground hover:text-foreground hover:bg-card/50">
                  <HelpCircle className="size-4" />
                  <span className="font-medium">Recursos</span>
                </Button>
              </Link>
            </nav>
          </div>

          <div className="mt-auto p-6 flex flex-col gap-6">
            <Separator className="bg-border/30" />
            <Button variant="ghost" className="w-full justify-start gap-3 px-3 h-10 text-muted-foreground hover:text-foreground group">
              <Settings className="size-4 group-hover:rotate-45 transition-transform" />
              <span className="text-sm font-medium">Ajustes</span>
            </Button>
            <div className="px-3">
              <div className="font-mono text-[9px] text-muted-foreground/60 tracking-widest uppercase">
                system_v2.4.0 (stable)
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-background overflow-y-auto px-10 py-8 relative">
          {children}
        </main>

        {/* Right Sidebar - Activity History */}
        <aside className="w-[320px] bg-background border-l border-border/50 flex flex-col shrink-0 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <History className="size-4 text-primary" />
              <h3 className="font-bold text-sm tracking-tight">Activity Log</h3>
            </div>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="size-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-8 flex-1">
            <div className="relative pl-6 border-l border-border/30 space-y-8">
              {/* Event 1 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 size-[9px] rounded-full bg-primary ring-4 ring-background" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">10m ago</span>
                  <h4 className="text-xs font-bold">Module <span className="text-primary">SOR</span> Access</h4>
                  <Card className="mt-2 bg-card/30 border-border/30">
                    <CardContent className="p-3">
                      <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                        [EXEC] COMPLETED QUIZ 101: <span className="text-primary font-bold">92% SCORE</span>
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Event 2 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 size-[9px] rounded-full bg-green-500 ring-4 ring-background" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">2h ago</span>
                  <h4 className="text-xs font-bold">Assignment Uploaded</h4>
                  <Card className="mt-2 bg-card/30 border-border/30">
                    <CardContent className="p-3">
                      <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                        STUDENT UPLOADED UNIT 3 NETWORK TOPOLOGY PROJECT
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Event 3 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 size-[9px] rounded-full bg-orange-500 ring-4 ring-background" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">5h ago</span>
                  <h4 className="text-xs font-bold">Exam Reminder</h4>
                  <Card className="mt-2 bg-card/30 border-border/30">
                    <CardContent className="p-3">
                      <p className="text-[10px] font-mono text-orange-500/80 leading-relaxed uppercase">
                        [WARN] HOMEWORK OVERDUE: CSS GRID LAYOUT
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Event 4 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 size-[9px] rounded-full bg-purple-500 ring-4 ring-background" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">1d ago</span>
                  <h4 className="text-xs font-bold">Achievement</h4>
                  <Card className="mt-2 bg-card/30 border-border/30">
                    <CardContent className="p-3 flex items-center gap-2">
                      <Trophy className="size-4 text-purple-500" />
                      <p className="text-[10px] font-mono text-foreground leading-relaxed uppercase">
                        UNLOCKED: GIT MASTER
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-border/50">
            <Button variant="outline" className="w-full h-9 text-[10px] font-mono uppercase tracking-widest bg-card border-border/50 hover:bg-muted transition-colors">
              View Full Logs
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}


