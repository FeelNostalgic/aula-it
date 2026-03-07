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
import { Copy } from "lucide-react";

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
            <div className="shrink-0 h-14 border-b border-border/50 bg-background flex items-center px-6">
                <h2 className="font-bold text-lg text-foreground truncate">{step.title}</h2>
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono tracking-widest bg-surface px-2 py-1 rounded-md text-text-muted border border-border-subtle">
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
