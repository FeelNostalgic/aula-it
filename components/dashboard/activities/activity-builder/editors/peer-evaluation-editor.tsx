"use client";

import { useState, useEffect, useTransition, useMemo, useRef } from "react";
import {
    ActivityStepWithClientState, ActivityPhaseWithSteps,
    PeerEvaluationContent, PeerEvaluationMode,
    OutlierSensitivity, NonEvaluatorPolicy, RubricCriteria,
} from "@/types/activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateStepConfiguration, updateStepContent } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { ListChecks, Users, User, MessageSquare, PanelRightClose, PanelRightOpen, Link2, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { RubricBuilderModal } from "@/components/dashboard/shared/rubric-builder-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigSection, ConfigSectionsToolbar, StepConfigSection, useConfigSectionState } from "./step-config-section";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { generatePeerAssignments, deletePeerAssignments, getPeerEvaluationResults } from "@/app/dashboard/units/[id]/actions";
import { useStepEditorTab } from "./use-step-editor-tab";
import { StepVisibilityTab } from "./step-visibility-tab";
import { MarkdownHelpPopover } from "./markdown-help-popover";
import { EditorSaveButton } from "./editor-save-button";
import { EvaluationQuestionBuilder } from "./evaluation-question-builder";
import { PeerEvalResponsesPanel } from "../evaluation/peer-eval-responses-panel";
import type { StepVisibilityTabHandle } from "./step-visibility-tab";

interface PeerEvaluationEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
    phases?: ActivityPhaseWithSteps[];
    activityId?: string;
    moduleId?: string;
}

