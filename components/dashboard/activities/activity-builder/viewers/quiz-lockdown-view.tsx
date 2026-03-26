"use client";

import { ActivityStepWithClientState, ActivitySubmission } from "@/types/activity";
import { StepViewer } from "./step-viewer";
import { Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuizLockdownViewProps {
    step: ActivityStepWithClientState;
    activityId: string;
    userId?: string | null;
    studentName?: string | null;
    googleEmail?: string | null;
    submission?: ActivitySubmission;
    activityTitle: string;
    onComplete: () => void;
}

export function QuizLockdownView({
    step,
    activityId,
    userId,
    studentName,
    googleEmail,
    submission,
    activityTitle,
    onComplete,
}: QuizLockdownViewProps) {
    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
            {/* Minimal header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-border/50 bg-surface-dark">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-destructive/10 border border-destructive/20">
                        <Shield className="size-3.5 text-destructive" />
                        <span className="text-xs font-bold text-destructive uppercase tracking-widest">Modo Examen</span>
                    </div>
                    <span className="text-sm text-text-muted">{activityTitle}</span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onComplete}
                    className="text-text-muted hover:text-foreground gap-2"
                >
                    <X className="size-4" />
                    Salir del examen
                </Button>
            </div>

            {/* Quiz content */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12">
                <div className="max-w-3xl mx-auto space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">{step.title}</h1>
                    </div>
                    <StepViewer
                        step={step}
                        activityId={activityId}
                        submission={submission}
                        googleEmail={googleEmail}
                        userId={userId}
                        studentName={studentName}
                    />
                </div>
            </div>
        </div>
    );
}
