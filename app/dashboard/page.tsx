import { createClient } from "@/utils/supabase/server";
import { Search, MoreVertical, Terminal, Database, Globe, Command } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-10">
      {/* Command Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center text-accent-blue font-mono text-sm pointer-events-none">
          {">"}
        </div>
        <input
          type="text"
          placeholder="Search projects or run a command..."
          className="w-full bg-background border border-border-subtle rounded-xl h-[52px] pl-10 pr-16 text-sm font-sans text-white focus:ring-1 focus:ring-accent-blue focus:border-accent-blue/50 outline-none transition-all placeholder:text-text-muted/60"
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
          <button className="text-[10px] font-mono font-bold text-accent-blue hover:underline tracking-widest uppercase flex items-center gap-2">
            VIEW ALL <span className="text-sm">→</span>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Module 1 */}
          <div className="p-6 rounded-xl bg-surface-dark border border-border-subtle hover:border-border-subtle/80 transition-all cursor-default group shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="size-11 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-text-muted group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">rebase_edit</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-base">Sistemas Operativos</h3>
                  <p className="text-[10px] font-mono text-text-muted uppercase tracking-tighter">Último acceso: Hoy</p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-accent-green/10 border border-accent-green/20 text-[10px] font-mono text-accent-green font-bold uppercase tracking-widest">
                Completado
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted mb-4 uppercase tracking-tighter">
              <span className="material-symbols-outlined text-[14px]">view_agenda</span>
              Tema actual: Gestión de Procesos
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                <span className="text-accent-blue">85%</span>
              </div>
              <div className="h-1.5 w-full bg-border-subtle rounded-full overflow-hidden">
                <div className="h-full bg-accent-blue rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </div>

          {/* Module 2 */}
          <div className="p-6 rounded-xl bg-surface-dark border border-border-subtle hover:border-border-subtle/80 transition-all cursor-default group shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="size-11 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-text-muted group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">hub</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-base">Redes de Datos</h3>
                  <p className="text-[10px] font-mono text-text-muted uppercase tracking-tighter">Último acceso: Ayer</p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-accent-orange/10 border border-accent-orange/20 text-[10px] font-mono text-accent-orange font-bold uppercase tracking-widest">
                En curso
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted mb-4 uppercase tracking-tighter">
              <span className="material-symbols-outlined text-[14px]">view_agenda</span>
              Tema actual: Modelo OSI
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                <span className="text-accent-orange">48%</span>
              </div>
              <div className="h-1.5 w-full bg-border-subtle rounded-full overflow-hidden">
                <div className="h-full bg-accent-orange rounded-full" style={{ width: '48%' }} />
              </div>
            </div>
          </div>

          {/* Module 3 */}
          <div className="p-6 rounded-xl bg-surface-dark border border-border-subtle opacity-60 hover:opacity-100 transition-all cursor-default group border-dashed shadow-sm">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="size-11 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-text-muted group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[24px]">database</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-base text-text-muted group-hover:text-white">Bases de Datos</h3>
                  <p className="text-[10px] font-mono text-text-muted uppercase tracking-tighter">Último acceso: --</p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-border-subtle/30 border border-border-subtle/50 text-[10px] font-mono text-text-muted font-bold uppercase tracking-widest">
                Pendiente
              </div>
            </div>

            <div className="flex items-center gap-10">
              <div className="h-2 w-32 bg-border-subtle rounded-full" />
              <div className="h-2 w-32 bg-border-subtle rounded-full" />
            </div>

            <div className="mt-8 h-1 w-full bg-border-subtle rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
