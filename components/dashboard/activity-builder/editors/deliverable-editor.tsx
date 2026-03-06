"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, DeliverableContent, DeliveryMode } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link2, HardDrive, CheckCircle2, Copy, MousePointer } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface DeliverableEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
}

export function DeliverableEditor({ step, onUpdate }: DeliverableEditorProps) {
    const defaultContent = (step.content as DeliverableContent) || { templateUrl: '', instructionsMarkdown: '', deliveryMode: 'manual' };
    const [content, setContent] = useState<DeliverableContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
    const [driveConnected, setDriveConnected] = useState<boolean | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { openPicker, isLoading: isDriveLoading } = useGoogleDrivePicker();

    const togglePreview = () => {
        setIsPreviewCollapsed(!isPreviewCollapsed);
    };

    useEffect(() => {
        const newContent = (step.content as DeliverableContent) || { templateUrl: '', instructionsMarkdown: '', deliveryMode: 'manual' };
        setContent(newContent);
    }, [step.id, step.content]);

    // Check Drive connection status when teacher_copy is selected
    useEffect(() => {
        if (content.deliveryMode === 'teacher_copy' && driveConnected === null) {
            fetch('/api/drive/status')
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
        handleChange('deliveryMode', mode);
        if (mode === 'teacher_copy' && driveConnected === null) {
            setDriveConnected(null); // trigger re-fetch
        }
    };

    const handlePickFromDrive = async () => {
        try {
            const files = await openPicker({ multiSelect: false, title: "Seleccionar plantilla" });
            if (files.length > 0) {
                const url = toEditableUrl(files[0]);
                handleChange("templateUrl", url);
            }
        } catch {
            toast.error("Error al abrir Google Drive");
        }
    };

    const deliveryMode: DeliveryMode = content.deliveryMode ?? 'manual';

    return (
        <div className="flex flex-col h-full w-full bg-background overflow-hidden relative min-h-0">
            <div className="shrink-0 p-6 border-b border-border/50 bg-surface/30">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-foreground">Configuración del Entregable</h3>
                        <p className="text-sm text-text-muted mt-1">
                            Define qué debe entregar el alumno y asocia una plantilla inicial si es necesario.
                        </p>
                    </div>
                    {isSaving ? (
                        <span className="text-xs text-accent-blue animate-pulse">Guardando...</span>
                    ) : (
                        <span className="text-xs text-text-muted/50">Guardado automáticamente</span>
                    )}
                </div>

                {/* Delivery Mode Toggle */}
                <div className="space-y-2 mb-4">
                    <label className="text-sm font-semibold text-foreground">Modo de entrega</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleDeliveryModeChange('manual')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                                deliveryMode === 'manual'
                                    ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                    : "bg-surface border-border/50 text-text-muted hover:text-foreground hover:bg-surface-dark"
                            )}
                        >
                            <MousePointer className="size-3.5" />
                            Entrega manual
                        </button>
                        <button
                            onClick={() => handleDeliveryModeChange('teacher_copy')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                                deliveryMode === 'teacher_copy'
                                    ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                    : "bg-surface border-border/50 text-text-muted hover:text-foreground hover:bg-surface-dark"
                            )}
                        >
                            <Copy className="size-3.5" />
                            Copia del profesor
                        </button>
                    </div>
                    <p className="text-xs text-text-muted">
                        {deliveryMode === 'manual'
                            ? "El alumno pega la URL de su propio documento de Drive."
                            : "El sistema copia la plantilla en la cuenta de cada alumno. Tú controlas los permisos."}
                    </p>
                </div>

                {/* Drive connection status for teacher_copy mode */}
                {deliveryMode === 'teacher_copy' && (
                    <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-surface-dark border border-border-strong rounded-xl">
                        <HardDrive className="size-4 text-accent-blue shrink-0" />
                        {driveConnected === null && (
                            <span className="text-xs text-text-muted animate-pulse">Verificando conexión...</span>
                        )}
                        {driveConnected === true && (
                            <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
                                <CheckCircle2 className="size-3.5" /> Drive conectado
                            </span>
                        )}
                        {driveConnected === false && (
                            <div className="flex items-center gap-3 flex-1">
                                <span className="text-xs text-text-muted flex-1">
                                    Drive no conectado —{" "}
                                    <a
                                        href="/settings"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-accent-blue hover:underline"
                                    >
                                        Conectar en Configuración →
                                    </a>
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-2 max-w-2xl">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Link2 className="size-4" /> Plantilla URL (Opcional)
                    </label>
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
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden min-h-0">
                <ResizablePanelGroup direction="horizontal">
                    {/* Editor Panel */}
                    <ResizablePanel defaultSize={50} minSize={30}>
                        <div className="flex flex-col h-full bg-surface-dark/20 relative min-h-0">
                            <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50 justify-between">
                                <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Instrucciones (Markdown)</span>
                                <button
                                    onClick={togglePreview}
                                    className="text-text-muted hover:text-foreground transition-colors flex items-center gap-1 bg-surface border border-border-subtle rounded-md px-2 py-1 shadow-sm h-7"
                                    title={isPreviewCollapsed ? "Expandir Vista Previa" : "Ocultar Vista Previa"}
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

                    <ResizableHandle withHandle className="bg-border-subtle hover:bg-accent-blue transition-colors duration-300 w-1.5 flex flex-col items-center justify-center">
                    </ResizableHandle>

                    {/* Preview Panel */}
                    <ResizablePanel
                        defaultSize={50}
                        minSize={25}
                        maxSize={75}
                        className={isPreviewCollapsed ? "hidden transition-all duration-300 ease-in-out" : "transition-all duration-300 ease-in-out"}
                    >
                        <div className="flex flex-col h-full bg-background relative border-l border-border-subtle">
                            <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50">
                                <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Vista Previa</span>
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
        </div>
    );
}
