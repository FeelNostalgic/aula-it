"use client";

import dynamic from "next/dynamic";
import { ActivityStepWithClientState, CompletionMode } from "@/types/activity";
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
const ResourceEditor = dynamic(
    () => import("./editors/resource-editor").then(m => ({ default: m.ResourceEditor })),
    { ssr: false }
);

import { Copy, Zap, ClipboardCheck, Eye, Minus } from "lucide-react";

const COMPLETION_LABELS: Record<CompletionMode, string> = {
    none: "Sin seguimiento",
    required: "Obligatorio",
    viewable: "Visualizable",
};

const COMPLETION_ICONS: Record<CompletionMode, typeof Minus> = {
    none: Minus,
    required: ClipboardCheck,
    viewable: Eye,
};

interface StepEditorPanelProps {
    step?: ActivityStepWithClientState;
    onUpdateStep: (updatedStep: ActivityStepWithClientState) => void;
}

export function StepEditorPanel({ step, onUpdateStep }: StepEditorPanelProps) {
    if (!step) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full text-text-muted">
                <div className="size-16 bg-surface rounded-2xl flex items-center justify-center mb-4">
                    <Copy className="size-6 text-text-muted/50" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Selecciona una Actividad</h2>
                <p className="max-w-md mx-auto">
                    Haz clic en cualquier actividad de la barra lateral para empezar a editar su contenido, o crea una nueva en una fase existente.
                </p>
            </div>
        );
    }

    const xp = step.xp ?? 0;
    const completionMode = step.completion_mode ?? "none";
    const CompletionIcon = COMPLETION_ICONS[completionMode];

    return (
        <div className="flex flex-col flex-1 min-h-0 w-full">
            {/* Informational header — values are edited inside each editor's Configuración tab */}
            <div className="shrink-0 h-11 border-b border-border/50 bg-background flex items-center px-6 gap-3">
                <h2 className="font-semibold text-sm text-foreground truncate">{step.title}</h2>

                <div className="ml-auto flex items-center gap-2">
                    {/* XP badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono ${xp > 500
                        ? "bg-accent-amber/10 border-accent-amber/30 text-accent-amber"
                        : xp > 0
                            ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                            : "bg-surface border-border-subtle text-text-muted/50"
                        }`}>
                        <Zap className="size-3" />
                        {xp} XP
                    </div>

                    {/* Completion mode badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${completionMode === "required"
                        ? "bg-accent-green/10 border-accent-green/30 text-accent-green"
                        : completionMode === "viewable"
                            ? "bg-accent-purple/10 border-accent-purple/30 text-accent-purple"
                            : "bg-surface border-border-subtle text-text-muted/50"
                        }`}>
                        <CompletionIcon className="size-3" />
                        {COMPLETION_LABELS[completionMode]}
                    </div>

                    {/* Type badge */}
                    <span className="text-[10px] uppercase font-mono tracking-widest bg-surface px-2 py-1 rounded-md text-text-muted border border-border-subtle shrink-0">
                        {step.type}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {step.type === "theory" && <TheoryEditor step={step} onUpdate={onUpdateStep} />}
                {step.type === "deliverable" && <DeliverableEditor step={step} onUpdate={onUpdateStep} />}
                {step.type === "file_upload" && <FileUploadEditor step={step} onUpdate={onUpdateStep} />}
                {step.type === "animation" && <AnimationEditor step={step} onUpdate={onUpdateStep} />}
                {step.type === "quiz" && <QuizEditor step={step} onUpdate={onUpdateStep} />}
                {step.type === "presentation" && <PresentationEditor step={step} onUpdate={onUpdateStep} />}
                {step.type === "resource" && <ResourceEditor step={step} onUpdate={onUpdateStep} />}
            </div>
        </div>
    );
}
