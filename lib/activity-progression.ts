import {
    ACTIVITY_NAVIGATION_MODE,
    COMPLETION_MODE,
    STEP_XP_AWARD_TRIGGER,
    UNIT_ACTIVITY_NAVIGATION_MODE,
    UNIT_ACTIVITY_UNLOCK_RULE,
    type ActivityNavigationMode,
    type ActivityPhaseWithSteps,
    type ActivityStepType,
    type ActivitySubmission,
    type CompletionMode,
    type StepXpAwardTrigger,
    type UnitActivityNavigationMode,
    type UnitActivityUnlockRule,
} from "@/types/activity";
import {
    buildStepLookupFromPhases,
    isStepVisibleForStudent,
    type StudentAudienceContext,
} from "@/lib/activity-step-audience";
import { MAP_ROUTE_TYPE, parseMapNodeId, toActivityNodeId, toFlowNodeId } from "@/types/unit-map";

const SUBMISSION_STEP_TYPE = {
    DELIVERABLE: "deliverable",
    FILE_UPLOAD: "file_upload",
    QUIZ: "quiz",
    SELF_EVALUATION: "self_evaluation",
    PEER_EVALUATION: "peer_evaluation",
} as const;

const PASSIVE_STEP_TYPE = {
    THEORY: "theory",
    PRESENTATION: "presentation",
    RESOURCE: "resource",
    ANIMATION: "animation",
} as const;

const SUBMISSION_STEP_TYPES = new Set<ActivityStepType>(Object.values(SUBMISSION_STEP_TYPE));
const PASSIVE_STEP_TYPES = new Set<ActivityStepType>(Object.values(PASSIVE_STEP_TYPE));

export type ProgressActivityLike = {
    id: string;
    order_index?: number | null;
    navigation_mode?: ActivityNavigationMode | null;
    activity_phases?: ActivityPhaseWithSteps[] | null;
};

export type ProgressConnectionLike = {
    source_activity_id?: string | null;
    target_activity_id?: string | null;
    source_map_node_id?: string | null;
    target_map_node_id?: string | null;
    route_type?: string | null;
};

export type StepCompletionRecordLike = {
    step_id: string;
};

export type ActivityProgressSnapshot = {
    viewedStepIds: Set<string>;
    completedStepIds: Set<string>;
    submissionsByStepId: Map<string, ActivitySubmission>;
};

export type StepCompletionRule = "none" | "view" | "complete" | "submit" | "grade";

export type StepProgressState = {
    tracked: boolean;
    completed: boolean;
    rule: StepCompletionRule;
};

export type ActivityProgressSummary = {
    trackedSteps: number;
    completedTrackedSteps: number;
    requiredSteps: number;
    completedRequiredSteps: number;
    completionPercentage: number;
    allRequiredStepsCompleted: boolean;
    allTrackedStepsCompleted: boolean;
};

function flattenVisibleSteps(
    phases: ActivityPhaseWithSteps[],
    audienceContext?: StudentAudienceContext,
): ActivityPhaseWithSteps["steps"] {
    const stepLookup = buildStepLookupFromPhases(phases);
    const visibleSteps: ActivityPhaseWithSteps["steps"] = [];

    const pushIfVisible = (step: ActivityPhaseWithSteps["steps"][number]) => {
        if (audienceContext && !isStepVisibleForStudent(step, audienceContext, stepLookup)) {
            return;
        }

        visibleSteps.push(step);

        for (const child of step.children ?? []) {
            pushIfVisible(child);
        }
    };

    for (const phase of phases) {
        for (const step of phase.steps ?? []) {
            pushIfVisible(step);
        }
    }

    return visibleSteps;
}

export function isSubmissionStepType(stepType?: string | null): stepType is ActivityStepType {
    if (!stepType) return false;
    return SUBMISSION_STEP_TYPES.has(stepType as ActivityStepType);
}

export function isPassiveStepType(stepType?: string | null): stepType is ActivityStepType {
    if (!stepType) return false;
    return PASSIVE_STEP_TYPES.has(stepType as ActivityStepType);
}

export function getStepXpAwardTrigger(step: {
    type: ActivityStepType;
    xp_award_trigger?: StepXpAwardTrigger | null;
}): StepXpAwardTrigger {
    if (!isSubmissionStepType(step.type)) {
        return STEP_XP_AWARD_TRIGGER.GRADE;
    }

    return step.xp_award_trigger ?? STEP_XP_AWARD_TRIGGER.GRADE;
}

function isTrackedCompletionMode(mode?: CompletionMode | null): boolean {
    return mode === COMPLETION_MODE.REQUIRED || mode === COMPLETION_MODE.VIEWABLE;
}

function isSubmissionCompletedForTrigger(
    submission: ActivitySubmission | undefined,
    trigger: StepXpAwardTrigger,
): boolean {
    if (!submission?.status) return false;

    if (trigger === STEP_XP_AWARD_TRIGGER.SUBMIT) {
        return submission.status === "submitted"
            || submission.status === "graded"
            || submission.status === "published";
    }

    return submission.status === "graded" || submission.status === "published";
}

