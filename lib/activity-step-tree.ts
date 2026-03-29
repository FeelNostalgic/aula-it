import type { ActivityPhaseWithSteps, ActivityStepWithClientState } from "@/types/activity";

type PhaseLike = {
    steps?: ActivityStepWithClientState[];
} & Omit<ActivityPhaseWithSteps, "steps">;

function flattenStepTree(steps: ActivityStepWithClientState[]): ActivityStepWithClientState[] {
    const flat: ActivityStepWithClientState[] = [];

    for (const step of steps ?? []) {
        flat.push(step);

        if (step.children?.length) {
            flat.push(...flattenStepTree(step.children));
        }
    }

    return flat;
}

export function normalizeNestedActivityPhases<TPhase extends PhaseLike>(phases: TPhase[]): ActivityPhaseWithSteps[] {
    const safePhases = phases ?? [];
    const allSteps = safePhases
        .flatMap((phase) => flattenStepTree(phase.steps ?? []))
        .sort((a, b) => a.order_index - b.order_index);

    const stepsById = new Map<string, ActivityStepWithClientState>();
    const childrenMap = new Map<string, ActivityStepWithClientState[]>();

    for (const step of allSteps) {
        const normalizedStep: ActivityStepWithClientState = {
            ...step,
            content: (step.content ?? {}) as ActivityStepWithClientState["content"],
            children: [],
        };

        stepsById.set(normalizedStep.id, normalizedStep);

        if (normalizedStep.parent_step_id) {
            const siblings = childrenMap.get(normalizedStep.parent_step_id) ?? [];
            siblings.push(normalizedStep);
            childrenMap.set(normalizedStep.parent_step_id, siblings);
        }
    }

    return safePhases.map((phase) => {
        const rootSteps = (phase.steps ?? [])
            .map((step) => stepsById.get(step.id) ?? {
                ...step,
                content: (step.content ?? {}) as ActivityStepWithClientState["content"],
                children: [],
            })
            .filter((step) => !step.parent_step_id || !stepsById.has(step.parent_step_id))
            .sort((a, b) => a.order_index - b.order_index)
            .map((step) => ({
                ...step,
                children: (childrenMap.get(step.id) ?? []).sort((a, b) => a.order_index - b.order_index),
            }));

        return {
            ...phase,
            steps: rootSteps,
        };
    });
}
