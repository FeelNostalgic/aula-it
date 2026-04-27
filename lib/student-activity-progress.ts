import { createAdminClient } from "@/utils/supabase/admin";
import { filterPhasesByStepAudience, type StudentAudienceContext } from "@/lib/activity-step-audience";
import { normalizeNestedActivityPhases } from "@/lib/activity-step-tree";
import {
    createActivityProgressSnapshot,
    getActivityProgressSummary,
    getUnlockedActivityIdsForUnit,
    getUnlockedStepIdsForActivity,
    type ActivityProgressSnapshot,
    type ProgressActivityLike,
    type ProgressConnectionLike,
    type ActivityProgressSummary,
} from "@/lib/activity-progression";
import type { ActivityNavigationMode, ActivityPhaseWithSteps, ActivitySubmission } from "@/types/activity";

export type StudentUnitProgressActivity = {
    id: string;
    status: string | null;
    order_index: number | null;
    navigation_mode: ActivityNavigationMode | null;
    phases: ActivityPhaseWithSteps[];
};

export type StudentUnitProgressContext = {
    unit: {
        id: string;
        module_id: string;
        view_type: string | null;
        activity_navigation_mode: string | null;
        activity_unlock_rule: string | null;
        activity_unlock_threshold: number | null;
    };
    activities: StudentUnitProgressActivity[];
    audienceContext: StudentAudienceContext;
    groupId: string | null;
    snapshot: ActivityProgressSnapshot;
    stepViews: { step_id: string }[];
    stepCompletions: { step_id: string }[];
    submissions: ActivitySubmission[];
    submissionsMap: Record<string, ActivitySubmission>;
    summariesByActivityId: Map<string, ActivityProgressSummary>;
    unlockedActivityIds: Set<string>;
    connections: ProgressConnectionLike[];
};

async function getStudentGroupIdInModule(moduleId: string, userId: string): Promise<string | null> {
    const admin = createAdminClient();

    const { data: moduleGroups } = await admin
        .from("module_groups")
        .select("id")
        .eq("module_id", moduleId)
        .eq("status", "active");

    const moduleGroupIds = (moduleGroups ?? []).map((group: any) => group.id as string);
    if (moduleGroupIds.length === 0) return null;

    const { data: memberRow } = await admin
        .from("module_group_members")
        .select("group_id")
        .eq("student_id", userId)
        .in("group_id", moduleGroupIds)
        .maybeSingle();

    return memberRow?.group_id ?? null;
}

function normalizeActivityPhases(rawPhases: any[] | null | undefined): ActivityPhaseWithSteps[] {
    return normalizeNestedActivityPhases((rawPhases ?? []) as any);
}

