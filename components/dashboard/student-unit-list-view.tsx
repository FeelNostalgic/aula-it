"use client";

import React from "react";
import {
    Clock,
    Zap,
    BarChart3,
    FileText,
    CheckSquare,
    Code,
    PenTool,
    Gamepad2,
    HelpCircle,
    Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getDurationConfig } from "@/lib/activity-config";

interface Activity {
    id: string;
    title: string;
    description: string | null;
    xp: number;
    duration: number | null;
    difficulty: string | null;
    status: 'published' | 'blocked' | 'draft';
    type?: string;
    phasesCount?: number;
    logo_url?: string | null;
    order_index: number;
}

interface StudentUnitListViewProps {
    unit: any;
    activities: Activity[];
    onStartActivity: (id: string) => void;
}

// Icon mapping function based on type
const getActivityIcon = (type: string) => {
    switch (type) {
        case 'theory': return <FileText className="size-5 text-blue-400" />;
        case 'quiz': return <CheckSquare className="size-5 text-orange-400" />;
        case 'code': return <Code className="size-5 text-emerald-400" />;
        case 'project': return <PenTool className="size-5 text-purple-400" />;
        case 'game': return <Gamepad2 className="size-5 text-pink-400" />;
        default: return <HelpCircle className="size-5 text-zinc-500" />;
    }
};

