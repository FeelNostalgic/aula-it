"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, DeliverableContent } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";

interface DeliverableEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
}

export function DeliverableEditor({ step, onUpdate }: DeliverableEditorProps) {
    const defaultContent = (step.content as DeliverableContent) || { templateUrl: '', instructionsMarkdown: '' };
    const [content, setContent] = useState<DeliverableContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const newContent = (step.content as DeliverableContent) || { templateUrl: '', instructionsMarkdown: '' };
        setContent(newContent);
    }, [step.id, step.content]);

    const handleChange = (field: keyof DeliverableContent, value: string) => {
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

    return (
        <div className="flex flex-col h-full w-full bg-background overflow-hidden relative">
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

                <div className="space-y-2 max-w-2xl">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Link2 className="size-4" /> Plantilla URL (Opcional)
                    </label>
                    <p className="text-xs text-text-muted">Enlace a Google Docs, Packet Tracer, o repositorio de inicio.</p>
                    <Input
                        value={content.templateUrl || ""}
                        onChange={(e) => handleChange("templateUrl", e.target.value)}
                        placeholder="https://docs.google.com/document/d/.../copy"
                        className="bg-surface border-border/50 h-9"
                    />
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Editor Panel */}
                <div className="flex-1 border-r border-border/50 flex flex-col h-full bg-surface-dark/20 relative">
                    <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50">
                        <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Instrucciones (Markdown)</span>
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

                {/* Preview Panel */}
                <div className="flex-1 flex flex-col h-full bg-background relative">
                    <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50">
                        <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Vista Previa</span>
                    </div>
                    <div className="flex-1 p-8 overflow-y-auto prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-a:text-accent-blue hover:prose-a:text-accent-blue/80 prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-none">
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
            </div>
        </div>
    );
}
