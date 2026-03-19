"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, AnimationContent } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { PlaySquare, Zap } from "lucide-react";
import { animationRegistry } from "@/lib/animations/registry";
import { AnimationPlayer } from "@/components/animations/animation-player";
import { ArpAnimation } from "@/components/animations/arp-animation";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StepConfigSection } from "./step-config-section";

// Map slug → component for preview
const previewMap: Record<string, React.ComponentType> = {
    arp: ArpAnimation,
};

interface AnimationEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
}

export function AnimationEditor({ step, onUpdate }: AnimationEditorProps) {
    const defaultContent = (step.content as AnimationContent) || { componentUrl: "", animationSlug: undefined };
    const [content, setContent] = useState<AnimationContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const newContent = (step.content as AnimationContent) || { componentUrl: "" };
        setContent(newContent);
    }, [step.id, step.content]);

    const save = (newContent: AnimationContent) => {
        setContent(newContent);
        onUpdate({ ...step, content: newContent });
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSaving(true);
        timeoutRef.current = setTimeout(async () => {
            const res = await updateStepContent(step.id, newContent);
            if (res.error) toast.error("Error al guardar la animación");
            setIsSaving(false);
        }, 1000);
    };

    const handleSlugSelect = (slug: string) => {
        save({ ...content, animationSlug: slug || undefined, componentUrl: "" });
    };

    const handleUrlChange = (url: string) => {
        save({ ...content, componentUrl: url, animationSlug: undefined });
    };

    // Preview
    const selectedMeta = content.animationSlug
        ? animationRegistry.find(a => a.slug === content.animationSlug)
        : null;
    const PreviewComponent = content.animationSlug ? previewMap[content.animationSlug] : null;

    const activeMode: "local" | "url" | "none" =
        content.animationSlug ? "local" : content.componentUrl ? "url" : "none";

    const tabTriggerClass = "h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:text-foreground text-text-muted bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none";

    return (
        <Tabs defaultValue="animacion" className="flex flex-col h-full w-full bg-background">
            {/* Tab bar */}
            <div className="shrink-0 border-b border-border/50 bg-surface-dark/10 px-4 flex items-center gap-2">
                <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
                    <TabsTrigger value="animacion" className={tabTriggerClass}>Animación</TabsTrigger>
                    <TabsTrigger value="configuracion" className={tabTriggerClass}>Configuración</TabsTrigger>
                </TabsList>
                <div className="ml-auto">
                    {isSaving ? (
                        <span className="text-[10px] text-accent-blue animate-pulse">Guardando...</span>
                    ) : (
                        <span className="text-[10px] text-text-muted/50">Guardado automáticamente</span>
                    )}
                </div>
            </div>

            {/* Animación tab — selector + preview */}
            <TabsContent value="animacion" className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
                <div className="flex h-full w-full overflow-hidden relative">
                    {/* Selector panel */}
                    <div className="w-[340px] shrink-0 border-r border-border/50 flex flex-col h-full bg-surface-dark/20">
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Animación local */}
                            <div className={cn(
                                "rounded-xl border p-4 space-y-3 transition-colors",
                                activeMode === "local" ? "border-primary/50 bg-primary/5" : "border-border/50 bg-surface/20"
                            )}>
                                <div className="flex items-center gap-2">
                                    <PlaySquare className="size-4 text-primary" />
                                    <span className="text-sm font-semibold text-foreground">Animación local</span>
                                    {activeMode === "local" && (
                                        <span className="ml-auto text-[10px] font-mono uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded">Activo</span>
                                    )}
                                </div>
                                <p className="text-xs text-text-muted">Animaciones educativas interactivas integradas en la plataforma.</p>
                                <select
                                    value={content.animationSlug || ""}
                                    onChange={(e) => handleSlugSelect(e.target.value)}
                                    className="w-full h-9 rounded-md border border-border/50 bg-surface text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">— Selecciona una animación —</option>
                                    {animationRegistry.map((anim) => (
                                        <option key={anim.slug} value={anim.slug}>[{anim.topic}] {anim.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-border/50" />
                                <span className="text-xs text-text-muted uppercase tracking-wider">o</span>
                                <div className="flex-1 h-px bg-border/50" />
                            </div>

                            {/* URL externa */}
                            <div className={cn(
                                "rounded-xl border p-4 space-y-3 transition-colors",
                                activeMode === "url" ? "border-border bg-surface/40" : "border-border/30 bg-surface/10"
                            )}>
                                <div className="flex items-center gap-2">
                                    <Zap className="size-4 text-text-muted" />
                                    <span className="text-sm font-semibold text-foreground">URL externa (iFrame)</span>
                                    {activeMode === "url" && (
                                        <span className="ml-auto text-[10px] font-mono uppercase text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border/50">Activo</span>
                                    )}
                                </div>
                                <p className="text-xs text-text-muted">Enlaza un simulador externo, Codepen, GNS3, etc.</p>
                                <Input
                                    value={content.componentUrl || ""}
                                    onChange={(e) => handleUrlChange(e.target.value)}
                                    placeholder="https://codepen.io/..."
                                    className="bg-surface border-border/50 font-mono text-sm h-9"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Preview panel */}
                    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
                        <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50">
                            <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Vista Previa</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {selectedMeta && PreviewComponent ? (
                                <div style={{ height: "calc(100vh - 120px)", minHeight: 560 }}>
                                    <AnimationPlayer steps={selectedMeta.steps} title={selectedMeta.title}>
                                        <PreviewComponent />
                                    </AnimationPlayer>
                                </div>
                            ) : content.componentUrl?.startsWith("http") ? (
                                <iframe
                                    src={content.componentUrl}
                                    className="w-full h-full border-none rounded-lg"
                                    title="Animation Preview"
                                    sandbox="allow-scripts allow-same-origin"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <PlaySquare className="size-12 text-text-muted/30 mb-4" />
                                    <p className="text-text-muted text-sm max-w-xs">
                                        {content.componentUrl
                                            ? "Componente local detectado. Se renderizará en tiempo de ejecución."
                                            : "Selecciona una animación o introduce una URL para previsualizar."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </TabsContent>

            {/* Configuración tab */}
            <TabsContent value="configuracion" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-8 space-y-4">
                    <div className="mb-2">
                        <h3 className="text-lg font-bold text-foreground">Configuración del paso</h3>
                        <p className="text-sm text-text-muted mt-1">Ajusta la experiencia y el modo de completado de esta animación.</p>
                    </div>
                    <StepConfigSection step={step} onUpdateStep={onUpdate} />
                </div>
            </TabsContent>
        </Tabs>
    );
}