// Difficulty color helper
const getDifficultyConfig = (difficulty?: string | null) => {
    const val = difficulty?.toLowerCase();
    switch (val) {
        case 'fácil':
        case 'bajo':
        case 'easy':
            return { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Fácil" };
        case 'media':
        case 'medio':
        case 'medium':
        case 'normal':
            return { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Medio" };
        case 'difícil':
        case 'hard':
            return { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", label: "Difícil" };
        case 'experto':
        case 'expert':
        case 'alto':
            return { color: "text-red-500", bg: "bg-red-950/30", border: "border-red-900/40", label: "Experto" };
        default:
            return { color: "text-zinc-500", bg: "bg-zinc-900", border: "border-zinc-800", label: difficulty || "N/A" };
    }
};

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function StudentUnitListView({ unit, activities, onStartActivity }: StudentUnitListViewProps) {
    // Hidden drafts for students
    const visibleActivities = activities
        .filter(a => a.status !== 'draft')
        .sort((a, b) => a.order_index - b.order_index);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header section similar to Teacher's but cleaner */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    <h2 className="text-2xl font-bold text-white uppercase italic tracking-tight">
                        {unit.name}
                    </h2>
                </div>
                <div className="flex items-center gap-4 ml-4">
                    <Badge variant="outline" className="bg-zinc-900/50 border-zinc-800 text-zinc-500 text-[10px] font-mono font-bold">
                        {visibleActivities.length}
                    </Badge>
                    <span className="w-1 h-1 rounded-full bg-zinc-800" />
                    <span className="text-zinc-600 italic uppercase text-[10px] font-bold tracking-widest">Unidad Didáctica</span>
                </div>
            </div>

            <Tabs defaultValue="retos" className="w-full">
                <TabsList className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-1 h-auto inline-flex max-w-full justify-start overflow-x-auto mb-6">
                    <TabsTrigger
                        value="retos"
                        className="font-mono text-[10px] font-bold tracking-widest uppercase px-6 py-2.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md shrink-0 transition-all duration-300"
                    >
                        <Zap className="mr-2 size-3.5" />
                        RETOS
                    </TabsTrigger>
                    <TabsTrigger
                        value="recursos"
                        className="font-mono text-[10px] font-bold tracking-widest uppercase px-6 py-2.5 data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md shrink-0 transition-all duration-300"
                    >
                        <FileText className="mr-2 size-3.5" />
                        RECURSOS
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="retos" className="mt-0 focus-visible:outline-none">
                    {/* List of Activities - Mirroring Teacher's View */}
                    <div className="space-y-3 pb-12">
                        {visibleActivities.map((activity) => {
                            const isBlocked = activity.status === 'blocked';
                            const diffConfig = getDifficultyConfig(activity.difficulty);
                            const durationConfig = getDurationConfig(activity.duration);
                            const Icon = getActivityIcon(activity.type || 'theory');

                            return (
                                <div
                                    key={activity.id}
                                    onClick={() => !isBlocked && onStartActivity(activity.id)}
                                    className={cn(
                                        "group flex items-center gap-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 transition-all duration-300",
                                        !isBlocked
                                            ? "hover:border-blue-500/30 hover:bg-zinc-910/80 cursor-pointer hover:shadow-[0_0_20px_rgba(59,130,246,0.05)]"
                                            : "opacity-60 grayscale-[0.5]"
                                    )}
                                >
                                    {/* Icon/Logo */}
                                    <div className="shrink-0 relative">
                                        {activity.logo_url ? (
                                            <div className="size-12 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-inner">
                                                <img src={activity.logo_url} alt={activity.title} className="size-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="bg-zinc-950 size-12 rounded-xl border border-zinc-800 flex items-center justify-center shadow-inner group-hover:border-blue-500/20 transition-colors">
                                                {Icon}
                                            </div>
                                        )}
                                        {isBlocked && (
                                            <div className="absolute -top-1 -right-1 bg-zinc-950 rounded-full p-1 border border-zinc-800">
                                                <Lock className="size-3 text-zinc-500" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4 className={cn(
                                                "font-bold text-zinc-100 truncate transition-colors uppercase tracking-tight italic",
                                                !isBlocked && "group-hover:text-blue-400"
                                            )}>
                                                {activity.title}
                                            </h4>

                                            {isBlocked && (
                                                <Badge variant="outline" className="text-[9px] uppercase font-black px-1.5 py-0 border-zinc-800 text-zinc-500 bg-zinc-900/50 italic leading-none h-4">
                                                    Bloqueado
                                                </Badge>
                                            )}

                                            <div className={cn(
                                                "flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0 rounded border italic leading-none h-4 ml-1",
                                                diffConfig.bg, diffConfig.color, diffConfig.border
                                            )}>
                                                {diffConfig.label}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="text-xs text-zinc-500 truncate max-w-md italic">
                                                {activity.description || "Explora este desafío y completa tus objetivos."}
                                            </p>
                                            {activity.duration && (
                                                <span className={`text-[10px] flex items-center gap-1 shrink-0 font-bold uppercase tracking-tighter ${durationConfig.color}`}>
                                                    <Clock className="size-2.5" />
                                                    {activity.duration} min
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats - Compact layout like teacher's view */}
                                    <div className="hidden sm:flex items-center gap-6 mr-4">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] text-zinc-600 uppercase font-black tracking-tighter mb-0.5 italic">Experience</span>
                                            <div className="flex items-center gap-1 text-amber-500 font-black text-sm italic">
                                                <Zap className="size-3 fill-amber-500/20" />
                                                <span>{activity.xp}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] text-zinc-600 uppercase font-black tracking-tighter mb-0.5 italic">Estructura</span>
                                            <div className="flex items-center gap-1 text-blue-400 font-black text-sm italic">
                                                <BarChart3 className="size-3" />
                                                <span>{activity.phasesCount || 1}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Decorative arrow or lock */}
                                    <div className="ml-2 text-zinc-800 group-hover:text-blue-500 transition-all transform group-hover:translate-x-1">
                                        {!isBlocked ? (
                                            <Zap className="size-4 opacity-50 fill-current" />
                                        ) : (
                                            <Lock className="size-4 opacity-20" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {visibleActivities.length === 0 && (
                            <div className="bg-zinc-900/20 border border-dashed border-zinc-800/50 rounded-2xl flex flex-col items-center justify-center py-20 text-center">
                                <h3 className="text-zinc-500 font-bold uppercase italic tracking-widest text-sm">No hay retos disponibles todavía</h3>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="recursos" className="mt-0 focus-visible:outline-none">
                    <div className="bg-zinc-900/20 border border-dashed border-zinc-800/40 rounded-2xl flex flex-col items-center justify-center py-32 text-center">
                        <div className="size-16 rounded-full bg-zinc-800/30 flex items-center justify-center mb-6 border border-zinc-800/50 shadow-inner">
                            <FileText className="size-8 text-zinc-600 opacity-50" />
                        </div>
                        <h3 className="text-zinc-400 font-bold uppercase italic tracking-widest text-lg mb-2">Recursos de la Unidad</h3>
                        <p className="text-zinc-600 italic text-sm max-w-sm">Próximamente tendrás acceso a todo el material complementario de esta unidad aquí.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
