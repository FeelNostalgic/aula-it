import { Search, MoreVertical, Terminal, Database, Globe, Command, ArrowRight, BookOpen, Clock, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

type Module = {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    created_at: string;
    teacher_id: string;
    status: "active" | "completed" | "pending";
};

interface StudentDashboardProps {
    initialModules: Module[];
}

const ICON_MAP: Record<string, any> = {
    BookOpen,
    Terminal,
    Database,
    Globe,
    // Add logic for matching icons based on the module icon string
};

export function StudentDashboard({ initialModules }: StudentDashboardProps) {
    return (
        <div className="flex flex-col gap-10">
            {/* Command Search Bar */}
            <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center text-accent-blue font-mono text-sm pointer-events-none z-10">
                    {">"}
                </div>
                <Input
                    type="text"
                    placeholder="Buscar proyectos o ejecutar un comando..."
                    className="w-full bg-background border-border-subtle rounded-xl h-[52px] pl-10 pr-16 text-sm font-sans text-foreground focus-visible:ring-1 focus-visible:ring-accent-blue focus-visible:border-accent-blue/50 transition-all placeholder:text-text-muted/60"
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <div className="px-2 py-1 rounded bg-surface border border-border-subtle flex items-center gap-1">
                        <Command className="size-2.5 text-text-muted" />
                        <span className="text-[10px] font-mono text-text-muted font-bold">K</span>
                    </div>
                </div>
            </div>

            {/* User Progress Panel */}
            <Card className="bg-surface-dark border-border-subtle overflow-hidden relative group">
                <div className="absolute inset-0 bg-accent-blue/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <CardContent className="p-6 flex flex-col md:flex-row items-center gap-8 relative z-10">
                    {/* Level Hexagon */}
                    <div className="relative shrink-0">
                        <div className="size-20 bg-surface border-2 border-accent-blue/30 rounded-2xl rotate-45 flex items-center justify-center relative overflow-hidden group-hover:border-accent-blue transition-colors">
                            <div className="absolute inset-0 bg-accent-blue/10 animate-pulse" />
                            <div className="-rotate-45 flex flex-col items-center">
                                <span className="text-3xl font-bold text-foreground tracking-tighter">14</span>
                                <span className="text-[8px] font-mono font-bold text-accent-blue uppercase tracking-[0.2em] -mt-1">NIVEL</span>
                            </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-accent-blue text-primary-foreground text-[9px] font-mono font-black italic rounded flex items-center gap-1 shadow-lg shadow-accent-blue/20">
                            CLASE-S
                        </div>
                    </div>

                    {/* XP Progress */}
                    <div className="flex-1 w-full space-y-4">
                        <div className="flex items-end justify-between">
                            <div className="space-y-1">
                                <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                                    <Terminal className="size-3 text-accent-blue" />
                                    Experiencia
                                </h3>
                                <p className="text-lg font-bold text-foreground tracking-tight">
                                    2,400 <span className="text-text-muted text-sm font-medium">/ 3,000 XP</span>
                                </p>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-[10px] font-mono text-accent-blue font-bold tracking-widest">SIGUIENTE: NVL 15</p>
                                <Badge variant="outline" className="border-accent-blue/20 bg-accent-blue/5 text-accent-blue text-[9px] px-2 py-0">
                                    +12.4% ESTA SEMANA
                                </Badge>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Progress value={80} className="h-2 bg-surface border border-border-subtle" />
                            <div className="flex justify-between font-mono text-[9px] text-text-muted/60 tracking-wider">
                                <span>ESTADO_BUFFER: ESTABLE</span>
                                <span className="animate-pulse">{"///"} SINCRONIZANDO_NUCLEO</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
                <Card className="bg-surface-dark border-border-subtle shadow-sm flex flex-col justify-between p-6">
                    <div className="flex items-center gap-4">
                        <div className="size-10 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                            <BookOpen className="size-5" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Módulos Matriculados</p>
                            <h3 className="text-2xl font-bold text-foreground font-mono">{initialModules.length}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="bg-surface-dark border-border-subtle shadow-sm flex flex-col justify-between p-6">
                    <div className="flex items-center gap-4">
                        <div className="size-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                            <Clock className="size-5" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Módulos en Curso</p>
                            <h3 className="text-2xl font-bold text-foreground font-mono">
                                {initialModules.filter(m => m.status === 'active' || !m.status).length}
                            </h3>
                        </div>
                    </div>
                </Card>
                <Card className="bg-surface-dark border-border-subtle shadow-sm flex flex-col justify-between p-6">
                    <div className="flex items-center gap-4">
                        <div className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                            <CheckCircle2 className="size-5" />
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Módulos Completados</p>
                            <h3 className="text-2xl font-bold text-foreground font-mono">
                                {initialModules.filter(m => m.status === 'completed').length}
                            </h3>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Seccion: Modulos Activos */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Módulos Activos</h2>
                    <Button variant="link" className="text-[10px] font-mono font-bold text-accent-blue hover:underline tracking-widest uppercase flex items-center gap-2 p-0 h-auto">
                        VER TODOS <ArrowRight className="size-3" />
                    </Button>
                </div>

                <div className="flex flex-col gap-4">
                    {initialModules.length === 0 ? (
                        <Card className="bg-surface-dark border-border-subtle border-dashed p-12 text-center flex flex-col items-center gap-4">
                            <div className="size-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
                                <BookOpen className="size-6 text-accent-blue" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold">No hay módulos activos</h3>
                                <p className="text-xs text-text-muted">Aún no estás matriculado en ningún módulo.</p>
                            </div>
                        </Card>
                    ) : (
                        initialModules.map(module => {
                            const Icon = ICON_MAP[module.icon] || BookOpen;
                            const statusConfig = {
                                active: { color: "text-accent-green", bg: "bg-accent-green/10", border: "border-accent-green/20", label: "ACTIVO" },
                                pending: { color: "text-accent-orange", bg: "bg-accent-orange/10", border: "border-accent-orange/20", label: "PENDIENTE" },
                                completed: { color: "text-accent-blue", bg: "bg-accent-blue/10", border: "border-accent-blue/20", label: "COMPLETADO" }
                            }[module.status || "pending"];

                            return (
                                <Link href={`/dashboard/modules/${module.id}`} key={module.id}>
                                    <Card className="bg-surface-dark border-border-subtle hover:border-border-subtle/80 transition-all cursor-pointer group shadow-sm overflow-hidden min-h-[140px] flex flex-col justify-center">
                                        <CardHeader className="flex flex-row items-start justify-between space-y-0 p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="size-11 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-accent-blue group-hover:bg-accent-blue/10 transition-colors">
                                                    <Icon className="size-5" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <CardTitle className="text-base font-bold group-hover:text-accent-blue transition-colors">{module.name}</CardTitle>
                                                    <CardDescription className="text-xs text-text-muted line-clamp-1">{module.description || "Sin descripción"}</CardDescription>
                                                </div>
                                            </div>
                                            {statusConfig && (
                                                <Badge variant="outline" className={`${statusConfig.bg} ${statusConfig.border} ${statusConfig.color} text-[10px]`}>
                                                    {statusConfig.label}
                                                </Badge>
                                            )}
                                        </CardHeader>
                                    </Card>
                                </Link>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
