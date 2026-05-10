"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { toast } from "sonner";
import { Link2, ListChecks, MessageSquare, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { updateStepConfiguration, updateStepContent } from "@/app/activities/[id]/edit/actions";
import { RubricBuilderModal } from "@/components/dashboard/shared/rubric-builder-modal";
import { cn } from "@/lib/utils";
import type {
    ActivityPhaseWithSteps,
    ActivityStepWithClientState,
    RubricCriteria,
    SelfEvaluationContent,
} from "@/types/activity";
import { EvaluationQuestionBuilder } from "./evaluation-question-builder";
import { EditorSaveButton } from "./editor-save-button";
import { MarkdownHelpPopover } from "./markdown-help-popover";
import { ConfigSection, ConfigSectionsToolbar, StepConfigSection, useConfigSectionState } from "./step-config-section";
import { StepVisibilityTab } from "./step-visibility-tab";
import { SelfEvalResponsesPanel } from "../evaluation/self-eval-responses-panel";
import { useStepEditorTab } from "./use-step-editor-tab";
import type { StepVisibilityTabHandle } from "./step-visibility-tab";

interface SelfEvaluationEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
    phases?: ActivityPhaseWithSteps[];
    activityId?: string;
    moduleId?: string;
}

const defaultContent: SelfEvaluationContent = {
    evalMode: "rubric",
    rubric: [],
    blocks: [],
    questions: [],
    requireJustification: false,
    countsTowardGrade: false,
    instructionsMarkdown: "",
};

