"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, FileUploadContent, AllowedFileType, GradeComposition, PeerEvaluationContent, QuizContent, RubricCriteria } from "@/types/activity";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateStepContent, updateStepDueDate } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { ListChecks, PanelRightClose, PanelRightOpen, Scale, Users } from "lucide-react";
import { RubricBuilderModal } from "@/components/dashboard/shared/rubric-builder-modal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigSection, ConfigSectionsToolbar, StepConfigSection, useConfigSectionState } from "./step-config-section";
import { StepSubmissionsPanel, STEP_SUBMISSIONS_PANEL_TYPES } from "@/components/dashboard/activities/activity-builder/step-submissions-panel";
import { useStepEditorTab } from "./use-step-editor-tab";
import { StepVisibilityTab } from "./step-visibility-tab";
import { MarkdownHelpPopover } from "./markdown-help-popover";
import { EditorSaveButton } from "./editor-save-button";
import type { StepVisibilityTabHandle } from "./step-visibility-tab";

const ALLOWED_TYPE_OPTIONS: { value: AllowedFileType; label: string }[] = [
    { value: 'pdf', label: 'PDF' },
    { value: 'image', label: 'Imágenes' },
    { value: 'word', label: 'Word (.doc, .docx)' },
    { value: 'zip', label: 'ZIP (.zip)' },
    { value: 'pka', label: 'Packet Tracer (.pka)' },
    { value: 'any', label: 'Cualquier archivo' },
];

const PRESET_SIZES = [5, 10, 25, 50];

type SizeUnit = 'MB' | 'GB';

function initCustomSizeState(mb: number): { isCustom: boolean; value: number; unit: SizeUnit } {
    if (PRESET_SIZES.includes(mb)) return { isCustom: false, value: mb, unit: 'MB' };
    if (mb >= 1024) return { isCustom: true, value: Math.round(mb / 1024), unit: 'GB' };
    return { isCustom: true, value: mb, unit: 'MB' };
}

function toMb(value: number, unit: SizeUnit): number {
    return unit === 'GB' ? value * 1024 : value;
}

function utcToLocalInputValue(isoUtc: string): string {
    const d = new Date(isoUtc);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FileUploadEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
    activityId?: string;
    moduleId?: string;
}

function isBuiltInQuizChild(step: { type: string; content: unknown }) {
    if (step.type !== "quiz") return false;
    const quizContent = step.content as Partial<QuizContent> | null | undefined;
    const mode = quizContent?.quizMode ?? (quizContent?.googleFormUrl ? "google_form" : "builtin");
    return mode === "builtin";
}

