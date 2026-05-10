"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { StepSubmissionRow } from "@/app/dashboard/units/[id]/actions";
import { getStepSubmissionsContext } from "@/app/activities/[id]/edit/actions";
import { CorrectionDetail } from "@/components/dashboard/units/unit-evaluation-tab";

const STEP_SUBMISSIONS_PANEL_TYPES = {
    QUIZ: "quiz",
    DELIVERABLE: "deliverable",
    FILE_UPLOAD: "file_upload",
    SELF_EVALUATION: "self_evaluation",
} as const;

type StepSubmissionsPanelType = (typeof STEP_SUBMISSIONS_PANEL_TYPES)[keyof typeof STEP_SUBMISSIONS_PANEL_TYPES];

type StepSubmissionsBaseData = {
    stepTitle: string;
    stepType: string;
    orderIndex: number;
    deliveryMode: "manual" | "teacher_copy" | undefined;
    isLocked: boolean;
    isGroupSubmission: boolean;
    parentStepId: string | null;
    isActivityClosed: boolean;
    quizContent: unknown;
};

type StepSubmissionsPanelProps = {
    stepId: string;
    activityId?: string;
    moduleId?: string;
    visible?: boolean;
    allowedTypes?: StepSubmissionsPanelType[];
    invalidTypeError?: string;
    missingContextError?: string;
    loadingLabel?: string;
};

export function StepSubmissionsPanel({
    stepId,
    activityId,
    moduleId,
    visible = true,
    allowedTypes,
    invalidTypeError,
    missingContextError = "No se pudo cargar el contexto de actividad para mostrar entregas.",
    loadingLabel = "Cargando entregas...",
}: StepSubmissionsPanelProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [students, setStudents] = useState<{ student_id: string; name: string }[]>([]);
    const [baseStepData, setBaseStepData] = useState<StepSubmissionsBaseData | null>(null);
    const [rows, setRows] = useState<StepSubmissionRow[]>([]);

    const loadResponses = useCallback(async () => {
        if (!activityId || !moduleId) {
            setError(missingContextError);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const result = await getStepSubmissionsContext(stepId, activityId, moduleId, {
                allowedTypes,
                invalidTypeError,
            });
            if (result.error || !result.context) {
                setError(result.error ?? "No se pudieron cargar las entregas.");
                setIsLoading(false);
                return;
            }

            setStudents(result.context.students);
            setBaseStepData(result.context.stepData);
            setRows(result.context.rows);
            setIsLoading(false);
        } catch {
            setError("No se pudieron cargar las entregas.");
            setIsLoading(false);
        }
    }, [activityId, allowedTypes, invalidTypeError, missingContextError, moduleId, stepId]);

    useEffect(() => {
        if (!visible) return;
        loadResponses();
    }, [visible, loadResponses]);

    const stepData = useMemo(() => {
        if (!baseStepData) return null;
        return {
            ...baseStepData,
            rows,
        };
    }, [baseStepData, rows]);

    if (!visible) return null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
                <RefreshCw className="size-4 animate-spin" />
                {loadingLabel}
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200/90">
                {error}
            </div>
        );
    }

    if (!activityId || !moduleId || !stepData) return null;

    return (
        <CorrectionDetail
            stepId={stepId}
            activityId={activityId}
            moduleId={moduleId}
            stepData={stepData}
            onSubmissionsChange={setRows}
            allSubmissions={rows}
            onRefetchSubmissions={loadResponses}
            students={students}
        />
    );
}

export { STEP_SUBMISSIONS_PANEL_TYPES };