export function getStepCompletionRule(step: {
    type: ActivityStepType;
    completion_mode?: CompletionMode | null;
    xp_award_trigger?: StepXpAwardTrigger | null;
}): StepCompletionRule {
    if (step.completion_mode === COMPLETION_MODE.NONE || !step.completion_mode) {
        return "none";
    }

    if (step.completion_mode === COMPLETION_MODE.VIEWABLE) {
        return "view";
    }

    if (isSubmissionStepType(step.type)) {
        return getStepXpAwardTrigger(step);
    }

    return "complete";
}

export function getStepProgressState(
    step: {
        id: string;
        type: ActivityStepType;
        completion_mode?: CompletionMode | null;
        xp_award_trigger?: StepXpAwardTrigger | null;
    },
    snapshot: ActivityProgressSnapshot,
): StepProgressState {
    const rule = getStepCompletionRule(step);

    if (!isTrackedCompletionMode(step.completion_mode)) {
        return {
            tracked: false,
            completed: false,
            rule,
        };
    }

    if (rule === "view") {
        return {
            tracked: true,
            completed: snapshot.viewedStepIds.has(step.id),
            rule,
        };
    }

    if (rule === "complete") {
        return {
            tracked: true,
            completed: snapshot.completedStepIds.has(step.id),
            rule,
        };
    }

    if (rule === "submit" || rule === "grade") {
        return {
            tracked: true,
            completed: isSubmissionCompletedForTrigger(
                snapshot.submissionsByStepId.get(step.id),
                rule === "submit" ? STEP_XP_AWARD_TRIGGER.SUBMIT : STEP_XP_AWARD_TRIGGER.GRADE,
            ),
            rule,
        };
    }

    return {
        tracked: false,
        completed: false,
        rule: "none",
    };
}

export function createActivityProgressSnapshot({
    stepViews,
    stepCompletions,
    submissions,
}: {
    stepViews?: StepCompletionRecordLike[] | null;
    stepCompletions?: StepCompletionRecordLike[] | null;
    submissions?: ActivitySubmission[] | null;
}): ActivityProgressSnapshot {
    return {
        viewedStepIds: new Set((stepViews ?? []).map((record) => record.step_id)),
        completedStepIds: new Set((stepCompletions ?? []).map((record) => record.step_id)),
        submissionsByStepId: new Map((submissions ?? []).map((submission) => [submission.step_id, submission])),
    };
}

export function getUnlockedStepIdsForActivity({
    phases,
    navigationMode,
    snapshot,
    audienceContext,
}: {
    phases: ActivityPhaseWithSteps[];
    navigationMode?: ActivityNavigationMode | null;
    snapshot: ActivityProgressSnapshot;
    audienceContext?: StudentAudienceContext;
}): Set<string> {
    const visibleSteps = flattenVisibleSteps(phases, audienceContext);
    const unlockedStepIds = new Set<string>();

    if ((navigationMode ?? ACTIVITY_NAVIGATION_MODE.FREE) !== ACTIVITY_NAVIGATION_MODE.STRICT) {
        for (const step of visibleSteps) unlockedStepIds.add(step.id);
        return unlockedStepIds;
    }

    let sequenceUnlocked = true;

    for (const step of visibleSteps) {
        if (sequenceUnlocked) {
            unlockedStepIds.add(step.id);
        }

        const state = getStepProgressState(step, snapshot);
        if (sequenceUnlocked && state.tracked && !state.completed) {
            sequenceUnlocked = false;
        }
    }

    return unlockedStepIds;
}

export function getActivityProgressSummary({
    phases,
    snapshot,
    audienceContext,
}: {
    phases: ActivityPhaseWithSteps[];
    snapshot: ActivityProgressSnapshot;
    audienceContext?: StudentAudienceContext;
}): ActivityProgressSummary {
    const visibleSteps = flattenVisibleSteps(phases, audienceContext);

    let trackedSteps = 0;
    let completedTrackedSteps = 0;
    let requiredSteps = 0;
    let completedRequiredSteps = 0;

    for (const step of visibleSteps) {
        const state = getStepProgressState(step, snapshot);
        if (!state.tracked) continue;

        trackedSteps += 1;
        if (state.completed) {
            completedTrackedSteps += 1;
        }

        if (step.completion_mode === COMPLETION_MODE.REQUIRED) {
            requiredSteps += 1;
            if (state.completed) {
                completedRequiredSteps += 1;
            }
        }
    }

    const completionPercentage = trackedSteps === 0
        ? 100
        : Math.round((completedTrackedSteps / trackedSteps) * 100);

    return {
        trackedSteps,
        completedTrackedSteps,
        requiredSteps,
        completedRequiredSteps,
        completionPercentage,
        allRequiredStepsCompleted: requiredSteps === 0 || requiredSteps === completedRequiredSteps,
        allTrackedStepsCompleted: trackedSteps > 0 && trackedSteps === completedTrackedSteps,
    };
}

