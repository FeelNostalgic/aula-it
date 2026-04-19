"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getQuizStepResponsesContext } from "@/app/activities/[id]/edit/actions";
import type { StepSubmissionRow } from "@/app/dashboard/units/[id]/actions";
import { CorrectionDetail } from "@/components/dashboard/units/unit-evaluation-tab";
import type { QuizContent } from "@/types/activity";

type QuizResponsesPanelProps = {
    stepId: string;
    activityId?: string;
    moduleId?: string;
    content: QuizContent;
    visible: boolean;
};

type QuizResponsesStepData = {
    stepTitle: string;
    stepType: string;
    orderIndex: number;
    deliveryMode: "manual" | "teacher_copy" | undefined;
    isLocked: boolean;
    isGroupSubmission: boolean;
    parentStepId: string | null;
    isActivityClosed: boolean;
    quizContent: QuizContent | null;
};

export function QuizResponsesPanel({ stepId, activityId, moduleId, content, visible }: QuizResponsesPanelProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [students, setStudents] = useState<{ student_id: string; name: string }[]>([]);
    const [baseStepData, setBaseStepData] = useState<QuizResponsesStepData | null>(null);
    const [rows, setRows] = useState<StepSubmissionRow[]>([]);

    const loadResponses = useCallback(async () => {
        if (!activityId || !moduleId) {
            setError("No se pudo cargar el contexto de actividad para mostrar respuestas.");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const result = await getQuizStepResponsesContext(stepId, activityId, moduleId);
            if (result.error || !result.context) {
                setError(result.error ?? "No se pudieron cargar las respuestas.");
                setIsLoading(false);
                return;
            }

            setStudents(result.context.students);
            setBaseStepData(result.context.stepData);
            setRows(result.context.rows);
            setIsLoading(false);
        } catch {
            setError("No se pudieron cargar las respuestas.");
            setIsLoading(false);
        }
    }, [activityId, moduleId, stepId]);

    useEffect(() => {
        if (!visible) return;
        loadResponses();
    }, [visible, loadResponses]);

    useEffect(() => {
        if (!visible) return;
        if (content.quizMode === "google_form") {
            toast.error("La pestaña Respuestas solo está disponible en quiz built-in.");
        }
    }, [content.quizMode, visible]);

    const stepData = useMemo(() => {
        if (!baseStepData) return null;
        return {
            ...baseStepData,
            rows,
        };
    }, [baseStepData, rows]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted">
                <RefreshCw className="size-4 animate-spin" />
                Cargando respuestas...
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
