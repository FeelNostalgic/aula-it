"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import type { QuizContent } from "@/types/activity";
import { StepSubmissionsPanel, STEP_SUBMISSIONS_PANEL_TYPES } from "@/components/dashboard/activities/activity-builder/step-submissions-panel";

type QuizResponsesPanelProps = {
    stepId: string;
    activityId?: string;
    moduleId?: string;
    content: QuizContent;
    visible: boolean;
};

export function QuizResponsesPanel({ stepId, activityId, moduleId, content, visible }: QuizResponsesPanelProps) {
    useEffect(() => {
        if (!visible) return;
        if (content.quizMode === "google_form") {
            toast.error("La pestaña Respuestas solo está disponible en quiz built-in.");
        }
    }, [content.quizMode, visible]);

    return (
        <StepSubmissionsPanel
            stepId={stepId}
            activityId={activityId}
            moduleId={moduleId}
            visible={visible}
            allowedTypes={[STEP_SUBMISSIONS_PANEL_TYPES.QUIZ]}
            invalidTypeError="El paso no es un cuestionario."
            missingContextError="No se pudo cargar el contexto de actividad para mostrar respuestas."
            loadingLabel="Cargando respuestas..."
        />
    );
}
