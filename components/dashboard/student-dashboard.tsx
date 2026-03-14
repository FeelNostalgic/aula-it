"use client";

import { useState, useEffect } from "react";
import { Terminal, BookOpen, Clock, CheckCircle2, LayoutGrid, List, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useGamification } from "@/hooks/use-gamification";
import { StudentModuleCard } from "./student-module-card";
import { cn } from "@/lib/utils";

type Module = {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    created_at: string;
    teacher_id: string;
    status: "active" | "completed" | "pending";
    total_units?: number;
    completed_units?: number;
    module_xp?: number;
    next_due_step?: { title: string; due_date: string } | null;
};

interface StudentDashboardProps {
    initialModules: Module[];
    gridColumns?: number;
}

export function StudentDashboard({ initialModules, gridColumns = 3 }: StudentDashboardProps) {
    const [viewMode, setViewMode] = useState<"grid" | "list" | null>(null);
    const { globalLevel } = useGamification();

    useEffect(() => {
        const saved = (localStorage.getItem("aula-it:dashboard:view-mode") as "grid" | "list") || "grid";
        setViewMode(saved);
    }, []);

    useEffect(() => {
        if (viewMode) {
            localStorage.setItem("aula-it:dashboard:view-mode", viewMode);
        }
    }, [viewMode]);

    const gridColsClass = {
        2: "md:grid-cols-2 lg:grid-cols-2",
        3: "md:grid-cols-2 lg:grid-cols-3",
        4: "md:grid-cols-3 lg:grid-cols-4",
        5: "md:grid-cols-4 lg:grid-cols-5",
    }[gridColumns as 2 | 3 | 4 | 5] || "md:grid-cols-2 lg:grid-cols-3";

    const [statsOpen, setStatsOpen] = useState(() => {
        if (typeof window === 'undefined') return true;
        const saved = localStorage.getItem('aula-it:student-dashboard:stats-open');
        return saved === null ? true : saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('aula-it:student-dashboard:stats-open', String(statsOpen));
    }, [statsOpen]);

    if (viewMode === null) {
        return (
            <div className="animate-in fade-in duration-500">
                <StudentDashboardSkeleton />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10">
            {/* user progress panel */}
            <Card className="bg-surface-dark border-border-subtle overflow-hidden relative group">
                <div className="absolute inset-0 bg-accent-blue/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <CardContent className="p-6 flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <div className="relative shrink-0">
                        <div className="size-20 bg-surface border-2 border-accent-blue/30 rounded-2xl rotate-45 flex items-center justify-center relative overflow-hidden group-hover:border-accent-blue transition-colors">
                            <div className="absolute inset-0 bg-accent-blue/10 animate-pulse" />
                            <div className="-rotate-45 flex flex-col items-center">
                                <span className="text-3xl font-bold text-foreground tracking-tighter">{globalLevel.level}</span>
                                <span className="text-[8px] font-mono font-bold text-accent-blue uppercase tracking-[0.2em] -mt-1">NIVEL</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full space-y-4">
                        <div className="flex items-end justify-between">
                            <div className="space-y-1">
                                <h3 className="text-xs font-mono font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                                    <Terminal className="size-3 text-accent-blue" />
                                    Experiencia Global
                                </h3>
                                <p className="text-lg font-bold text-foreground tracking-tight">
                                    {Math.round(globalLevel.xpInCurrentLevel).toLocaleString()} <span className="text-text-muted text-sm font-medium">/ {Math.round(globalLevel.xpRequiredForNextLevel).toLocaleString()} XP</span>
                                </p>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-[10px] font-mono text-accent-blue font-bold tracking-widest">SIGUIENTE: NVL {globalLevel.level + 1}</p>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Progress value={globalLevel.progressPercentage} className="h-2 bg-surface border border-border-subtle [&>div]:bg-accent-blue" />
                            <div className="flex justify-between font-mono text-[9px] text-text-muted/60 tracking-wider">
                                <span>{Math.round(globalLevel.xpInCurrentLevel).toLocaleString()} XP DESDE EL ÚLTIMO NIVEL</span>
                                <span className="animate-pulse">{"///"} SINCRONIZANDO_NUCLEO</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div>
                <button
                    onClick={() => setStatsOpen(!statsOpen)}
                    className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-foreground transition-colors mb-4 group"
                >
                    <ChevronDown className={cn("size-4 transition-transform", !statsOpen && "-rotate-90")} />
                    <span className="uppercase tracking-widest">Estadísticas</span>
                </button>
                {statsOpen && (
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
                                        {initialModules.filter(m => m.status === 'active').length}
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
                )}
            </div>

            {/* Seccion: Modulos Activos */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Módulos Activos</h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-surface border border-border-subtle rounded-md p-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`size-7 rounded-sm ${viewMode === 'grid' ? 'bg-surface-dark text-foreground shadow-sm' : 'text-text-muted hover:text-foreground hover:bg-transparent'}`}
                                onClick={() => setViewMode('grid')}
                            >
                                <LayoutGrid className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`size-7 rounded-sm ${viewMode === 'list' ? 'bg-surface-dark text-foreground shadow-sm' : 'text-text-muted hover:text-foreground hover:bg-transparent'}`}
                                onClick={() => setViewMode('list')}
                            >
                                <List className="size-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className={cn("grid gap-4", viewMode === 'list' ? "flex flex-col" : gridColsClass)}>
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
                        initialModules.map(module => (
                            <StudentModuleCard key={module.id} module={module as any} viewMode={viewMode} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function StudentDashboardSkeleton() {
    return (
        <div className="flex flex-col gap-10">
            <Card className="bg-surface-dark border-border-subtle h-32">
                <CardContent className="p-6 flex items-center gap-8">
                    <Skeleton className="size-20 rounded-2xl rotate-45 bg-surface" />
                    <div className="flex-1 space-y-4">
                        <Skeleton className="h-4 w-32 bg-surface" />
                        <Skeleton className="h-2 w-full bg-surface" />
                    </div>
                </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl bg-surface-dark border border-border-subtle" />
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="bg-surface-dark border-border-subtle h-64">
                        <CardContent className="p-6 space-y-4">
                            <Skeleton className="size-12 rounded-xl bg-surface" />
                            <Skeleton className="h-6 w-3/4 bg-surface" />
                            <Skeleton className="h-4 w-full bg-surface" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
