"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { ActivityStepWithClientState, CompletionMode, STEP_XP_AWARD_TRIGGER, type StepXpAwardTrigger } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap, HelpCircle, Minus, ClipboardCheck, Eye, ChevronDown, Send, Star } from "lucide-react";
import { updateStepXp, updateStepCompletionMode, updateStepXpAwardTrigger } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isSubmissionStepType } from "@/lib/activity-progression";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Shared UI primitives (used by quiz-editor and other editors)
// ---------------------------------------------------------------------------

export interface ConfigSectionState {
    isSectionOpen: (sectionId: string) => boolean;
    toggleSection: (sectionId: string) => void;
}

function readStoredSections(storageKey: string): Record<string, boolean> {
    if (typeof window === "undefined") return {};
    try {
        const raw = localStorage.getItem(storageKey);
        return raw ? JSON.parse(raw) as Record<string, boolean> : {};
    } catch {
        return {};
    }
}

export function useConfigSectionState(stepId: string, sectionIds: string[]) {
    const storageKey = `aula-it:activity-step:${stepId}:config-sections`;
    const activeStorageKeyRef = useRef(storageKey);
    const visibleKey = sectionIds.join("|");
    const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => readStoredSections(storageKey));

    useEffect(() => {
        activeStorageKeyRef.current = storageKey;
        setOpenSections(readStoredSections(storageKey));
    }, [storageKey]);

    useEffect(() => {
        setOpenSections(prev => {
            let changed = false;
            const next = { ...prev };
            for (const sectionId of sectionIds) {
                if (next[sectionId] === undefined) {
                    next[sectionId] = true;
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [visibleKey]);

    useEffect(() => {
        if (activeStorageKeyRef.current !== storageKey) return;
        try {
            localStorage.setItem(storageKey, JSON.stringify(openSections));
        } catch {}
    }, [storageKey, openSections]);

    const isSectionOpen = (sectionId: string) => openSections[sectionId] ?? true;
    const toggleSection = (sectionId: string) => {
        setOpenSections(prev => ({ ...prev, [sectionId]: !(prev[sectionId] ?? true) }));
    };
    const setAllSectionsOpen = (open: boolean) => {
        setOpenSections(prev => {
            const next = { ...prev };
            for (const sectionId of sectionIds) next[sectionId] = open;
            return next;
        });
    };
    const allSectionsOpen = sectionIds.length > 0 && sectionIds.every(sectionId => isSectionOpen(sectionId));

    return { isSectionOpen, toggleSection, setAllSectionsOpen, allSectionsOpen };
}

export function ConfigSectionsToolbar({
    allSectionsOpen,
    onToggleAll,
}: {
    allSectionsOpen: boolean;
    onToggleAll: () => void;
}) {
    return (
        <div className="flex justify-end">
            <button
                type="button"
                onClick={onToggleAll}
                className="rounded-md border border-border/50 bg-surface px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-surface-dark hover:text-foreground"
            >
                {allSectionsOpen ? "Colapsar todo" : "Abrir todo"}
            </button>
        </div>
    );
}

export function ConfigSection({
    title,
    children,
    sectionId,
    open = true,
    onToggle,
    headerRight,
    contentClassName,
}: {
    title: ReactNode;
    children: ReactNode;
    sectionId?: string;
    open?: boolean;
    onToggle?: () => void;
    headerRight?: ReactNode;
    contentClassName?: string;
}) {
    const panelId = sectionId ? `config-section-${sectionId}` : undefined;
    const titleNode = (
        <span className="text-xs font-bold text-foreground uppercase tracking-widest">{title}</span>
    );

    return (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-surface-dark shadow-sm">
            <div className="flex items-center gap-3 border-b border-border/50 bg-surface/70 px-5 py-3">
                {onToggle ? (
                    <button
                        type="button"
                        onClick={onToggle}
                        aria-expanded={open}
                        aria-controls={panelId}
                        className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                    >
                        {titleNode}
                        <ChevronDown className={cn("size-4 shrink-0 text-text-muted transition-transform", !open && "-rotate-90")} />
                    </button>
                ) : (
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        {titleNode}
                    </div>
                )}
                {headerRight && <div className="shrink-0">{headerRight}</div>}
            </div>
            {open && (
                <div id={panelId} className={cn("p-5", contentClassName ?? "space-y-4")}>
                    {children}
                </div>
            )}
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
    sectionState?: ConfigSectionState;
}

export function StepConfigSection({ step, onUpdateStep, sectionState }: StepConfigSectionProps) {
    const [xp, setXp] = useState<string>(step.xp?.toString() || "0");
    const [completionMode, setCompletionMode] = useState<CompletionMode>(step.completion_mode ?? "none");
    const [xpAwardTrigger, setXpAwardTrigger] = useState<StepXpAwardTrigger>(step.xp_award_trigger ?? STEP_XP_AWARD_TRIGGER.GRADE);
    const xpTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const modeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const triggerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const showsSubmissionTrigger = isSubmissionStepType(step.type);

    useEffect(() => {
        setXp(step.xp?.toString() || "0");
        setCompletionMode(step.completion_mode ?? "none");
        setXpAwardTrigger(step.xp_award_trigger ?? STEP_XP_AWARD_TRIGGER.GRADE);
    }, [step.id, step.xp, step.completion_mode, step.xp_award_trigger]);

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

    const handleXpAwardTriggerChange = (trigger: StepXpAwardTrigger) => {
        setXpAwardTrigger(trigger);
        onUpdateStep({ ...step, xp_award_trigger: trigger });
        if (triggerTimeoutRef.current) clearTimeout(triggerTimeoutRef.current);
        triggerTimeoutRef.current = setTimeout(async () => {
            const res = await updateStepXpAwardTrigger(step.id, trigger);
            if (res.error) toast.error("Error al guardar cuándo se entrega la XP");
        }, 1000);
    };

    const xpNum = parseInt(xp, 10);

    return (
        <>
            <ConfigSection
                title="Experiencia"
                sectionId="experience"
                open={sectionState?.isSectionOpen("experience")}
                onToggle={sectionState ? () => sectionState.toggleSection("experience") : undefined}
            >
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

            <ConfigSection
                title="Modo de Completado"
                sectionId="completion-mode"
                open={sectionState?.isSectionOpen("completion-mode")}
                onToggle={sectionState ? () => sectionState.toggleSection("completion-mode") : undefined}
            >
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
                    <strong className="text-foreground/70">Obligatorio</strong> — el alumno debe completarlo para avanzar; en pasos pasivos se marca manualmente y en entregas depende del trigger real.<br />
                    <strong className="text-foreground/70">Visualizable</strong> — el alumno la marca como visto manualmente.
                </p>
            </ConfigSection>

            {showsSubmissionTrigger && (
                <ConfigSection
                    title="Entrega de XP"
                    sectionId="xp-award-trigger"
                    open={sectionState?.isSectionOpen("xp-award-trigger")}
                    onToggle={sectionState ? () => sectionState.toggleSection("xp-award-trigger") : undefined}
                >
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            variant={xpAwardTrigger === STEP_XP_AWARD_TRIGGER.SUBMIT ? "default" : "outline"}
                            className="h-8 px-3 text-xs gap-1.5"
                            onClick={() => handleXpAwardTriggerChange(STEP_XP_AWARD_TRIGGER.SUBMIT)}
                        >
                            <Send className="size-3.5" /> Al enviar
                        </Button>
                        <Button
                            size="sm"
                            variant={xpAwardTrigger === STEP_XP_AWARD_TRIGGER.GRADE ? "default" : "outline"}
                            className="h-8 px-3 text-xs gap-1.5"
                            onClick={() => handleXpAwardTriggerChange(STEP_XP_AWARD_TRIGGER.GRADE)}
                        >
                            <Star className="size-3.5" /> Al corregir
                        </Button>
                    </div>
                    <p className="text-xs text-text-muted/70 leading-relaxed">
                        <strong className="text-foreground/70">Al enviar</strong> — concede XP en la primera entrega valida.<br />
                        <strong className="text-foreground/70">Al corregir</strong> — espera a que la submission pase a corregida/publicada.
                    </p>
                </ConfigSection>
            )}
        </>
    );
}
