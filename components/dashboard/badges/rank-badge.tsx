"use client";

import { cn } from "@/lib/utils";
import {
    Crown, Gem, Star, Medal, Shield, Target, Hexagon
} from "lucide-react";

export const RANK_STYLE: Record<string, { icon: any; color: string; fill: string; bg: string; border: string }> = {
    'S': { icon: Crown, color: 'text-amber-400', fill: 'fill-amber-400/20', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
    'SS': { icon: Crown, color: 'text-amber-400', fill: 'fill-amber-400/20', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
    'A': { icon: Gem, color: 'text-fuchsia-400', fill: 'fill-fuchsia-400/20', bg: 'bg-fuchsia-400/10', border: 'border-fuchsia-400/30' },
    'A+': { icon: Gem, color: 'text-fuchsia-400', fill: 'fill-fuchsia-400/20', bg: 'bg-fuchsia-400/10', border: 'border-fuchsia-400/30' },
    'A-': { icon: Gem, color: 'text-fuchsia-400', fill: 'fill-fuchsia-400/20', bg: 'bg-fuchsia-400/10', border: 'border-fuchsia-400/30' },
    'B': { icon: Star, color: 'text-blue-400', fill: 'fill-blue-400/20', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
    'B+': { icon: Star, color: 'text-blue-400', fill: 'fill-blue-400/20', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
    'B-': { icon: Star, color: 'text-blue-400', fill: 'fill-blue-400/20', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
    'C': { icon: Medal, color: 'text-emerald-400', fill: 'fill-emerald-400/20', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
    'C+': { icon: Medal, color: 'text-emerald-400', fill: 'fill-emerald-400/20', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
    'C-': { icon: Medal, color: 'text-emerald-400', fill: 'fill-emerald-400/20', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
    'D': { icon: Shield, color: 'text-orange-400', fill: 'fill-orange-400/20', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
    'D+': { icon: Shield, color: 'text-orange-400', fill: 'fill-orange-400/20', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
    'D-': { icon: Shield, color: 'text-orange-400', fill: 'fill-orange-400/20', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
    'E': { icon: Target, color: 'text-rose-400', fill: 'fill-rose-400/20', bg: 'bg-rose-400/10', border: 'border-rose-400/30' },
    'E+': { icon: Target, color: 'text-rose-400', fill: 'fill-rose-400/20', bg: 'bg-rose-400/10', border: 'border-rose-400/30' },
    'E-': { icon: Target, color: 'text-rose-400', fill: 'fill-rose-400/20', bg: 'bg-rose-400/10', border: 'border-rose-400/30' },
    'F': { icon: Hexagon, color: 'text-slate-400', fill: 'fill-slate-400/20', bg: 'bg-slate-400/10', border: 'border-slate-400/30' },
    'F+': { icon: Hexagon, color: 'text-slate-400', fill: 'fill-slate-400/20', bg: 'bg-slate-400/10', border: 'border-slate-400/30' },
    'F-': { icon: Hexagon, color: 'text-slate-400', fill: 'fill-slate-400/20', bg: 'bg-slate-400/10', border: 'border-slate-400/30' },
};

interface RankBadgeProps {
    rank: string;
    showLabel?: boolean;
    className?: string;
}

export function RankBadge({ rank, showLabel = false, className }: RankBadgeProps) {
    const style = RANK_STYLE[rank] || RANK_STYLE['F'];
    const RankIcon = style.icon;

    return (
        <div className={cn(
            "flex items-center gap-2 px-2.5 py-1 rounded-full border shadow-sm transition-all shrink-0",
            style.bg, style.border, className
        )}>
            <RankIcon className={cn("size-3.5", style.color, style.fill)} />
            <span className={cn("text-xs font-black tracking-tight", style.color)}>
                {rank}
            </span>
            {showLabel && (
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 border-l border-border/50 pl-2">
                    Rango
                </span>
            )}
        </div>
    );
}
