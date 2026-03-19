"use client";

import { useState, useEffect, useRef } from "react";
import { ActivityStepWithClientState, FileUploadContent, AllowedFileType, RubricCriteria } from "@/types/activity";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateStepContent, updateStepDueDate } from "@/app/activities/[id]/edit/actions";
import { toast } from "sonner";
import { ListChecks, PanelRightClose, PanelRightOpen } from "lucide-react";
import { RubricBuilderModal } from "@/components/dashboard/rubric-builder-modal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StepConfigSection } from "./step-config-section";

const ALLOWED_TYPE_OPTIONS: { value: AllowedFileType; label: string }[] = [
    { value: 'pdf', label: 'PDF' },
    { value: 'image', label: 'Imágenes' },
    { value: 'word', label: 'Word (.doc, .docx)' },
    { value: 'zip', label: 'ZIP (.zip)' },
    { value: 'pka', label: 'Packet Tracer (.pka)' },
    { value: 'any', label: 'Cualquier archivo' },
];

const PRESET_SIZES = [5, 10, 25, 50];

type SizeUnit = 'MB' | 'GB';

function initCustomSizeState(mb: number): { isCustom: boolean; value: number; unit: SizeUnit } {
    if (PRESET_SIZES.includes(mb)) return { isCustom: false, value: mb, unit: 'MB' };
    if (mb >= 1024) return { isCustom: true, value: Math.round(mb / 1024), unit: 'GB' };
    return { isCustom: true, value: mb, unit: 'MB' };
}

function toMb(value: number, unit: SizeUnit): number {
    return unit === 'GB' ? value * 1024 : value;
}

