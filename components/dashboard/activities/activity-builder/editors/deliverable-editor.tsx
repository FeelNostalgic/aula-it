"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, DeliverableContent, DeliveryMode, GradeComposition, PeerEvaluationContent, RubricCriteria } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { updateStepContent, updateStepDueDate } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link2, HardDrive, CheckCircle2, Copy, MousePointer, ExternalLink, ListChecks, Send, Users, Scale } from "lucide-react";
import { RubricBuilderModal } from "@/components/dashboard/shared/rubric-builder-modal";
import { useGoogleDrivePicker } from "@/hooks/use-google-drive-picker";
import { toEditableUrl } from "@/lib/google-drive-urls";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StepConfigSection } from "./step-config-section";

interface DeliverableEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
    activityId?: string;
}

export function DeliverableEditor({ step, onUpdate, activityId }: DeliverableEditorProps) {
    const defaultContent = (step.content as DeliverableContent) || { templateUrl: "", instructionsMarkdown: "", deliveryMode: "manual" };
    const [content, setContent] = useState<DeliverableContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
    const [driveConnected, setDriveConnected] = useState<boolean | null>(null);
    const [rubricModalOpen, setRubricModalOpen] = useState(false);
    const [dueDate, setDueDate] = useState<string | null>(step.due_date ?? null);
    const [isDistributing, setIsDistributing] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dueDateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { openPicker, isLoading: isDriveLoading } = useGoogleDrivePicker();

    useEffect(() => {
        const newContent = (step.content as DeliverableContent) || { templateUrl: "", instructionsMarkdown: "", deliveryMode: "manual" };
        setContent(newContent);
        setDueDate(step.due_date ?? null);
    }, [step.id, step.content, step.due_date]);

    useEffect(() => {
        if (content.deliveryMode === "teacher_copy" && driveConnected === null) {
            fetch("/api/drive/status")
                .then(r => r.json())
                .then(data => setDriveConnected(data.connected))
                .catch(() => setDriveConnected(false));
        }
    }, [content.deliveryMode, driveConnected]);

    const handleChange = (field: keyof DeliverableContent, value: string | DeliveryMode) => {
        const newContent = { ...content, [field]: value };
        setContent(newContent);
        onUpdate({ ...step, content: newContent });

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSaving(true);
        timeoutRef.current = setTimeout(async () => {
            const res = await updateStepContent(step.id, newContent);
            if (res.error) toast.error("Error al guardar el entregable");
            setIsSaving(false);
        }, 1000);
    };

    const handleDeliveryModeChange = (mode: DeliveryMode) => {
        handleChange("deliveryMode", mode);
        if (mode === "teacher_copy" && driveConnected === null) {
            setDriveConnected(null);
        }
    };

    const handlePickFromDrive = async () => {
        try {
            let externalAccessToken: string | undefined;
            if (driveConnected) {
                try {
                    const res = await fetch("/api/drive/token");
                    if (res.ok) {
                        const data = await res.json();
                        externalAccessToken = data.access_token;
                    }
                } catch {
                    // fall through to OAuth flow
                }
            }
            const files = await openPicker({ multiSelect: false, title: "Seleccionar plantilla", externalAccessToken });
            if (files.length > 0) {
                handleChange("templateUrl", toEditableUrl(files[0]));
            }
        } catch {
            toast.error("Error al abrir Google Drive");
        }
    };

    const handleGroupToggle = (value: boolean) => {
        const newContent = { ...content, is_group_submission: value };
        setContent(newContent);
        onUpdate({ ...step, content: newContent });
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSaving(true);
        timeoutRef.current = setTimeout(async () => {
            const res = await updateStepContent(step.id, newContent);
            if (res.error) toast.error("Error al guardar configuración");
            setIsSaving(false);
        }, 500);
    };

    const handleRubricChange = (newRubric: RubricCriteria[]) => {
        const newContent = { ...content, rubric: newRubric };
        setContent(newContent);
        onUpdate({ ...step, content: newContent });
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSaving(true);
        timeoutRef.current = setTimeout(async () => {
            const res = await updateStepContent(step.id, newContent);
            if (res.error) toast.error("Error al guardar la rúbrica");
            setIsSaving(false);
        }, 1000);
    };

    const handleDueDateChange = (value: string | null) => {
        setDueDate(value);
        if (dueDateTimeoutRef.current) clearTimeout(dueDateTimeoutRef.current);
        setIsSaving(true);
        dueDateTimeoutRef.current = setTimeout(async () => {
            const res = await updateStepDueDate(step.id, value);
            if (res.error) toast.error("Error al guardar la fecha límite");
            setIsSaving(false);
        }, 1000);
    };

    const handleDistribute = () => {
        if (!activityId) return;
        setIsDistributing(true);

        const promise = fetch("/api/drive/copy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stepId: step.id, activityId }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "Error al distribuir la plantilla");
                return data as { copied: number; skipped: number; errors: string[] };
            })
            .finally(() => setIsDistributing(false));

        toast.promise(promise, {
            loading: "Distribuyendo plantilla...",
            success: (data) => {
                const parts = [`${data.copied} copia${data.copied !== 1 ? "s" : ""} creada${data.copied !== 1 ? "s" : ""}`];
                if (data.skipped > 0) parts.push(`${data.skipped} sin @gmail`);
                if (data.errors?.length > 0) parts.push(`${data.errors.length} error${data.errors.length !== 1 ? "es" : ""}`);
                return parts.join(" · ");
            },
            error: (err) => err?.message ?? "Error al distribuir la plantilla",
        });
    };

    const deliveryMode: DeliveryMode = content.deliveryMode ?? "manual";

    return (
        <Tabs defaultValue="instrucciones" className="flex flex-col h-full w-full bg-background">
            {/* Tab bar */}
            <div className="shrink-0 border-b border-border/50 bg-surface-dark/10 px-4 flex items-center gap-2">
                <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
                    <TabsTrigger
                        value="instrucciones"
                        className="h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:text-foreground text-text-muted bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                        Instrucciones
                    </TabsTrigger>
                    <TabsTrigger
                        value="configuracion"
                        className="h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:text-foreground text-text-muted bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                        Configuración
                    </TabsTrigger>
                </TabsList>

                <div className="ml-auto">
                    {isSaving ? (
                        <span className="text-[10px] text-accent-blue animate-pulse">Guardando...</span>
                    ) : (
                        <span className="text-[10px] text-text-muted/50">Guardado automáticamente</span>
                    )}
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
                                    <button
                                        onClick={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
                                        className="text-text-muted hover:text-foreground transition-colors flex items-center gap-1 bg-surface border border-border-subtle rounded-md px-2 py-1 shadow-sm h-7"
                                        title={isPreviewCollapsed ? "Expandir vista previa" : "Ocultar vista previa"}
                                    >
                                        {isPreviewCollapsed ? <PanelRightOpen className="size-3.5" /> : <PanelRightClose className="size-3.5" />}
                                    </button>
                                </div>
                                <div className="flex-1 p-0 overflow-hidden">
                                    <Textarea
                                        value={content.instructionsMarkdown || ""}
                                        onChange={(e) => handleChange("instructionsMarkdown", e.target.value)}
                                        className="h-full w-full resize-none border-none focus-visible:ring-0 rounded-none bg-transparent p-6 text-foreground font-mono text-sm leading-relaxed"
                                        placeholder="# Paso 1...\nDescribe el reto."
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
                                        <div className="text-text-muted/50 italic mt-4 text-center">
                                            Instrucciones vacías.
                                        </div>
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
                        <h3 className="text-lg font-bold text-foreground">Configuración del Entregable</h3>
                        <p className="text-sm text-text-muted mt-1">Define qué debe entregar el alumno, la plantilla y la evaluación.</p>
                    </div>

                    {/* Step-level: XP + completion mode */}
                    <StepConfigSection step={step} onUpdateStep={onUpdate} />

                    {/* Delivery mode */}
                    <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                        <div className="px-5 py-2.5 border-b border-white/5 bg-white/2">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Modo de entrega</span>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDeliveryModeChange("manual")}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                                        deliveryMode === "manual"
                                            ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                            : "bg-surface border-border/50 text-text-muted hover:text-foreground hover:bg-surface-dark"
                                    )}
                                >
                                    <MousePointer className="size-3.5" /> Entrega manual
                                </button>
                                <button
                                    onClick={() => handleDeliveryModeChange("teacher_copy")}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                                        deliveryMode === "teacher_copy"
                                            ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                            : "bg-surface border-border/50 text-text-muted hover:text-foreground hover:bg-surface-dark"
                                    )}
                                >
                                    <Copy className="size-3.5" /> Copia del profesor
                                </button>
                            </div>
                            <p className="text-xs text-text-muted">
                                {deliveryMode === "manual"
                                    ? "El alumno pega la URL de su propio documento de Drive."
                                    : "El sistema copia la plantilla en la cuenta de cada alumno. Tú controlas los permisos."}
                            </p>

                            {deliveryMode === "teacher_copy" && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 px-4 py-3 bg-surface border border-border-strong rounded-xl">
                                        <HardDrive className="size-4 text-accent-blue shrink-0" />
                                        {driveConnected === null && <span className="text-xs text-text-muted animate-pulse">Verificando conexión...</span>}
                                        {driveConnected === true && (
                                            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
                                                <CheckCircle2 className="size-3.5" /> Drive conectado
                                            </span>
                                        )}
                                        {driveConnected === false && (
                                            <span className="text-xs text-text-muted flex-1">
                                                Drive no conectado —{" "}
                                                <a href="/settings" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">
                                                    Conectar en Configuración →
                                                </a>
                                            </span>
                                        )}
                                    </div>
                                    {driveConnected === true && content.templateUrl && activityId && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleDistribute}
                                            disabled={isDistributing}
                                            className="w-full h-9 text-xs gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                        >
                                            <Send className="size-3.5" />
                                            {isDistributing ? "Distribuyendo..." : "Distribuir plantilla a alumnos"}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Group submission toggle */}
                    <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                        <div className="px-5 py-2.5 border-b border-white/5 bg-white/2">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Entrega Grupal</span>
                        </div>
                        <div className="p-5 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Users className="size-4 text-text-muted shrink-0" />
                                <div>
                                    <p className="text-sm text-foreground font-medium">Entrega por grupos</p>
                                    <p className="text-xs text-text-muted mt-0.5">
                                        Un documento compartido por grupo en lugar de uno por alumno.
                                    </p>
                                </div>
                            </div>
                            <button
                                role="switch"
                                aria-checked={!!content.is_group_submission}
                                onClick={() => handleGroupToggle(!content.is_group_submission)}
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
                        </div>
                    </div>

                    {/* Template URL */}
                    <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                        <div className="px-5 py-2.5 border-b border-white/5 bg-white/2">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Plantilla (Opcional)</span>
                        </div>
                        <div className="p-5 space-y-3">
                            <p className="text-xs text-text-muted">Enlace a Google Docs, Packet Tracer, o repositorio de inicio.</p>
                            <div className="flex gap-2">
                                <Input
                                    value={content.templateUrl || ""}
                                    onChange={(e) => handleChange("templateUrl", e.target.value)}
                                    placeholder="https://docs.google.com/document/d/.../copy"
                                    className="bg-surface border-border/50 h-9 flex-1"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePickFromDrive}
                                    disabled={isDriveLoading}
                                    className="h-9 border-border/50 hover:bg-surface-dark shrink-0"
                                >
                                    <HardDrive className="size-4 mr-2 text-accent-blue" />
                                    {isDriveLoading ? "Cargando..." : "Drive"}
                                </Button>
                                {content.templateUrl && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                        className="h-9 px-2 text-text-muted hover:text-foreground shrink-0"
                                        title="Abrir plantilla en nueva pestaña"
                                    >
                                        <a href={content.templateUrl} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="size-4" />
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

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
                        onChange={handleRubricChange}
                    />

                    {/* Ponderación 360° — solo si hay hijos de evaluación */}
                    {(() => {
                        const children = step.children ?? [];
                        const selfEvalChild = children.find(c => c.type === "self_evaluation");
                        const peerEvalChild = children.find(c => c.type === "peer_evaluation" && (c.content as PeerEvaluationContent)?.mode !== "intra_group");
                        const intraGroupChild = children.find(c => c.type === "peer_evaluation" && (c.content as PeerEvaluationContent)?.mode === "intra_group");
                        const showIntraGroup = !!content.is_group_submission && !!intraGroupChild;

                        if (!selfEvalChild && !peerEvalChild && !showIntraGroup) return null;

                        // Questions-mode self-evals are completion gates unless they have numeric questions with points > 0
                        const selfEvalIsQuestions = selfEvalChild && (selfEvalChild.content as any)?.evalMode === 'questions';
                        const selfEvalHasNumericWithWeight = selfEvalIsQuestions &&
                            ((selfEvalChild!.content as any)?.questions ?? []).some((q: any) => q.type === 'numeric' && (q.points ?? 0) > 0);
                        const showSelfEvalSlider = !selfEvalIsQuestions || selfEvalHasNumericWithWeight;

                        // Questions-mode intra_group only contributes to grade if it has a numeric question with points > 0
                        const intraGroupIsQuestions = showIntraGroup && (intraGroupChild!.content as any)?.evalMode === 'questions';
                        const intraGroupHasNumericWithWeight = intraGroupIsQuestions &&
                            ((intraGroupChild!.content as any)?.questions ?? []).some((q: any) => q.type === 'numeric' && (q.points ?? 0) > 0);
                        const showIntraGroupSlider = showIntraGroup && (!intraGroupIsQuestions || intraGroupHasNumericWithWeight);

                        const comp: GradeComposition = content.gradeComposition ?? { selfEvalWeight: 0, peerEvalWeight: 0, intraGroupWeight: 0 };
                        const effectiveSelfW = showSelfEvalSlider ? comp.selfEvalWeight : 0;
                        const effectiveIntraW = showIntraGroupSlider ? comp.intraGroupWeight : 0;
                        const totalAssigned = effectiveSelfW + comp.peerEvalWeight + effectiveIntraW;
                        const teacherWeight = Math.max(0, 100 - totalAssigned);

                        const updateComp = (field: keyof GradeComposition, value: number) => {
                            const newComp = { ...comp, [field]: value };
                            const newTotal = (showSelfEvalSlider ? newComp.selfEvalWeight : 0) + newComp.peerEvalWeight + (showIntraGroupSlider ? newComp.intraGroupWeight : 0);
                            if (newTotal > 100) return;
                            const newContent = { ...content, gradeComposition: newComp };
                            setContent(newContent);
                            onUpdate({ ...step, content: newContent });
                            if (timeoutRef.current) clearTimeout(timeoutRef.current);
                            setIsSaving(true);
                            timeoutRef.current = setTimeout(async () => {
                                const res = await updateStepContent(step.id, newContent);
                                if (res.error) toast.error("Error al guardar ponderación");
                                setIsSaving(false);
                            }, 1000);
                        };

                        return (
                            <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                                <div className="px-5 py-2.5 border-b border-white/5 bg-white/2 flex items-center justify-between">
                                    <span className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                                        <Scale className="size-3" /> Ponderación (360°)
                                    </span>
                                    <span className={cn("text-xs font-mono", totalAssigned > 100 ? "text-red-400" : "text-text-muted")}>
                                        Profesor: {teacherWeight}%
                                    </span>
                                </div>
                                <div className="p-5 space-y-3">
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
                                        !showSelfEvalSlider ? (
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-text-muted w-36 shrink-0">Autoevaluación</span>
                                                <span className="flex-1 text-xs text-text-muted/50 italic">
                                                    Tipo preguntas — añade preguntas numéricas con % para habilitar nota (0%)
                                                </span>
                                                <span className="text-sm font-mono text-text-muted/40 w-10 text-right">0%</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-foreground w-36 shrink-0">Autoevaluación</span>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={100 - comp.peerEvalWeight - effectiveIntraW}
                                                    value={comp.selfEvalWeight}
                                                    onChange={e => updateComp("selfEvalWeight", Number(e.target.value))}
                                                    className="flex-1 accent-accent-blue"
                                                />
                                                <span className="text-sm font-mono text-foreground w-10 text-right">{comp.selfEvalWeight}%</span>
                                            </div>
                                        )
                                    )}

                                    {/* Coevaluación */}
                                    {peerEvalChild && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-foreground w-36 shrink-0">Coevaluación</span>
                                            <input
                                                type="range"
                                                min={0}
                                                max={100 - effectiveSelfW - effectiveIntraW}
                                                value={comp.peerEvalWeight}
                                                onChange={e => updateComp("peerEvalWeight", Number(e.target.value))}
                                                className="flex-1 accent-accent-blue"
                                            />
                                            <span className="text-sm font-mono text-foreground w-10 text-right">{comp.peerEvalWeight}%</span>
                                        </div>
                                    )}

                                    {/* Contribución grupal — solo si is_group_submission + intra_group child */}
                                    {showIntraGroup && (
                                        intraGroupIsQuestions && !intraGroupHasNumericWithWeight ? (
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-text-muted w-36 shrink-0">Contrib. grupal</span>
                                                <span className="flex-1 text-xs text-text-muted/50 italic">
                                                    Tipo preguntas — añade preguntas numéricas con peso para habilitar nota (0%)
                                                </span>
                                                <span className="text-sm font-mono text-text-muted/40 w-10 text-right">0%</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-foreground w-36 shrink-0">Contrib. grupal</span>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={100 - effectiveSelfW - comp.peerEvalWeight}
                                                    value={comp.intraGroupWeight}
                                                    onChange={e => updateComp("intraGroupWeight", Number(e.target.value))}
                                                    className="flex-1 accent-accent-blue"
                                                />
                                                <span className="text-sm font-mono text-foreground w-10 text-right">{comp.intraGroupWeight}%</span>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Due date */}
                    <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                        <div className="px-5 py-2.5 border-b border-white/5 bg-white/2">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Fecha Límite</span>
                        </div>
                        <div className="p-5 space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="datetime-local"
                                    value={dueDate ? dueDate.slice(0, 16) : ""}
                                    onChange={(e) => handleDueDateChange(e.target.value || null)}
                                    className="flex-1 h-9 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                />
                                {dueDate && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDueDateChange(null)}
                                        className="h-9 text-xs text-text-muted hover:text-foreground shrink-0"
                                    >
                                        Quitar
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-text-muted">El alumno no podrá entregar pasada esta fecha.</p>
                        </div>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
    );
}
