"use client";

import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface NextDueDisplayProps {
    nextDueStep?: { title: string; due_date: string } | null;
    viewMode: 'grid' | 'list';
}

export function NextDueDisplay({ nextDueStep, viewMode }: NextDueDisplayProps) {
    return (
        <div className={cn(
            "bg-surface border border-border-subtle rounded-xl flex items-center gap-3 transition-colors",
            viewMode === 'grid' ? "p-3 min-h-[68px]" : "p-2 w-[350px] min-h-[54px]"
        )}>
            <div className={cn(
                "rounded-lg bg-surface-dark border border-border-subtle flex items-center justify-center text-text-muted shrink-0",
                viewMode === 'grid' ? "size-10" : "size-8"
            )}>
                <Terminal className={viewMode === 'grid' ? "size-4" : "size-3.5"} />
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase tracking-widest font-bold text-text-muted leading-tight">Próxima entrega</span>
                <span className={cn(
                    "text-xs font-bold text-foreground truncate leading-snug",
                    !nextDueStep && "text-text-muted/50 font-normal"
                )}>
                    {nextDueStep ? nextDueStep.title : "Sin definir"}
                </span>
                {nextDueStep && (
                    <span className="text-[10px] text-text-muted leading-tight">
                        {new Date(nextDueStep.due_date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                    </span>
                )}
            </div>
        </div>
    );
}
