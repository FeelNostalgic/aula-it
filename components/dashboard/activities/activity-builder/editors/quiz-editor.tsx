"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, QuizContent, QuizMode, QuestionBank, QuizQuestion, QuizQuestionType } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateStepContent, getQuestionBanks, updateStepLockdown } from "@/app/activities/[id]/edit/actions";
import { QuestionBankManagerDialog } from "./question-bank-manager";
import { ConfigSection, ConfigSectionsToolbar, ConfigToggle, StepConfigSection, useConfigSectionState } from "./step-config-section";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Circle, HardDrive, ExternalLink, BarChart2, AlignLeft, GripVertical, Layers, FileUp } from "lucide-react";
import { GoogleFormCsvImport } from "./google-form-csv-import";
import { cn } from "@/lib/utils";
import { createDefaultQuizQuestion, convertQuestionToType, getGroupStatsAvailability, getQuestionType, QUIZ_QUESTION_TYPE, supportsClassicOptions } from "@/lib/quiz-core";
import { useGoogleDrivePicker } from "@/hooks/use-google-drive-picker";
import { toFormEmbedUrl, GOOGLE_MIME } from "@/lib/google-drive-urls";
import { StructuredQuestionFields } from "../quiz/structured-question-fields";
import { QuizStatsPanel } from "../quiz/quiz-stats-panel";
import { QuizResponsesPanel } from "../quiz/quiz-responses-panel";
import { LikertQuestionConfig } from "../quiz/likert-question-config";
import { useStepEditorTab } from "./use-step-editor-tab";
import { StepVisibilityTab } from "./step-visibility-tab";
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
    activityId?: string;
    moduleId?: string;
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
    { value: 'likert', label: 'Likert' },
    { value: 'fill_in_the_blank_dropdown', label: 'Texto con huecos' },
    { value: 'table_drag_drop', label: 'Tabla drag & drop' },
    { value: 'matching_pairs', label: 'Emparejar' },
    { value: 'ordering_sequence', label: 'Ordenar secuencia' },
    { value: 'categorization_drag_drop', label: 'Clasificar' },
];

