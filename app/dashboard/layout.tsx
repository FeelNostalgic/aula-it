import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  LogOut,
  Flame,
  MoreHorizontal,
  History,
  Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_VERSION, APP_STATUS } from "@/lib/version";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logout } from "@/app/(auth)/login/actions";

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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
      {/* Top Nav Bar */}
      <header className="h-[68px] border-b border-border/50 bg-background flex items-center justify-between px-6 shrink-0 z-20">
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

        <div className="flex items-center gap-4 uppercase font-mono tracking-widest text-[10px]">
          {!isTeacher && (
            <>
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
            </>
          )}

          <ThemeToggle />

          <Button variant="ghost" size="icon" className="size-10 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all">
            <Settings className="size-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-10 rounded-lg bg-card border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground transition-all ml-2">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-[10px]">
                    {user.user_metadata?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 font-sans">
              <DropdownMenuLabel className="flex flex-col">
                <span className="font-bold">{user.user_metadata?.full_name || 'Usuario'}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{user.email}</span>
                {isTeacher && (
                  <span className="text-[10px] text-accent-blue font-mono font-bold mt-1 uppercase tracking-widest">Profesor</span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form action={logout} className="w-full">
                  <button type="submit" className="w-full flex items-center gap-2 cursor-pointer font-medium text-destructive">
                    <LogOut className="size-4" />
                    <span>Cerrar sesión</span>
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 bg-background overflow-y-auto px-10 py-8 relative">
          {children}
        </main>

        {/* Right Sidebar - Activity History */}
        <aside className="w-[320px] bg-background border-l border-border/50 flex flex-col shrink-0 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <History className="size-4 text-primary" />
              <h3 className="font-bold text-sm tracking-tight">Historial de Actividad</h3>
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
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">hace 10m</span>
                  <h4 className="text-xs font-bold">Módulo <span className="text-primary">SOR</span> Accedido</h4>
                  <Card className="mt-2 bg-card/30 border-border/30">
                    <CardContent className="p-3">
                      <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                        [EXEC] TEST 101 COMPLETADO: <span className="text-primary font-bold">92% PUNTUACIÓN</span>
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Event 2 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 size-[9px] rounded-full bg-green-500 ring-4 ring-background" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">hace 2h</span>
                  <h4 className="text-xs font-bold">Tarea Subida</h4>
                  <Card className="mt-2 bg-card/30 border-border/30">
                    <CardContent className="p-3">
                      <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                        ESTUDIANTE SUBIÓ PROYECTO TEMA 3 TOPOLOGÍA DE RED
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Event 3 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 size-[9px] rounded-full bg-orange-500 ring-4 ring-background" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">hace 5h</span>
                  <h4 className="text-xs font-bold">Recordatorio</h4>
                  <Card className="mt-2 bg-card/30 border-border/30">
                    <CardContent className="p-3">
                      <p className="text-[10px] font-mono text-orange-500/80 leading-relaxed uppercase">
                        [WARN] TAREA ATRASADA: CSS GRID LAYOUT
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Event 4 */}
              <div className="relative">
                <div className="absolute -left-[31px] top-1 size-[9px] rounded-full bg-purple-500 ring-4 ring-background" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">hace 1d</span>
                  <h4 className="text-xs font-bold">Logro</h4>
                  <Card className="mt-2 bg-card/30 border-border/30">
                    <CardContent className="p-3 flex items-center gap-2">
                      <Trophy className="size-4 text-purple-500" />
                      <p className="text-[10px] font-mono text-foreground leading-relaxed uppercase">
                        DESBLOQUEADO: MAESTRO DE GIT
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-border/50 flex flex-col gap-4">
            <Button variant="outline" className="w-full h-9 text-[10px] font-mono uppercase tracking-widest bg-card border-border/50 hover:bg-muted transition-colors">
              Ver Historial Completo
            </Button>

            {/* Version Tag */}
            <div className="text-center font-mono text-[9px] text-muted-foreground/60 tracking-widest uppercase mt-4">
              build_id: v{APP_VERSION} ({APP_STATUS})
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}