export function getActivityPrerequisiteMap(
    activities: ProgressActivityLike[],
    connections: ProgressConnectionLike[],
): Map<string, string[]> {
    const sortedActivities = [...activities].sort((left, right) => (left.order_index ?? 0) - (right.order_index ?? 0));
    const incomingByNodeId = new Map<string, string[]>();

    for (const connection of connections) {
        if ((connection.route_type ?? MAP_ROUTE_TYPE.REQUIRED) !== MAP_ROUTE_TYPE.REQUIRED) {
            continue;
        }

        const sourceNodeId = connection.source_map_node_id
            ? toFlowNodeId(connection.source_map_node_id)
            : connection.source_activity_id
                ? toActivityNodeId(connection.source_activity_id)
                : null;
        const targetNodeId = connection.target_map_node_id
            ? toFlowNodeId(connection.target_map_node_id)
            : connection.target_activity_id
                ? toActivityNodeId(connection.target_activity_id)
                : null;

        if (!sourceNodeId || !targetNodeId) continue;

        const currentIncoming = incomingByNodeId.get(targetNodeId) ?? [];
        currentIncoming.push(sourceNodeId);
        incomingByNodeId.set(targetNodeId, currentIncoming);
    }

    const prerequisitesByActivityId = new Map<string, string[]>();

    sortedActivities.forEach((activity, index) => {
        const targetNodeId = toActivityNodeId(activity.id);
        const queue = [...(incomingByNodeId.get(targetNodeId) ?? [])];
        const visitedNodes = new Set<string>();
        const prerequisiteIds = new Set<string>();

        while (queue.length > 0) {
            const currentNodeId = queue.shift();
            if (!currentNodeId || visitedNodes.has(currentNodeId)) continue;

            visitedNodes.add(currentNodeId);

            const node = parseMapNodeId(currentNodeId);
            if (node.kind === "activity") {
                prerequisiteIds.add(node.id);
                continue;
            }

            for (const previousNodeId of incomingByNodeId.get(currentNodeId) ?? []) {
                queue.push(previousNodeId);
            }
        }

        if (prerequisiteIds.size === 0 && index > 0) {
            prerequisitesByActivityId.set(activity.id, [sortedActivities[index - 1].id]);
            return;
        }

        prerequisitesByActivityId.set(activity.id, [...prerequisiteIds]);
    });

    return prerequisitesByActivityId;
}

export function getUnlockedActivityIdsForUnit({
    activities,
    connections,
    summariesByActivityId,
    navigationMode,
    unlockRule,
    unlockThreshold,
}: {
    activities: ProgressActivityLike[];
    connections: ProgressConnectionLike[];
    summariesByActivityId: Map<string, ActivityProgressSummary>;
    navigationMode?: UnitActivityNavigationMode | null;
    unlockRule?: UnitActivityUnlockRule | null;
    unlockThreshold?: number | null;
}): Set<string> {
    const unlockedActivityIds = new Set<string>();
    const sortedActivities = [...activities].sort((left, right) => (left.order_index ?? 0) - (right.order_index ?? 0));

    if ((navigationMode ?? UNIT_ACTIVITY_NAVIGATION_MODE.FREE) !== UNIT_ACTIVITY_NAVIGATION_MODE.RESTRICTED) {
        for (const activity of sortedActivities) unlockedActivityIds.add(activity.id);
        return unlockedActivityIds;
    }

    const prerequisitesByActivityId = getActivityPrerequisiteMap(sortedActivities, connections);
    const resolvedUnlockRule = unlockRule ?? UNIT_ACTIVITY_UNLOCK_RULE.REQUIRED_STEPS;
    const resolvedUnlockThreshold = Math.min(Math.max(unlockThreshold ?? 100, 1), 100);

    const isActivitySatisfied = (activityId: string) => {
        const summary = summariesByActivityId.get(activityId);
        if (!summary) return false;

        if (resolvedUnlockRule === UNIT_ACTIVITY_UNLOCK_RULE.PERCENTAGE) {
            return summary.completionPercentage >= resolvedUnlockThreshold;
        }

        return summary.allRequiredStepsCompleted;
    };

    for (let index = 0; index < sortedActivities.length; index += 1) {
        const activity = sortedActivities[index];
        const prerequisites = prerequisitesByActivityId.get(activity.id) ?? [];

        if (prerequisites.length === 0) {
            unlockedActivityIds.add(activity.id);
            continue;
        }

        if (prerequisites.every((prerequisiteId) => isActivitySatisfied(prerequisiteId))) {
            unlockedActivityIds.add(activity.id);
        }
    }

    return unlockedActivityIds;
}
