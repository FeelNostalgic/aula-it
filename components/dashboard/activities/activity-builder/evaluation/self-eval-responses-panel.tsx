"use client";

import { StepSubmissionsPanel, STEP_SUBMISSIONS_PANEL_TYPES } from "@/components/dashboard/activities/activity-builder/step-submissions-panel";

type SelfEvalResponsesPanelProps = {
    stepId: string;
    activityId?: string;
    moduleId?: string;
    visible: boolean;
};

export function SelfEvalResponsesPanel({ stepId, activityId, moduleId, visible }: SelfEvalResponsesPanelProps) {
    return (
        <StepSubmissionsPanel
            stepId={stepId}
            activityId={activityId}
            moduleId={moduleId}
            visible={visible}
            allowedTypes={[STEP_SUBMISSIONS_PANEL_TYPES.SELF_EVALUATION]}
            invalidTypeError="El paso no es una autoevaluación."
            missingContextError="No se pudo cargar el contexto de actividad para mostrar respuestas."
            loadingLabel="Cargando respuestas..."
        />
    );
}