export function QuizEditor({ step, onUpdate, activityId, moduleId }: QuizEditorProps) {
    const isNestedQuiz = !!step.parent_step_id;

    const getInitialContent = (rawContent: unknown): QuizContent => {
        const content = rawContent && typeof rawContent === "object"
            ? rawContent as Partial<QuizContent>
            : null;
        if (!content) return { questions: [], passingScore: 80, showCorrectAnswers: true };
        return {
            ...content,
            quizMode: isNestedQuiz ? "builtin" : content.quizMode,
            googleFormUrl: isNestedQuiz ? undefined : content.googleFormUrl,
            questions: content.questions ?? [],
            showCorrectAnswers: content.showCorrectAnswers ?? true,
            penalizeWrongAnswers: content.penalizeWrongAnswers ?? false,
            randomizeQuestions: content.randomizeQuestions ?? false,
            randomizeOptions: content.randomizeOptions ?? false,
            saveQuestionStats: content.saveQuestionStats ?? false,
        };
    };

    const [content, setContent] = useState<QuizContent>(getInitialContent(step.content));
    const [isSaving, setIsSaving] = useState(false);
    const [showCsvImport, setShowCsvImport] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { openPicker, isLoading: isDriveLoading } = useGoogleDrivePicker();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        setContent(getInitialContent(step.content));
    }, [step.id, step.content, step.parent_step_id]);

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
        const normalizedContent: QuizContent = isNestedQuiz
            ? { ...newContent, quizMode: "builtin", googleFormUrl: undefined }
            : newContent;
        const nextContent = getGroupStatsAvailability(normalizedContent).enabled
            ? normalizedContent
            : { ...normalizedContent, saveQuestionStats: false };
        setContent(nextContent);
        onUpdate({ ...step, content: nextContent });
        saveToServer(nextContent);
    };

    const addQuestion = () => {
        handleUpdate({ ...content, questions: [...content.questions, createDefaultQuizQuestion()] });
    };

    const updateQuestion = (qId: string, updates: Partial<QuizQuestion>) => {
        handleUpdate({ ...content, questions: content.questions.map(q => q.id === qId ? { ...q, ...updates } : q) });
    };

    const changeQuestionType = (qId: string, type: QuizQuestionType) => {
        const questions = content.questions.map(q => {
            if (q.id !== qId) return q;
            return convertQuestionToType(q, type);
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

    const [showBankManager, setShowBankManager] = useState(false);
    const [availableBanks, setAvailableBanks] = useState<QuestionBank[]>([]);

    useEffect(() => {
        getQuestionBanks().then(({ banks }) => {
            if (banks) setAvailableBanks(banks as QuestionBank[]);
        });
    }, []);

    const addBankSelection = (bank: QuestionBank) => {
        if ((content.bankSelections ?? []).some(s => s.bankId === bank.id)) return;
        handleUpdate({ ...content, bankSelections: [...(content.bankSelections ?? []), { bankId: bank.id, pickCount: 1 }] });
    };

    const updateBankSelection = (bankId: string, pickCount: number) => {
        handleUpdate({ ...content, bankSelections: (content.bankSelections ?? []).map(s => s.bankId === bankId ? { ...s, pickCount } : s) });
    };

    const removeBankSelection = (bankId: string) => {
        handleUpdate({ ...content, bankSelections: (content.bankSelections ?? []).filter(s => s.bankId !== bankId) });
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

    const effectiveMode: QuizMode = isNestedQuiz ? 'builtin' : content.quizMode ?? (content.googleFormUrl ? 'google_form' : 'builtin');
    const availableTabs = effectiveMode === "builtin"
        ? ["contenido", "pools", "stats", "respuestas", "configuracion", "visibilidad"]
        : ["contenido", "configuracion", "visibilidad"];
    const { activeTab, setActiveTab } = useStepEditorTab(step.id, "contenido", availableTabs);
    const statsAvailability = getGroupStatsAvailability(content);
    const configSectionIds = [
        "experience",
        "completion-mode",
        "quiz-mode",
        "exam-mode",
        ...(effectiveMode === "builtin" ? ["evaluation", "results", "randomness", "presentation"] : []),
    ];
    const sectionState = useConfigSectionState(step.id, configSectionIds);

    const tabTriggerClass = "h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:text-foreground text-text-muted bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none";

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full w-full bg-background">
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
                            Bancos{(content.bankSelections?.length ?? 0) > 0 && <span className="ml-1.5 text-[10px] font-mono opacity-60">({content.bankSelections!.length})</span>}
                        </TabsTrigger>
                    )}
                    {effectiveMode === 'builtin' && (
                        <TabsTrigger value="stats" className={tabTriggerClass}>Stats</TabsTrigger>
                    )}
                    {effectiveMode === 'builtin' && (
                        <TabsTrigger value="respuestas" className={tabTriggerClass}>Respuestas</TabsTrigger>
                    )}
                    <TabsTrigger value="configuracion" className={tabTriggerClass}>Configuración</TabsTrigger>
                    <TabsTrigger value="visibilidad" className={tabTriggerClass}>Visibilidad</TabsTrigger>
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
                    <div className="w-full max-w-7xl mx-auto p-6 sm:p-8 space-y-4 pb-32">
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
                    </div>
                )}
            </TabsContent>

            {/* Bancos tab — global banks */}
            <TabsContent value="pools" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-8 space-y-6 pb-16">
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Layers className="size-4 text-accent-blue" />
                            Bancos de preguntas
                        </h3>
                        <div className="flex items-center justify-between gap-4">
                            <p className="text-xs text-text-muted">
                                Incluye preguntas aleatorias de bancos globales. Los bancos son compartidos entre cuestionarios.
                            </p>
                            <Button onClick={() => setShowBankManager(true)} size="sm" variant="outline" className="gap-2 border-accent-blue/30 text-accent-blue hover:bg-accent-blue/10 shrink-0">
                                <Layers className="size-3.5" /> Gestionar bancos
                            </Button>
                        </div>
                    </div>

                    {!content.bankSelections?.length ? (
                        <div className="text-center p-10 border border-dashed border-border/50 rounded-xl bg-surface/20">
                            <Layers className="size-8 text-text-muted/20 mx-auto mb-3" />
                            <p className="text-sm text-text-muted">Sin bancos incluidos. Crea bancos globales y añádelos aquí.</p>
                            <Button onClick={() => setShowBankManager(true)} size="sm" variant="ghost" className="mt-3 gap-1.5 text-accent-blue">
                                <Plus className="size-3.5" /> Gestionar bancos globales
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {content.bankSelections.map(selection => {
                                const bank = availableBanks.find(b => b.id === selection.bankId);
                                const bankName = bank?.name ?? selection.bankId;
                                const bankSize = bank?.questions.length ?? 0;
                                return (
                                    <div key={selection.bankId} className="p-4 bg-surface-dark border border-white/5 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">{bankName}</p>
                                                {bankSize > 0 && <p className="text-xs text-text-muted">{bankSize} preguntas en el banco</p>}
                                            </div>
                                            {bankSize === 0 ? (
                                                <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                                                    Banco vacío
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs text-text-muted">Coger:</span>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={bankSize}
                                                        value={selection.pickCount}
                                                        onChange={(e) => updateBankSelection(selection.bankId, Math.max(1, Math.min(bankSize, Number(e.target.value))))}
                                                        className="w-16 h-8 text-xs font-mono bg-surface border-border text-center px-1"
                                                    />
                                                    <span className="text-xs text-text-muted">/ {bankSize}</span>
                                                </div>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => removeBankSelection(selection.bankId)}
                                                className="size-8 text-text-muted hover:text-red-400 shrink-0">
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="p-4 bg-accent-blue/5 border border-accent-blue/15 rounded-xl text-xs text-text-muted space-y-1">
                        <p><strong className="text-foreground">Preguntas fijas del quiz:</strong> {content.questions.length} — siempre visibles para todos.</p>
                        <p><strong className="text-foreground">Bancos incluidos:</strong> {content.bankSelections?.length ?? 0} — selección aleatoria determinista por alumno e intento.</p>
                    </div>

                    <QuestionBankManagerDialog
                        open={showBankManager}
                        onClose={() => setShowBankManager(false)}
                        onBanksLoaded={setAvailableBanks}
                        onSelectBank={addBankSelection}
                        onRemoveBank={removeBankSelection}
                        selectedBankIds={(content.bankSelections ?? []).map(s => s.bankId)}
                    />
                </div>
            </TabsContent>

            <TabsContent value="stats" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="w-full max-w-7xl mx-auto p-6 sm:p-8 pb-16">
                    <QuizStatsPanel
                        stepId={step.id}
                        content={content}
                        visible={activeTab === "stats"}
                    />
                </div>
            </TabsContent>

            <TabsContent value="respuestas" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="w-full max-w-none mx-auto p-4 sm:p-6 pb-16">
                    <QuizResponsesPanel
                        stepId={step.id}
                        activityId={activityId}
                        moduleId={moduleId}
                        content={content}
                        visible={activeTab === "respuestas"}
                    />
                </div>
            </TabsContent>

            {/* Configuración tab */}
            <TabsContent value="configuracion" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-8 space-y-4 pb-16">
                    {/* Step-level: XP + completion mode */}
                    <ConfigSectionsToolbar
                        allSectionsOpen={sectionState.allSectionsOpen}
                        onToggleAll={() => sectionState.setAllSectionsOpen(!sectionState.allSectionsOpen)}
                    />
                    <StepConfigSection step={step} onUpdateStep={onUpdate} sectionState={sectionState} />

                    {/* Quiz mode selector — global config */}
                    <ConfigSection
                        title="Modo del cuestionario"
                        sectionId="quiz-mode"
                        open={sectionState.isSectionOpen("quiz-mode")}
                        onToggle={() => sectionState.toggleSection("quiz-mode")}
                    >
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
                                disabled={isNestedQuiz}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                                    effectiveMode === 'google_form'
                                        ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                        : "bg-surface border-border/50 text-text-muted hover:text-foreground hover:bg-surface-dark",
                                    isNestedQuiz && "cursor-not-allowed opacity-50 hover:text-text-muted hover:bg-surface"
                                )}
                            >
                                Google Form
                            </button>
                        </div>
                        <p className="text-xs text-text-muted/70">
                            {isNestedQuiz
                                ? "Este cuestionario está anidado en una entrega, por eso solo puede usar el modo built-in."
                                : effectiveMode === 'builtin'
                                ? "El cuestionario se construye con el editor de preguntas integrado."
                                : "Se incrusta un formulario de Google Forms. Las respuestas se gestionan en Google."}
                        </p>
                    </ConfigSection>

                    {/* Exam mode (lockdown) */}
                    <ConfigSection
                        title="Modo Examen"
                        sectionId="exam-mode"
                        open={sectionState.isSectionOpen("exam-mode")}
                        onToggle={() => sectionState.toggleSection("exam-mode")}
                    >
                        <ConfigToggle
                            checked={!!step.is_lockdown}
                            onChange={async (v) => {
                                const res = await updateStepLockdown(step.id, v);
                                if (res.error) {
                                    toast.error("Error al actualizar el modo examen");
                                } else {
                                    onUpdate({ ...step, is_lockdown: v });
                                }
                            }}
                            label="Activar Modo Examen"
                            description="El cuestionario ocupa toda la pantalla. El alumno no puede navegar a otras actividades mientras lo realiza."
                        />
                    </ConfigSection>

                    {/* Built-in only settings */}
                    {effectiveMode === 'builtin' && (
                        <>
                            <ConfigSection
                                title="Evaluación"
                                sectionId="evaluation"
                                open={sectionState.isSectionOpen("evaluation")}
                                onToggle={() => sectionState.toggleSection("evaluation")}
                            >
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
                                    checked={!!content.penalizeWrongAnswers}
                                    onChange={(v) => handleUpdate({ ...content, penalizeWrongAnswers: v })}
                                    label="Penalizar respuestas incorrectas"
                                    description="Una respuesta incorrecta resta 1/3 del valor de la pregunta. Para opción múltiple, cada opción incorrecta cancela una correcta. El total nunca baja de 0."
                                />
                            </ConfigSection>

                            <ConfigSection
                                title="Resultados"
                                sectionId="results"
                                open={sectionState.isSectionOpen("results")}
                                onToggle={() => sectionState.toggleSection("results")}
                            >
                                <ConfigToggle
                                    checked={!!content.showCorrectAnswers}
                                    onChange={(v) => handleUpdate({ ...content, showCorrectAnswers: v })}
                                    label="Mostrar respuestas correctas al alumno"
                                    description="Al terminar el cuestionario, el alumno ve qué respuestas eran correctas y su nota. Si está desactivado, solo se muestra la nota cuando el profesor publique las calificaciones."
                                />
                                <label className={cn(
                                    "flex items-start gap-3 group",
                                    statsAvailability.enabled ? "cursor-pointer" : "cursor-not-allowed opacity-70"
                                )}>
                                    <div className="mt-0.5 shrink-0">
                                        <input
                                            type="checkbox"
                                            checked={!!content.saveQuestionStats}
                                            disabled={!statsAvailability.enabled}
                                            onChange={(e) => handleUpdate({ ...content, saveQuestionStats: e.target.checked })}
                                            className="accent-accent-blue size-4"
                                        />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-semibold text-foreground group-hover:text-white transition-colors">Guardar estadísticas grupales</p>
                                        <p className="text-xs text-text-muted/70 leading-relaxed">
                                            {statsAvailability.enabled
                                                ? "Permite comparar por intento qué respondió cada alumno en cada pregunta y verlo en la pestaña Stats."
                                                : statsAvailability.reason}
                                        </p>
                                    </div>
                                </label>
                            </ConfigSection>

                            <ConfigSection
                                title="Aleatoriedad"
                                sectionId="randomness"
                                open={sectionState.isSectionOpen("randomness")}
                                onToggle={() => sectionState.toggleSection("randomness")}
                            >
                                <ConfigToggle
                                    checked={!!content.randomizeQuestions}
                                    onChange={(v) => handleUpdate({ ...content, randomizeQuestions: v })}
                                    label="Aleatorizar orden de preguntas"
                                    description="Cada alumno verá las preguntas en un orden diferente, reduciendo la posibilidad de copiar."
                                />
                                <ConfigToggle
                                    checked={!!content.randomizeOptions}
                                    onChange={(v) => handleUpdate({ ...content, randomizeOptions: v })}
                                    label="Aleatorizar opciones de respuesta"
                                    description="Las opciones de cada pregunta se muestran en orden aleatorio. No aplica a preguntas de Verdadero/Falso."
                                />
                            </ConfigSection>

                            <ConfigSection
                                title="Presentación"
                                sectionId="presentation"
                                open={sectionState.isSectionOpen("presentation")}
                                onToggle={() => sectionState.toggleSection("presentation")}
                            >
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Preguntas por página</label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={content.questionsPerPage ?? ""}
                                        onChange={(e) => handleUpdate({ ...content, questionsPerPage: e.target.value ? Number(e.target.value) : undefined })}
                                        placeholder="Todas"
                                        className="w-32 font-mono bg-surface border-border"
                                    />
                                    <p className="text-xs text-text-muted/70">Vacío = todas las preguntas en una sola página.</p>
                                </div>
                            </ConfigSection>
                        </>
                    )}
                </div>
            </TabsContent>

            <TabsContent value="visibilidad" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <StepVisibilityTab step={step} onUpdateStep={onUpdate} visible={activeTab === "visibilidad"} />
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
    const qType = getQuestionType(q);

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
                {qType === QUIZ_QUESTION_TYPE.LIKERT ? (
                    <span className="text-xs text-text-muted rounded-md border border-border/30 bg-surface px-2 py-1">
                        Sin puntuación
                    </span>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-text-muted">Puntos:</span>
                        <Input type="number" min={0} step={0.5}
                            value={q.points ?? 1}
                            onChange={(e) => onUpdate(q.id, { points: Number(e.target.value) })}
                            className="w-16 h-7 text-xs font-mono bg-surface border-border text-center px-1" />
                    </div>
                )}
                <label className="flex items-center gap-1.5 rounded-md border border-border/30 bg-surface px-2 py-1 text-xs font-medium text-text-muted">
                    <input
                        type="checkbox"
                        checked={!!q.isRequired}
                        onChange={(e) => onUpdate(q.id, { isRequired: e.target.checked || undefined })}
                        className="size-3.5 accent-accent-blue"
                    />
                    Obligatoria
                </label>
            </div>

            {/* Options with DnD */}
            {supportsClassicOptions(q) && (
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
                                        if (qType === QUIZ_QUESTION_TYPE.TRUE_FALSE) {
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
                    {qType === QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE && (
                        <Button variant="ghost" size="sm" onClick={() => onAddOption(q.id)}
                            className="text-text-muted hover:text-accent-blue ml-7 mt-2">
                            <Plus className="size-3 mr-1" /> Añadir Opción
                        </Button>
                    )}
                </div>
            )}

            {/* Short answer placeholder */}
            {qType === QUIZ_QUESTION_TYPE.SHORT_ANSWER && (
                <div className="pl-14">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-surface border border-border/30 text-text-muted text-sm">
                        <AlignLeft className="size-4 shrink-0" />
                        <span>El alumno escribirá su respuesta en texto libre. Requiere corrección manual.</span>
                    </div>
                </div>
            )}

            {qType === QUIZ_QUESTION_TYPE.LIKERT && (
                <LikertQuestionConfig
                    question={q}
                    onUpdate={(updates) => onUpdate(q.id, updates)}
                />
            )}

            {!supportsClassicOptions(q) && qType !== QUIZ_QUESTION_TYPE.SHORT_ANSWER && qType !== QUIZ_QUESTION_TYPE.LIKERT && (
                <StructuredQuestionFields
                    question={q}
                    onUpdate={(updates) => onUpdate(q.id, updates)}
                />
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
