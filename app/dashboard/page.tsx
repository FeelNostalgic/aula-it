import { createClient } from "@/utils/supabase/server";
import { Search, MoreVertical, Terminal, Database, Globe, Command, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-10">
      {/* Command Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center text-accent-blue font-mono text-sm pointer-events-none z-10">
          {">"}
        </div>
        <Input
          type="text"
          placeholder="Search projects or run a command..."
          className="w-full bg-background border-border-subtle rounded-xl h-[52px] pl-10 pr-16 text-sm font-sans text-white focus-visible:ring-1 focus-visible:ring-accent-blue focus-visible:border-accent-blue/50 transition-all placeholder:text-text-muted/60"
        />
        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
          <div className="px-2 py-1 rounded bg-surface border border-border-subtle flex items-center gap-1">
            <Command className="size-2.5 text-text-muted" />
            <span className="text-[10px] font-mono text-text-muted font-bold">K</span>
          </div>
        </div>
      </div>

      {/* Seccion: Modulos Activos */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Módulos Activos</h2>
          <Button variant="link" className="text-[10px] font-mono font-bold text-accent-blue hover:underline tracking-widest uppercase flex items-center gap-2 p-0 h-auto">
            VIEW ALL <ArrowRight className="size-3" />
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Module 1 */}
          <Card className="bg-surface-dark border-border-subtle hover:border-border-subtle/80 transition-all cursor-default group shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 p-6">
              <div className="flex items-center gap-4">
                <div className="size-11 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-text-muted group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">rebase_edit</span>
                </div>
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base font-bold">Sistemas Operativos</CardTitle>
                  <CardDescription className="text-[10px] font-mono text-text-muted uppercase tracking-tighter">Último acceso: Hoy</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-accent-green/10 border-accent-green/20 text-accent-green hover:bg-accent-green/20 text-[10px]">
                COMPLETADO
              </Badge>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted mb-4 uppercase tracking-tighter">
                <span className="material-symbols-outlined text-[14px]">view_agenda</span>
                Tema actual: Gestión de Procesos
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                  <span className="text-accent-blue">85%</span>
                </div>
                <Progress value={85} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          {/* Module 2 */}
          <Card className="bg-surface-dark border-border-subtle hover:border-border-subtle/80 transition-all cursor-default group shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 p-6">
              <div className="flex items-center gap-4">
                <div className="size-11 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-text-muted group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">hub</span>
                </div>
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base font-bold">Redes de Datos</CardTitle>
                  <CardDescription className="text-[10px] font-mono text-text-muted uppercase tracking-tighter">Último acceso: Ayer</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-accent-orange/10 border-accent-orange/20 text-accent-orange hover:bg-accent-orange/20 text-[10px]">
                EN CURSO
              </Badge>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted mb-4 uppercase tracking-tighter">
                <span className="material-symbols-outlined text-[14px]">view_agenda</span>
                Tema actual: Modelo OSI
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                  <span className="text-accent-orange">48%</span>
                </div>
                <Progress
                  value={48}
                  className="h-1.5"
                // Note: Custom indicator styling might be needed for orange, 
                // currently it defaults to primary (blue).
                />
              </div>
            </CardContent>
          </Card>

          {/* Module 3 */}
          <Card className="bg-surface-dark border-border-subtle opacity-60 hover:opacity-100 transition-all cursor-default group border-dashed shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 p-6">
              <div className="flex items-center gap-4">
                <div className="size-11 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-text-muted group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">database</span>
                </div>
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base font-bold text-text-muted group-hover:text-white transition-colors">Bases de Datos</CardTitle>
                  <CardDescription className="text-[10px] font-mono text-text-muted uppercase tracking-tighter">Último acceso: --</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-border-subtle/30 border-border-subtle/50 text-text-muted text-[10px]">
                PENDIENTE
              </Badge>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <div className="flex items-center gap-10">
                <div className="h-2 w-32 bg-border-subtle rounded-full" />
                <div className="h-2 w-32 bg-border-subtle rounded-full" />
              </div>

              <div className="mt-8 h-1 w-full bg-border-subtle rounded-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