export function FileUploadEditor({ step, onUpdate, activityId, moduleId }: FileUploadEditorProps) {
    const defaultContent: FileUploadContent = (step.content as FileUploadContent) || {
        instructionsMarkdown: '',
        allowedTypes: ['pdf', 'image', 'word'],
        maxFileSizeMb: 10,
        maxFiles: 1,
    };
    const { activeTab, setActiveTab } = useStepEditorTab(step.id, "instrucciones", ["instrucciones", "configuracion", "entregas", "visibilidad"]);
    const initCustom = initCustomSizeState(defaultContent.maxFileSizeMb);
    const [content, setContent] = useState<FileUploadContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const visibilityRef = useRef<StepVisibilityTabHandle | null>(null);
    const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
    const [rubricModalOpen, setRubricModalOpen] = useState(false);
    const [dueDate, setDueDate] = useState<string | null>(step.due_date ?? null);
    const [isCustomSize, setIsCustomSize] = useState(initCustom.isCustom);
    const [customSizeValue, setCustomSizeValue] = useState(initCustom.value);
    const [customSizeUnit, setCustomSizeUnit] = useState<SizeUnit>(initCustom.unit);

    useEffect(() => {
        const newContent = (step.content as FileUploadContent) || {
            instructionsMarkdown: '',
            allowedTypes: ['pdf', 'image', 'word'],
            maxFileSizeMb: 10,
            maxFiles: 1,
        };
        setContent(newContent);
        setDueDate(step.due_date ?? null);
        const newCustom = initCustomSizeState((newContent as FileUploadContent).maxFileSizeMb ?? 10);
        setIsCustomSize(newCustom.isCustom);
        setCustomSizeValue(newCustom.value);
        setCustomSizeUnit(newCustom.unit);
        setIsDirty(false);
    }, [step.id, step.due_date]);

    const saveContent = (newContent: FileUploadContent) => {
        setContent(newContent);
        setIsDirty(true);
        onUpdate({ ...step, content: newContent });
    };

    const handleDueDateChange = (value: string | null) => {
        // Convert local datetime-local string to UTC ISO before saving
        const isoUtc = value ? new Date(value).toISOString() : null;
        setDueDate(isoUtc);
        setIsDirty(true);
    };

    const handleSave = async () => {
        if (!isDirty || isSaving) return;
        setIsSaving(true);
        const contentRes = await updateStepContent(step.id, content);
        if (contentRes.error) {
            toast.error("Error al guardar");
            setIsSaving(false);
            return;
        }
        const dueDateRes = await updateStepDueDate(step.id, dueDate);
        if (dueDateRes.error) {
            toast.error("Error al guardar la fecha límite");
            setIsSaving(false);
            return;
        }
        if (visibilityRef.current?.isDirty()) {
            const visibilitySaved = await visibilityRef.current.save();
            if (!visibilitySaved) {
                setIsSaving(false);
                return;
            }
        }
        setIsSaving(false);
        setIsDirty(false);
    };

    const toggleAllowedType = (type: AllowedFileType) => {
        const current = content.allowedTypes ?? [];
        const updated = current.includes(type)
            ? current.filter(t => t !== type)
            : [...current, type];
        saveContent({ ...content, allowedTypes: updated });
    };

    const handleRubricChange = (newRubric: RubricCriteria[]) => {
        saveContent({ ...content, rubric: newRubric });
    };

    const gradeChildren = step.children ?? [];
    const hasGradeCompositionSection = gradeChildren.some(child => {
        if (child.type === "self_evaluation") return true;
        if (child.type === "quiz") return isBuiltInQuizChild(child);
        if (child.type !== "peer_evaluation") return false;
        const peerContent = child.content as PeerEvaluationContent | null | undefined;
        return peerContent?.mode !== "intra_group" || !!content.is_group_submission;
    });
    const configSectionIds = [
        "experience",
        "completion-mode",
        "group-submission",
        "allowed-types",
        "limits",
        "rubric",
        ...(hasGradeCompositionSection ? ["weighting"] : []),
        "due-date",
    ];
    const sectionState = useConfigSectionState(step.id, configSectionIds);

    const tabTriggerClass = "h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:text-foreground text-text-muted bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none";

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full w-full bg-background">
            {/* Tab bar */}
            <div className="shrink-0 border-b border-border/50 bg-surface-dark/10 px-4 flex items-center gap-2">
                <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
                    <TabsTrigger value="instrucciones" className={tabTriggerClass}>Instrucciones</TabsTrigger>
                    <TabsTrigger value="configuracion" className={tabTriggerClass}>Configuración</TabsTrigger>
                    <TabsTrigger value="entregas" className={tabTriggerClass}>Entregas</TabsTrigger>
                    <TabsTrigger value="visibilidad" className={tabTriggerClass}>Visibilidad</TabsTrigger>
                </TabsList>
                <div className="ml-auto">
                    <EditorSaveButton isSaving={isSaving} isDirty={isDirty} onSave={handleSave} />
                </div>
            </div>

            {/* Instrucciones tab — markdown split view */}
            <TabsContent value="instrucciones" className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
                <div className="flex h-full overflow-hidden min-h-0">
                    <ResizablePanelGroup direction="horizontal">
                        <ResizablePanel defaultSize={50} minSize={30}>
                            <div className="flex flex-col h-full bg-surface-dark/20 relative min-h-0">
                                <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50 justify-between">
                                    <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Instrucciones (Markdown)</span>
                                    <div className="flex items-center gap-1">
                                        <MarkdownHelpPopover />
                                        <button
                                            onClick={() => setIsPreviewCollapsed(v => !v)}
                                            className="text-text-muted hover:text-foreground transition-colors flex items-center gap-1 bg-surface border border-border-subtle rounded-md px-2 py-1 shadow-sm h-7"
                                            title={isPreviewCollapsed ? "Expandir vista previa" : "Ocultar vista previa"}
                                        >
                                            {isPreviewCollapsed ? <PanelRightOpen className="size-3.5" /> : <PanelRightClose className="size-3.5" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 p-0 overflow-hidden">
                                    <Textarea
                                        value={content.instructionsMarkdown || ""}
                                        onChange={(e) => saveContent({ ...content, instructionsMarkdown: e.target.value })}
                                        className="h-full w-full resize-none border-none focus-visible:ring-0 rounded-none bg-transparent p-6 text-foreground font-mono text-sm leading-relaxed"
                                        placeholder="# Instrucciones\nDescribe qué debe entregar el alumno..."
                                    />
                                </div>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle className="bg-border-subtle hover:bg-accent-blue transition-colors duration-300 w-1.5 flex flex-col items-center justify-center" />

                        <ResizablePanel defaultSize={50} minSize={25} maxSize={75} className={isPreviewCollapsed ? "hidden" : ""}>
                            <div className="flex flex-col h-full bg-background relative border-l border-border-subtle">
                                <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50">
                                    <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Vista previa</span>
                                </div>
                                <div className="flex-1 p-8 overflow-y-auto prose dark:prose-invert prose-sm max-w-none prose-headings:font-semibold prose-a:text-accent-blue hover:prose-a:text-accent-blue/80 prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-none prose-code:bg-surface-dark prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none font-sans">
                                    {content.instructionsMarkdown ? (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                                        >
                                            {content.instructionsMarkdown}
                                        </ReactMarkdown>
                                    ) : (
                                        <div className="text-text-muted/50 italic mt-4 text-center">Instrucciones vacías.</div>
                                    )}
                                </div>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </TabsContent>

            <TabsContent value="entregas" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="w-full max-w-none mx-auto p-4 sm:p-6 pb-16">
                    <StepSubmissionsPanel
                        stepId={step.id}
                        activityId={activityId}
                        moduleId={moduleId}
                        visible={activeTab === "entregas"}
                        allowedTypes={[STEP_SUBMISSIONS_PANEL_TYPES.FILE_UPLOAD]}
                        invalidTypeError="El paso no es de subida de archivos."
                        missingContextError="No se pudo cargar el contexto de actividad para mostrar entregas."
                        loadingLabel="Cargando entregas..."
                    />
                </div>
            </TabsContent>

            {/* Configuración tab */}
            <TabsContent value="configuracion" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-8 space-y-6">
                    <div className="mb-2">
                        <h3 className="text-lg font-bold text-foreground">Configuración del Entregable</h3>
                        <p className="text-sm text-text-muted mt-1">El alumno sube archivos directamente a tu Drive.</p>
                    </div>

                    <ConfigSectionsToolbar
                        allSectionsOpen={sectionState.allSectionsOpen}
                        onToggleAll={() => sectionState.setAllSectionsOpen(!sectionState.allSectionsOpen)}
                    />
                    <StepConfigSection step={step} onUpdateStep={onUpdate} sectionState={sectionState} />

                    {/* Group submission toggle */}
                    <ConfigSection
                        title="Entrega Grupal"
                        sectionId="group-submission"
                        open={sectionState.isSectionOpen("group-submission")}
                        onToggle={() => sectionState.toggleSection("group-submission")}
                        contentClassName="flex items-center justify-between gap-4"
                    >
                            <div className="flex items-center gap-3">
                                <Users className="size-4 text-text-muted shrink-0" />
                                <div>
                                    <p className="text-sm text-foreground font-medium">Entrega por grupos</p>
                                    <p className="text-xs text-text-muted mt-0.5">
                                        Todos los miembros del grupo comparten los archivos subidos.
                                    </p>
                                </div>
                            </div>
                            <button
                                role="switch"
                                aria-checked={!!content.is_group_submission}
                                onClick={() => saveContent({ ...content, is_group_submission: !content.is_group_submission })}
                                className={cn(
                                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none",
                                    content.is_group_submission ? "bg-accent-blue" : "bg-surface-dark border border-border/50"
                                )}
                            >
                                <span
                                    className={cn(
                                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                                        content.is_group_submission ? "translate-x-5" : "translate-x-0"
                                    )}
                                />
                            </button>
                    </ConfigSection>

                    {/* Tipos de archivo */}
                    <ConfigSection
                        title="Tipos de archivo permitidos"
                        sectionId="allowed-types"
                        open={sectionState.isSectionOpen("allowed-types")}
                        onToggle={() => sectionState.toggleSection("allowed-types")}
                    >
                            <div className="flex flex-wrap gap-2">
                                {ALLOWED_TYPE_OPTIONS.map(opt => {
                                    const active = content.allowedTypes?.includes(opt.value) ?? false;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => toggleAllowedType(opt.value)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                                                active
                                                    ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                                    : "bg-surface border-border/50 text-text-muted hover:text-foreground hover:bg-surface-dark"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                    </ConfigSection>

                    {/* Límites */}
                    <ConfigSection
                        title="Límites"
                        sectionId="limits"
                        open={sectionState.isSectionOpen("limits")}
                        onToggle={() => sectionState.toggleSection("limits")}
                        contentClassName="flex flex-wrap gap-6"
                    >
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">Tamaño máximo</label>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={isCustomSize ? "custom" : String(content.maxFileSizeMb)}
                                        onChange={(e) => {
                                            if (e.target.value === "custom") { setIsCustomSize(true); }
                                            else { setIsCustomSize(false); saveContent({ ...content, maxFileSizeMb: Number(e.target.value) }); }
                                        }}
                                        className="h-9 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                    >
                                        {PRESET_SIZES.map(mb => <option key={mb} value={mb}>{mb} MB</option>)}
                                        <option value="custom">Personalizado</option>
                                    </select>
                                    {isCustomSize && (
                                        <>
                                            <input type="number" min={1} value={customSizeValue}
                                                onChange={(e) => { const v = Math.max(1, Number(e.target.value)); setCustomSizeValue(v); saveContent({ ...content, maxFileSizeMb: toMb(v, customSizeUnit) }); }}
                                                className="h-9 w-20 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                            />
                                            <select value={customSizeUnit}
                                                onChange={(e) => { const unit = e.target.value as SizeUnit; setCustomSizeUnit(unit); saveContent({ ...content, maxFileSizeMb: toMb(customSizeValue, unit) }); }}
                                                className="h-9 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                            >
                                                <option value="MB">MB</option>
                                                <option value="GB">GB</option>
                                            </select>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">Nº máximo de archivos</label>
                                <input type="number" min={1} max={10} value={content.maxFiles}
                                    onChange={(e) => saveContent({ ...content, maxFiles: Math.max(1, Math.min(10, Number(e.target.value))) })}
                                    className="h-9 w-20 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                />
                            </div>
                    </ConfigSection>

                    {/* Rúbrica */}
                    <ConfigSection
                        title="Rúbrica"
                        sectionId="rubric"
                        open={sectionState.isSectionOpen("rubric")}
                        onToggle={() => sectionState.toggleSection("rubric")}
                    >
                            <Button variant="outline" size="sm" onClick={() => setRubricModalOpen(true)}
                                className="h-8 text-xs gap-1.5 border-border/50 text-text-muted hover:text-foreground">
                                <ListChecks className="size-3.5" />
                                {(content.rubric?.length ?? 0) > 0
                                    ? `Editar rúbrica (${content.rubric!.length} ${content.rubric!.length === 1 ? "criterio" : "criterios"})`
                                    : "Configurar rúbrica"}
                            </Button>
                    </ConfigSection>
                    <RubricBuilderModal rubric={content.rubric ?? []} open={rubricModalOpen} onClose={() => setRubricModalOpen(false)} onChange={handleRubricChange} />

                    {/* Ponderación 360° — solo si hay hijos de evaluación */}
                    {(() => {
                        const children = step.children ?? [];
                        const selfEvalChild = children.find(c => c.type === "self_evaluation");
                        const peerEvalChild = children.find(c => c.type === "peer_evaluation" && (c.content as PeerEvaluationContent)?.mode !== "intra_group");
                        const intraGroupChild = children.find(c => c.type === "peer_evaluation" && (c.content as PeerEvaluationContent)?.mode === "intra_group");
                        const quizChild = children.find(isBuiltInQuizChild);
                        const showIntraGroup = !!content.is_group_submission && !!intraGroupChild;

                        if (!selfEvalChild && !peerEvalChild && !showIntraGroup && !quizChild) return null;

                        const comp: GradeComposition = content.gradeComposition ?? { selfEvalWeight: 0, peerEvalWeight: 0, intraGroupWeight: 0, quizWeight: 0 };
                        const effectiveSelfW = selfEvalChild ? comp.selfEvalWeight : 0;
                        const effectivePeerW = peerEvalChild ? comp.peerEvalWeight : 0;
                        const effectiveIntraW = showIntraGroup ? comp.intraGroupWeight : 0;
                        const effectiveQuizW = quizChild ? (comp.quizWeight ?? 0) : 0;
                        const totalAssigned = effectiveSelfW + effectivePeerW + effectiveIntraW + effectiveQuizW;
                        const teacherWeight = Math.max(0, 100 - totalAssigned);

                        const updateComp = (field: keyof GradeComposition, value: number) => {
                            const newComp = { ...comp, [field]: value };
                            const newTotal =
                                (selfEvalChild ? newComp.selfEvalWeight : 0)
                                + (peerEvalChild ? newComp.peerEvalWeight : 0)
                                + (showIntraGroup ? newComp.intraGroupWeight : 0)
                                + (quizChild ? (newComp.quizWeight ?? 0) : 0);
                            if (newTotal > 100) return;
                            saveContent({ ...content, gradeComposition: newComp });
                        };

                        return (
                            <ConfigSection
                                title={<span className="flex items-center gap-1.5"><Scale className="size-3" /> Ponderación (360°)</span>}
                                sectionId="weighting"
                                open={sectionState.isSectionOpen("weighting")}
                                onToggle={() => sectionState.toggleSection("weighting")}
                                contentClassName="space-y-3"
                                headerRight={
                                    <span className={cn("text-xs font-mono", totalAssigned > 100 ? "text-red-400" : "text-text-muted")}>
                                        Profesor: {teacherWeight}%
                                    </span>
                                }
                            >
                                    <p className="text-xs text-text-muted">Cuánto pesa cada evaluación en la nota final. El porcentaje del profesor es el residuo.</p>

                                    {/* Profesor — read-only residual */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-text-muted w-36 shrink-0">Profesor</span>
                                        <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-accent-blue/40 transition-all"
                                                style={{ width: `${teacherWeight}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-mono text-text-muted w-10 text-right">{teacherWeight}%</span>
                                    </div>

                                    {/* Autoevaluación */}
                                    {selfEvalChild && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-foreground w-36 shrink-0">Autoevaluación</span>
                                            <input
                                                type="range"
                                                min={0}
                                                max={100 - effectivePeerW - effectiveIntraW - effectiveQuizW}
                                                value={comp.selfEvalWeight}
                                                onChange={e => updateComp("selfEvalWeight", Number(e.target.value))}
                                                className="flex-1 accent-accent-blue"
                                            />
                                            <span className="text-sm font-mono text-foreground w-10 text-right">{comp.selfEvalWeight}%</span>
                                        </div>
                                    )}

                                    {/* Coevaluación */}
                                    {peerEvalChild && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-foreground w-36 shrink-0">Coevaluación</span>
                                            <input
                                                type="range"
                                                min={0}
                                                max={100 - effectiveSelfW - effectiveIntraW - effectiveQuizW}
                                                value={comp.peerEvalWeight}
                                                onChange={e => updateComp("peerEvalWeight", Number(e.target.value))}
                                                className="flex-1 accent-accent-blue"
                                            />
                                            <span className="text-sm font-mono text-foreground w-10 text-right">{comp.peerEvalWeight}%</span>
                                        </div>
                                    )}

                                    {/* Contribución grupal — solo si is_group_submission + intra_group child */}
                                    {showIntraGroup && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-foreground w-36 shrink-0">Contrib. grupal</span>
                                            <input
                                                type="range"
                                                min={0}
                                                max={100 - effectiveSelfW - effectivePeerW - effectiveQuizW}
                                                value={comp.intraGroupWeight}
                                                onChange={e => updateComp("intraGroupWeight", Number(e.target.value))}
                                                className="flex-1 accent-accent-blue"
                                            />
                                            <span className="text-sm font-mono text-foreground w-10 text-right">{comp.intraGroupWeight}%</span>
                                        </div>
                                    )}

                                    {quizChild && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-foreground w-36 shrink-0">Cuestionario</span>
                                            <input
                                                type="range"
                                                min={0}
                                                max={100 - effectiveSelfW - effectivePeerW - effectiveIntraW}
                                                value={comp.quizWeight ?? 0}
                                                onChange={e => updateComp("quizWeight", Number(e.target.value))}
                                                className="flex-1 accent-accent-blue"
                                            />
                                            <span className="text-sm font-mono text-foreground w-10 text-right">{comp.quizWeight ?? 0}%</span>
                                        </div>
                                    )}
                            </ConfigSection>
                        );
                    })()}

                    {/* Fecha límite */}
                    <ConfigSection
                        title="Fecha Límite"
                        sectionId="due-date"
                        open={sectionState.isSectionOpen("due-date")}
                        onToggle={() => sectionState.toggleSection("due-date")}
                        contentClassName="space-y-2"
                    >
                            <div className="flex items-center gap-2">
                                <input type="datetime-local"
                                    value={dueDate ? utcToLocalInputValue(dueDate) : ""}
                                    onChange={(e) => handleDueDateChange(e.target.value || null)}
                                    className="flex-1 h-9 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                />
                                {dueDate && (
                                    <Button variant="ghost" size="sm" onClick={() => handleDueDateChange(null)}
                                        className="h-9 text-xs text-text-muted hover:text-foreground shrink-0">
                                        Quitar
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-text-muted">El alumno no podrá entregar pasada esta fecha.</p>
                    </ConfigSection>
                </div>
            </TabsContent>
            <TabsContent value="visibilidad" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <StepVisibilityTab ref={visibilityRef} step={step} onUpdateStep={onUpdate} visible={activeTab === "visibilidad"} onDirtyChange={(dirty) => { if (dirty) setIsDirty(true); }} />
            </TabsContent>
        </Tabs>
    );
}
