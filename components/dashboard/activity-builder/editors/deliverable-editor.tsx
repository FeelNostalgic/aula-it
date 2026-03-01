"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, DeliverableStepContent } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { Link2 } from "lucide-react";

interface DeliverableEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
}

export function DeliverableEditor({ step, onUpdate }: DeliverableEditorProps) {
    const defaultContent = (step.content as DeliverableStepContent) || { templateUrl: '', instructionsMarkdown: '' };
    const [content, setContent] = useState<DeliverableStepContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const newContent = (step.content as DeliverableStepContent) || { templateUrl: '', instructionsMarkdown: '' };
        setContent(newContent);
    }, [step.id, step.content]);

    const handleChange = (field: keyof DeliverableStepContent, value: string) => {
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
        <div className="flex flex-col h-full w-full p-8 overflow-y-auto max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-foreground">Configuración del Entregable</h3>
                    <p className="text-sm text-text-muted mt-1">
                        Define qué debe entregar el alumno y asocia una plantilla inicial si es necesario.
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
                        <Link2 className="size-4" /> Plantilla URL (Opcional)
                    </label>
                    <p className="text-xs text-text-muted">Enlace a Google Docs, Packet Tracer, o repositorio de inicio.</p>
                    <Input
                        value={content.templateUrl || ""}
                        onChange={(e) => handleChange("templateUrl", e.target.value)}
                        placeholder="https://docs.google.com/document/d/.../copy"
                        className="bg-surface border-border/50"
                    />
                </div>
            </div>

            <div className="space-y-4 flex-1 flex flex-col min-h-[300px]">
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Instrucciones (Markdown)</label>
                    <p className="text-xs text-text-muted">Explica paso a paso lo que el alumno debe realizar y entregar.</p>
                </div>
                <Textarea
                    value={content.instructionsMarkdown || ""}
                    onChange={(e) => handleChange("instructionsMarkdown", e.target.value)}
                    placeholder="# Paso 1...\nDescribe el reto."
                    className="flex-1 resize-none bg-surface border-border/50 font-mono text-sm leading-relaxed p-4 h-full min-h-[300px]"
                />
            </div>
        </div>
    );
}
