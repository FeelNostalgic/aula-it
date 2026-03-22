"use client";

import React, { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, QuizContent, QuizMode, QuizPool, QuizQuestion, QuizQuestionType } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { StepConfigSection, ConfigSection, ConfigToggle } from "./step-config-section";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Circle, HardDrive, ExternalLink, BarChart2, AlignLeft, GripVertical, Layers, FileUp } from "lucide-react";
import { GoogleFormCsvImport } from "./google-form-csv-import";
import { cn } from "@/lib/utils";
import { useGoogleDrivePicker } from "@/hooks/use-google-drive-picker";
import { toFormEmbedUrl, GOOGLE_MIME } from "@/lib/google-drive-urls";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface QuizEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
}

// onUpdate serves double duty: content updates AND step-level updates (XP, completion)

function getFormAdminUrl(viewformUrl: string): string | null {
    const match = viewformUrl.match(/\/forms\/d\/([^/?]+)/);
    if (!match) return null;
    return `https://docs.google.com/forms/d/${match[1]}/edit#responses`;
}

const QUESTION_TYPES: { value: QuizQuestionType; label: string }[] = [
    { value: 'multiple_choice', label: 'Opción múltiple' },
    { value: 'true_false', label: 'Verdadero/Falso' },
    { value: 'short_answer', label: 'Respuesta corta' },
];

