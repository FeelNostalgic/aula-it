"use client";

import { useState } from "react";
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
    MoreVertical
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

                        return (
                            <Card
                                key={module.id}
                                className={`bg-surface-dark border-border-subtle hover:border-accent-blue/50 transition-all group overflow-hidden ${viewMode === "list" ? "flex flex-row items-center p-0" : ""
                                    }`}
                            >
                                <CardHeader className={`space-y-0 ${viewMode === "list" ? "flex-1 p-4" : "p-6"}`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-accent-blue group-hover:scale-110 transition-transform">
                                                <Icon className="size-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <CardTitle className="text-base font-bold text-foreground tracking-tight">{module.name}</CardTitle>
                                                {module.description && viewMode === "grid" && (
                                                    <CardDescription className="text-xs text-text-muted line-clamp-1">{module.description}</CardDescription>
                                                )}
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="size-8 text-text-muted opacity-0 group-hover:opacity-100">
                                            <MoreVertical className="size-4" />
                                        </Button>
                                    </div>
                                </CardHeader>

                                <CardContent className={`${viewMode === "list" ? "flex items-center gap-8 p-4 shrink-0" : "p-6 pt-0"}`}>
                                    <div className={`grid ${viewMode === "list" ? "grid-cols-2 gap-8" : "grid-cols-2 gap-4"} mb-6`}>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest">
                                                <Users className="size-3 text-accent-green" />
                                                Alumnos
                                            </div>
                                            <p className="text-lg font-bold">0</p>
                                        </div>
                                        <div className="space-y-1 text-right md:text-left">
                                            <div className="flex items-center justify-end md:justify-start gap-1.5 text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest">
                                                <TrendingUp className="size-3 text-accent-orange" />
                                                Progreso
                                            </div>
                                            <p className="text-lg font-bold">0%</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 mt-auto">
                                        <div className="flex-1">
                                            <Progress value={0} className="h-1.5 bg-surface" />
                                        </div>
                                        <Button
                                            variant="link"
                                            className="p-0 h-auto text-[10px] font-mono font-bold text-accent-blue tracking-widest shrink-0"
                                        >
                                            GESTIONAR <ArrowRight className="size-3 ml-1" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
