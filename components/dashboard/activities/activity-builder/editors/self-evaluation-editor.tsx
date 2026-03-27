"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, SelfEvaluationContent, RubricCriteria, ActivityPhaseWithSteps } from "@/types/activity";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { ListChecks, FileText } from "lucide-react";
import { RubricBuilderModal } from "@/components/dashboard/shared/rubric-builder-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StepConfigSection } from "./step-config-section";
import { cn } from "@/lib/utils";

interface SelfEvaluationEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
    phases?: ActivityPhaseWithSteps[];
}

const defaultContent: SelfEvaluationContent = {
    rubric: [],
    requireJustification: false,
    countsTowardGrade: false,
    instructionsMarkdown: "",
};

export function SelfEvaluationEditor({ step, onUpdate, phases }: SelfEvaluationEditorProps) {
    const [content, setContent] = useState<SelfEvaluationContent>(
        (step.content as SelfEvaluationContent) || defaultContent
    );
    const [isSaving, setIsSaving] = useState(false);
    const [rubricModalOpen, setRubricModalOpen] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setContent((step.content as SelfEvaluationContent) || defaultContent);
    }, [step.id, step.content]);

    const save = (newContent: SelfEvaluationContent) => {
        setContent(newContent);
        onUpdate({ ...step, content: newContent });
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSaving(true);
        timeoutRef.current = setTimeout(async () => {
            const res = await updateStepContent(step.id, newContent);
            if (res.error) toast.error("Error al guardar");
            setIsSaving(false);
        }, 800);
    };

    // All deliverable/file_upload steps across all phases (for reference step selector)
    const deliverableSteps = (phases ?? []).flatMap(p =>
        p.steps.filter(s => s.type === "deliverable" || s.type === "file_upload")
    );

    const tabTriggerClass = "h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:text-foreground text-text-muted bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none";

    return (
        <Tabs defaultValue="configuracion" className="flex flex-col h-full w-full bg-background">
            <div className="shrink-0 border-b border-border/50 bg-surface-dark/10 px-4 flex items-center gap-2">
                <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
                    <TabsTrigger value="instrucciones" className={tabTriggerClass}>Instrucciones</TabsTrigger>
                    <TabsTrigger value="configuracion" className={tabTriggerClass}>Configuración</TabsTrigger>
                </TabsList>
                <div className="ml-auto">
                    {isSaving
                        ? <span className="text-[10px] text-accent-blue animate-pulse">Guardando...</span>
                        : <span className="text-[10px] text-text-muted/50">Guardado automáticamente</span>
                    }
                </div>
            </div>

            {/* Instrucciones tab */}
            <TabsContent value="instrucciones" className="mt-0 flex-1 min-h-0 overflow-hidden data-[state=inactive]:hidden">
                <Textarea
                    value={content.instructionsMarkdown || ""}
                    onChange={(e) => save({ ...content, instructionsMarkdown: e.target.value })}
                    className="h-full w-full resize-none border-none focus-visible:ring-0 rounded-none bg-transparent p-6 text-foreground font-mono text-sm leading-relaxed"
                    placeholder="# Instrucciones de autoevaluación..."
                />
            </TabsContent>

            {/* Configuración tab */}
            <TabsContent value="configuracion" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-8 space-y-4">
                    <div className="mb-2">
                        <h3 className="text-lg font-bold text-foreground">Configuración de Autoevaluación</h3>
                        <p className="text-sm text-text-muted mt-1">El alumno se evalúa con la rúbrica que configures aquí.</p>
                    </div>

                    <StepConfigSection step={step} onUpdateStep={onUpdate} />

                    {/* Rubric */}
                    <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                        <div className="px-5 py-2.5 border-b border-white/5 bg-white/2">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Rúbrica</span>
                        </div>
                        <div className="p-5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRubricModalOpen(true)}
                                className="h-8 text-xs gap-1.5 border-border/50 text-text-muted hover:text-foreground"
                            >
                                <ListChecks className="size-3.5" />
                                {(content.rubric?.length ?? 0) > 0
                                    ? `Editar rúbrica (${content.rubric!.length} ${content.rubric!.length === 1 ? "criterio" : "criterios"})`
                                    : "Configurar rúbrica"}
                            </Button>
                        </div>
                    </div>
                    <RubricBuilderModal
                        rubric={content.rubric ?? []}
                        open={rubricModalOpen}
                        onClose={() => setRubricModalOpen(false)}
                        onChange={(rubric: RubricCriteria[]) => save({ ...content, rubric })}
                    />

                    {/* Reference step selector */}
                    {deliverableSteps.length > 0 && (
                        <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                            <div className="px-5 py-2.5 border-b border-white/5 bg-white/2">
                                <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Entregable de Referencia</span>
                            </div>
                            <div className="p-5 space-y-2">
                                <p className="text-xs text-text-muted">
                                    Muestra la entrega del alumno como contexto mientras se autoevalúa (opcional).
                                </p>
                                <select
                                    value={content.referenceStepId ?? ""}
                                    onChange={(e) => save({ ...content, referenceStepId: e.target.value || undefined })}
                                    className="h-9 w-full rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                >
                                    <option value="">Sin referencia</option>
                                    {deliverableSteps.map(s => (
                                        <option key={s.id} value={s.id}>{s.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Options */}
                    <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                        <div className="px-5 py-2.5 border-b border-white/5 bg-white/2">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Opciones</span>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Require justification */}
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm text-foreground font-medium">Justificación obligatoria</p>
                                    <p className="text-xs text-text-muted mt-0.5">El alumno debe escribir un texto por criterio.</p>
                                </div>
                                <button
                                    role="switch"
                                    aria-checked={content.requireJustification}
                                    onClick={() => save({ ...content, requireJustification: !content.requireJustification })}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                                        content.requireJustification ? "bg-accent-blue" : "bg-surface-dark border border-border/50"
                                    )}
                                >
                                    <span className={cn(
                                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                                        content.requireJustification ? "translate-x-5" : "translate-x-0"
                                    )} />
                                </button>
                            </div>

                            {/* Counts toward grade */}
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm text-foreground font-medium">Contribuye a la nota</p>
                                    <p className="text-xs text-text-muted mt-0.5">La autoevaluación pondera en la nota final.</p>
                                </div>
                                <button
                                    role="switch"
                                    aria-checked={content.countsTowardGrade}
                                    onClick={() => save({ ...content, countsTowardGrade: !content.countsTowardGrade })}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                                        content.countsTowardGrade ? "bg-accent-blue" : "bg-surface-dark border border-border/50"
                                    )}
                                >
                                    <span className={cn(
                                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                                        content.countsTowardGrade ? "translate-x-5" : "translate-x-0"
                                    )} />
                                </button>
                            </div>

                            {/* Weight slider — only if counts toward grade */}
                            {content.countsTowardGrade && (
                                <div className="space-y-2 pt-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-foreground font-medium">Peso de la autoevaluación</p>
                                        <span className="text-sm font-mono font-bold text-accent-blue">{content.selfEvalWeight ?? 20}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={5}
                                        max={50}
                                        step={5}
                                        value={content.selfEvalWeight ?? 20}
                                        onChange={(e) => save({ ...content, selfEvalWeight: Number(e.target.value) })}
                                        className="w-full accent-accent-blue"
                                    />
                                    <p className="text-xs text-text-muted">
                                        Nota final = {content.selfEvalWeight ?? 20}% autoevaluación + {100 - (content.selfEvalWeight ?? 20)}% nota del profesor.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
    );
}