const defaultContent: PeerEvaluationContent = {
    mode: "individual",
    rubric: [],
    blocks: [],
    questions: [],
    requireJustification: false,
    submissionsPerEvaluator: 2,
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

export function PeerEvaluationEditor({ step, onUpdate, phases, activityId, moduleId }: PeerEvaluationEditorProps) {
    const [content, setContent] = useState<PeerEvaluationContent>(
        (step.content as PeerEvaluationContent) || defaultContent
    );
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const visibilityRef = useRef<StepVisibilityTabHandle | null>(null);
    const [rubricModalOpen, setRubricModalOpen] = useState(false);
    const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isGenerating, setIsGenerating] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [gestionAssignments, setGestionAssignments] = useState<any[]>([]);
    const [gestionLoading, setGestionLoading] = useState(false);

    const loadGestionAssignments = async () => {
        setGestionLoading(true);
        const res = await getPeerEvaluationResults(step.id);
        setGestionAssignments(res.assignments ?? []);
        setGestionLoading(false);
    };

    useEffect(() => {
        setContent((step.content as PeerEvaluationContent) || defaultContent);
        setIsDirty(!!step.client_dirty);
    }, [step.id]);

    useEffect(() => {
        if (moduleId) loadGestionAssignments();
    }, [step.id, moduleId]);

    const save = (newContent: PeerEvaluationContent) => {
        setContent(newContent);
        setIsDirty(true);
        onUpdate({ ...step, content: newContent, client_dirty: true });
    };

    const handleSave = async () => {
        if (!isDirty || isSaving) return;
        setIsSaving(true);
        const res = await updateStepContent(step.id, content);
        if (res.error) {
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
    const questions = content.questions ?? [];
    const showsRubric = evalMode === "rubric" || evalMode === "combined";
    const showsQuestions = evalMode === "questions" || evalMode === "combined";
    const availableTabs = useMemo(
        () => {
            const tabs = ["instrucciones", "configuracion"];
            if (showsQuestions) tabs.push("preguntas");
            tabs.push("respuestas", "visibilidad");
            return tabs;
        },
        [showsQuestions],
    );
    const { activeTab, setActiveTab } = useStepEditorTab(step.id, "configuracion", availableTabs);

    // Find the parent step for this eval step
    const parentStep = step.parent_step_id
        ? (phases ?? []).flatMap(p => p.steps).find(s => s.id === step.parent_step_id) ?? null
        : null;
    const showManualManagement = !!moduleId && content.mode !== "intra_group" && !(content.mode === "group" && content.evaluateAllGroups);
    const configSectionIds = [
        "experience",
        "completion-mode",
        "mode",
        "parent-step",
        "evaluation-mode",
        ...(showsRubric ? ["rubric"] : []),
        ...(content.mode === "individual" ? ["distribution-individual", "integrity"] : []),
        ...(content.mode === "group" ? ["distribution-groups"] : []),
        ...(content.mode === "intra_group" ? ["distribution-intra-group"] : []),
        ...(showManualManagement ? ["management"] : []),
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
                            Preguntas {questions.length > 0 && <span className="ml-1 text-[9px] font-bold bg-accent-blue/20 text-accent-blue px-1.5 py-0.5 rounded-full">{questions.length}</span>}
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="respuestas" className={tabTriggerClass}>Respuestas</TabsTrigger>
                    <TabsTrigger value="visibilidad" className={tabTriggerClass}>Visibilidad</TabsTrigger>
                </TabsList>
                <div className="ml-auto">
                    <EditorSaveButton isSaving={isSaving} isDirty={isDirty} onSave={handleSave} />
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
                                    <div className="flex items-center gap-1">
                                        <MarkdownHelpPopover />
                                        <button
                                            onClick={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
                                            className="text-text-muted hover:text-foreground transition-colors flex items-center gap-1 bg-surface border border-border-subtle rounded-md px-2 py-1 shadow-sm h-7"
                                            title={isPreviewCollapsed ? "Expandir Vista Previa" : "Ocultar Vista Previa"}
                                        >
                                            {isPreviewCollapsed ? <PanelRightOpen className="size-3.5" /> : <PanelRightClose className="size-3.5" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 p-0 overflow-hidden">
                                    <Textarea
                                        value={content.instructionsMarkdown || ""}
                                        onChange={(e) => save({ ...content, instructionsMarkdown: e.target.value })}
                                        className="h-full w-full resize-none border-none focus-visible:ring-0 rounded-none bg-transparent p-6 text-foreground font-mono text-sm leading-relaxed"
                                        placeholder="# Instrucciones de coevaluación..."
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

            <TabsContent value="configuracion" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-8 space-y-4">
                    <div className="mb-2">
                        <h3 className="text-lg font-bold text-foreground">Configuración de Coevaluación</h3>
                        <p className="text-sm text-text-muted mt-1">Los alumnos evalúan los trabajos de sus compañeros con la rúbrica que configures.</p>
                    </div>

                    <ConfigSectionsToolbar
                        allSectionsOpen={sectionState.allSectionsOpen}
                        onToggleAll={() => sectionState.setAllSectionsOpen(!sectionState.allSectionsOpen)}
                    />
                    <StepConfigSection step={step} onUpdateStep={onUpdate} sectionState={sectionState} onDirtyChange={setIsDirty} />

                    {/* Mode selector */}
                    {(() => {
                        const parentIsGroup = parentStep && (parentStep.content as any)?.is_group_submission === true;
                        const parentIsIndividual = parentStep && !parentIsGroup;
                        const allowedModes: PeerEvaluationMode[] = parentIsGroup
                            ? ["group", "intra_group"]
                            : parentIsIndividual
                                ? ["individual"]
                                : ["individual", "group", "intra_group"];
                        return (
                            <ConfigSection
                                title="Modo"
                                sectionId="mode"
                                open={sectionState.isSectionOpen("mode")}
                                onToggle={() => sectionState.toggleSection("mode")}
                                contentClassName="space-y-3"
                            >
                                    <div className="flex gap-2 flex-wrap">
                                        {(["individual", "group", "intra_group"] as PeerEvaluationMode[]).map(m => {
                                            const isAllowed = allowedModes.includes(m);
                                            return (
                                                <button
                                                    key={m}
                                                    onClick={() => isAllowed && save({ ...content, mode: m })}
                                                    disabled={!isAllowed}
                                                    title={!isAllowed ? "No disponible para este tipo de entregable" : undefined}
                                                    className={cn(
                                                        "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                                                        content.mode === m
                                                            ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                                            : isAllowed
                                                                ? "bg-surface border-border/50 text-text-muted hover:text-foreground hover:bg-surface-dark"
                                                                : "bg-surface/30 border-border/20 text-text-muted/30 cursor-not-allowed"
                                                    )}
                                                >
                                                    {m === "individual" ? <User className="size-3.5" /> : <Users className="size-3.5" />}
                                                    {m === "individual" ? "Individual" : m === "group" ? "Grupos" : "Entre miembros"}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-text-muted">
                                        {content.mode === "individual"
                                            ? "Cada alumno evalúa trabajos de N compañeros asignados aleatoriamente."
                                        : content.mode === "group"
                                                ? "Los grupos se evalúan entre sí."
                                                : "Los miembros de cada grupo se evalúan entre sí — mide contribución individual."}
                                    </p>
                            </ConfigSection>
                        );
                    })()}

                    {/* Parent step indicator */}
                    <ConfigSection
                        title="Entregable Vinculado"
                        sectionId="parent-step"
                        open={sectionState.isSectionOpen("parent-step")}
                        onToggle={() => sectionState.toggleSection("parent-step")}
                    >
                            {parentStep ? (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-sm">
                                    <Link2 className="size-3.5 shrink-0" />
                                    <span className="font-medium truncate">{parentStep.title}</span>
                                </div>
                            ) : (
                                <p className="text-xs text-text-muted">
                                    {content.mode === 'intra_group'
                                        ? <>Opcional — arrastra este paso bajo un <span className="font-semibold text-foreground">Entregable grupal</span> para asociarlo a una entrega. Sin entregable funciona como coevaluación global del módulo.</>
                                        : <>Arrastra este paso bajo un <span className="font-semibold text-foreground">Entregable</span> o <span className="font-semibold text-foreground">Subida de Archivos</span> en el constructor de actividad para vincularlo.</>
                                    }
                                </p>
                            )}
                    </ConfigSection>

                    {/* Eval mode selector */}
                    <ConfigSection
                        title="Modo de Evaluación"
                        sectionId="evaluation-mode"
                        open={sectionState.isSectionOpen("evaluation-mode")}
                        onToggle={() => sectionState.toggleSection("evaluation-mode")}
                        contentClassName="space-y-3"
                    >
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
                                <button
                                    onClick={() => save({ ...content, evalMode: "combined" })}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                                        evalMode === "combined"
                                            ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                            : "bg-surface border-border/50 text-text-muted hover:text-foreground hover:bg-surface-dark"
                                    )}
                                >
                                    <ListChecks className="size-3.5" />
                                    Combinado
                                </button>
                            </div>
                            <p className="text-xs text-text-muted">
                                {evalMode === "rubric"
                                    ? "Los evaluadores puntúan niveles por criterio con justificación opcional."
                                    : "Los evaluadores responden preguntas abiertas. Sin puntuación numérica — mide reflexión y feedback cualitativo."}
                            </p>
                    </ConfigSection>

                    {/* Rubric — only in rubric mode */}
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

                    {/* Questions mode hint */}
                    {evalMode === "questions" && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-dark border border-white/5 text-xs text-text-muted">
                            <MessageSquare className="size-3.5 text-accent-blue shrink-0" />
                            Configura las preguntas en la pestaña <span className="font-semibold text-foreground ml-0.5">Preguntas</span>.
                        </div>
                    )}

                    {/* Mode-specific settings */}
                    {content.mode === "individual" && (
                        <ConfigSection
                            title="Distribución (Individual)"
                            sectionId="distribution-individual"
                            open={sectionState.isSectionOpen("distribution-individual")}
                            onToggle={() => sectionState.toggleSection("distribution-individual")}
                        >
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
                        </ConfigSection>
                    )}

                    {content.mode === "group" && (
                        <ConfigSection
                            title="Distribución (Grupos)"
                            sectionId="distribution-groups"
                            open={sectionState.isSectionOpen("distribution-groups")}
                            onToggle={() => sectionState.toggleSection("distribution-groups")}
                        >
                                <Toggle
                                    label="Evalúa a todos los grupos"
                                    description="Cada grupo evalúa a todos los demás grupos."
                                    value={!!content.evaluateAllGroups}
                                    onChange={(v) => save({ ...content, evaluateAllGroups: v })}
                                />
                                {!content.evaluateAllGroups && (
                                    <div className="flex items-center justify-between gap-4 pl-4 border-l-2 border-border/30">
                                        <div>
                                            <p className="text-sm text-foreground font-medium">Grupos por grupo</p>
                                            <p className="text-xs text-text-muted mt-0.5">Cuántos grupos evalúa cada grupo.</p>
                                        </div>
                                        <input
                                            type="number" min={1} max={20}
                                            value={content.groupsPerGroup ?? 1}
                                            onChange={(e) => save({ ...content, groupsPerGroup: Number(e.target.value) })}
                                            className="h-9 w-20 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                        />
                                    </div>
                                )}
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
                        </ConfigSection>
                    )}

                    {content.mode === "intra_group" && (
                        <ConfigSection
                            title="Distribución (Entre miembros)"
                            sectionId="distribution-intra-group"
                            open={sectionState.isSectionOpen("distribution-intra-group")}
                            onToggle={() => sectionState.toggleSection("distribution-intra-group")}
                        >
                                <Toggle
                                    label="Justificación obligatoria"
                                    description="El evaluador debe escribir un texto por criterio."
                                    value={!!content.requireJustification}
                                    onChange={(v) => save({ ...content, requireJustification: v })}
                                />
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
                        </ConfigSection>
                    )}

                    {/* Anti-gaming section (individual mode only) */}
                    {content.mode === "individual" && (
                        <ConfigSection
                            title="Integridad de la evaluación"
                            sectionId="integrity"
                            open={sectionState.isSectionOpen("integrity")}
                            onToggle={() => sectionState.toggleSection("integrity")}
                            contentClassName="space-y-5"
                        >
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
                        </ConfigSection>
                    )}

                    {/* Gestión — generate assignments (hidden for intra_group — auto-generated) */}
                    {content.mode === 'group' && content.evaluateAllGroups && (
                        <div className="rounded-xl border border-accent-blue/20 bg-accent-blue/5 px-5 py-4">
                            <p className="text-sm font-semibold text-accent-blue">Asignaciones automáticas</p>
                            <p className="text-xs text-text-muted mt-1">
                                Las asignaciones se generan automáticamente cuando los grupos acceden a la actividad.
                            </p>
                        </div>
                    )}

                    {showManualManagement && moduleId && (
                        <ConfigSection
                            title="Gestión"
                            sectionId="management"
                            open={sectionState.isSectionOpen("management")}
                            onToggle={() => sectionState.toggleSection("management")}
                            contentClassName="space-y-3"
                            headerRight={
                                <div className="flex items-center gap-1.5">
                                    {gestionAssignments.length > 0 && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={isGenerating}
                                            onClick={async () => {
                                                if (!confirmReset) {
                                                    setConfirmReset(true);
                                                    setTimeout(() => setConfirmReset(false), 4000);
                                                    return;
                                                }
                                                setConfirmReset(false);
                                                setIsGenerating(true);
                                                const del = await deletePeerAssignments(step.id);
                                                if (del.error) { toast.error(del.error); setIsGenerating(false); return; }
                                                const gen = await generatePeerAssignments(step.id, moduleId);
                                                if (gen.error) {
                                                    toast.error(gen.error);
                                                } else {
                                                    toast.success("Asignaciones regeneradas correctamente.");
                                                    await loadGestionAssignments();
                                                }
                                                setIsGenerating(false);
                                            }}
                                            className={cn(
                                                "shrink-0 h-7 text-xs gap-1.5 transition-colors",
                                                confirmReset
                                                    ? "border-red-500/50 text-red-400 bg-red-500/5 hover:bg-red-500/10"
                                                    : "border-border/50 text-text-muted hover:text-foreground"
                                            )}
                                        >
                                            <Trash2 className="size-3" />
                                            {confirmReset ? "¿Confirmar?" : "Regenerar asignaciones"}
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={isGenerating}
                                        onClick={async () => {
                                            setIsGenerating(true);
                                            const res = await generatePeerAssignments(step.id, moduleId);
                                            if (res.error) {
                                                toast.error(res.error);
                                            } else {
                                                toast.success("Asignaciones generadas correctamente.");
                                                await loadGestionAssignments();
                                            }
                                            setIsGenerating(false);
                                        }}
                                        className="shrink-0 h-7 text-xs gap-1.5 border-border/50 text-text-muted hover:text-foreground"
                                    >
                                        {isGenerating ? <span className="size-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Users className="size-3" />}
                                        Generar asignaciones
                                    </Button>
                                </div>
                            }
                        >
                                {gestionLoading ? (
                                    <div className="flex items-center gap-2 text-xs text-text-muted py-2">
                                        <span className="size-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                        Cargando asignaciones...
                                    </div>
                                ) : gestionAssignments.length === 0 ? (
                                    <p className="text-xs text-text-muted py-1">No hay asignaciones generadas todavía.</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        <p className="text-xs text-text-muted mb-2">
                                            {gestionAssignments.filter(a => a.eval_submission_id).length} / {gestionAssignments.length} completadas
                                        </p>
                                        {gestionAssignments.map((a: any) => {
                                            const evaluatorName = a.evaluator?.full_name ?? a.evaluator_group?.name ?? "—";
                                            const targetName = content.mode === "intra_group"
                                                ? (a.target_student?.full_name ?? "—")
                                                : (a.target_submission?.student?.full_name ?? a.target_submission?.group?.name ?? "—");
                                            const done = !!a.eval_submission_id;
                                            return (
                                                <div key={a.id} className="flex items-center gap-2 text-xs py-1 border-b border-white/3 last:border-0">
                                                    {done
                                                        ? <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                                                        : <Clock className="size-3 text-text-muted/50 shrink-0" />}
                                                    <span className="text-foreground font-medium truncate max-w-[35%]">{evaluatorName}</span>
                                                    <span className="text-text-muted/50 shrink-0">→</span>
                                                    <span className="text-text-muted truncate flex-1">{targetName}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                        </ConfigSection>
                    )}
                </div>
            </TabsContent>

            {/* Preguntas tab */}
            <TabsContent value="preguntas" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <EvaluationQuestionBuilder
                    content={content}
                    onChange={save}
                    heading="Preguntas de evaluacion"
                    description="Anade secciones y preguntas que el evaluador respondera sobre el trabajo revisado."
                    emptyTitle="No hay preguntas todavia."
                    emptyDescription="Empieza creando preguntas o una seccion para ordenar el feedback."
                />
            </TabsContent>

            <TabsContent value="respuestas" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="w-full max-w-none mx-auto p-4 sm:p-6 pb-16">
                    <PeerEvalResponsesPanel
                        stepId={step.id}
                        activityId={activityId}
                        moduleId={moduleId}
                        stepTitle={step.title}
                        isActivityClosed={step.is_activity_closed}
                        visible={activeTab === "respuestas"}
                    />
                </div>
            </TabsContent>

            <TabsContent value="visibilidad" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <StepVisibilityTab ref={visibilityRef} step={step} onUpdateStep={onUpdate} visible={activeTab === "visibilidad"} onDirtyChange={(dirty) => { if (dirty) { setIsDirty(true); onUpdate({ ...step, client_dirty: true }); } }} />
            </TabsContent>
        </Tabs>
    );
}

function Toggle({
    value,
    onChange,
    label,
    description,
}: {
    value: boolean;
    onChange: (value: boolean) => void;
    label?: string;
    description?: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
                {label && <p className="text-sm font-medium text-foreground">{label}</p>}
                {description && <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{description}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={value}
                aria-label={label}
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
        </div>
    );
}

