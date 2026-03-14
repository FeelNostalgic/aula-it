"use client";

import Link from "next/link";
import {
    BookOpen, Terminal, Database, Globe, Network, Brain, Code,
    Crown, Gem, Star, Medal, Shield, Target, Hexagon, Zap,
    Cpu, Smartphone, Monitor, Cloud
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useModuleGamification } from "@/hooks/use-gamification";
import { cn } from "@/lib/utils";
import { ModuleRank } from "@/lib/gamification";
import { RankBadge } from "./rank-badge";
import { NextDueDisplay } from "./next-due-display";

const ICON_MAP: Record<string, any> = {
    BookOpen,
    Terminal,
    Database,
    Globe,
    Network,
    Brain,
    Code,
    Cpu,
    Shield,
    Smartphone,
    Monitor,
    Cloud,
};


type EnrichedModule = {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    icon_style?: string;
    custom_icon_url?: string | null;
    created_at: string;
    teacher_id: string;
    status: "active" | "completed" | "draft" | "archived";
    total_units?: number;
    completed_units?: number;
    module_xp?: number;
    next_due_step?: { title: string; due_date: string } | null;
};

interface StudentModuleCardProps {
    module: EnrichedModule;
    viewMode: "grid" | "list";
}

function ModuleIcon({ module, className, viewMode }: { module: any; className?: string; viewMode: "grid" | "list" }) {
    const Icon = ICON_MAP[module.icon] || BookOpen;

    if (module.custom_icon_url) {
        return (
            <div className={cn(
                "rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-surface border border-border-subtle",
                viewMode === "list" ? "size-10" : "size-12",
                className
            )}>
                <img src={module.custom_icon_url} alt={module.name} className="size-full object-cover" />
            </div>
        );
    }

    return (
        <div className={cn(
            "size-12 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-accent-blue group-hover:bg-accent-blue/10 transition-colors shrink-0",
            viewMode === "list" && "size-10 rounded-lg",
            className
        )}>
            <Icon className={viewMode === "list" ? "size-4" : "size-5"} />
        </div>
    );
}

export function StudentModuleCard({ module, viewMode }: StudentModuleCardProps) {
    const { moduleXp, moduleRank } = useModuleGamification(module.id, "student");
    const Icon = ICON_MAP[module.icon] || BookOpen;

    const statusConfigMap = {
        active: { color: "text-accent-green", bg: "bg-accent-green/10", border: "border-accent-green/20", label: "ACTIVO" },
        draft: { color: "text-accent-orange", bg: "bg-accent-orange/10", border: "border-accent-orange/20", label: "BORRADOR" },
        pending: { color: "text-accent-orange", bg: "bg-accent-orange/10", border: "border-accent-orange/20", label: "BORRADOR" },
        completed: { color: "text-accent-blue", bg: "bg-accent-blue/10", border: "border-accent-blue/20", label: "COMPLETADO" },
        archived: { color: "text-text-muted", bg: "bg-surface", border: "border-border-strong border-dashed", label: "ARCHIVADO" }
    };

    const statusConfig = statusConfigMap[module.status as keyof typeof statusConfigMap || "draft"];

    // Use initial data if hook is still loading the first time, to prevent flicker
    const displayXp = moduleXp > 0 ? moduleXp : (module.module_xp || 0);

    const totalUnits = module.total_units || 0;
    const completedUnits = module.completed_units || 0;
    const progressPercent = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

    const content = (
        <Card className={cn(
            "bg-surface-dark border-border-subtle hover:border-border-subtle/80 transition-all cursor-pointer group shadow-sm flex flex-col justify-center overflow-hidden h-full relative",
            viewMode === "list" && "flex-row items-center p-4 min-h-0"
        )}>
            {/* Module Rank strip / Corner */}
            {viewMode === "grid" && (
                <div className="absolute top-0 right-0 p-3 z-10">
                    <RankBadge rank={moduleRank} />
                </div>
            )}

            <div className={cn(
                "flex items-start gap-4 p-6",
                viewMode === "list" && "p-2 items-center w-full justify-between"
            )}>
                {/* Left side: Icon & Text */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <ModuleIcon module={module} viewMode={viewMode} />

                    <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-bold group-hover:text-accent-blue transition-colors truncate">
                                {module.name}
                            </CardTitle>
                            {viewMode === "list" && (
                                <RankBadge rank={moduleRank} />
                            )}
                        </div>
                        {viewMode === "grid" && (
                            <CardDescription className="text-xs text-text-muted line-clamp-1">
                                {module.description || "Sin descripción"}
                            </CardDescription>
                        )}
                    </div>
                </div>

                {/* List Mode extra info */}
                {viewMode === "list" && (
                    <div className="flex items-center gap-6 shrink-0">
                        <div className="w-32">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] text-text-muted font-bold tracking-widest">{completedUnits}/{totalUnits} U.D.</span>
                                <span className="text-[10px] text-foreground font-bold">{progressPercent}%</span>
                            </div>
                            <Progress value={progressPercent} className="h-1 shadow-inner bg-surface" />
                        </div>
                        {/* Próxima entrega */}
                        <div className="hidden lg:block">
                            <NextDueDisplay nextDueStep={module.next_due_step} viewMode="list" />
                        </div>
                        <div className="w-24 text-right">
                            <Badge variant="outline" className={`${statusConfig.bg} ${statusConfig.border} ${statusConfig.color} text-[9px] shadow-sm`}>
                                {statusConfig.label}
                            </Badge>
                        </div>
                    </div>
                )}
            </div>

            {/* Grid Mode Footer / Extra Info */}
            {viewMode === "grid" && (
                <div className="mt-auto px-6 pb-6 pt-2 space-y-4">
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{completedUnits} / {totalUnits} Unidades</span>
                            <span className="text-[10px] text-foreground font-bold">{progressPercent}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-1.5 bg-surface [&>div]:bg-accent-blue shadow-inner" />
                    </div>

                    <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                            <span className="text-[10px] block font-mono text-text-muted font-bold tracking-widest">EXP. MÓDULO</span>
                            <span className="text-sm font-black text-foreground font-mono">{displayXp.toLocaleString()} XP</span>
                        </div>

                        {statusConfig && (
                            <Badge variant="outline" className={`${statusConfig.bg} ${statusConfig.border} ${statusConfig.color} text-[9px] shadow-sm`}>
                                {statusConfig.label}
                            </Badge>
                        )}
                    </div>

                    {/* Próxima entrega */}
                    <div className="border-t border-border-subtle pt-3 mt-3">
                        <NextDueDisplay nextDueStep={module.next_due_step} viewMode="grid" />
                    </div>
                </div>
            )}
        </Card>
    );

    return (
        <Link href={`/dashboard/modules/${module.id}`} className={cn(
            "block group",
            viewMode === "grid" ? "h-full" : "w-full"
        )}>
            {content}
        </Link>
    );
}
