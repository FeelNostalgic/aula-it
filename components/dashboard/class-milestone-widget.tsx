"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Gift } from "lucide-react";
import { useGamification } from "@/hooks/use-gamification";

interface ClassMilestoneWidgetProps {
    milestone: {
        id: string;
        title: string;
        description: string | null;
        target_points: number;
        current_points: number;
        reward: string;
    } | null;
}

export function ClassMilestoneWidget({ milestone }: ClassMilestoneWidgetProps) {
    if (!milestone) return null;

    const progressPercentage = Math.min(
        100,
        Math.round((milestone.current_points / milestone.target_points) * 100)
    );

    return (
        <Card className="relative overflow-hidden border-none bg-linear-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

            <CardContent className="p-6 relative z-10 flex flex-col md:flex-row gap-6 md:items-center">
                <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-xs font-mono font-bold text-accent-blue uppercase tracking-widest flex items-center gap-2">
                                <Target className="size-3" />
                                Objetivo Global de la Clase
                            </h3>
                            <p className="text-xl font-bold text-foreground tracking-tight">
                                {milestone.title}
                            </p>
                            {milestone.description && (
                                <p className="text-sm text-text-muted mt-1 max-w-2xl">
                                    {milestone.description}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono font-medium">
                            <span className="text-text-muted">Progreso: {milestone.current_points.toLocaleString()} XP</span>
                            <span className="text-text-muted">Objetivo: {milestone.target_points.toLocaleString()} XP</span>
                        </div>
                        <Progress
                            value={progressPercentage}
                            className="h-2"
                            indicatorClassName="bg-linear-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                        />
                    </div>
                </div>

                <div className="md:w-64 shrink-0 bg-white/5 dark:bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex items-start gap-4">
                    <div className="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                        <Gift className="size-5" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Recompensa</p>
                        <p className="text-sm font-medium text-foreground">{milestone.reward}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
