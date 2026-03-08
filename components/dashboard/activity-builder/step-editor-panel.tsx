"use client";

import dynamic from "next/dynamic";
import { ActivityStepWithClientState } from "@/types/activity";
import { TheoryEditor } from "./editors/theory-editor";
import { AnimationEditor } from "./editors/animation-editor";

const DeliverableEditor = dynamic(
    () => import("./editors/deliverable-editor").then(m => ({ default: m.DeliverableEditor })),
    { ssr: false }
);
const FileUploadEditor = dynamic(
    () => import("./editors/file-upload-editor").then(m => ({ default: m.FileUploadEditor })),
    { ssr: false }
);
const QuizEditor = dynamic(
    () => import("./editors/quiz-editor").then(m => ({ default: m.QuizEditor })),
    { ssr: false }
);
const PresentationEditor = dynamic(
    () => import("./editors/presentation-editor").then(m => ({ default: m.PresentationEditor })),
    { ssr: false }
);
import { Copy, Zap, Save, Trash2, X, ChevronRight, GripVertical, Plus, Settings2, Type, FileText, Layout, HelpCircle } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { updateStepXp } from "@/app/activities/[id]/edit/actions";

interface StepEditorPanelProps {
    step?: ActivityStepWithClientState;
    onUpdateStep: (updatedStep: ActivityStepWithClientState) => void;
}

export function StepEditorPanel({ step, onUpdateStep }: StepEditorPanelProps) {
    const [xp, setXp] = useState<string>(step?.xp?.toString() || "0");
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setXp(step?.xp?.toString() || "0");
    }, [step?.id, step?.xp]);

    const handleXpChange = (val: string) => {
        setXp(val);
        const numVal = parseInt(val, 10);
        const finalVal = isNaN(numVal) ? 0 : numVal;

        onUpdateStep({ ...step!, xp: finalVal });

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(async () => {
            const res = await updateStepXp(step!.id, finalVal);
            if (res.error) toast.error("Error al guardar XP");
        }, 1000);
    };

    if (!step) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full text-text-muted">
                <div className="size-16 bg-surface rounded-2xl flex items-center justify-center mb-4">
                    <Copy className="size-6 text-text-muted/50" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Selecciona un Paso</h2>
                <p className="max-w-md mx-auto">
                    Haz clic en cualquier paso de la barra lateral para empezar a editar su contenido, o crea uno nuevo en una fase existente.
                </p>
            </div>
        );
    }

    // Render the proper editor based on step.type
    return (
        <div className="flex flex-col h-full w-full">
            {/* Header / Info bar of the step could go here, but editor handles it usually or we define it here */}
            <div className="shrink-0 h-14 border-b border-border/50 bg-background flex items-center px-6 gap-4">
                <h2 className="font-bold text-lg text-foreground truncate">{step.title}</h2>
                <div className="ml-auto flex items-center gap-4 border-l border-border/50 pl-4">
                    <div className="flex items-center gap-2 group">
                        <Zap className="size-4 text-accent-blue/70 group-hover:text-accent-blue transition-colors" />
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Experiencia (XP)</label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <HelpCircle className="size-3.5 text-text-muted hover:text-accent-blue transition-colors cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="max-w-xs p-4 space-y-2 bg-surface-dark border-border-subtle shadow-xl">
                                            <p className="font-bold text-accent-blue text-xs uppercase tracking-wider">Guía de XP</p>
                                            <ul className="text-[11px] space-y-1 text-text-muted list-disc ml-3">
                                                <li><span className="text-foreground font-semibold">Teoría/Lectura:</span> 10 - 50 XP</li>
                                                <li><span className="text-foreground font-semibold">Ejercicios Cortos:</span> 50 - 150 XP</li>
                                                <li><span className="text-foreground font-semibold">Entregables/Prácticas:</span> 200 - 500 XP</li>
                                                <li><span className="text-foreground font-semibold">Hitos Críticos:</span> 500+ XP</li>
                                            </ul>
                                            <p className="text-[10px] italic text-text-muted/80 pt-1 border-t border-border/50">
                                                Mantén un equilibrio para motivar sin inflar los niveles.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <Input
                                id="step-xp"
                                type="number"
                                min="0"
                                value={xp}
                                onChange={(e) => handleXpChange(e.target.value)}
                                className="w-20 h-8 text-xs bg-surface border-border-subtle px-2 focus-visible:ring-1 focus-visible:ring-accent-blue font-mono"
                            />
                        </div>
                    </div>
                    <span className="text-[10px] uppercase font-mono tracking-widest bg-surface px-2 py-1 rounded-md text-text-muted border border-border-subtle shrink-0">
                        TIPO: {step.type}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {step.type === 'theory' && <TheoryEditor step={step} onUpdate={onUpdateStep} />}
                {step.type === 'deliverable' && <DeliverableEditor step={step} onUpdate={onUpdateStep} />}
                {step.type === 'file_upload' && <FileUploadEditor step={step} onUpdate={onUpdateStep} />}
                {step.type === 'animation' && <AnimationEditor step={step} onUpdate={onUpdateStep} />}
                {step.type === 'quiz' && <QuizEditor step={step} onUpdate={onUpdateStep} />}
                {step.type === 'presentation' && <PresentationEditor step={step} onUpdate={onUpdateStep} />}
            </div>
        </div>
    );
}
