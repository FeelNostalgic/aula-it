"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, CompletionMode } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap, HelpCircle, Minus, ClipboardCheck, Eye } from "lucide-react";
import { updateStepXp, updateStepCompletionMode } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Shared UI primitives (used by quiz-editor and other editors)
// ---------------------------------------------------------------------------

export function ConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
            <div className="px-5 py-2.5 border-b border-white/5 bg-white/2">
                <span className="text-xs font-bold text-text-muted uppercase tracking-widest">{title}</span>
            </div>
            <div className="p-5 space-y-4">
                {children}
            </div>
        </div>
    );
}

export function ConfigToggle({
    checked, onChange, label, description,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    description: string;
}) {
    return (
        <label className="flex items-start gap-3 cursor-pointer group">
            <div className="mt-0.5 shrink-0">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="accent-accent-blue size-4"
                />
            </div>
            <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground group-hover:text-white transition-colors">{label}</p>
                <p className="text-xs text-text-muted/70 leading-relaxed">{description}</p>
            </div>
        </label>
    );
}

// ---------------------------------------------------------------------------
// Step-level config section (XP + completion mode)
// ---------------------------------------------------------------------------

interface StepConfigSectionProps {
    step: ActivityStepWithClientState;
    onUpdateStep: (updated: ActivityStepWithClientState) => void;
}

export function StepConfigSection({ step, onUpdateStep }: StepConfigSectionProps) {
    const [xp, setXp] = useState<string>(step.xp?.toString() || "0");
    const [completionMode, setCompletionMode] = useState<CompletionMode>(step.completion_mode ?? "none");
    const xpTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const modeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setXp(step.xp?.toString() || "0");
        setCompletionMode(step.completion_mode ?? "none");
    }, [step.id]);

    const handleXpChange = (val: string) => {
        setXp(val);
        const numVal = parseInt(val, 10);
        const finalVal = isNaN(numVal) ? 0 : numVal;
        onUpdateStep({ ...step, xp: finalVal });
        if (xpTimeoutRef.current) clearTimeout(xpTimeoutRef.current);
        xpTimeoutRef.current = setTimeout(async () => {
            const res = await updateStepXp(step.id, finalVal);
            if (res.error) toast.error("Error al guardar XP");
        }, 1000);
    };

    const handleModeChange = (mode: CompletionMode) => {
        setCompletionMode(mode);
        onUpdateStep({ ...step, completion_mode: mode });
        if (modeTimeoutRef.current) clearTimeout(modeTimeoutRef.current);
        modeTimeoutRef.current = setTimeout(async () => {
            const res = await updateStepCompletionMode(step.id, mode);
            if (res.error) toast.error("Error al guardar el modo de completado");
        }, 1000);
    };

    const xpNum = parseInt(xp, 10);

    return (
        <>
            <ConfigSection title="Experiencia">
                <div className="flex items-center gap-3">
                    <Zap className={`size-4 shrink-0 ${xpNum > 500 ? "text-accent-amber" : xpNum > 0 ? "text-accent-blue" : "text-text-muted/40"}`} />
                    <Input
                        type="number"
                        min="0"
                        value={xp}
                        onChange={(e) => handleXpChange(e.target.value)}
                        className={`w-24 h-8 text-sm bg-surface border-border px-2 font-mono ${xpNum > 500
                            ? "text-accent-amber border-accent-amber/50 focus-visible:ring-accent-amber"
                            : xpNum > 0
                                ? "text-accent-blue focus-visible:ring-accent-blue"
                                : "text-text-muted opacity-60"
                            }`}
                    />
                    <span className="text-sm text-text-muted">XP</span>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <HelpCircle className="size-3.5 text-text-muted hover:text-accent-blue transition-colors cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs p-4 space-y-2 bg-surface-dark border-border-subtle shadow-xl">
                                <p className="font-bold text-accent-blue text-xs uppercase tracking-wider text-center">Guía de Recompensas</p>
                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                    <div className="bg-surface/50 p-1.5 rounded border border-border/30">
                                        <p className="font-bold text-foreground">Teoría</p>
                                        <p className="text-text-muted">10 - 50 XP</p>
                                    </div>
                                    <div className="bg-surface/50 p-1.5 rounded border border-border/30">
                                        <p className="font-bold text-foreground">Ejercicios</p>
                                        <p className="text-text-muted">50 - 150 XP</p>
                                    </div>
                                    <div className="bg-surface/50 p-1.5 rounded border border-border/30">
                                        <p className="font-bold text-foreground">Entregables</p>
                                        <p className="text-text-muted">200 - 500 XP</p>
                                    </div>
                                    <div className="bg-surface/50 p-1.5 rounded border border-border/30">
                                        <p className="font-bold text-accent-blue">Críticos</p>
                                        <p className="text-text-muted">500+ XP</p>
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </ConfigSection>

            <ConfigSection title="Modo de Completado">
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant={completionMode === "none" ? "default" : "outline"}
                        className="h-8 px-3 text-xs gap-1.5"
                        onClick={() => handleModeChange("none")}
                    >
                        <Minus className="size-3.5" /> Ninguno
                    </Button>
                    <Button
                        size="sm"
                        variant={completionMode === "required" ? "default" : "outline"}
                        className="h-8 px-3 text-xs gap-1.5"
                        onClick={() => handleModeChange("required")}
                    >
                        <ClipboardCheck className="size-3.5" /> Obligatorio
                    </Button>
                    <Button
                        size="sm"
                        variant={completionMode === "viewable" ? "default" : "outline"}
                        className="h-8 px-3 text-xs gap-1.5"
                        onClick={() => handleModeChange("viewable")}
                    >
                        <Eye className="size-3.5" /> Visualizable
                    </Button>
                </div>
                <p className="text-xs text-text-muted/70 leading-relaxed">
                    <strong className="text-foreground/70">Ninguno</strong> — sin seguimiento.<br />
                    <strong className="text-foreground/70">Obligatorio</strong> — el alumno debe completarlo para avanzar, se marca como completado automaticamente al finalizar.<br />
                    <strong className="text-foreground/70">Visualizable</strong> — el alumno la marca como visto manualmente.
                </p>
            </ConfigSection>
        </>
    );
}
