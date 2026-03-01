"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ActivityStepWithClientState, TheoryContent } from "@/types/activity";
import { Textarea } from "@/components/ui/textarea";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TheoryEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
}

export function TheoryEditor({ step, onUpdate }: TheoryEditorProps) {
    const defaultContent = (step.content as TheoryContent) || { markdown: '' };
    const [content, setContent] = useState<TheoryContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);

    // Auto-save debounce ref
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Update local state when step changes (from selecting another step)
    useEffect(() => {
        const newContent = (step.content as TheoryContent) || { markdown: '' };
        setContent(newContent);
    }, [step.id, step.content]);

    const saveToServer = useCallback(async (contentToSave: TheoryContent) => {
        setIsSaving(true);
        const res = await updateStepContent(step.id, contentToSave);
        if (res.error) {
            toast.error("Error al guardar el contenido del paso");
        }
        setIsSaving(false);
    }, [step.id]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const newContent: TheoryContent = { ...content, markdown: newValue };
        setContent(newContent);

        // Optimistic update
        onUpdate({ ...step, content: newContent });

        // Debounced save to server
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(async () => {
            const res = await updateStepContent(step.id, newContent);
            if (res.error) {
                toast.error("Error al guardar el contenido del paso");
            }
            setIsSaving(false);
        }, 1000);
    };

    return (
        <div className="flex h-full w-full bg-background overflow-hidden">
            {/* Editor Panel */}
            <div className="flex-1 border-r border-border/50 flex flex-col h-full bg-surface-dark/20 relative">
                <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50 justify-between">
                    <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Editor Markdown</span>
                    {isSaving ? (
                        <span className="text-[10px] text-accent-blue animate-pulse">Guardando...</span>
                    ) : (
                        <span className="text-[10px] text-text-muted/50">Guardado automáticamente</span>
                    )}
                </div>
                <div className="flex-1 p-0 overflow-hidden">
                    <Textarea
                        value={content.markdown}
                        onChange={handleChange}
                        className="h-full w-full resize-none border-none focus-visible:ring-0 rounded-none bg-transparent p-6 text-foreground font-mono text-sm leading-relaxed"
                        placeholder="# ¡Escribe tu contenido aquí!\n\nSoporta **Markdown** y [enlaces](https://github.com/remarkjs/react-markdown)..."
                    />
                </div>
            </div>

            {/* Preview Panel */}
            <div className="flex-1 flex flex-col h-full bg-background relative">
                <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50">
                    <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Vista Previa</span>
                </div>
                <div className="flex-1 p-8 overflow-y-auto prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-a:text-accent-blue hover:prose-a:text-accent-blue/80 prose-p:leading-relaxed prose-pre:bg-surface-dark prose-pre:border prose-pre:border-border/50">
                    {content.markdown ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content.markdown}
                        </ReactMarkdown>
                    ) : (
                        <div className="text-text-muted/50 italic mt-4 text-center">
                            Nada que mostrar aún. Empieza a escribir.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
