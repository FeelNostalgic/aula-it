"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, PresentationContent } from "@/types/activity";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { HardDrive } from "lucide-react";
import { updateStepContent } from "@/app/activities/[id]/edit/actions";
import { useGoogleDrivePicker } from "@/hooks/use-google-drive-picker";
import { toEmbedUrl, GOOGLE_MIME } from "@/lib/google-drive-urls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfigSection, ConfigSectionsToolbar, StepConfigSection, useConfigSectionState } from "./step-config-section";

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
    const { openPicker, isLoading: isDriveLoading } = useGoogleDrivePicker();
    const configSectionIds = ["experience", "completion-mode", "teacher-notes"];
    const sectionState = useConfigSectionState(step.id, configSectionIds);

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
        }, 1000);
    };

    const handleUrlChange = (val: string) => {
        setSlidesUrl(val);
        triggerSave(val, notes);
    };

    const handlePickFromDrive = async () => {
        try {
            const files = await openPicker({
                mimeTypes: [GOOGLE_MIME.PRESENTATION],
                multiSelect: false,
                title: "Seleccionar presentación",
            });
            if (files.length > 0) {
                handleUrlChange(toEmbedUrl(files[0]));
            }
        } catch {
            toast.error("Error al abrir Google Drive");
        }
    };

    const handleNotesChange = (val: string) => {
        setNotes(val);
        triggerSave(slidesUrl, val);
    };

    return (
        <Tabs defaultValue="presentacion" className="flex flex-col h-full w-full bg-background">
            {/* Tab bar */}
            <div className="shrink-0 border-b border-border/50 bg-surface-dark/10 px-4 flex items-center gap-2">
                <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
                    <TabsTrigger
                        value="presentacion"
                        className="h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:text-foreground text-text-muted bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                        Presentación
                    </TabsTrigger>
                    <TabsTrigger
                        value="configuracion"
                        className="h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:text-foreground text-text-muted bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                        Configuración
                    </TabsTrigger>
                </TabsList>

                <div className="ml-auto">
                    {isSaving ? (
                        <span className="text-[10px] text-accent-blue animate-pulse">Guardando...</span>
                    ) : (
                        <span className="text-[10px] text-text-muted/50">Guardado automáticamente</span>
                    )}
                </div>
            </div>

            {/* Presentación tab — URL picker + iframe preview */}
            <TabsContent value="presentacion" className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
                <div className="flex h-full w-full">
                    {/* Editor sidebar */}
                    <div className="w-1/3 min-w-[280px] border-r border-border/50 bg-surface-dark flex flex-col">
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">
                                    URL de Presentación (Embed)
                                </label>
                                <p className="text-xs text-text-muted">
                                    Pega el enlace de "Publicar en la web" de Google Slides, Pitch, Canva, etc.
                                </p>
                                <div className="flex gap-2">
                                    <Input
                                        value={slidesUrl}
                                        onChange={(e) => handleUrlChange(e.target.value)}
                                        placeholder="https://docs.google.com/presentation/d/e/..."
                                        className="bg-surface border-border/50 font-mono text-xs flex-1"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePickFromDrive}
                                        disabled={isDriveLoading}
                                        className="h-9 border-border/50 hover:bg-surface-dark shrink-0"
                                    >
                                        <HardDrive className="size-4 mr-2 text-accent-blue" />
                                        {isDriveLoading ? "..." : "Drive"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Live preview */}
                    <div className="flex-1 bg-background flex flex-col">
                        <div className="h-10 border-b border-border/50 flex items-center px-4 shrink-0 bg-surface-dark/50">
                            <span className="text-xs font-medium text-text-muted">Vista previa</span>
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
            </TabsContent>

            {/* Configuración tab — XP, completion, notes */}
            <TabsContent value="configuracion" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-8 space-y-4">
                    <div className="mb-2">
                        <h3 className="text-lg font-bold text-foreground">Configuración de la actividad</h3>
                        <p className="text-sm text-text-muted mt-1">Ajusta la experiencia, el modo de completado y las notas del profesor.</p>
                    </div>

                    <ConfigSectionsToolbar
                        allSectionsOpen={sectionState.allSectionsOpen}
                        onToggleAll={() => sectionState.setAllSectionsOpen(!sectionState.allSectionsOpen)}
                    />
                    <StepConfigSection step={step} onUpdateStep={onUpdate} sectionState={sectionState} />

                    {/* Teacher notes */}
                    <ConfigSection
                        title="Notas del Profesor"
                        sectionId="teacher-notes"
                        open={sectionState.isSectionOpen("teacher-notes")}
                        onToggle={() => sectionState.toggleSection("teacher-notes")}
                    >
                        <p className="text-xs text-text-muted">
                            Anotaciones o guion para esta presentación. Solo visibles para ti.
                        </p>
                        <Textarea
                            value={notes}
                            onChange={(e) => handleNotesChange(e.target.value)}
                            placeholder="Puntos clave a mencionar, tiempo estimado por slide..."
                            className="bg-surface border-border/50 resize-none h-40 font-mono text-xs"
                        />
                    </ConfigSection>
                </div>
            </TabsContent>
        </Tabs>
    );
}