export function QuizEditor({ step, onUpdate }: QuizEditorProps) {
    const defaultContent = (step.content as QuizContent) || { questions: [], passingScore: 80, showCorrectAnswers: true };
    const [content, setContent] = useState<QuizContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const [showCsvImport, setShowCsvImport] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { openPicker, isLoading: isDriveLoading } = useGoogleDrivePicker();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        const newContent = (step.content as QuizContent) || { questions: [], passingScore: 80, showCorrectAnswers: true };
        setContent(newContent);
    }, [step.id, step.content]);

    const saveToServer = (newContent: QuizContent) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSaving(true);
        timeoutRef.current = setTimeout(async () => {
            const res = await updateStepContent(step.id, newContent);
            if (res.error) toast.error("Error al guardar el cuestionario");
            setIsSaving(false);
        }, 1200);
    };

    const handleUpdate = (newContent: QuizContent) => {
        setContent(newContent);
        onUpdate({ ...step, content: newContent });
        saveToServer(newContent);
    };

    const addQuestion = () => {
        const newQuestion: QuizQuestion = {
            id: crypto.randomUUID(),
            type: 'multiple_choice',
            text: "",
            options: [
                { id: crypto.randomUUID(), text: "", isCorrect: true },
                { id: crypto.randomUUID(), text: "", isCorrect: false }
            ],
            points: 1,
        };
        handleUpdate({ ...content, questions: [...content.questions, newQuestion] });
    };

    const updateQuestion = (qId: string, updates: Partial<QuizQuestion>) => {
        handleUpdate({ ...content, questions: content.questions.map(q => q.id === qId ? { ...q, ...updates } : q) });
    };

    const changeQuestionType = (qId: string, type: QuizQuestionType) => {
        const questions = content.questions.map(q => {
            if (q.id !== qId) return q;
            if (type === 'true_false') {
                return { ...q, type, options: [
                    { id: crypto.randomUUID(), text: "Verdadero", isCorrect: true },
                    { id: crypto.randomUUID(), text: "Falso", isCorrect: false },
                ]};
            }
            if (type === 'short_answer') return { ...q, type, options: [] };
            return { ...q, type, options: q.options.length >= 2 ? q.options : [
                { id: crypto.randomUUID(), text: "", isCorrect: true },
                { id: crypto.randomUUID(), text: "", isCorrect: false },
            ]};
        });
        handleUpdate({ ...content, questions });
    };

    const removeQuestion = (qId: string) => {
        handleUpdate({ ...content, questions: content.questions.filter(q => q.id !== qId) });
    };

    const addOption = (qId: string) => {
        handleUpdate({ ...content, questions: content.questions.map(q =>
            q.id !== qId ? q : { ...q, options: [...q.options, { id: crypto.randomUUID(), text: "", isCorrect: false }] }
        )});
    };

    const updateOption = (qId: string, optId: string, updates: Partial<{ text: string; isCorrect: boolean }>) => {
        handleUpdate({ ...content, questions: content.questions.map(q =>
            q.id !== qId ? q : { ...q, options: q.options.map(opt => opt.id === optId ? { ...opt, ...updates } : opt) }
        )});
    };

    const removeOption = (qId: string, optId: string) => {
        handleUpdate({ ...content, questions: content.questions.map(q =>
            q.id !== qId ? q : { ...q, options: q.options.filter(opt => opt.id !== optId) }
        )});
    };

    const handleQuestionDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIdx = content.questions.findIndex(q => q.id === active.id);
        const newIdx = content.questions.findIndex(q => q.id === over.id);
        handleUpdate({ ...content, questions: arrayMove(content.questions, oldIdx, newIdx) });
    };

    const addPool = () => {
        const newPool: QuizPool = { id: crypto.randomUUID(), name: "Nuevo banco", pickCount: 1 };
        handleUpdate({ ...content, pools: [...(content.pools ?? []), newPool] });
    };

    const updatePool = (poolId: string, updates: Partial<QuizPool>) => {
        handleUpdate({ ...content, pools: (content.pools ?? []).map(p => p.id === poolId ? { ...p, ...updates } : p) });
    };

    const removePool = (poolId: string) => {
        // Remove pool and unassign questions from it
        handleUpdate({
            ...content,
            pools: (content.pools ?? []).filter(p => p.id !== poolId),
            questions: content.questions.map(q => q.poolId === poolId ? { ...q, poolId: undefined } : q),
        });
    };

    const setQuestionPool = (qId: string, poolId: string | undefined) => {
        handleUpdate({ ...content, questions: content.questions.map(q => q.id === qId ? { ...q, poolId } : q) });
    };

    const handleOptionDragEnd = (qId: string, event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const q = content.questions.find(q => q.id === qId);
        if (!q) return;
        const oldIdx = q.options.findIndex(o => o.id === active.id);
        const newIdx = q.options.findIndex(o => o.id === over.id);
        handleUpdate({ ...content, questions: content.questions.map(qq =>
            qq.id !== qId ? qq : { ...qq, options: arrayMove(qq.options, oldIdx, newIdx) }
        )});
    };

    const handlePickFormFromDrive = async () => {
        try {
            const files = await openPicker({ mimeTypes: [GOOGLE_MIME.FORM], multiSelect: false, title: "Seleccionar Google Form" });
            if (files.length > 0) handleUpdate({ ...content, googleFormUrl: toFormEmbedUrl(files[0]) });
        } catch {
            toast.error("Error al abrir Google Drive");
        }
    };

    const effectiveMode: QuizMode = content.quizMode ?? (content.googleFormUrl ? 'google_form' : 'builtin');

    const tabTriggerClass = "h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:text-foreground text-text-muted bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none";

    return (
        <Tabs defaultValue="contenido" className="flex flex-col h-full w-full bg-background">
            {/* Tab bar */}
            <div className="shrink-0 border-b border-border/50 bg-surface-dark/10 px-4 flex items-center gap-2">
                <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
                    <TabsTrigger value="contenido" className={tabTriggerClass}>
                        {effectiveMode === 'builtin'
                            ? <>Preguntas{content.questions.length > 0 && <span className="ml-1.5 text-[10px] font-mono opacity-60">({content.questions.length})</span>}</>
                            : "Google Form"
                        }
                    </TabsTrigger>
                    {effectiveMode === 'builtin' && (
                        <TabsTrigger value="pools" className={tabTriggerClass}>
                            Bancos{(content.pools?.length ?? 0) > 0 && <span className="ml-1.5 text-[10px] font-mono opacity-60">({content.pools!.length})</span>}
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="configuracion" className={tabTriggerClass}>Configuración</TabsTrigger>
                </TabsList>
                <div className="ml-auto">
                    {isSaving
                        ? <span className="text-[10px] text-accent-blue animate-pulse">Guardando...</span>
                        : <span className="text-[10px] text-text-muted/50">Guardado automáticamente</span>
                    }
                </div>
            </div>

            {/* Contenido tab — adapta según modo */}
            <TabsContent value="contenido" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                {effectiveMode === 'google_form' ? (
                    /* Google Form mode */
                    <div className="max-w-3xl mx-auto p-8 space-y-4">
                        <div className="p-6 bg-surface-dark border border-white/5 rounded-xl space-y-4">
                            <label className="text-sm font-semibold text-foreground">Google Form Link</label>
                            <div className="flex gap-2">
                                <Input
                                    value={content.googleFormUrl ?? ""}
                                    onChange={(e) => handleUpdate({ ...content, googleFormUrl: e.target.value })}
                                    placeholder="https://docs.google.com/forms/d/e/.../viewform?embedded=true"
                                    className="bg-surface border-border flex-1"
                                />
                                <Button variant="outline" size="sm" onClick={handlePickFormFromDrive} disabled={isDriveLoading}
                                    className="h-9 border-border/50 hover:bg-surface-dark shrink-0">
                                    <HardDrive className="size-4 mr-2 text-accent-blue" />
                                    {isDriveLoading ? "..." : "Drive"}
                                </Button>
                                {content.googleFormUrl?.startsWith("http") && (
                                    <>
                                        <Button variant="ghost" size="sm" asChild className="h-9 px-2 text-text-muted hover:text-foreground shrink-0" title="Abrir formulario en nueva pestaña">
                                            <a href={content.googleFormUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /></a>
                                        </Button>
                                        {getFormAdminUrl(content.googleFormUrl) && (
                                            <Button variant="ghost" size="sm" asChild className="h-9 px-2 text-emerald-400 hover:text-emerald-300 shrink-0" title="Ver respuestas en Google Forms">
                                                <a href={getFormAdminUrl(content.googleFormUrl)!} target="_blank" rel="noopener noreferrer"><BarChart2 className="size-4" /></a>
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                            <p className="text-xs text-text-muted italic">
                                Asegúrate de que el enlace termine en /viewform o tenga embedded=true para que se vea correctamente en el visor del alumno.
                            </p>
                            <div className="pt-2 border-t border-white/5">
                                <Button variant="outline" size="sm" onClick={() => setShowCsvImport(true)}
                                    className="gap-2 text-xs border-border/50 hover:bg-surface-dark">
                                    <FileUp className="size-3.5" /> Importar resultados desde CSV
                                </Button>
                                <p className="text-xs text-text-muted/60 mt-1.5">
                                    Importa puntuaciones del CSV exportado de Google Forms al libro de calificaciones.
                                </p>
                            </div>
                            {content.googleFormUrl?.includes("http") && (
                                <div className="aspect-video w-full border border-border/50 rounded-lg overflow-hidden bg-background mt-4">
                                    <iframe src={content.googleFormUrl} className="size-full" />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Built-in mode — questions builder */
                    <div className="max-w-4xl mx-auto p-8 space-y-4 pb-32">
                        {content.questions.length === 0 ? (
                            <div className="text-center p-12 border border-dashed border-border/50 rounded-xl bg-surface/20">
                                <p className="text-text-muted mb-4">No hay preguntas creadas.</p>
                                <Button onClick={addQuestion} variant="outline" className="text-accent-blue border-accent-blue/30 hover:bg-accent-blue/10">
                                    <Plus className="size-4 mr-2" /> Añadir la primera pregunta
                                </Button>
                            </div>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQuestionDragEnd}>
                                <SortableContext items={content.questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-4">
                                        {content.questions.map((q, idx) => (
                                            <SortableQuestion
                                                key={q.id}
                                                q={q}
                                                idx={idx}
                                                sensors={sensors}
                                                pools={content.pools ?? []}
                                                onChangeType={changeQuestionType}
                                                onUpdate={updateQuestion}
                                                onRemove={removeQuestion}
                                                onAddOption={addOption}
                                                onUpdateOption={updateOption}
                                                onRemoveOption={removeOption}
                                                onOptionDragEnd={handleOptionDragEnd}
                                                onSetPool={setQuestionPool}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                        {content.questions.length > 0 && (
                            <div className="flex justify-center pt-4">
                                <Button onClick={addQuestion} className="bg-surface hover:bg-surface-dark text-foreground border border-border/50">
                                    <Plus className="size-4 mr-2" /> Nueva Pregunta
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </TabsContent>

            {/* Pools tab */}
            <TabsContent value="pools" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-8 space-y-6 pb-16">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Layers className="size-4 text-accent-blue" />
                                Bancos de preguntas
                            </h3>
                            <p className="text-xs text-text-muted mt-1">
                                Agrupa preguntas en bancos. Se selecciona aleatoriamente el número indicado por alumno e intento, siempre de forma consistente.
                            </p>
                        </div>
                        <Button onClick={addPool} size="sm" variant="outline" className="gap-2 border-accent-blue/30 text-accent-blue hover:bg-accent-blue/10">
                            <Plus className="size-3.5" /> Nuevo banco
                        </Button>
                    </div>

                    {!content.pools?.length ? (
                        <div className="text-center p-10 border border-dashed border-border/50 rounded-xl bg-surface/20">
                            <Layers className="size-8 text-text-muted/20 mx-auto mb-3" />
                            <p className="text-sm text-text-muted">Sin bancos creados. Las preguntas se muestran todas a todos los alumnos.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {content.pools.map(pool => {
                                const assigned = content.questions.filter(q => q.poolId === pool.id);
                                return (
                                    <div key={pool.id} className="p-4 bg-surface-dark border border-white/5 rounded-xl space-y-3">
                                        <div className="flex items-center gap-3">
                                            <Input
                                                value={pool.name}
                                                onChange={(e) => updatePool(pool.id, { name: e.target.value })}
                                                placeholder="Nombre del banco"
                                                className="flex-1 bg-surface border-border text-sm font-medium"
                                            />
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs text-text-muted">Seleccionar:</span>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={assigned.length || 1}
                                                    value={pool.pickCount}
                                                    onChange={(e) => updatePool(pool.id, { pickCount: Math.max(1, Number(e.target.value)) })}
                                                    className="w-16 h-8 text-xs font-mono bg-surface border-border text-center px-1"
                                                />
                                                <span className="text-xs text-text-muted">/ {assigned.length}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => removePool(pool.id)}
                                                className="size-8 text-text-muted hover:text-red-400 shrink-0">
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                        <div className="text-xs text-text-muted pl-1">
                                            {assigned.length === 0
                                                ? <span className="italic">Sin preguntas asignadas. Asígnalas desde la pestaña Preguntas.</span>
                                                : assigned.map(q => <span key={q.id} className="inline-block mr-2 bg-surface px-2 py-0.5 rounded border border-border/30 mb-1">{q.text || "Sin texto"}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {content.pools?.length > 0 && (
                        <div className="p-4 bg-accent-blue/5 border border-accent-blue/15 rounded-xl text-xs text-text-muted space-y-1">
                            <p><strong className="text-foreground">Sin banco asignado:</strong> {content.questions.filter(q => !q.poolId).length} preguntas — siempre visibles para todos.</p>
                            <p><strong className="text-foreground">En algún banco:</strong> {content.questions.filter(q => q.poolId).length} preguntas — selección determinista por alumno e intento.</p>
                        </div>
                    )}
                </div>
            </TabsContent>

            {/* Configuración tab */}
            <TabsContent value="configuracion" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-8 space-y-4 pb-16">
                    {/* Step-level: XP + completion mode */}
                    <StepConfigSection step={step} onUpdateStep={onUpdate} />

                    {/* Quiz mode selector — global config */}
                    <ConfigSection title="Modo del cuestionario">
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleUpdate({ ...content, quizMode: 'builtin' })}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                                    effectiveMode === 'builtin'
                                        ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                        : "bg-surface border-border/50 text-text-muted hover:text-foreground hover:bg-surface-dark"
                                )}
                            >
                                Built-in
                            </button>
                            <button
                                onClick={() => handleUpdate({ ...content, quizMode: 'google_form' })}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                                    effectiveMode === 'google_form'
                                        ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                        : "bg-surface border-border/50 text-text-muted hover:text-foreground hover:bg-surface-dark"
                                )}
                            >
                                Google Form
                            </button>
                        </div>
                        <p className="text-xs text-text-muted/70">
                            {effectiveMode === 'builtin'
                                ? "El cuestionario se construye con el editor de preguntas integrado."
                                : "Se incrusta un formulario de Google Forms. Las respuestas se gestionan en Google."}
                        </p>
                    </ConfigSection>

                    {/* Built-in only settings */}
                    {effectiveMode === 'builtin' && (
                        <>
                            <ConfigSection title="Evaluación">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Nota mínima para aprobar (%)</label>
                                        <Input type="number" min={0} max={100}
                                            value={content.passingScore ?? ""}
                                            onChange={(e) => handleUpdate({ ...content, passingScore: e.target.value ? Number(e.target.value) : undefined })}
                                            placeholder="Sin mínimo" className="bg-surface border-border w-32 font-mono" />
                                        <p className="text-xs text-text-muted/70">Porcentaje mínimo para considerar el cuestionario superado.</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Máximo de intentos</label>
                                        <Input type="number" min={1}
                                            value={content.maxAttempts ?? ""}
                                            onChange={(e) => handleUpdate({ ...content, maxAttempts: e.target.value ? Number(e.target.value) : undefined })}
                                            placeholder="Ilimitados" className="bg-surface border-border w-32 font-mono" />
                                        <p className="text-xs text-text-muted/70">Vacío = intentos ilimitados.</p>
                                    </div>
                                </div>
                                <ConfigToggle
                                    checked={!!(content as any).penalizeWrongAnswers}
                                    onChange={(v) => handleUpdate({ ...content, penalizeWrongAnswers: v })}
                                    label="Penalizar respuestas incorrectas"
                                    description="Una respuesta incorrecta resta 1/3 del valor de la pregunta. Para opción múltiple, cada opción incorrecta cancela una correcta. El total nunca baja de 0."
                                />
                            </ConfigSection>

                            <ConfigSection title="Resultados">
                                <ConfigToggle
                                    checked={!!(content as any).showCorrectAnswers}
                                    onChange={(v) => handleUpdate({ ...content, showCorrectAnswers: v })}
                                    label="Mostrar respuestas correctas al alumno"
                                    description="Al terminar el cuestionario, el alumno ve qué respuestas eran correctas y su nota. Si está desactivado, solo se muestra la nota cuando el profesor publique las calificaciones."
                                />
                            </ConfigSection>

                            <ConfigSection title="Aleatoriedad">
                                <ConfigToggle
                                    checked={!!(content as any).randomizeQuestions}
                                    onChange={(v) => handleUpdate({ ...content, randomizeQuestions: v })}
                                    label="Aleatorizar orden de preguntas"
                                    description="Cada alumno verá las preguntas en un orden diferente, reduciendo la posibilidad de copiar."
                                />
                                <ConfigToggle
                                    checked={!!(content as any).randomizeOptions}
                                    onChange={(v) => handleUpdate({ ...content, randomizeOptions: v })}
                                    label="Aleatorizar opciones de respuesta"
                                    description="Las opciones de cada pregunta se muestran en orden aleatorio. No aplica a preguntas de Verdadero/Falso."
                                />
                            </ConfigSection>
                        </>
                    )}
                </div>
            </TabsContent>

            <GoogleFormCsvImport
                stepId={step.id}
                open={showCsvImport}
                onClose={() => setShowCsvImport(false)}
            />
        </Tabs>
    );
}

// ---------------------------------------------------------------------------
// Sortable Question card
// ---------------------------------------------------------------------------

function SortableQuestion({
    q, idx, sensors, pools,
    onChangeType, onUpdate, onRemove,
    onAddOption, onUpdateOption, onRemoveOption, onOptionDragEnd, onSetPool,
}: {
    q: QuizQuestion;
    idx: number;
    sensors: ReturnType<typeof useSensors>;
    pools: QuizPool[];
    onChangeType: (id: string, t: QuizQuestionType) => void;
    onUpdate: (id: string, updates: Partial<QuizQuestion>) => void;
    onRemove: (id: string) => void;
    onAddOption: (id: string) => void;
    onUpdateOption: (qId: string, optId: string, u: Partial<{ text: string; isCorrect: boolean }>) => void;
    onRemoveOption: (qId: string, optId: string) => void;
    onOptionDragEnd: (qId: string, event: DragEndEvent) => void;
    onSetPool: (qId: string, poolId: string | undefined) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
    const qType = q.type ?? 'multiple_choice';

    return (
        <div ref={setNodeRef} style={style} className="p-6 bg-surface-dark border border-white/5 rounded-xl space-y-4 shadow-sm relative group">
            {/* Drag handle + question text */}
            <div className="flex items-start gap-2">
                <button
                    {...attributes} {...listeners}
                    className="mt-2 text-text-muted/30 hover:text-text-muted cursor-grab active:cursor-grabbing shrink-0 touch-none"
                >
                    <GripVertical className="size-4" />
                </button>
                <span className="bg-surface text-text-muted font-bold px-3 py-1 rounded-md text-sm mt-1 shrink-0">
                    Q{idx + 1}
                </span>
                <Input
                    value={q.text}
                    onChange={(e) => onUpdate(q.id, { text: e.target.value })}
                    placeholder="Escribe la pregunta aquí..."
                    className="flex-1 bg-surface border-border text-sm font-medium"
                />
                <Button variant="ghost" size="icon"
                    onClick={() => onRemove(q.id)}
                    className="text-text-muted hover:text-red-400 hover:bg-red-400/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="size-4" />
                </Button>
            </div>

            {/* Type selector + points */}
            <div className="pl-14 flex items-center gap-4 flex-wrap">
                <div className="flex gap-1 p-0.5 bg-surface rounded-lg border border-border/30">
                    {QUESTION_TYPES.map(qt => (
                        <button key={qt.value}
                            onClick={() => onChangeType(q.id, qt.value)}
                            className={cn(
                                "px-2.5 py-1 text-xs font-semibold rounded-md transition-colors",
                                qType === qt.value ? "bg-accent-blue/15 text-accent-blue" : "text-text-muted hover:text-foreground"
                            )}>
                            {qt.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-text-muted">Puntos:</span>
                    <Input type="number" min={0} step={0.5}
                        value={q.points ?? 1}
                        onChange={(e) => onUpdate(q.id, { points: Number(e.target.value) })}
                        className="w-16 h-7 text-xs font-mono bg-surface border-border text-center px-1" />
                </div>
                {pools.length > 0 && (
                    <div className="flex items-center gap-1.5 ml-auto">
                        <Layers className="size-3 text-text-muted shrink-0" />
                        <select
                            value={q.poolId ?? ""}
                            onChange={(e) => onSetPool(q.id, e.target.value || undefined)}
                            className="h-7 text-xs bg-surface border border-border rounded-md px-2 text-text-muted"
                        >
                            <option value="">Siempre visible</option>
                            {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* Options with DnD */}
            {qType !== 'short_answer' && (
                <div className="pl-14 space-y-2">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onOptionDragEnd(q.id, e)}>
                        <SortableContext items={q.options.map(o => o.id)} strategy={verticalListSortingStrategy}>
                            {q.options.map((opt, oIdx) => (
                                <SortableOption
                                    key={opt.id}
                                    opt={opt}
                                    oIdx={oIdx}
                                    qType={qType}
                                    canRemove={q.options.length > 2}
                                    onToggleCorrect={() => {
                                        if (qType === 'true_false') {
                                            // Single-select: set this as correct, all others incorrect
                                            onUpdate(q.id, { options: q.options.map(o => ({ ...o, isCorrect: o.id === opt.id })) });
                                        } else {
                                            onUpdateOption(q.id, opt.id, { isCorrect: !opt.isCorrect });
                                        }
                                    }}
                                    onChangeText={(text) => onUpdateOption(q.id, opt.id, { text })}
                                    onRemove={() => onRemoveOption(q.id, opt.id)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                    {qType === 'multiple_choice' && (
                        <Button variant="ghost" size="sm" onClick={() => onAddOption(q.id)}
                            className="text-text-muted hover:text-accent-blue ml-7 mt-2">
                            <Plus className="size-3 mr-1" /> Añadir Opción
                        </Button>
                    )}
                </div>
            )}

            {/* Short answer placeholder */}
            {qType === 'short_answer' && (
                <div className="pl-14">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-surface border border-border/30 text-text-muted text-sm">
                        <AlignLeft className="size-4 shrink-0" />
                        <span>El alumno escribirá su respuesta en texto libre. Requiere corrección manual.</span>
                    </div>
                </div>
            )}

            {/* Explanation */}
            <div className="pl-14">
                <Input
                    value={q.explanation ?? ""}
                    onChange={(e) => onUpdate(q.id, { explanation: e.target.value || undefined })}
                    placeholder="Explicación (opcional) — se muestra al alumno tras enviar"
                    className="h-8 bg-surface/50 border-border/30 text-xs text-text-muted placeholder:text-text-muted/50"
                />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sortable Option row
// ---------------------------------------------------------------------------

function SortableOption({
    opt, oIdx, qType, canRemove,
    onToggleCorrect, onChangeText, onRemove,
}: {
    opt: { id: string; text: string; isCorrect: boolean };
    oIdx: number;
    qType: QuizQuestionType;
    canRemove: boolean;
    onToggleCorrect: () => void;
    onChangeText: (text: string) => void;
    onRemove: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opt.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3">
            <button
                {...attributes} {...listeners}
                className="text-text-muted/30 hover:text-text-muted cursor-grab active:cursor-grabbing shrink-0 touch-none"
            >
                <GripVertical className="size-3.5" />
            </button>
            <button
                onClick={onToggleCorrect}
                className="focus:outline-none transition-colors shrink-0"
                title={opt.isCorrect ? "Marcar como incorrecta" : "Marcar como correcta"}
            >
                {opt.isCorrect
                    ? <CheckCircle2 className="size-5 text-green-500" />
                    : <Circle className="size-5 text-text-muted/40 hover:text-text-muted" />
                }
            </button>
            <Input
                value={opt.text}
                onChange={(e) => onChangeText(e.target.value)}
                placeholder={`Opción ${oIdx + 1}`}
                readOnly={qType === 'true_false'}
                className={cn(
                    "h-9 bg-background/50 border-border/50 text-sm",
                    opt.isCorrect ? "border-green-500/30" : "",
                    qType === 'true_false' ? "opacity-70 cursor-default" : ""
                )}
            />
            {qType === 'multiple_choice' && (
                <Button variant="ghost" size="icon" onClick={onRemove}
                    className="size-8 text-text-muted hover:text-red-400 shrink-0"
                    disabled={!canRemove} title="Eliminar opción">
                    <Trash2 className="size-3.5" />
                </Button>
            )}
        </div>
    );
}
