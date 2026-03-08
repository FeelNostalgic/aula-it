"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Gift, Trophy, ArrowRight } from "lucide-react";
import { ClassMilestone } from "@/types/database";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ClassMilestoneWidgetProps {
    milestones: ClassMilestone[];
    activeMilestone: ClassMilestone | null;
    label?: string;
}

export function ClassMilestoneWidget({ milestones, activeMilestone, label }: ClassMilestoneWidgetProps) {
    // Only show active or completed milestones in the progression
    const visibleMilestones = [...milestones]
        .filter(m => m.status === 'active' || m.status === 'completed')
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const currentActive = activeMilestone && activeMilestone.status === 'active'
        ? activeMilestone
        : visibleMilestones.find(m => m.status === 'active') || null;

    const isActuallyCompleted = visibleMilestones.length > 0 && visibleMilestones.every(m => m.status === 'completed');

    if (visibleMilestones.length === 0) return null;

    if (isActuallyCompleted) {
        const lastCompleted = visibleMilestones[visibleMilestones.length - 1];
        return (
            <Card className="relative overflow-hidden border-none bg-linear-to-br from-emerald-500/20 via-teal-500/10 to-transparent backdrop-blur-md shadow-2xl border border-white/10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 flex flex-col items-center text-center gap-4"
                >
                    <div className="size-20 rounded-2xl bg-accent-green/20 flex items-center justify-center text-accent-green border border-accent-green/30 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                        <Trophy className="size-10" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-foreground tracking-tighter uppercase whitespace-nowrap">¡Misión Cumplida!</h3>
                        <p className="text-sm text-text-muted max-w-[280px]">Habéis conquistado todos los objetivos de esta unidad. ¡Excelente trabajo!</p>
                    </div>
                    {lastCompleted?.reward && (
                        <div className="mt-2 px-6 py-3 bg-white/5 border border-white/10 rounded-full flex items-center gap-3">
                            <Gift className="size-4 text-accent-green" />
                            <span className="text-sm font-bold text-foreground">{lastCompleted.reward}</span>
                        </div>
                    )}
                </motion.div>
            </Card>
        );
    }

    if (!currentActive) return null;

    const currentIndex = visibleMilestones.findIndex(m => m.id === currentActive.id);
    const totalCount = visibleMilestones.length;

    // Cumulative progress calculation
    const cumulativeGoal = visibleMilestones.reduce((acc, m) => acc + m.target_points, 0);
    const cumulativeProgress = visibleMilestones.reduce((acc, m, idx) => {
        if (idx < currentIndex) return acc + m.target_points;
        if (idx === currentIndex) return acc + m.current_points;
        return acc;
    }, 0);

    const progressPercentage = Math.min(100, Math.round((cumulativeProgress / cumulativeGoal) * 100));

    return (
        <TooltipProvider>
            <Card className="relative overflow-hidden border-none bg-linear-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/5 backdrop-blur-xl border border-white/5 group">
                {/* Decorative gradients */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none transition-colors duration-1000" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] -ml-32 -mb-32 pointer-events-none" />

                <CardContent className="p-6 relative z-10 flex flex-col gap-8">
                    {/* Header Info & Persisent Reward Card */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-[10px] font-black text-accent-blue uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Target className="size-3" />
                                    {label ?? "Camino de la Unidad"}
                                </h3>
                                <div className="h-px w-8 bg-accent-blue/30" />
                                <span className="text-[10px] font-bold bg-accent-blue/10 text-accent-blue px-2.5 py-1 rounded-md border border-accent-blue/20">
                                    {currentIndex + 1} / {totalCount} HITOS
                                </span>
                            </div>
                            <h2 className="text-3xl font-black text-foreground tracking-tighter leading-none">
                                {currentActive.title}
                            </h2>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-baseline gap-1 font-mono">
                                    <span className="text-xl font-black text-foreground">{cumulativeProgress.toLocaleString()}</span>
                                    <span className="text-xs font-bold text-text-muted uppercase"> / {cumulativeGoal.toLocaleString()} XP</span>
                                </div>
                                <div className="h-4 w-px bg-white/10 mx-1" />
                            </div>
                        </div>

                        {/* Persistent Reward Card (Visible without hover) */}
                        <motion.div
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="lg:w-80 shrink-0 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-xl backdrop-blur-md relative overflow-hidden group/reward transition-all hover:bg-white/10 hover:border-amber-500/20"
                        >
                            <div className="absolute inset-0 bg-linear-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover/reward:opacity-100 transition-opacity duration-500" />

                            {/* Icon container with more punch */}
                            <div className="relative size-12 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 shrink-0 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)] group-hover/reward:scale-110 transition-transform duration-500">
                                <div className="absolute inset-0 bg-amber-500/20 blur-lg rounded-full opacity-0 group-hover/reward:opacity-100 transition-opacity" />
                                <Gift className="size-6 relative z-10" />
                            </div>

                            <div className="space-y-1 relative z-10 flex-1">
                                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] opacity-80 leading-none">
                                    Recompensa Hito
                                </h4>
                                <p className="text-sm font-bold text-foreground leading-tight tracking-tight mt-1.5 line-clamp-2">
                                    {currentActive.reward}
                                </p>
                            </div>

                            {/* Decorative element */}
                            <div className="absolute -right-4 -bottom-4 size-20 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                        </motion.div>
                    </div>

                    {/* Main Cumulative Progress Bar */}
                    <div className="relative pt-8 pb-4">
                        {/* The Markers (Orange Theme) */}
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-start">
                            {visibleMilestones.map((m, idx) => {
                                // Calculate position for each milestone end point
                                const milestoneEndXP = visibleMilestones.slice(0, idx + 1).reduce((acc, current) => acc + current.target_points, 0);
                                const pos = (milestoneEndXP / cumulativeGoal) * 100;
                                const isFulfilled = cumulativeProgress >= milestoneEndXP;
                                const isNext = !isFulfilled && idx === currentIndex;

                                return (
                                    <div
                                        key={m.id}
                                        className="absolute -top-1 transition-all duration-700 ease-out pointer-events-auto"
                                        style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
                                    >
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <motion.button
                                                    whileHover={{ scale: 1.2, y: -2 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    className={cn(
                                                        "relative size-8 rounded-xl flex items-center justify-center transition-all duration-500",
                                                        "border backdrop-blur-md shadow-lg",
                                                        isFulfilled
                                                            ? "bg-accent-green/20 border-accent-green/40 text-accent-green"
                                                            : isNext
                                                                ? "bg-amber-500/20 border-amber-500/50 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                                                                : "bg-amber-500/5 border-amber-500/20 text-amber-500/40 opacity-70"
                                                    )}
                                                >
                                                    {isNext && (
                                                        <motion.div
                                                            layoutId="active-ring"
                                                            className="absolute inset-0 rounded-xl border-2 border-amber-500/50"
                                                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                                                            transition={{ repeat: Infinity, duration: 2 }}
                                                        />
                                                    )}
                                                    <Gift className={cn("size-4", isFulfilled && "animate-bounce")} />
                                                    {/* Vertical indicator line */}
                                                    <div className={cn(
                                                        "absolute top-full w-0.5 h-10 mt-1 transition-all duration-1000",
                                                        isFulfilled ? "bg-accent-green/40" : isNext ? "bg-amber-500/40" : "bg-white/5"
                                                    )} />
                                                </motion.button>
                                            </TooltipTrigger>
                                            <TooltipContent
                                                side="top"
                                                className="bg-zinc-800 border-white/10 text-white p-3 shadow-2xl backdrop-blur-xl max-w-[200px]"
                                            >
                                                <div className="space-y-1.5">
                                                    <p className="font-black text-[10px] uppercase tracking-tighter text-amber-500">RECOMPENSA HITO {idx + 1}</p>
                                                    <p className="font-bold text-sm tracking-tight leading-tight">{m.title}</p>
                                                    <p className="text-xs text-zinc-300 leading-relaxed font-medium">{m.reward}</p>
                                                    <div className="pt-2 flex items-center justify-between border-t border-white/10 mt-2">
                                                        <span className="text-[9px] font-bold text-zinc-500 uppercase">{m.target_points} XP</span>
                                                        {isFulfilled && <span className="text-[9px] font-black text-accent-green uppercase">CONSEGUIDO</span>}
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                );
                            })}
                        </div>

                        {/* The Actual Progress Line */}
                        <div className="relative h-4 w-full bg-surface-dark/50 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                                className="absolute top-0 left-0 h-full bg-linear-to-r from-indigo-600 via-indigo-500 to-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                            >
                                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer scale-150 pointer-events-none" />
                            </motion.div>
                        </div>

                        {/* Progression segments */}
                        <div className="flex items-center gap-1.5 mt-6 px-1">
                            {visibleMilestones.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "h-1 rounded-full transition-all duration-1000",
                                        idx <= currentIndex ? "flex-1 bg-accent-blue/30" : "w-4 bg-white/5"
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TooltipProvider>
    );
}
