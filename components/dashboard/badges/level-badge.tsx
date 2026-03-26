"use client";

import { useGamification } from "@/hooks/use-gamification";
import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function LevelBadge() {
    const { globalLevel, streakDays, loading } = useGamification();

    if (loading) {
        return (
            <div className="flex items-center gap-1 bg-card border border-border/50 rounded-lg p-1 pr-3 animate-pulse">
                <div className="size-8 rounded-md bg-primary/10 border border-primary/20" />
                <div className="h-2 w-8 bg-muted rounded" />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4 uppercase font-mono tracking-widest text-[10px]">
            {streakDays > 0 && (
                <Badge variant="outline" className="bg-orange-500/10 border-orange-500/20 text-orange-500 px-4 py-1.5 rounded-lg flex items-center gap-2 hover:bg-orange-500/20 transition-colors cursor-default">
                    <Flame className="size-3 fill-orange-500" />
                    <span className="font-bold">{streakDays} {streakDays === 1 ? "DÍA ACTIVO" : "DÍAS ACTIVO"}</span>
                </Badge>
            )}

            <div
                className="flex items-center gap-1 bg-card border border-border/50 rounded-lg p-1 pr-3 hover:border-primary/50 transition-all cursor-default group"
                title={`${globalLevel.xpInCurrentLevel.toFixed(0)} / ${globalLevel.xpRequiredForNextLevel.toFixed(0)} XP para Nivel ${globalLevel.level + 1}`}
            >
                <div className="size-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold transition-all shadow-inner group-hover:bg-primary group-hover:text-primary-foreground">
                    {globalLevel.level}
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted-foreground transition-colors group-hover:text-foreground">NVL</span>
                    <div className="h-0.5 w-8 bg-primary/20 rounded-full mt-0.5 overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${globalLevel.progressPercentage}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
