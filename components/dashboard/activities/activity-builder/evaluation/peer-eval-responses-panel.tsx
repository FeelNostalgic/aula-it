"use client";

import { PeerEvaluationTeacherView } from "@/components/dashboard/units/peer-evaluation-teacher-view";

type PeerEvalResponsesPanelProps = {
    stepId: string;
    activityId?: string;
    moduleId?: string;
    stepTitle: string;
    isActivityClosed?: boolean;
    visible: boolean;
};

export function PeerEvalResponsesPanel({
    stepId,
    activityId,
    moduleId,
    stepTitle,
    isActivityClosed,
    visible,
}: PeerEvalResponsesPanelProps) {
    if (!visible || !activityId || !moduleId) return null;

    return (
        <PeerEvaluationTeacherView
            stepId={stepId}
            moduleId={moduleId}
            stepTitle={stepTitle}
            activityId={activityId}
            isActivityClosed={isActivityClosed}
        />
    );
}
