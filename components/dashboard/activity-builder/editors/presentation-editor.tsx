"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, PresentationContent } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";

interface PresentationEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updatedStep: ActivityStepWithClientState) => void;
}

export function PresentationEditor({ step, onUpdate }: PresentationEditorProps) {
    const defaultContent: PresentationContent = { slidesUrl: "", notes: "" };
    const initialContent = (step.content as PresentationContent) || defaultContent;

    const [slidesUrl, setSlidesUrl] = useState(initialContent.slidesUrl || "");
    const [notes, setNotes] = useState(initialContent.notes || "");
    const [isSaving, setIsSaving] = useState(false);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Update local state when step changes
    useEffect(() => {
        const content = (step.content as PresentationContent) || defaultContent;
        setSlidesUrl(content.slidesUrl || "");
        setNotes(content.notes || "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step.id]);

    const triggerSave = (newUrl: string, newNotes: string) => {
        setIsSaving(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const newContent: PresentationContent = { slidesUrl: newUrl, notes: newNotes };

        timeoutRef.current = setTimeout(async () => {
            const res = await updateStepContent(step.id, newContent);
            if (res.error) {
                toast.error("Error al guardar la presentación");
            } else {
                onUpdate({ ...step, content: newContent });
            }
            setIsSaving(false);
        }, 1000); // 1s debounce
    };

    const handleUrlChange = (val: string) => {
        setSlidesUrl(val);
        triggerSave(val, notes);
    };

    const handleNotesChange = (val: string) => {
        setNotes(val);
        triggerSave(slidesUrl, val);
    };

    return (
        <div className="flex h-full w-full">
            {/* Editor Sidebar */}
            <div className="w-1/3 min-w-[300px] border-r border-border/50 bg-surface-dark flex flex-col">
                <div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0 h-10">
                    <span className="text-xs font-medium text-text-muted">Editor de Presentación</span>
                    {isSaving ? (
                        <span className="text-[10px] text-accent-blue animate-pulse">Guardando...</span>
                    ) : (
                        <span className="text-[10px] text-text-muted/50">Guardado automáticamente</span>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            URL de Presentación (Embed)
                        </label>
                        <p className="text-xs text-text-muted mb-2">
                            Pega el enlace de "Publicar en la web" de Google Slides, Pitch, Canva, etc.
                        </p>
                        <Input
                            value={slidesUrl}
                            onChange={(e) => handleUrlChange(e.target.value)}
                            placeholder="https://docs.google.com/presentation/d/e/..."
                            className="bg-surface border-border/50 font-mono text-xs"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Notas del Profesor
                        </label>
                        <p className="text-xs text-text-muted mb-2">
                            Anotaciones o guion para esta diapositiva / presentación.
                        </p>
                        <Textarea
                            value={notes}
                            onChange={(e) => handleNotesChange(e.target.value)}
                            placeholder="Puntos clave a mencionar..."
                            className="bg-surface border-border/50 resize-none h-48 font-mono text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* Live Preview / Render Area */}
            <div className="flex-1 bg-background flex flex-col relative">
                <div className="h-10 border-b border-border/50 flex items-center px-4 shrink-0 justify-between bg-surface-dark/50">
                    <span className="text-xs font-medium text-text-muted flex items-center gap-2">
                        Vista Previa
                    </span>
                </div>

                <div className="flex-1 p-8 overflow-y-auto bg-grid-pattern">
                    {slidesUrl ? (
                        <div className="w-full aspect-video rounded-lg overflow-hidden border border-border/50 shadow-2xl bg-surface flex items-center justify-center">
                            <iframe
                                src={slidesUrl}
                                width="100%"
                                height="100%"
                                allowFullScreen
                                className="border-none"
                                title="Presentation Preview"
                            />
                        </div>
                    ) : (
                        <div className="w-full aspect-video rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center text-text-muted">
                            <p className="text-sm">Configura la URL de la presentación para previsualizar</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