export async function loadStudentUnitProgressContext(params: {
    unitId: string;
    userId: string;
    moduleId?: string | null;
    groupId?: string | null;
}): Promise<StudentUnitProgressContext | null> {
    const admin = createAdminClient();

    const { data: unitRow } = await admin
        .from("units")
        .select("id, module_id, view_type, activity_navigation_mode, activity_unlock_rule, activity_unlock_threshold")
        .eq("id", params.unitId)
        .maybeSingle();

    if (!unitRow?.id || !unitRow.module_id) {
        return null;
    }

    const groupId = params.groupId ?? await getStudentGroupIdInModule(params.moduleId ?? unitRow.module_id, params.userId);
    const audienceContext: StudentAudienceContext = {
        studentId: params.userId,
        groupId,
        bypassAudience: false,
    };

    const { data: rawActivities } = await admin
        .from("activities")
        .select(`
            id,
            status,
            order_index,
            navigation_mode,
            phases:activity_phases(
                id,
                activity_id,
                title,
                order_index,
                steps:activity_steps(*)
            )
        `)
        .eq("unit_id", params.unitId)
        .order("order_index", { ascending: true });

    const { data: connections } = await admin
        .from("activity_connections")
        .select("source_activity_id, target_activity_id, source_map_node_id, target_map_node_id, route_type")
        .eq("unit_id", params.unitId);

    const activities: StudentUnitProgressActivity[] = (rawActivities ?? []).map((activity: any) => ({
        id: activity.id,
        status: activity.status ?? null,
        order_index: activity.order_index ?? 0,
        navigation_mode: activity.navigation_mode ?? null,
        phases: normalizeActivityPhases(activity.phases),
    }));

    const allStepIds = activities.flatMap((activity) =>
        activity.phases.flatMap((phase) =>
            phase.steps.flatMap((step) => [step.id, ...(step.children ?? []).map((child) => child.id)]),
        ),
    );

    const [stepViewsResult, stepCompletionsResult, individualSubmissionsResult, groupSubmissionsResult] = await Promise.all([
        allStepIds.length > 0
            ? admin.from("step_views").select("step_id").eq("student_id", params.userId).in("step_id", allStepIds)
            : Promise.resolve({ data: [] as { step_id: string }[], error: null }),
        allStepIds.length > 0
            ? admin.from("step_completions").select("step_id").eq("student_id", params.userId).in("step_id", allStepIds)
            : Promise.resolve({ data: [] as { step_id: string }[], error: null }),
        allStepIds.length > 0
            ? admin.from("activity_submissions").select("*").eq("student_id", params.userId).in("step_id", allStepIds)
            : Promise.resolve({ data: [] as ActivitySubmission[], error: null }),
        allStepIds.length > 0 && groupId
            ? admin.from("activity_submissions").select("*").eq("group_id", groupId).in("step_id", allStepIds)
            : Promise.resolve({ data: [] as ActivitySubmission[], error: null }),
    ]);

    const submissionsMap = new Map<string, ActivitySubmission>();
    for (const submission of (groupSubmissionsResult.data ?? []) as ActivitySubmission[]) {
        submissionsMap.set(submission.step_id, submission);
    }
    for (const submission of (individualSubmissionsResult.data ?? []) as ActivitySubmission[]) {
        submissionsMap.set(submission.step_id, submission);
    }

    const snapshot = createActivityProgressSnapshot({
        stepViews: stepViewsResult.data ?? [],
        stepCompletions: stepCompletionsResult.data ?? [],
        submissions: [...submissionsMap.values()],
    });

    const summariesByActivityId = new Map<string, ActivityProgressSummary>();
    for (const activity of activities) {
        summariesByActivityId.set(
            activity.id,
            getActivityProgressSummary({
                phases: activity.phases,
                snapshot,
                audienceContext,
            }),
        );
    }

    const unlockedActivityIds = getUnlockedActivityIdsForUnit({
        activities: activities as ProgressActivityLike[],
        connections: (connections ?? []) as ProgressConnectionLike[],
        summariesByActivityId,
        navigationMode: unitRow.activity_navigation_mode,
        unlockRule: unitRow.activity_unlock_rule,
        unlockThreshold: unitRow.activity_unlock_threshold,
    });

    return {
        unit: {
            id: unitRow.id,
            module_id: unitRow.module_id,
            view_type: unitRow.view_type ?? null,
            activity_navigation_mode: unitRow.activity_navigation_mode ?? null,
            activity_unlock_rule: unitRow.activity_unlock_rule ?? null,
            activity_unlock_threshold: unitRow.activity_unlock_threshold ?? null,
        },
        activities,
        audienceContext,
        groupId,
        snapshot,
        stepViews: (stepViewsResult.data ?? []) as { step_id: string }[],
        stepCompletions: (stepCompletionsResult.data ?? []) as { step_id: string }[],
        submissions: [...submissionsMap.values()],
        submissionsMap: Object.fromEntries(submissionsMap),
        summariesByActivityId,
        unlockedActivityIds,
        connections: (connections ?? []) as ProgressConnectionLike[],
    };
}

export function getStudentActivityContext(
    context: StudentUnitProgressContext,
    activityId: string,
) {
    return context.activities.find((activity) => activity.id === activityId) ?? null;
}

export function isStudentActivityUnlocked(
    context: StudentUnitProgressContext,
    activityId: string,
): boolean {
    return context.unlockedActivityIds.has(activityId);
}

export function isStudentActivityOpen(
    context: StudentUnitProgressContext,
    activityId: string,
): boolean {
    const activity = getStudentActivityContext(context, activityId);
    if (!activity) return false;

    const isPublished = activity.status === "published" || activity.status === "active";
    return isPublished && isStudentActivityUnlocked(context, activityId);
}

export function getStudentUnlockedStepIdsForActivity(
    context: StudentUnitProgressContext,
    activityId: string,
): Set<string> {
    const activity = getStudentActivityContext(context, activityId);
    if (!activity) return new Set<string>();

    return getUnlockedStepIdsForActivity({
        phases: activity.phases,
        navigationMode: activity.navigation_mode,
        snapshot: context.snapshot,
        audienceContext: context.audienceContext,
    });
}

export function getStudentVisiblePhasesForActivity(
    context: StudentUnitProgressContext,
    activityId: string,
): ActivityPhaseWithSteps[] {
    const activity = getStudentActivityContext(context, activityId);
    if (!activity) return [];
    return filterPhasesByStepAudience(activity.phases, context.audienceContext);
}