function utcToLocalInputValue(isoUtc: string): string {
    const d = new Date(isoUtc);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FileUploadEditorProps {
    step: ActivityStepWithClientState;
    onUpdate: (updated: ActivityStepWithClientState) => void;
}

export function FileUploadEditor({ step, onUpdate }: FileUploadEditorProps) {
    const defaultContent: FileUploadContent = (step.content as FileUploadContent) || {
        instructionsMarkdown: '',
        allowedTypes: ['pdf', 'image', 'word'],
        maxFileSizeMb: 10,
        maxFiles: 1,
    };
    const initCustom = initCustomSizeState(defaultContent.maxFileSizeMb);
    const [content, setContent] = useState<FileUploadContent>(defaultContent);
    const [isSaving, setIsSaving] = useState(false);
    const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
    const [rubricModalOpen, setRubricModalOpen] = useState(false);
    const [dueDate, setDueDate] = useState<string | null>(step.due_date ?? null);
    const [isCustomSize, setIsCustomSize] = useState(initCustom.isCustom);
    const [customSizeValue, setCustomSizeValue] = useState(initCustom.value);
    const [customSizeUnit, setCustomSizeUnit] = useState<SizeUnit>(initCustom.unit);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dueDateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const newContent = (step.content as FileUploadContent) || {
            instructionsMarkdown: '',
            allowedTypes: ['pdf', 'image', 'word'],
            maxFileSizeMb: 10,
            maxFiles: 1,
        };
        setContent(newContent);
        setDueDate(step.due_date ?? null);
        const newCustom = initCustomSizeState((newContent as FileUploadContent).maxFileSizeMb ?? 10);
        setIsCustomSize(newCustom.isCustom);
        setCustomSizeValue(newCustom.value);
        setCustomSizeUnit(newCustom.unit);
    }, [step.id, step.content, step.due_date]);

    const saveContent = (newContent: FileUploadContent) => {
        setContent(newContent);
        onUpdate({ ...step, content: newContent });
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsSaving(true);
        timeoutRef.current = setTimeout(async () => {
            const res = await updateStepContent(step.id, newContent);
            if (res.error) toast.error("Error al guardar");
            setIsSaving(false);
        }, 1000);
    };

    const handleDueDateChange = (value: string | null) => {
        // Convert local datetime-local string to UTC ISO before saving
        const isoUtc = value ? new Date(value).toISOString() : null;
        setDueDate(isoUtc);
        if (dueDateTimeoutRef.current) clearTimeout(dueDateTimeoutRef.current);
        setIsSaving(true);
        dueDateTimeoutRef.current = setTimeout(async () => {
            const res = await updateStepDueDate(step.id, isoUtc);
            if (res.error) toast.error("Error al guardar la fecha límite");
            setIsSaving(false);
        }, 1000);
    };

    const toggleAllowedType = (type: AllowedFileType) => {
        const current = content.allowedTypes ?? [];
        const updated = current.includes(type)
            ? current.filter(t => t !== type)
            : [...current, type];
        saveContent({ ...content, allowedTypes: updated });
    };

    const handleRubricChange = (newRubric: RubricCriteria[]) => {
        saveContent({ ...content, rubric: newRubric });
    };

    const tabTriggerClass = "h-10 px-4 text-xs font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-accent-blue data-[state=active]:text-foreground text-text-muted bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none";

    return (
        <Tabs defaultValue="instrucciones" className="flex flex-col h-full w-full bg-background">
            {/* Tab bar */}
            <div className="shrink-0 border-b border-border/50 bg-surface-dark/10 px-4 flex items-center gap-2">
                <TabsList className="bg-transparent h-auto p-0 gap-0 rounded-none">
                    <TabsTrigger value="instrucciones" className={tabTriggerClass}>Instrucciones</TabsTrigger>
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

            {/* Instrucciones tab — markdown split view */}
            <TabsContent value="instrucciones" className="mt-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
                <div className="flex h-full overflow-hidden min-h-0">
                    <ResizablePanelGroup direction="horizontal">
                        <ResizablePanel defaultSize={50} minSize={30}>
                            <div className="flex flex-col h-full bg-surface-dark/20 relative min-h-0">
                                <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50 justify-between">
                                    <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Instrucciones (Markdown)</span>
                                    <button
                                        onClick={() => setIsPreviewCollapsed(v => !v)}
                                        className="text-text-muted hover:text-foreground transition-colors flex items-center gap-1 bg-surface border border-border-subtle rounded-md px-2 py-1 shadow-sm h-7"
                                        title={isPreviewCollapsed ? "Expandir Vista Previa" : "Ocultar Vista Previa"}
                                    >
                                        {isPreviewCollapsed ? <PanelRightOpen className="size-3.5" /> : <PanelRightClose className="size-3.5" />}
                                    </button>
                                </div>
                                <div className="flex-1 p-0 overflow-hidden">
                                    <Textarea
                                        value={content.instructionsMarkdown || ""}
                                        onChange={(e) => saveContent({ ...content, instructionsMarkdown: e.target.value })}
                                        className="h-full w-full resize-none border-none focus-visible:ring-0 rounded-none bg-transparent p-6 text-foreground font-mono text-sm leading-relaxed"
                                        placeholder="# Instrucciones\nDescribe qué debe entregar el alumno..."
                                    />
                                </div>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle className="bg-border-subtle hover:bg-accent-blue transition-colors duration-300 w-1.5 flex flex-col items-center justify-center" />

                        <ResizablePanel defaultSize={50} minSize={25} maxSize={75} className={isPreviewCollapsed ? "hidden" : ""}>
                            <div className="flex flex-col h-full bg-background relative border-l border-border-subtle">
                                <div className="h-10 shrink-0 flex items-center px-4 border-b border-border/30 bg-surface/50">
                                    <span className="text-xs font-mono tracking-widest text-text-muted uppercase">Vista Previa</span>
                                </div>
                                <div className="flex-1 p-8 overflow-y-auto prose dark:prose-invert prose-sm max-w-none prose-headings:font-semibold prose-a:text-accent-blue hover:prose-a:text-accent-blue/80 prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-none prose-code:bg-surface-dark prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none font-sans">
                                    {content.instructionsMarkdown ? (
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                                        >
                                            {content.instructionsMarkdown}
                                        </ReactMarkdown>
                                    ) : (
                                        <div className="text-text-muted/50 italic mt-4 text-center">Instrucciones vacías.</div>
                                    )}
                                </div>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </TabsContent>

            {/* Configuración tab */}
            <TabsContent value="configuracion" className="mt-0 flex-1 min-h-0 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-8 space-y-6">
                    <div className="mb-2">
                        <h3 className="text-lg font-bold text-foreground">Configuración del Entregable</h3>
                        <p className="text-sm text-text-muted mt-1">El alumno sube archivos directamente a tu Drive.</p>
                    </div>

                    <StepConfigSection step={step} onUpdateStep={onUpdate} />

                    {/* Tipos de archivo */}
                    <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                        <div className="px-5 py-2.5 border-b border-white/5 bg-white/[0.02]">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Tipos de archivo permitidos</span>
                        </div>
                        <div className="p-5">
                            <div className="flex flex-wrap gap-2">
                                {ALLOWED_TYPE_OPTIONS.map(opt => {
                                    const active = content.allowedTypes?.includes(opt.value) ?? false;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => toggleAllowedType(opt.value)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                                                active
                                                    ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                                    : "bg-surface border-border/50 text-text-muted hover:text-foreground hover:bg-surface-dark"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Límites */}
                    <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                        <div className="px-5 py-2.5 border-b border-white/5 bg-white/[0.02]">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Límites</span>
                        </div>
                        <div className="p-5 flex flex-wrap gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">Tamaño máximo</label>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={isCustomSize ? "custom" : String(content.maxFileSizeMb)}
                                        onChange={(e) => {
                                            if (e.target.value === "custom") { setIsCustomSize(true); }
                                            else { setIsCustomSize(false); saveContent({ ...content, maxFileSizeMb: Number(e.target.value) }); }
                                        }}
                                        className="h-9 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                    >
                                        {PRESET_SIZES.map(mb => <option key={mb} value={mb}>{mb} MB</option>)}
                                        <option value="custom">Personalizado</option>
                                    </select>
                                    {isCustomSize && (
                                        <>
                                            <input type="number" min={1} value={customSizeValue}
                                                onChange={(e) => { const v = Math.max(1, Number(e.target.value)); setCustomSizeValue(v); saveContent({ ...content, maxFileSizeMb: toMb(v, customSizeUnit) }); }}
                                                className="h-9 w-20 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                            />
                                            <select value={customSizeUnit}
                                                onChange={(e) => { const unit = e.target.value as SizeUnit; setCustomSizeUnit(unit); saveContent({ ...content, maxFileSizeMb: toMb(customSizeValue, unit) }); }}
                                                className="h-9 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                            >
                                                <option value="MB">MB</option>
                                                <option value="GB">GB</option>
                                            </select>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">Nº máximo de archivos</label>
                                <input type="number" min={1} max={10} value={content.maxFiles}
                                    onChange={(e) => saveContent({ ...content, maxFiles: Math.max(1, Math.min(10, Number(e.target.value))) })}
                                    className="h-9 w-20 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Rúbrica */}
                    <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                        <div className="px-5 py-2.5 border-b border-white/5 bg-white/[0.02]">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Rúbrica</span>
                        </div>
                        <div className="p-5">
                            <Button variant="outline" size="sm" onClick={() => setRubricModalOpen(true)}
                                className="h-8 text-xs gap-1.5 border-border/50 text-text-muted hover:text-foreground">
                                <ListChecks className="size-3.5" />
                                {(content.rubric?.length ?? 0) > 0
                                    ? `Editar rúbrica (${content.rubric!.length} ${content.rubric!.length === 1 ? "criterio" : "criterios"})`
                                    : "Configurar rúbrica"}
                            </Button>
                        </div>
                    </div>
                    <RubricBuilderModal rubric={content.rubric ?? []} open={rubricModalOpen} onClose={() => setRubricModalOpen(false)} onChange={handleRubricChange} />

                    {/* Fecha límite */}
                    <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                        <div className="px-5 py-2.5 border-b border-white/5 bg-white/[0.02]">
                            <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Fecha Límite</span>
                        </div>
                        <div className="p-5 space-y-2">
                            <div className="flex items-center gap-2">
                                <input type="datetime-local"
                                    value={dueDate ? utcToLocalInputValue(dueDate) : ""}
                                    onChange={(e) => handleDueDateChange(e.target.value || null)}
                                    className="flex-1 h-9 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                />
                                {dueDate && (
                                    <Button variant="ghost" size="sm" onClick={() => handleDueDateChange(null)}
                                        className="h-9 text-xs text-text-muted hover:text-foreground shrink-0">
                                        Quitar
                                    </Button>
                                )}
                            </div>
                            <p className="text-xs text-text-muted">El alumno no podrá entregar pasada esta fecha.</p>
                        </div>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
    );
}