export function SelfEvaluationEditor({ step, onUpdate, phases, activityId, moduleId }: SelfEvaluationEditorProps) {
    const [content, setContent] = useState<SelfEvaluationContent>((step.content as SelfEvaluationContent) || defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [rubricModalOpen, setRubricModalOpen] = useState(false);
    const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
    const visibilityRef = useRef<StepVisibilityTabHandle | null>(null);

    useEffect(() => {
        setContent((step.content as SelfEvaluationContent) || defaultContent);
        setIsDirty(!!step.client_dirty);
    }, [step.id, step.content, step.client_dirty]);

    const save = (nextContent: SelfEvaluationContent) => {
        setContent(nextContent);
        setIsDirty(true);
        onUpdate({ ...step, content: nextContent, client_dirty: true });
    };

    const handleSave = async () => {
        if (!isDirty || isSaving) return;
        setIsSaving(true);
        const result = await updateStepContent(step.id, content);
        if (result.error) {
            toast.error("Error al guardar");
            setIsSaving(false);
            return;
        }
        const configRes = await updateStepConfiguration(step.id, {
            xp: step.xp ?? 0,
            completion_mode: step.completion_mode ?? "none",
            xp_award_trigger: step.xp_award_trigger ?? null,
        });
        if (configRes.error) {
            toast.error("Error al guardar la configuración de la actividad");
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
        onUpdate({ ...step, content, client_dirty: false });
    };

    const evalMode = content.evalMode ?? "rubric";
    const showsRubric = evalMode === "rubric" || evalMode === "combined";
    const showsQuestions = evalMode === "questions" || evalMode === "combined";
    const questionsCount = content.questions?.length ?? 0;
    const linkedSteps = useMemo(() => (
        (phases ?? [])
            .flatMap((phase) => phase.steps)
            .filter((candidate) => candidate.type === "deliverable" || candidate.type === "file_upload")
    ), [phases]);

    const availableTabs = useMemo(() => {
        const tabs = ["instrucciones", "configuracion"];
        if (showsQuestions) tabs.push("preguntas");
        tabs.push("respuestas", "visibilidad");
        return tabs;
    }, [showsQuestions]);
    const { activeTab, setActiveTab } = useStepEditorTab(step.id, "configuracion", availableTabs);

    const configSectionIds = [
        "experience",
        "completion-mode",
        "evaluation-mode",
        ...(showsRubric ? ["rubric", "options"] : []),
        "parent-step",
    ];
    const sectionState = useConfigSectionState(step.id, configSectionIds);
    const tabTriggerClass = "h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:text-foreground text-text-muted bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none";

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full w-full bg-background">
            <div className="shrink-0 border-b border-border/50 bg-surface-dark/10 px-4 flex items-center gap-2">
                <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
                    <TabsTrigger value="instrucciones" className={tabTriggerClass}>Instrucciones</TabsTrigger>
                    <TabsTrigger value="configuracion" className={tabTriggerClass}>Configuración</TabsTrigger>
                    {showsQuestions && (
                        <TabsTrigger value="preguntas" className={tabTriggerClass}>
                            Preguntas {questionsCount > 0 && <span className="ml-1 text-[9px] font-bold bg-accent-blue/20 text-accent-blue px-1.5 py-0.5 rounded-full">{questionsCount}</span>}
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="respuestas" className={tabTriggerClass}>Respuestas</TabsTrigger>
                    <TabsTrigger value="visibilidad" className={tabTriggerClass}>Visibilidad</TabsTrigger>
                </TabsList>
                <div className="ml-auto">
                    <EditorSaveButton isSaving={isSaving} isDirty={isDirty} onSave={handleSave} />
                </div>
            </div>

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
                                            onClick={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
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
                                        onChange={(event) => save({ ...content, instructionsMarkdown: event.target.value })}
                                        className="h-full w-full resize-none border-none focus-visible:ring-0 rounded-none bg-transparent p-6 text-foreground font-mono text-sm leading-relaxed"
                                        placeholder="# Instrucciones de autoevaluación..."
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
                                <div className="flex-1 overflow-y-auto p-6">
                                    {content.instructionsMarkdown ? (
                                        <div className="prose dark:prose-invert prose-sm max-w-none text-text-muted prose-pre:p-0 prose-code:bg-surface-dark prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none font-sans">
                                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}>
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

            <TabsContent value="configuracion" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-8 space-y-4">
                    <div className="mb-2">
                        <h3 className="text-lg font-bold text-foreground">Configuración de Autoevaluación</h3>
                        <p className="text-sm text-text-muted mt-1">El alumno se evalúa con la rúbrica, las preguntas o ambos bloques en cascada.</p>
                    </div>

                    <ConfigSectionsToolbar
                        allSectionsOpen={sectionState.allSectionsOpen}
                        onToggleAll={() => sectionState.setAllSectionsOpen(!sectionState.allSectionsOpen)}
                    />
                    <StepConfigSection step={step} onUpdateStep={onUpdate} sectionState={sectionState} onDirtyChange={setIsDirty} />

                    <ConfigSection
                        title="Modo de evaluación"
                        sectionId="evaluation-mode"
                        open={sectionState.isSectionOpen("evaluation-mode")}
                        onToggle={() => sectionState.toggleSection("evaluation-mode")}
                        contentClassName="space-y-3"
                    >
                        <div className="flex flex-wrap gap-2">
                            <ModeButton active={evalMode === "rubric"} onClick={() => save({ ...content, evalMode: "rubric" })} icon={<ListChecks className="size-3.5" />} label="Rúbrica" />
                            <ModeButton active={evalMode === "questions"} onClick={() => save({ ...content, evalMode: "questions" })} icon={<MessageSquare className="size-3.5" />} label="Preguntas" />
                            <ModeButton active={evalMode === "combined"} onClick={() => save({ ...content, evalMode: "combined" })} icon={<ListChecks className="size-3.5" />} label="Combinado" />
                        </div>
                        <p className="text-xs text-text-muted">
                            {evalMode === "rubric"
                                ? "El alumno selecciona un nivel por criterio y, si lo exiges, lo justifica."
                                : evalMode === "questions"
                                    ? "El alumno responde preguntas abiertas, Likert o numéricas como reflexión."
                                    : "Primero responde la rúbrica y después las preguntas. La puntuación sale solo de la rúbrica."}
                        </p>
                    </ConfigSection>

                    {showsRubric && (
                        <>
                            <ConfigSection
                                title="Rúbrica"
                                sectionId="rubric"
                                open={sectionState.isSectionOpen("rubric")}
                                onToggle={() => sectionState.toggleSection("rubric")}
                            >
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
                            </ConfigSection>
                            <RubricBuilderModal
                                rubric={content.rubric ?? []}
                                open={rubricModalOpen}
                                onClose={() => setRubricModalOpen(false)}
                                onChange={(rubric: RubricCriteria[]) => save({ ...content, rubric })}
                            />
                        </>
                    )}

                    <ConfigSection
                        title="Paso vinculado"
                        sectionId="parent-step"
                        open={sectionState.isSectionOpen("parent-step")}
                        onToggle={() => sectionState.toggleSection("parent-step")}
                        contentClassName="space-y-3"
                    >
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Entregable de referencia</label>
                            <select
                                value={content.referenceStepId ?? ""}
                                onChange={(event) => save({ ...content, referenceStepId: event.target.value || undefined })}
                                className="w-full h-10 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                            >
                                <option value="">Sin vincular</option>
                                {linkedSteps.map((candidate) => (
                                    <option key={candidate.id} value={candidate.id}>
                                        {candidate.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-text-muted">
                            <Link2 className="size-3.5 text-accent-blue shrink-0 mt-0.5" />
                            Vincula la autoevaluación a un entregable si quieres mostrar contexto al alumno o hacerla pesar en la nota final.
                        </div>
                    </ConfigSection>

                    {showsRubric && (
                        <ConfigSection
                            title="Opciones"
                            sectionId="options"
                            open={sectionState.isSectionOpen("options")}
                            onToggle={() => sectionState.toggleSection("options")}
                            contentClassName="space-y-4"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm text-foreground font-medium">Exigir justificación</p>
                                    <p className="text-xs text-text-muted mt-0.5">El alumno debe escribir un texto por criterio.</p>
                                </div>
                                <Toggle value={content.requireJustification} onChange={(value) => save({ ...content, requireJustification: value })} />
                            </div>
                            {content.requireJustification && (
                                <div className="flex items-center justify-between gap-4 pl-4 border-l-2 border-border/30">
                                    <div>
                                        <p className="text-sm text-foreground font-medium">Mínimo de caracteres</p>
                                        <p className="text-xs text-text-muted mt-0.5">Por justificación de criterio.</p>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        max={500}
                                        value={content.minJustificationLength ?? 0}
                                        onChange={(event) => save({ ...content, minJustificationLength: Number(event.target.value) || undefined })}
                                        className="h-9 w-20 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm text-foreground font-medium">Cuenta para nota final</p>
                                    <p className="text-xs text-text-muted mt-0.5">Solo aplica a la parte de rúbrica.</p>
                                </div>
                                <Toggle
                                    value={content.countsTowardGrade}
                                    onChange={(value) => save({ ...content, countsTowardGrade: value, selfEvalWeight: value ? (content.selfEvalWeight ?? 20) : undefined })}
                                />
                            </div>
                            {content.countsTowardGrade && (
                                <div className="flex items-center justify-between gap-4 pl-4 border-l-2 border-border/30">
                                    <div>
                                        <p className="text-sm text-foreground font-medium">Peso de la autoevaluación</p>
                                        <p className="text-xs text-text-muted mt-0.5">% de la nota final del entregable vinculado.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={content.selfEvalWeight ?? 20}
                                            onChange={(event) => save({ ...content, selfEvalWeight: Number(event.target.value) })}
                                            className="w-20 bg-surface border-border/50 text-center font-mono"
                                        />
                                        <span className="text-xs text-text-muted">%</span>
                                    </div>
                                </div>
                            )}
                        </ConfigSection>
                    )}
                </div>
            </TabsContent>

            <TabsContent value="preguntas" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <EvaluationQuestionBuilder
                    content={content}
                    onChange={save}
                    heading="Preguntas de reflexión"
                    description="Añade secciones y preguntas de respuesta libre, Likert o numéricas."
                    emptyTitle="No hay preguntas todavía."
                    emptyDescription="Empieza creando preguntas o una sección para organizar la reflexión."
                />
            </TabsContent>

            <TabsContent value="respuestas" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="w-full max-w-none mx-auto p-4 sm:p-6 pb-16">
                    <SelfEvalResponsesPanel
                        stepId={step.id}
                        activityId={activityId}
                        moduleId={moduleId}
                        visible={activeTab === "respuestas"}
                    />
                </div>
            </TabsContent>

            <TabsContent value="visibilidad" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <StepVisibilityTab
                    ref={visibilityRef}
                    step={step}
                    onUpdateStep={onUpdate}
                    visible={activeTab === "visibilidad"}
                    onDirtyChange={(dirty) => {
                        if (!dirty) return;
                        setIsDirty(true);
                        onUpdate({ ...step, client_dirty: true });
                    }}
                />
            </TabsContent>
        </Tabs>
    );
}

function ModeButton({
    active,
    onClick,
    icon,
    label,
}: {
    active: boolean;
    onClick: () => void;
    icon: ReactNode;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                active
                    ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                    : "bg-surface border-border/50 text-text-muted hover:text-foreground hover:bg-surface-dark"
            )}
        >
            {icon}
            {label}
        </button>
    );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
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
            <span
                className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                    value ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    );
}
