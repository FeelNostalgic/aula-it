"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ActivityStepWithClientState, TheoryContent } from "@/types/activity";
import { Textarea } from "@/components/ui/textarea";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

interface TheoryEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
}

export function TheoryEditor({ step, onUpdate }: TheoryEditorProps) {
    const defaultContent = (step.content as TheoryContent) || { markdown: '' };
    const [content, setContent] = useState<TheoryContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);

    // Auto-save debounce ref
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const togglePreview = () => {
        setIsPreviewCollapsed(!isPreviewCollapsed);
    };

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
        <div className="flex h-full w-full bg-background overflow-hidden relative">
            <ResizablePanelGroup direction="horizontal">
                {/* Editor Panel */}
                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="flex flex-col h-full bg-surface-dark/20 relative">
                        <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50 justify-between">
                            <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Editor Markdown</span>
                            <div className="flex items-center gap-4">
                                {isSaving ? (
                                    <span className="text-[10px] text-accent-blue animate-pulse">Guardando...</span>
                                ) : (
                                    <span className="text-[10px] text-text-muted/50">Guardado automáticamente</span>
                                )}
                                <button
                                    onClick={togglePreview}
                                    className="text-text-muted hover:text-foreground transition-colors flex items-center gap-1 bg-surface border border-border-subtle rounded-md px-2 py-1 shadow-sm h-7"
                                    title={isPreviewCollapsed ? "Expandir Vista Previa" : "Ocultar Vista Previa"}
                                >
                                    {isPreviewCollapsed ? <PanelRightOpen className="size-3.5" /> : <PanelRightClose className="size-3.5" />}
                                </button>
                            </div>
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
                            {content.markdown ? (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkMath]}
                                    rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                                >
                                    {content.markdown}
                                </ReactMarkdown>
                            ) : (
                                <div className="text-text-muted/50 italic mt-4 text-center">
                                    Nada que mostrar aún. Empieza a escribir.
                                </div>
                            )}
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
