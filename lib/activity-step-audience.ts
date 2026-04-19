import { STEP_AUDIENCE_MODE, type ActivityPhaseWithSteps, type ActivityStepWithClientState, type StepAudienceMode } from "@/types/activity";

export type StudentAudienceContext = {
    studentId?: string | null;
    groupId?: string | null;
    bypassAudience?: boolean;
};

export type StepAudienceLike = {
    id: string;
    parent_step_id?: string | null;
    is_visible?: boolean | null;
    audience_mode?: StepAudienceMode | null;
    visible_student_ids?: string[] | null;
    visible_group_ids?: string[] | null;
    inherit_audience_from_parent?: boolean | null;
    children?: StepAudienceLike[];
};

export type EffectiveStepAudience = {
    mode: StepAudienceMode;
    visibleStudentIds: string[];
    visibleGroupIds: string[];
    inheritFromParent: boolean;
};

function normalizeAudienceMode(value: StepAudienceMode | string | null | undefined): StepAudienceMode {
    if (value === STEP_AUDIENCE_MODE.RESTRICTED) return STEP_AUDIENCE_MODE.RESTRICTED;
    return STEP_AUDIENCE_MODE.ALL;
}

function normalizeUuidList(values: string[] | null | undefined): string[] {
    if (!Array.isArray(values)) return [];
    return Array.from(
        new Set(
            values
                .filter((value): value is string => typeof value === "string")
                .map((value) => value.trim())
                .filter((value) => value.length > 0),
        ),
    );
}

export function normalizeStepAudience(step: StepAudienceLike): EffectiveStepAudience {
    return {
        mode: normalizeAudienceMode(step.audience_mode),
        visibleStudentIds: normalizeUuidList(step.visible_student_ids),
        visibleGroupIds: normalizeUuidList(step.visible_group_ids),
        inheritFromParent: step.inherit_audience_from_parent === true,
    };
}

export function buildStepLookupFromPhases(phases: ActivityPhaseWithSteps[]): Map<string, StepAudienceLike> {
    const lookup = new Map<string, StepAudienceLike>();

    const walk = (step: StepAudienceLike) => {
        lookup.set(step.id, step);
        for (const child of step.children ?? []) walk(child);
    };

    for (const phase of phases) {
        for (const step of phase.steps ?? []) walk(step);
    }

    return lookup;
}

export function resolveEffectiveStepAudience(
    step: StepAudienceLike,
    stepById: Map<string, StepAudienceLike>,
    visited: Set<string> = new Set(),
): EffectiveStepAudience {
    const ownAudience = normalizeStepAudience(step);
    const parentId = step.parent_step_id ?? null;

    if (!ownAudience.inheritFromParent || !parentId) return ownAudience;
    if (visited.has(step.id)) return ownAudience;

    const parent = stepById.get(parentId);
    if (!parent) return ownAudience;

    const nextVisited = new Set(visited);
    nextVisited.add(step.id);
    return resolveEffectiveStepAudience(parent, stepById, nextVisited);
}

function isAudienceAllowed(
    audience: EffectiveStepAudience,
    context: StudentAudienceContext,
): boolean {
    if (context.bypassAudience) return true;
    if (audience.mode === STEP_AUDIENCE_MODE.ALL) return true;

    const studentId = context.studentId ?? null;
    const groupId = context.groupId ?? null;
    if (!studentId) return false;

    if (audience.visibleStudentIds.includes(studentId)) return true;
    if (groupId && audience.visibleGroupIds.includes(groupId)) return true;

    return false;
}

export function isStepVisibleForStudent(
    step: StepAudienceLike,
    context: StudentAudienceContext,
    stepById: Map<string, StepAudienceLike>,
    ancestryGuard: Set<string> = new Set(),
): boolean {
    if (step.is_visible === false) return false;

    if (ancestryGuard.has(step.id)) return false;

    const parentId = step.parent_step_id ?? null;
    if (parentId) {
        const parent = stepById.get(parentId);
        if (parent) {
            const nextGuard = new Set(ancestryGuard);
            nextGuard.add(step.id);
            if (!isStepVisibleForStudent(parent, context, stepById, nextGuard)) return false;
        }
    }

    const effectiveAudience = resolveEffectiveStepAudience(step, stepById);
    return isAudienceAllowed(effectiveAudience, context);
}

export function filterPhasesByStepAudience(
    phases: ActivityPhaseWithSteps[],
    context: StudentAudienceContext,
): ActivityPhaseWithSteps[] {
    const stepLookup = buildStepLookupFromPhases(phases);

    const filterStep = (step: ActivityStepWithClientState): ActivityStepWithClientState | null => {
        if (!isStepVisibleForStudent(step, context, stepLookup)) return null;

        const children = ((step.children ?? []) as ActivityStepWithClientState[])
            .map((child) => filterStep(child))
            .filter((child): child is ActivityStepWithClientState => child !== null);

        return { ...step, children };
    };

    return phases.map((phase) => ({
        ...phase,
        steps: (phase.steps ?? [])
            .map((step) => filterStep(step))
            .filter((step): step is ActivityStepWithClientState => step !== null),
    }));
}
