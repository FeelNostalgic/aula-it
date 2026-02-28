"use client";

import { useState } from "react";
import Link from "next/link";
import {
    LayoutGrid,
    List,
    Users,
    TrendingUp,
    ArrowRight,
    BookOpen,
    Brain,
    Code,
    Network,
    Database,
    Terminal,
    MoreVertical,
    Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CreateModuleDialog } from "./create-module-dialog";

const ICON_MAP: Record<string, any> = {
    BookOpen,
    Brain,
    Code,
    Network,
    Database,
    Terminal,
};

type Module = {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    created_at: string;
    teacher_id: string;
};

interface TeacherDashboardProps {
    initialModules: Module[];
}

export function TeacherDashboard({ initialModules }: TeacherDashboardProps) {
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    return (
        <div className="flex flex-col gap-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Módulos que impartes</h2>
                    <p className="text-sm font-medium text-text-muted">Gestiona tus unidades educativas y haz seguimiento de tus alumnos.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-surface border border-border-subtle rounded-lg p-1">
                        <Button
                            variant={viewMode === "grid" ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => setViewMode("grid")}
                            className={`size-8 rounded-md ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-text-muted"}`}
                        >
                            <LayoutGrid className="size-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => setViewMode("list")}
                            className={`size-8 rounded-md ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-text-muted"}`}
                        >
                            <List className="size-4" />
                        </Button>
                    </div>
                    <CreateModuleDialog />
                </div>
            </div>

            {initialModules.length === 0 ? (
                <Card className="bg-surface-dark border-border-subtle border-dashed p-12 text-center flex flex-col items-center gap-4">
                    <div className="size-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
                        <BookOpen className="size-6 text-accent-blue" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold">No hay módulos registrados</h3>
                        <p className="text-xs text-text-muted">Aún no has creado ningún módulo. ¡Comienza ahora!</p>
                    </div>
                    <CreateModuleDialog />
                </Card>
            ) : (
                <div className={viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "flex flex-col gap-4"
                }>
                    {initialModules.map((module) => {
                        const Icon = ICON_MAP[module.icon] || BookOpen;

                        // Mock values for demonstration
                        const progress = Math.floor(Math.random() * 40) + 60; // 60-100%
                        const studentsCount = Math.floor(Math.random() * 20) + 10;
                        const statuses = ["ACTIVO", "EN REVISIÓN", "PENDIENTE"] as const;
                        const status = statuses[module.id.length % 3]; // Deterministic mock based on ID

                        if (viewMode === "list") {
                            return (
                                <Link href={`/dashboard/modules/${module.id}`} key={module.id}>
                                    <div className="bg-surface-dark border border-border-subtle hover:border-accent-blue/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 group transition-all cursor-pointer shadow-sm hover:shadow-md">
                                        {/* Col 1: Icon + Text */}
                                        <div className="flex items-center gap-4 min-w-[280px] flex-1">
                                            <div className="size-10 rounded-lg bg-surface border border-accent-blue/20 shadow-[0_0_10px_rgba(34,211,238,0.05)] flex items-center justify-center text-accent-blue group-hover:scale-110 transition-transform shrink-0">
                                                <Icon className="size-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-foreground truncate group-hover:text-accent-blue transition-colors tracking-tight">{module.name}</h3>
                                                <p className="text-xs text-text-muted truncate">{module.description || "Sin descripción"}</p>
                                            </div>
                                        </div>

                                        {/* Col 2: Progress */}
                                        <div className="w-full md:w-[180px] shrink-0">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Progreso</span>
                                                <span className="text-xs font-bold text-foreground">{progress}%</span>
                                            </div>
                                            <Progress value={progress} className="h-1.5 bg-surface [&>div]:bg-accent-blue" />
                                        </div>

                                        {/* Col 3: Students */}
                                        <div className="w-full md:w-[120px] shrink-0 flex items-center gap-3">
                                            <div className="size-8 rounded-full bg-surface border border-border-subtle flex items-center justify-center shrink-0">
                                                <Users className="size-3.5 text-text-muted" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted leading-none">Alumnos</div>
                                                <div className="text-sm font-bold text-foreground leading-none">{studentsCount}</div>
                                            </div>
                                        </div>

                                        {/* Col 4: Status Badge */}
                                        <div className="w-full md:w-[130px] shrink-0 flex md:justify-end mt-2 md:mt-0">
                                            {status === "ACTIVO" && (
                                                <Badge variant="outline" className="border-accent-green/30 bg-accent-green/10 text-accent-green gap-1.5 py-1 px-3">
                                                    <span className="size-1.5 rounded-full bg-accent-green animate-pulse" />
                                                    ACTIVO
                                                </Badge>
                                            )}
                                            {status === "EN REVISIÓN" && (
                                                <Badge variant="outline" className="border-accent-orange/30 bg-accent-orange/10 text-accent-orange gap-1.5 py-1 px-3">
                                                    <span className="size-1.5 rounded-full bg-accent-orange" />
                                                    REVISIÓN
                                                </Badge>
                                            )}
                                            {status === "PENDIENTE" && (
                                                <Badge variant="outline" className="border-border-strong bg-surface text-text-muted gap-1.5 py-1 px-3">
                                                    <span className="size-1.5 rounded-full bg-text-muted" />
                                                    PENDIENTE
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        }

                        // Grid View
                        return (
                            <Link href={`/dashboard/modules/${module.id}`} key={module.id} className="block h-full">
                                <Card className="bg-surface-dark border-border-subtle hover:border-accent-blue/50 hover:shadow-lg hover:shadow-accent-blue/5 transition-all group overflow-hidden cursor-pointer flex flex-col h-full rounded-2xl">
                                    <div className="p-6 flex flex-col h-full">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-5">
                                            <div className="size-12 rounded-xl bg-surface border border-accent-blue/20 shadow-[0_0_15px_rgba(34,211,238,0.1)] flex items-center justify-center text-accent-blue group-hover:scale-110 group-hover:bg-accent-blue/10 transition-all">
                                                <Icon className="size-6" />
                                            </div>
                                            {status === "ACTIVO" && (
                                                <Badge variant="outline" className="border-accent-green/30 bg-accent-green/5 text-accent-green gap-1.5 shadow-sm">
                                                    <span className="size-1.5 rounded-full bg-accent-green animate-pulse" />
                                                    ACTIVO
                                                </Badge>
                                            )}
                                            {status === "EN REVISIÓN" && (
                                                <Badge variant="outline" className="border-accent-orange/30 bg-accent-orange/5 text-accent-orange gap-1.5 shadow-sm">
                                                    <span className="size-1.5 rounded-full bg-accent-orange" />
                                                    REVISIÓN
                                                </Badge>
                                            )}
                                            {status === "PENDIENTE" && (
                                                <Badge variant="outline" className="border-border-strong bg-surface text-text-muted gap-1.5 shadow-sm">
                                                    <span className="size-1.5 rounded-full bg-text-muted" />
                                                    PENDIENTE
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="mb-6">
                                            <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-accent-blue transition-colors line-clamp-1">
                                                {module.name}
                                            </h3>
                                            <p className="text-sm text-text-muted mt-1.5 line-clamp-2">
                                                {module.description || "Sin descripción proporcionada para este módulo."}
                                            </p>
                                        </div>

                                        {/* Footer Area */}
                                        <div className="mt-auto space-y-4 pt-4 border-t border-border-subtle/50 relative">
                                            {/* Progress and Students */}
                                            <div className="flex items-end justify-between">
                                                <div className="space-y-1.5">
                                                    <div className="text-[10px] uppercase tracking-widest font-mono font-bold text-text-muted">
                                                        Progreso Global
                                                    </div>
                                                    <div className="flex items-baseline gap-1 font-bold text-foreground">
                                                        <span className="text-2xl leading-none">{progress}</span>
                                                        <span className="text-sm text-text-muted">%</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-1.5">
                                                    <div className="flex -space-x-2">
                                                        {[1, 2, 3].map((i) => (
                                                            <div key={i} className="size-6 rounded-full bg-surface-dark border-2 border-border-subtle flex items-center justify-center overflow-hidden z-10">
                                                                <Users className="size-3 text-text-muted opacity-50" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-text-muted tracking-wider uppercase">+{studentsCount} Alumnos</span>
                                                </div>
                                            </div>

                                            <Progress value={progress} className="h-1.5 bg-surface [&>div]:bg-accent-blue" />

                                            {/* Next Delivery Inner Box */}
                                            <div className="bg-[#050A0D] border border-border-subtle rounded-xl p-3 flex items-center gap-3 mt-4 group-hover:border-accent-blue/30 transition-colors">
                                                <div className="size-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
                                                    <Terminal className="size-4 text-text-muted group-hover:text-accent-blue transition-colors" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-0.5">Próxima entrega</div>
                                                    <div className="text-xs font-bold text-foreground truncate group-hover:text-accent-blue/90 transition-colors">Práctica: Instalación Linux</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
