"use client";

import { useState, useEffect, useRef } from "react";
import {
    ActivityStepWithClientState, ActivityPhaseWithSteps,
    PeerEvaluationContent, PeerEvaluationMode,
    OutlierSensitivity, NonEvaluatorPolicy, RubricCriteria, QuizQuestion,
} from "@/types/activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { ListChecks, Users, User, MessageSquare, Plus, Trash2, GripVertical } from "lucide-react";
import { RubricBuilderModal } from "@/components/dashboard/shared/rubric-builder-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StepConfigSection } from "./step-config-section";
import { cn } from "@/lib/utils";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PeerEvaluationEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
    phases?: ActivityPhaseWithSteps[];
}

const defaultContent: PeerEvaluationContent = {
    mode: "individual",
    sourceStepId: "",
    rubric: [],
    requireJustification: false,
    submissionsPerEvaluator: 2,
    peerWeight: 30,
    anonymousEvaluation: true,
    peerFeedbackVisibleToStudents: false,
    outlierSensitivity: "normal",
    nonEvaluatorPolicy: "fallback_teacher",
    evaluateAllGroups: true,
    individualEvaluatorMode: false,
    livePresentationMode: false,
};

const OUTLIER_OPTIONS: { value: OutlierSensitivity; label: string; desc: string }[] = [
    { value: "strict", label: "Estricto (1σ)", desc: "Detecta pequeñas desviaciones" },
    { value: "normal", label: "Normal (1.5σ)", desc: "Equilibrio entre precisión y tolerancia" },
    { value: "lenient", label: "Laxo (2σ)", desc: "Solo detecta desviaciones extremas" },
];

const NON_EVALUATOR_OPTIONS: { value: NonEvaluatorPolicy; label: string; desc: string }[] = [
    { value: "none", label: "Sin consecuencia", desc: "Las entregas asignadas quedan con un evaluador menos." },
    { value: "fallback_teacher", label: "Solo nota del profesor (por defecto)", desc: "Si no evalúa, su nota se calcula al 100% con la del profesor." },
    { value: "grade_penalty", label: "Penalización", desc: "Se descuenta una cantidad de puntos de su nota final." },
];

