"use client";

import { useState, useEffect, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigSectionsToolbar, StepConfigSection, useConfigSectionState } from "./step-config-section";
import { useStepEditorTab } from "./use-step-editor-tab";
import { StepVisibilityTab } from "./step-visibility-tab";
import { MarkdownHelpPopover } from "./markdown-help-popover";
import { EditorSaveButton } from "./editor-save-button";
import type { StepVisibilityTabHandle } from "./step-visibility-tab";

interface TheoryEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
}

export function TheoryEditor({ step, onUpdate }: TheoryEditorProps) {
    const defaultContent = (step.content as TheoryContent) || { markdown: "" };
    const { activeTab, setActiveTab } = useStepEditorTab(step.id, "contenido", ["contenido", "configuracion", "visibilidad"]);
    const [content, setContent] = useState<TheoryContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const visibilityRef = useRef<StepVisibilityTabHandle | null>(null);
    const configSectionIds = ["experience", "completion-mode"];
    const sectionState = useConfigSectionState(step.id, configSectionIds);

    useEffect(() => {
        const newContent = (step.content as TheoryContent) || { markdown: "" };
        setContent(newContent);
        setIsDirty(false);
    }, [step.id]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const newContent: TheoryContent = { ...content, markdown: newValue };
        setContent(newContent);
        setIsDirty(true);
        onUpdate({ ...step, content: newContent });
    };

    const handleSave = async () => {
        if (!isDirty || isSaving) return;
        setIsSaving(true);
        const res = await updateStepContent(step.id, content);
        if (res.error) {
            toast.error("Error al guardar el contenido de la actividad");
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

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full w-full bg-background">
            {/* Tab bar */}
            <div className="shrink-0 border-b border-border/50 bg-surface-dark/10 px-4 flex items-center gap-2">
                <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
                    <TabsTrigger
                        value="contenido"
                        className="h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:text-foreground text-text-muted bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                        Contenido
                    </TabsTrigger>
                    <TabsTrigger
                        value="configuracion"
                        className="h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:text-foreground text-text-muted bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                        Configuración
                    </TabsTrigger>
                    <TabsTrigger
                        value="visibilidad"
                        className="h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:text-foreground text-text-muted bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                        Visibilidad
                    </TabsTrigger>
                </TabsList>

                <div className="ml-auto">
                    <EditorSaveButton isSaving={isSaving} isDirty={isDirty} onSave={handleSave} />
                </div>
            </div>

            {/* Contenido tab — full-height split view */}
            <TabsContent value="contenido" className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
                <div className="flex h-full w-full overflow-hidden relative min-h-0">
                    <ResizablePanelGroup direction="horizontal">
                        {/* Editor Panel */}
                        <ResizablePanel defaultSize={50} minSize={30}>
                            <div className="flex flex-col h-full bg-surface-dark/20 relative min-h-0">
                                <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50 justify-between">
                                    <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Editor Markdown</span>
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
                                        value={content.markdown}
                                        onChange={handleChange}
                                        className="h-full w-full resize-none border-none focus-visible:ring-0 rounded-none bg-transparent p-6 text-foreground font-mono text-sm leading-relaxed"
                                        placeholder="# ¡Escribe tu contenido aquí!\n\nSoporta **Markdown** y [enlaces](https://github.com/remarkjs/react-markdown)..."
                                    />
                                </div>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle className="bg-border-subtle hover:bg-accent-blue transition-colors duration-300 w-1.5 flex flex-col items-center justify-center" />

                        {/* Preview Panel */}
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
            </TabsContent>

            {/* Configuración tab */}
            <TabsContent value="configuracion" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-8 space-y-4">
                    <div className="mb-2">
                        <h3 className="text-lg font-bold text-foreground">Configuración de la actividad</h3>
                        <p className="text-sm text-text-muted mt-1">Ajusta la experiencia y el modo de completado de esta actividad.</p>
                    </div>
                    <ConfigSectionsToolbar
                        allSectionsOpen={sectionState.allSectionsOpen}
                        onToggleAll={() => sectionState.setAllSectionsOpen(!sectionState.allSectionsOpen)}
                    />
                    <StepConfigSection step={step} onUpdateStep={onUpdate} sectionState={sectionState} />
                </div>
            </TabsContent>

            <TabsContent value="visibilidad" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <StepVisibilityTab ref={visibilityRef} step={step} onUpdateStep={onUpdate} visible={activeTab === "visibilidad"} onDirtyChange={(dirty) => { if (dirty) setIsDirty(true); }} />
            </TabsContent>
        </Tabs>
    );
}
