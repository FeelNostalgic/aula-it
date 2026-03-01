"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, AnimationStepContent } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { PlaySquare } from "lucide-react";

interface AnimationEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
}

export function AnimationEditor({ step, onUpdate }: AnimationEditorProps) {
    const defaultContent = (step.content as AnimationStepContent) || { componentUrl: '', props: {} };
    const [content, setContent] = useState<AnimationStepContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const newContent = (step.content as AnimationStepContent) || { componentUrl: '', props: {} };
        setContent(newContent);
    }, [step.id, step.content]);

    const handleChange = (field: keyof AnimationStepContent, value: string) => {
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
        <div className="flex flex-col h-full w-full p-8 overflow-y-auto max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-foreground">Configuración de Animación</h3>
                    <p className="text-sm text-text-muted mt-1">
                        Vincula un componente interactivo o app embebida de terceros.
                    </p>
                </div>
                {isSaving ? (
                    <span className="text-xs text-accent-blue animate-pulse">Guardando...</span>
                ) : (
                    <span className="text-xs text-text-muted/50">Guardado</span>
                )}
            </div>

            <div className="space-y-4 bg-surface/30 p-6 rounded-xl border border-white/5">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <PlaySquare className="size-4" /> Componente URL (o ID)
                    </label>
                    <p className="text-xs text-text-muted">Introduce el ID del componente local o URL para iFrame interactivo.</p>
                    <Input
                        value={content.componentUrl || ""}
                        onChange={(e) => handleChange("componentUrl", e.target.value)}
                        placeholder="Ej. NetworkTopologySimulator o https://codepen.io/..."
                        className="bg-surface border-border/50 font-mono text-sm"
                    />
                </div>
            </div>

            <div className="flex items-center justify-center p-12 border-2 border-dashed border-border/50 rounded-xl bg-surface/20">
                <p className="text-text-muted text-sm text-center">
                    La previsualización en vivo del componente interactivo no está disponible. <br />
                    Renderizará en tiempo de ejecución para el alumno.
                </p>
            </div>
        </div>
    );
}
