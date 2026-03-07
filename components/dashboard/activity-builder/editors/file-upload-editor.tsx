"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, FileUploadContent, AllowedFileType, RubricCriteria } from "@/types/activity";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateStepContent, updateStepDueDate } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { ListChecks, PanelRightClose, PanelRightOpen } from "lucide-react";
import { RubricBuilderModal } from "@/components/dashboard/rubric-builder-modal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

const ALLOWED_TYPE_OPTIONS: { value: AllowedFileType; label: string }[] = [
    { value: 'pdf', label: 'PDF' },
    { value: 'image', label: 'Imágenes' },
    { value: 'word', label: 'Word (.doc, .docx)' },
    { value: 'any', label: 'Cualquier archivo' },
];

const MAX_SIZE_OPTIONS = [5, 10, 25, 50];

interface FileUploadEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
}

export function FileUploadEditor({ step, onUpdate }: FileUploadEditorProps) {
    const defaultContent: FileUploadContent = (step.content as FileUploadContent) || {
        instructionsMarkdown: '',
        allowedTypes: ['pdf', 'image', 'word'],
        maxFileSizeMb: 10,
        maxFiles: 1,
    };
    const [content, setContent] = useState<FileUploadContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
    const [rubricModalOpen, setRubricModalOpen] = useState(false);
    const [dueDate, setDueDate] = useState<string | null>(step.due_date ?? null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dueDateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const newContent = (step.content as FileUploadContent) || {
            instructionsMarkdown: '',
            allowedTypes: ['pdf', 'image', 'word'],
            maxFileSizeMb: 10,
            maxFiles: 1,
        };
        setContent(newContent);
        setDueDate(step.due_date ?? null);
    }, [step.id, step.content, step.due_date]);

    const saveContent = (newContent: FileUploadContent) => {
        setContent(newContent);
        onUpdate({ ...step, content: newContent });
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSaving(true);
        timeoutRef.current = setTimeout(async () => {
            const res = await updateStepContent(step.id, newContent);
            if (res.error) toast.error("Error al guardar");
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

    return (
        <div className="flex flex-col h-full w-full bg-background overflow-hidden relative min-h-0">
            <div className="shrink-0 p-6 border-b border-border/50 bg-surface/30">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-foreground">Configuración del Entregable</h3>
                        <p className="text-sm text-text-muted mt-1">
                            El alumno sube archivos directamente a tu Drive.
                        </p>
                    </div>
                    {isSaving ? (
                        <span className="text-xs text-accent-blue animate-pulse">Guardando...</span>
                    ) : (
                        <span className="text-xs text-text-muted/50">Guardado automáticamente</span>
                    )}
                </div>

                {/* Tipos de archivo */}
                <div className="space-y-2 mb-4">
                    <label className="text-sm font-semibold text-foreground">Tipos de archivo permitidos</label>
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
                </div>

                {/* Tamaño máximo + nº archivos */}
                <div className="flex gap-6 mb-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground">Tamaño máximo</label>
                        <select
                            value={content.maxFileSizeMb}
                            onChange={(e) => saveContent({ ...content, maxFileSizeMb: Number(e.target.value) })}
                            className="h-9 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                        >
                            {MAX_SIZE_OPTIONS.map(mb => (
                                <option key={mb} value={mb}>{mb} MB</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground">Nº máximo de archivos</label>
                        <input
                            type="number"
                            min={1}
                            max={10}
                            value={content.maxFiles}
                            onChange={(e) => saveContent({ ...content, maxFiles: Math.max(1, Math.min(10, Number(e.target.value))) })}
                            className="h-9 w-20 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                        />
                    </div>
                </div>

                {/* Fecha límite */}
                <div className="space-y-1.5 mb-4 max-w-xs">
                    <label className="text-sm font-semibold text-foreground">Fecha límite (opcional)</label>
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

                {/* Rúbrica */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRubricModalOpen(true)}
                    className="h-8 text-xs gap-1.5 border-border/50 text-text-muted hover:text-foreground"
                >
                    <ListChecks className="size-3.5" />
                    {(content.rubric?.length ?? 0) > 0
                        ? `Rúbrica (${content.rubric!.length} ${content.rubric!.length === 1 ? 'criterio' : 'criterios'})`
                        : "Configurar rúbrica"}
                </Button>

                <RubricBuilderModal
                    rubric={content.rubric ?? []}
                    open={rubricModalOpen}
                    onClose={() => setRubricModalOpen(false)}
                    onChange={handleRubricChange}
                />
            </div>

            {/* Instructions editor + preview */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel defaultSize={50} minSize={30}>
                        <div className="flex flex-col h-full bg-surface-dark/20 relative min-h-0">
                            <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50 justify-between">
                                <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Instrucciones (Markdown)</span>
                                <button
                                    onClick={() => setIsPreviewCollapsed(v => !v)}
                                    className="text-text-muted hover:text-foreground transition-colors flex items-center gap-1 bg-surface border border-border-subtle rounded-md px-2 py-1 shadow-sm h-7"
                                    title={isPreviewCollapsed ? "Expandir Vista Previa" : "Ocultar Vista Previa"}
                                >
                                    {isPreviewCollapsed ? <PanelRightOpen className="size-3.5" /> : <PanelRightClose className="size-3.5" />}
                                </button>
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