export function PeerEvaluationEditor({ step, onUpdate, phases }: PeerEvaluationEditorProps) {
    const [content, setContent] = useState<PeerEvaluationContent>(
        (step.content as PeerEvaluationContent) || defaultContent
    );
    const [isSaving, setIsSaving] = useState(false);
    const [rubricModalOpen, setRubricModalOpen] = useState(false);
    const [antiGamingOpen, setAntiGamingOpen] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setContent((step.content as PeerEvaluationContent) || defaultContent);
    }, [step.id, step.content]);

    const save = (newContent: PeerEvaluationContent) => {
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

    const evalMode = content.evalMode ?? "rubric";
    const questions = content.questions ?? [];

    function generateId() { return Math.random().toString(36).slice(2, 10); }
    function addQuestion() {
        const newQ: QuizQuestion = { id: generateId(), type: 'short_answer', text: "", options: [], points: 0 };
        save({ ...content, questions: [...questions, newQ] });
    }
    function updateQuestion(id: string, patch: Partial<QuizQuestion>) {
        save({ ...content, questions: (questions as QuizQuestion[]).map(q => q.id === id ? { ...q, ...patch } : q) });
    }
    function removeQuestion(id: string) {
        save({ ...content, questions: questions.filter(q => q.id !== id) });
    }

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const qs = questions as QuizQuestion[];
        const oldIdx = qs.findIndex(q => q.id === active.id);
        const newIdx = qs.findIndex(q => q.id === over.id);
        save({ ...content, questions: arrayMove(qs, oldIdx, newIdx) });
    }

    // Deliverable/file_upload steps as source candidates
    const sourceSteps = (phases ?? []).flatMap(p =>
        p.steps.filter(s =>
            (s.type === "deliverable" || s.type === "file_upload") && s.id !== step.id
        )
    );

    const tabTriggerClass = "h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:text-foreground text-text-muted bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none";

    return (
        <Tabs defaultValue="configuracion" className="flex flex-col h-full w-full bg-background">
            <div className="shrink-0 border-b border-border/50 bg-surface-dark/10 px-4 flex items-center gap-2">
                <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
                    <TabsTrigger value="configuracion" className={tabTriggerClass}>Configuración</TabsTrigger>
                    {evalMode === "questions" && (
                        <TabsTrigger value="preguntas" className={tabTriggerClass}>
                            Preguntas {questions.length > 0 && <span className="ml-1 text-[9px] font-bold bg-accent-blue/20 text-accent-blue px-1.5 py-0.5 rounded-full">{questions.length}</span>}
                        </TabsTrigger>
                    )}
                </TabsList>
                <div className="ml-auto">
                    {isSaving
                        ? <span className="text-[10px] text-accent-blue animate-pulse">Guardando...</span>
                        : <span className="text-[10px] text-text-muted/50">Guardado automáticamente</span>
                    }
                </div>
            </div>

            <TabsContent value="configuracion" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-8 space-y-4">
                    <div className="mb-2">
                        <h3 className="text-lg font-bold text-foreground">Configuración de Coevaluación</h3>
                        <p className="text-sm text-text-muted mt-1">Los alumnos evalúan los trabajos de sus compañeros con la rúbrica que configures.</p>
                    </div>

                    <StepConfigSection step={step} onUpdateStep={onUpdate} />

                    {/* Mode selector */}
                    <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                        <div className="px-5 py-2.5 border-b border-white/5 bg-white/2">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Modo</span>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="flex gap-2">
                                {(["individual", "group"] as PeerEvaluationMode[]).map(m => (
                                    <button
                                        key={m}
                                        onClick={() => save({ ...content, mode: m })}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                                            content.mode === m
                                                ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                                : "bg-surface border-border/50 text-text-muted hover:text-foreground hover:bg-surface-dark"
                                        )}
                                    >
                                        {m === "individual" ? <User className="size-3.5" /> : <Users className="size-3.5" />}
                                        {m === "individual" ? "Individual" : "Grupos"}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-text-muted">
                                {content.mode === "individual"
                                    ? "Cada alumno evalúa trabajos de N compañeros asignados aleatoriamente."
                                    : "Los grupos se evalúan entre sí."}
                            </p>
                        </div>
                    </div>

                    {/* Source step */}
                    <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                        <div className="px-5 py-2.5 border-b border-white/5 bg-white/2">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Paso a Evaluar</span>
                        </div>
                        <div className="p-5 space-y-2">
                            <p className="text-xs text-text-muted">Selecciona qué entregable se va a coevaluar.</p>
                            {sourceSteps.length > 0 ? (
                                <select
                                    value={content.sourceStepId ?? ""}
                                    onChange={(e) => save({ ...content, sourceStepId: e.target.value })}
                                    className="h-9 w-full rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                >
                                    <option value="">Seleccionar paso...</option>
                                    {sourceSteps.map(s => (
                                        <option key={s.id} value={s.id}>{s.title}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-xs text-amber-400/80">
                                    No hay pasos de tipo Entregable o Subida de Archivos en esta actividad todavía.
                                </p>
                            )}
                        </div>
                    </div>

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
                                    ? "Los evaluadores puntúan niveles por criterio con justificación opcional."
                                    : "Los evaluadores responden preguntas abiertas. Sin puntuación numérica — mide reflexión y feedback cualitativo."}
                            </p>
                        </div>
                    </div>

                    {/* Rubric — only in rubric mode */}
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

                    {/* Questions mode hint */}
                    {evalMode === "questions" && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-dark border border-white/5 text-xs text-text-muted">
                            <MessageSquare className="size-3.5 text-accent-blue shrink-0" />
                            Configura las preguntas en la pestaña <span className="font-semibold text-foreground ml-0.5">Preguntas</span>.
                        </div>
                    )}

                    {/* Mode-specific settings */}
                    {content.mode === "individual" && (
                        <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                            <div className="px-5 py-2.5 border-b border-white/5 bg-white/2">
                                <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Distribución (Individual)</span>
                            </div>
                            <div className="p-5 space-y-4">
                                {/* N evaluations per student */}
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm text-foreground font-medium">Entregas a evaluar por alumno</p>
                                        <p className="text-xs text-text-muted mt-0.5">Cuántos trabajos evalúa cada evaluador.</p>
                                    </div>
                                    <input
                                        type="number" min={1} max={10}
                                        value={content.submissionsPerEvaluator ?? 2}
                                        onChange={(e) => save({ ...content, submissionsPerEvaluator: Math.max(1, Math.min(10, Number(e.target.value))) })}
                                        className="h-9 w-16 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                    />
                                </div>

                                {/* Peer weight — only relevant in rubric mode */}
                                {evalMode === "rubric" && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-foreground font-medium">Peso de los pares</p>
                                            <span className="text-sm font-mono font-bold text-accent-blue">{content.peerWeight ?? 30}%</span>
                                        </div>
                                        <input
                                            type="range" min={0} max={100} step={5}
                                            value={content.peerWeight ?? 30}
                                            onChange={(e) => save({ ...content, peerWeight: Number(e.target.value) })}
                                            className="w-full accent-accent-blue"
                                        />
                                        <p className="text-xs text-text-muted">
                                            Nota final = {content.peerWeight ?? 30}% promedio de pares + {100 - (content.peerWeight ?? 30)}% nota del profesor.
                                        </p>
                                    </div>
                                )}

                                {/* Anonymous */}
                                <Toggle
                                    label="Evaluación anónima"
                                    description="Los alumnos no saben quién los evaluó."
                                    value={!!content.anonymousEvaluation}
                                    onChange={(v) => save({ ...content, anonymousEvaluation: v })}
                                />

                                {/* Require justification */}
                                <Toggle
                                    label="Justificación obligatoria"
                                    description="El evaluador debe escribir un texto por criterio."
                                    value={!!content.requireJustification}
                                    onChange={(v) => save({ ...content, requireJustification: v })}
                                />

                                {/* Min justification length */}
                                {content.requireJustification && (
                                    <div className="flex items-center justify-between gap-4 pl-4 border-l-2 border-border/30">
                                        <div>
                                            <p className="text-sm text-foreground font-medium">Mínimo de caracteres</p>
                                            <p className="text-xs text-text-muted mt-0.5">Por justificación de criterio.</p>
                                        </div>
                                        <input
                                            type="number" min={0} max={500}
                                            value={content.minJustificationLength ?? 0}
                                            onChange={(e) => save({ ...content, minJustificationLength: Number(e.target.value) })}
                                            className="h-9 w-20 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                        />
                                    </div>
                                )}

                                {/* Peer feedback visible to students */}
                                <Toggle
                                    label="Mostrar feedback de pares al alumno"
                                    description="Cuando el profesor publique notas, los alumnos verán las justificaciones recibidas."
                                    value={!!content.peerFeedbackVisibleToStudents}
                                    onChange={(v) => save({ ...content, peerFeedbackVisibleToStudents: v })}
                                />
                            </div>
                        </div>
                    )}

                    {content.mode === "group" && (
                        <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                            <div className="px-5 py-2.5 border-b border-white/5 bg-white/2">
                                <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Distribución (Grupos)</span>
                            </div>
                            <div className="p-5 space-y-4">
                                <Toggle
                                    label="Evalúa a todos los grupos"
                                    description="Cada grupo evalúa a todos los demás grupos."
                                    value={!!content.evaluateAllGroups}
                                    onChange={(v) => save({ ...content, evaluateAllGroups: v })}
                                />
                                <Toggle
                                    label="Modo individual dentro del grupo"
                                    description="Cada miembro envía su propia evaluación (en lugar de una por grupo)."
                                    value={!!content.individualEvaluatorMode}
                                    onChange={(v) => save({ ...content, individualEvaluatorMode: v })}
                                />
                                <Toggle
                                    label="Presentación en vivo"
                                    description="Añade una sección de Q&A al final de la rúbrica."
                                    value={!!content.livePresentationMode}
                                    onChange={(v) => save({ ...content, livePresentationMode: v })}
                                />
                                <Toggle
                                    label="Justificación obligatoria"
                                    description="El evaluador debe escribir un texto por criterio."
                                    value={!!content.requireJustification}
                                    onChange={(v) => save({ ...content, requireJustification: v })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Anti-gaming section (individual mode only) */}
                    {content.mode === "individual" && (
                        <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                            <button
                                className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-text-muted uppercase tracking-widest hover:bg-white/2 transition-colors"
                                onClick={() => setAntiGamingOpen(v => !v)}
                            >
                                <span>Integridad de la evaluación</span>
                                <span className="text-[10px] normal-case font-normal">{antiGamingOpen ? "Ocultar ▲" : "Mostrar ▼"}</span>
                            </button>
                            {antiGamingOpen && (
                                <div className="p-5 border-t border-white/5 space-y-5">
                                    {/* Outlier sensitivity */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold text-foreground">Sensibilidad a outliers</p>
                                        <p className="text-xs text-text-muted">Umbral de desviación estándar para marcar una evaluación como sospechosa.</p>
                                        <div className="flex flex-col gap-2">
                                            {OUTLIER_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => save({ ...content, outlierSensitivity: opt.value })}
                                                    className={cn(
                                                        "flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm transition-colors text-left",
                                                        content.outlierSensitivity === opt.value
                                                            ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                                            : "bg-surface border-border/50 text-text-muted hover:text-foreground"
                                                    )}
                                                >
                                                    <span className="font-medium">{opt.label}</span>
                                                    <span className="text-xs opacity-70">{opt.desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Non-evaluator policy */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold text-foreground">Política para alumnos que no evalúan</p>
                                        <div className="flex flex-col gap-2">
                                            {NON_EVALUATOR_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => save({ ...content, nonEvaluatorPolicy: opt.value })}
                                                    className={cn(
                                                        "flex flex-col px-4 py-2.5 rounded-lg border text-sm transition-colors text-left",
                                                        content.nonEvaluatorPolicy === opt.value
                                                            ? "bg-accent-blue/10 border-accent-blue/30"
                                                            : "bg-surface border-border/50 hover:bg-surface-dark"
                                                    )}
                                                >
                                                    <span className={cn("font-medium", content.nonEvaluatorPolicy === opt.value ? "text-accent-blue" : "text-foreground")}>{opt.label}</span>
                                                    <span className="text-xs text-text-muted mt-0.5">{opt.desc}</span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Penalty points input */}
                                        {content.nonEvaluatorPolicy === "grade_penalty" && (
                                            <div className="flex items-center justify-between gap-4 pl-4 border-l-2 border-border/30 mt-2">
                                                <div>
                                                    <p className="text-sm text-foreground font-medium">Puntos de penalización</p>
                                                    <p className="text-xs text-text-muted mt-0.5">Se descuentan de la nota final (ej. 1.0).</p>
                                                </div>
                                                <input
                                                    type="number" min={0} max={10} step={0.5}
                                                    value={content.nonEvaluatorPenaltyPoints ?? 1}
                                                    onChange={(e) => save({ ...content, nonEvaluatorPenaltyPoints: Number(e.target.value) })}
                                                    className="h-9 w-20 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </TabsContent>

            {/* Preguntas tab — only visible in questions mode */}
            <TabsContent value="preguntas" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-8 space-y-4 pb-32">
                    <div className="mb-2">
                        <h3 className="text-lg font-bold text-foreground">Preguntas de evaluación</h3>
                        <p className="text-sm text-text-muted mt-1">El evaluador responderá estas preguntas sobre el trabajo revisado.</p>
                    </div>

                    {questions.length === 0 ? (
                        <div className="text-center p-12 border border-dashed border-border/50 rounded-xl bg-surface/20">
                            <p className="text-text-muted mb-4">No hay preguntas todavía.</p>
                            <Button onClick={addQuestion} variant="outline" className="text-accent-blue border-accent-blue/30 hover:bg-accent-blue/10">
                                <Plus className="size-4 mr-2" /> Añadir la primera pregunta
                            </Button>
                        </div>
                    ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={(questions as QuizQuestion[]).map(q => q.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-4">
                                    {(questions as QuizQuestion[]).map((q, idx) => (
                                        <SortablePeerEvalQuestion
                                            key={q.id}
                                            q={q}
                                            idx={idx}
                                            onUpdate={updateQuestion}
                                            onRemove={removeQuestion}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}

                    {questions.length > 0 && (
                        <div className="flex justify-center pt-4">
                            <Button onClick={addQuestion} className="bg-surface hover:bg-surface-dark text-foreground border border-border/50">
                                <Plus className="size-4 mr-2" /> Nueva Pregunta
                            </Button>
                        </div>
                    )}
                </div>
            </TabsContent>
        </Tabs>
    );
}

// ─── SortablePeerEvalQuestion ────────────────────────────────────────────────

type SortablePeerEvalQuestionProps = {
    q: QuizQuestion;
    idx: number;
    onUpdate: (id: string, patch: Partial<QuizQuestion>) => void;
    onRemove: (id: string) => void;
};

function SortablePeerEvalQuestion({ q, idx, onUpdate, onRemove }: SortablePeerEvalQuestionProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

    const TYPES: { value: 'short_answer' | 'likert'; label: string }[] = [
        { value: 'short_answer', label: 'Respuesta libre' },
        { value: 'likert', label: 'Escala Likert' },
    ];

    return (
        <div ref={setNodeRef} style={style} className="p-6 bg-surface-dark border border-white/5 rounded-xl space-y-4 shadow-sm relative group">
            {/* Header row */}
            <div className="flex items-start gap-3">
                <button
                    {...attributes}
                    {...listeners}
                    className="mt-1 cursor-grab active:cursor-grabbing text-text-muted/40 hover:text-text-muted transition-colors shrink-0"
                >
                    <GripVertical className="size-4" />
                </button>

                <span className="shrink-0 bg-surface text-text-muted font-bold px-3 py-1 rounded-md text-xs mt-0.5">
                    Q{idx + 1}
                </span>

                <Input
                    value={q.text}
                    onChange={(e) => onUpdate(q.id, { text: e.target.value })}
                    placeholder="Escribe la pregunta..."
                    className="flex-1 bg-transparent border-0 border-b border-border/30 rounded-none px-0 focus-visible:ring-0 focus-visible:border-accent-blue text-sm"
                />

                <button
                    onClick={() => onRemove(q.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted/50 hover:text-red-400 shrink-0 mt-1"
                >
                    <Trash2 className="size-4" />
                </button>
            </div>

            {/* Type pills + content */}
            <div className="pl-14 space-y-4">
                <div className="flex gap-1 p-0.5 bg-surface rounded-lg border border-border/30 w-fit">
                    {TYPES.map(t => (
                        <button
                            key={t.value}
                            onClick={() => onUpdate(q.id, { type: t.value })}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                                q.type === t.value
                                    ? "bg-accent-blue/15 text-accent-blue"
                                    : "text-text-muted hover:text-foreground"
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {q.type === 'short_answer' && (
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm text-foreground font-medium">Mínimo de caracteres</p>
                            <p className="text-xs text-text-muted mt-0.5">0 = sin mínimo.</p>
                        </div>
                        <input
                            type="number" min={0} max={2000}
                            value={q.minLength ?? 0}
                            onChange={(e) => onUpdate(q.id, { minLength: Number(e.target.value) || undefined })}
                            className="h-9 w-20 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-accent-blue"
                        />
                    </div>
                )}

                {q.type === 'likert' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm text-foreground font-medium">Niveles de la escala</p>
                                <p className="text-xs text-text-muted mt-0.5">Número de opciones.</p>
                            </div>
                            <div className="flex gap-1 p-0.5 bg-surface rounded-lg border border-border/30">
                                {[3, 5, 7].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => onUpdate(q.id, { likertScale: n })}
                                        className={cn(
                                            "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                                            (q.likertScale ?? 5) === n
                                                ? "bg-accent-blue/15 text-accent-blue"
                                                : "text-text-muted hover:text-foreground"
                                        )}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm text-foreground font-medium">Justificación obligatoria</p>
                                <p className="text-xs text-text-muted mt-0.5">El evaluador debe razonar su elección.</p>
                            </div>
                            <LikertJustifToggle
                                value={q.requireJustification ?? false}
                                onChange={(v) => onUpdate(q.id, { requireJustification: v })}
                            />
                        </div>
                        {q.requireJustification && (
                            <div className="flex items-center justify-between gap-4 pl-4 border-l-2 border-border/30">
                                <div>
                                    <p className="text-sm text-foreground font-medium">Mínimo de caracteres</p>
                                    <p className="text-xs text-text-muted mt-0.5">Por justificación.</p>
                                </div>
                                <input
                                    type="number" min={0} max={2000}
                                    value={q.minLength ?? 0}
                                    onChange={(e) => onUpdate(q.id, { minLength: Number(e.target.value) || undefined })}
                                    className="h-9 w-20 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LikertJustifToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
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

function Toggle({
    label,
    description,
    value,
    onChange,
}: {
    label: string;
    description: string;
    value: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div>
                <p className="text-sm text-foreground font-medium">{label}</p>
                <p className="text-xs text-text-muted mt-0.5">{description}</p>
            </div>
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
        </div>
    );
}
