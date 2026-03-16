"use client";

import React, { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, QuizContent, QuizMode, QuizQuestion, QuizQuestionType } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Circle, HardDrive, ExternalLink, BarChart2, AlignLeft, GripVertical } from "lucide-react";
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

    return (
        <div className="flex flex-col h-full w-full p-8 overflow-y-auto max-w-4xl mx-auto space-y-8 pb-32">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-foreground">Constructor de Cuestionario</h3>
                    <p className="text-sm text-text-muted mt-1">Añade preguntas y opciones para evaluar al alumno.</p>
                </div>
                {isSaving
                    ? <span className="text-xs text-accent-blue animate-pulse">Guardando...</span>
                    : <span className="text-xs text-text-muted/50">Guardado automáticamente</span>
                }
            </div>

            {/* Mode selector */}
            <div className="flex gap-4 p-1 bg-surface-dark rounded-lg w-fit border border-border/50">
                <Button variant={effectiveMode === 'builtin' ? "secondary" : "ghost"} size="sm" className="text-xs h-7 px-4"
                    onClick={() => handleUpdate({ ...content, quizMode: 'builtin' })}>
                    Built-in
                </Button>
                <Button variant={effectiveMode === 'google_form' ? "secondary" : "ghost"} size="sm" className="text-xs h-7 px-4"
                    onClick={() => handleUpdate({ ...content, quizMode: 'google_form' })}>
                    Google Form
                </Button>
            </div>

            <div className="space-y-6">
                {effectiveMode === 'google_form' ? (
                    <div className="p-8 bg-surface-dark border border-white/5 rounded-xl space-y-4">
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
                        {content.googleFormUrl?.includes("http") && (
                            <div className="aspect-video w-full border border-border/50 rounded-lg overflow-hidden bg-background mt-4">
                                <iframe src={content.googleFormUrl} className="size-full" />
                            </div>
                        )}
                    </div>
                ) : (
                    <Tabs defaultValue="preguntas">
                        <TabsList className="bg-surface-dark border border-white/5 w-full justify-start rounded-xl p-1 mb-2">
                            <TabsTrigger value="configuracion" className="text-xs data-[state=active]:bg-surface data-[state=active]:text-foreground text-text-muted rounded-lg">
                                Configuración
                            </TabsTrigger>
                            <TabsTrigger value="preguntas" className="text-xs data-[state=active]:bg-surface data-[state=active]:text-foreground text-text-muted rounded-lg">
                                Preguntas{content.questions.length > 0 && <span className="ml-1.5 text-[10px] font-mono opacity-60">({content.questions.length})</span>}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="configuracion" className="mt-0 space-y-3">
                            {/* Evaluación */}
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

                            {/* Resultados */}
                            <ConfigSection title="Resultados">
                                <ConfigToggle
                                    checked={!!(content as any).showCorrectAnswers}
                                    onChange={(v) => handleUpdate({ ...content, showCorrectAnswers: v })}
                                    label="Mostrar respuestas correctas al alumno"
                                    description="Al terminar el cuestionario, el alumno ve qué respuestas eran correctas y su nota. Si está desactivado, solo se muestra la nota cuando el profesor publique las calificaciones."
                                />
                            </ConfigSection>

                            {/* Aleatoriedad */}
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
                        </TabsContent>

                        <TabsContent value="preguntas" className="mt-0 space-y-4">
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
                                                    onChangeType={changeQuestionType}
                                                    onUpdate={updateQuestion}
                                                    onRemove={removeQuestion}
                                                    onAddOption={addOption}
                                                    onUpdateOption={updateOption}
                                                    onRemoveOption={removeOption}
                                                    onOptionDragEnd={handleOptionDragEnd}
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
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Config section + toggle helpers
// ---------------------------------------------------------------------------

function ConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
            <div className="px-5 py-2.5 border-b border-white/5 bg-white/[0.02]">
                <span className="text-xs font-bold text-text-muted uppercase tracking-widest">{title}</span>
            </div>
            <div className="p-5 space-y-4">
                {children}
            </div>
        </div>
    );
}

function ConfigToggle({
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
// Sortable Question card
// ---------------------------------------------------------------------------

function SortableQuestion({
    q, idx, sensors,
    onChangeType, onUpdate, onRemove,
    onAddOption, onUpdateOption, onRemoveOption, onOptionDragEnd,
}: {
    q: QuizQuestion;
    idx: number;
    sensors: ReturnType<typeof useSensors>;
    onChangeType: (id: string, t: QuizQuestionType) => void;
    onUpdate: (id: string, updates: Partial<QuizQuestion>) => void;
    onRemove: (id: string) => void;
    onAddOption: (id: string) => void;
    onUpdateOption: (qId: string, optId: string, u: Partial<{ text: string; isCorrect: boolean }>) => void;
    onRemoveOption: (qId: string, optId: string) => void;
    onOptionDragEnd: (qId: string, event: DragEndEvent) => void;
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
