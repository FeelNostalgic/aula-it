"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, AnimationContent } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { PlaySquare } from "lucide-react";

interface AnimationEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
}

export function AnimationEditor({ step, onUpdate }: AnimationEditorProps) {
    const defaultContent = (step.content as AnimationContent) || { componentUrl: '', props: {} };
    const [content, setContent] = useState<AnimationContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const newContent = (step.content as AnimationContent) || { componentUrl: '', props: {} };
        setContent(newContent);
    }, [step.id, step.content]);

    const handleChange = (field: keyof AnimationContent, value: string) => {
        const newContent = { ...content, [field]: value };
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

    return (
        <div className="flex h-full w-full bg-background overflow-hidden relative">
            {/* Editor Panel */}
            <div className="flex-1 border-r border-border/50 flex flex-col h-full bg-surface-dark/20 relative">
                <div className="shrink-0 p-6 border-b border-border/50 bg-surface/30">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-foreground">Configuración de Animación</h3>
                            <p className="text-sm text-text-muted mt-1">
                                Vincula un componente interactivo o app embebida de terceros.
                            </p>
                        </div>
                        {isSaving ? (
                            <span className="text-xs text-accent-blue animate-pulse">Guardando...</span>
                        ) : (
                            <span className="text-xs text-text-muted/50">Guardado automáticamente</span>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <PlaySquare className="size-4" /> Componente URL (o ID)
                        </label>
                        <p className="text-xs text-text-muted">Introduce el ID del componente local o URL para iFrame interactivo.</p>
                        <Input
                            value={content.componentUrl || ""}
                            onChange={(e) => handleChange("componentUrl", e.target.value)}
                            placeholder="Ej. NetworkTopologySimulator o https://codepen.io/..."
                            className="bg-surface border-border/50 font-mono text-sm h-9"
                        />
                    </div>
                </div>
            </div>

            {/* Preview Panel */}
            <div className="flex-1 flex flex-col h-full bg-background relative">
                <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50">
                    <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Vista Previa</span>
                </div>
                <div className="flex-1 p-0 overflow-hidden bg-surface-dark flex items-center justify-center relative">
                    {content.componentUrl && content.componentUrl.startsWith('http') ? (
                        <iframe
                            src={content.componentUrl}
                            className="w-full h-full border-none bg-white"
                            title="Animation Preview"
                            sandbox="allow-scripts allow-same-origin"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center max-w-sm">
                            <PlaySquare className="size-12 text-text-muted/30 mb-4" />
                            <p className="text-text-muted text-sm">
                                {content.componentUrl
                                    ? "Componente local detectado. La previsualización se renderizará en tiempo de ejecución para el alumno."
                                    : "Introduce una URL válida para previsualizar el iFrame."}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
