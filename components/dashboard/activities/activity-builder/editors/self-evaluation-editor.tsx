"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, SelfEvaluationContent, RubricCriteria, ActivityPhaseWithSteps, EvalQuestion } from "@/types/activity";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { ListChecks, MessageSquare, Plus, Trash2, PanelRightClose, PanelRightOpen } from "lucide-react";
import { RubricBuilderModal } from "@/components/dashboard/shared/rubric-builder-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StepConfigSection } from "./step-config-section";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface SelfEvaluationEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
    phases?: ActivityPhaseWithSteps[];
}

const defaultContent: SelfEvaluationContent = {
    evalMode: "rubric",
    rubric: [],
    questions: [],
    requireJustification: false,
    countsTowardGrade: false,
    instructionsMarkdown: "",
};

function generateId() {
    return Math.random().toString(36).slice(2, 10);
}

export function SelfEvaluationEditor({ step, onUpdate, phases }: SelfEvaluationEditorProps) {
    const [content, setContent] = useState<SelfEvaluationContent>(
        (step.content as SelfEvaluationContent) || defaultContent
    );
    const [isSaving, setIsSaving] = useState(false);
    const [rubricModalOpen, setRubricModalOpen] = useState(false);
    const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
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

    const deliverableSteps = (phases ?? []).flatMap(p =>
        p.steps.filter(s => s.type === "deliverable" || s.type === "file_upload")
    );

    const evalMode = content.evalMode ?? "rubric";
    const questions = content.questions ?? [];

    function addQuestion() {
        save({ ...content, questions: [...questions, { id: generateId(), text: "", description: "" }] });
    }

    function updateQuestion(id: string, patch: Partial<EvalQuestion>) {
        save({ ...content, questions: questions.map(q => q.id === id ? { ...q, ...patch } : q) });
    }

    function removeQuestion(id: string) {
        save({ ...content, questions: questions.filter(q => q.id !== id) });
    }

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

            {/* Instrucciones tab — split markdown preview */}
            <TabsContent value="instrucciones" className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
                <div className="flex h-full overflow-hidden min-h-0">
                    <ResizablePanelGroup direction="horizontal">
                        <ResizablePanel defaultSize={50} minSize={30}>
                            <div className="flex flex-col h-full bg-surface-dark/20 relative min-h-0">
                                <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50 justify-between">
                                    <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Instrucciones (Markdown)</span>
                                    <button
                                        onClick={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
                                        className="text-text-muted hover:text-foreground transition-colors flex items-center gap-1 bg-surface border border-border-subtle rounded-md px-2 py-1 shadow-sm h-7"
                                        title={isPreviewCollapsed ? "Expandir Vista Previa" : "Ocultar Vista Previa"}
                                    >
                                        {isPreviewCollapsed ? <PanelRightOpen className="size-3.5" /> : <PanelRightClose className="size-3.5" />}
                                    </button>
                                </div>
                                <div className="flex-1 p-0 overflow-hidden">
                                    <Textarea
                                        value={content.instructionsMarkdown || ""}
                                        onChange={(e) => save({ ...content, instructionsMarkdown: e.target.value })}
                                        className="h-full w-full resize-none border-none focus-visible:ring-0 rounded-none bg-transparent p-6 text-foreground font-mono text-sm leading-relaxed"
                                        placeholder="# Instrucciones de autoevaluación..."
                                    />
                                </div>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle className="bg-border-subtle hover:bg-accent-blue transition-colors duration-300 w-1.5 flex flex-col items-center justify-center" />

                        <ResizablePanel
                            defaultSize={50}
                            minSize={25}
                            maxSize={75}
                            className={isPreviewCollapsed ? "hidden" : ""}
                        >
                            <div className="flex flex-col h-full bg-background relative border-l border-border-subtle">
                                <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50">
                                    <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Vista Previa</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6">
                                    {content.instructionsMarkdown ? (
                                        <div className="prose dark:prose-invert prose-sm max-w-none text-text-muted prose-pre:p-0 prose-code:bg-surface-dark prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none font-sans">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                                            >
                                                {content.instructionsMarkdown}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-text-muted/50 italic">Instrucciones vacías.</p>
                                    )}
                                </div>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </TabsContent>

            {/* Configuración tab */}
            <TabsContent value="configuracion" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-8 space-y-4">
                    <div className="mb-2">
                        <h3 className="text-lg font-bold text-foreground">Configuración de Autoevaluación</h3>
                        <p className="text-sm text-text-muted mt-1">El alumno se evalúa con la rúbrica o las preguntas que configures aquí.</p>
                    </div>

                    <StepConfigSection step={step} onUpdateStep={onUpdate} />

                    {/* Eval mode selector */}
                    <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                        <div className="px-5 py-2.5 border-b border-white/5 bg-white/2">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Modo de Evaluación</span>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => save({ ...content, evalMode: "rubric" })}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                                        evalMode === "rubric"
                                            ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                            : "bg-surface border-border/50 text-text-muted hover:text-foreground hover:bg-surface-dark"
                                    )}
                                >
                                    <ListChecks className="size-3.5" />
                                    Rúbrica
                                </button>
                                <button
                                    onClick={() => save({ ...content, evalMode: "questions" })}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                                        evalMode === "questions"
                                            ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                            : "bg-surface border-border/50 text-text-muted hover:text-foreground hover:bg-surface-dark"
                                    )}
                                >
                                    <MessageSquare className="size-3.5" />
                                    Preguntas abiertas
                                </button>
                            </div>
                            <p className="text-xs text-text-muted">
                                {evalMode === "rubric"
                                    ? "El alumno selecciona un nivel por criterio y opcionalmente justifica su elección."
                                    : "El alumno responde preguntas abiertas. Sin puntuación numérica — mide esfuerzo y reflexión."}
                            </p>
                        </div>
                    </div>

                    {/* Rubric section — only in rubric mode */}
                    {evalMode === "rubric" && (
                        <>
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
                        </>
                    )}

                    {/* Questions builder — only in questions mode */}
                    {evalMode === "questions" && (
                        <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                            <div className="px-5 py-2.5 border-b border-white/5 bg-white/2 flex items-center justify-between">
                                <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Preguntas</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={addQuestion}
                                    className="h-7 text-xs gap-1 text-accent-blue hover:text-accent-blue"
                                >
                                    <Plus className="size-3" />
                                    Añadir
                                </Button>
                            </div>
                            <div className="p-5 space-y-3">
                                {questions.length === 0 && (
                                    <p className="text-xs text-text-muted/70 text-center py-4">
                                        Sin preguntas todavía. Añade la primera.
                                    </p>
                                )}
                                {questions.map((q, idx) => (
                                    <div key={q.id} className="p-3 bg-surface border border-border/40 rounded-lg space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest shrink-0">P{idx + 1}</span>
                                            <Input
                                                value={q.text}
                                                onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                                                placeholder="¿Qué has aprendido con este proyecto?"
                                                className="flex-1 h-8 text-sm bg-transparent border-border/40"
                                            />
                                            <button
                                                onClick={() => removeQuestion(q.id)}
                                                className="text-text-muted/50 hover:text-red-400 transition-colors shrink-0"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                        <Input
                                            value={q.description ?? ""}
                                            onChange={(e) => updateQuestion(q.id, { description: e.target.value })}
                                            placeholder="Pista o contexto (opcional)"
                                            className="h-7 text-xs text-text-muted bg-transparent border-border/30"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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

                    {/* Options — only relevant in rubric mode */}
                    {evalMode === "rubric" && (
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
                                    <Toggle
                                        value={content.requireJustification}
                                        onChange={(v) => save({ ...content, requireJustification: v })}
                                    />
                                </div>

                                {/* Counts toward grade */}
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm text-foreground font-medium">Contribuye a la nota</p>
                                        <p className="text-xs text-text-muted mt-0.5">La autoevaluación pondera en la nota final.</p>
                                    </div>
                                    <Toggle
                                        value={content.countsTowardGrade}
                                        onChange={(v) => save({ ...content, countsTowardGrade: v })}
                                    />
                                </div>

                                {/* Weight slider */}
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
                    )}
                </div>
            </TabsContent>
        </Tabs>
    );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            role="switch"
            aria-checked={value}
            onClick={() => onChange(!value)}
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                value ? "bg-accent-blue" : "bg-surface-dark border border-border/50"
            )}
        >
            <span className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                value ? "translate-x-5" : "translate-x-0"
            )} />
        </button>
    );
}
