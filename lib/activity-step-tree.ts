import type { ActivityPhaseWithSteps, ActivityStepWithClientState } from "@/types/activity";

const EVAL_STEP_TYPES = ['self_evaluation', 'peer_evaluation', 'quiz'] as const;
const PARENT_STEP_TYPES = ['deliverable', 'file_upload'] as const;

export interface FlatStep {
    step: ActivityStepWithClientState;
    depth: 0 | 1;
    parentId: string | null;
    flatIndex: number;
}

export interface ProjectedPosition {
    depth: 0 | 1;
    parentId: string | null;
    overFlatIndex: number;
    phaseId: string;
}

/**
 * Flattens a phase's step tree into an ordered array.
 * Root steps appear at depth=0; their children appear immediately after at depth=1.
 *
 * Input:  [A(children:[X,Y]), B, C(children:[Z])]
 * Output: [A(0), X(1), Y(1), B(0), C(0), Z(1)]
 */
export function flattenPhaseSteps(phase: ActivityPhaseWithSteps): FlatStep[] {
    const result: FlatStep[] = [];
    let idx = 0;
    for (const step of phase.steps) {
        result.push({ step, depth: 0, parentId: null, flatIndex: idx++ });
        for (const child of step.children ?? []) {
            result.push({ step: child as ActivityStepWithClientState, depth: 1, parentId: step.id, flatIndex: idx++ });
        }
    }
    return result;
}

/**
 * Given the current drag state, projects where the dragged item would land and at what depth.
 *
 * - delta.x < -50px → try to move to depth 0 (unindent)
 * - delta.x > +50px → try to move to depth 1 (indent)
 * - depth=1 only allowed if: dragged type ∈ EVAL_STEP_TYPES AND nearest root above ∈ PARENT_STEP_TYPES
 */
export function getProjectedPosition(
    flatItems: FlatStep[],
    activeId: string,
    overId: string,
    deltaX: number,
    phaseId: string,
): ProjectedPosition | null {
    const activeIndex = flatItems.findIndex(f => `step-${f.step.id}` === activeId);
    const overIndex = flatItems.findIndex(f => `step-${f.step.id}` === overId);

    if (activeIndex === -1 || overIndex === -1) return null;

    const activeFlat = flatItems[activeIndex];
    const draggedStep = activeFlat.step;

    // Determine intended depth from horizontal offset (threshold 50px, 1 level per 20px)
    const depthOffset = Math.abs(deltaX) >= 50 ? Math.sign(deltaX) : 0;
    const rawDepth = Math.max(0, Math.min(1, activeFlat.depth + depthOffset)) as 0 | 1;

    let clampedDepth: 0 | 1 = rawDepth;
    let parentId: string | null = null;

    if (clampedDepth === 1) {
        if (!EVAL_STEP_TYPES.includes(draggedStep.type as any)) {
            clampedDepth = 0;
        } else {
            // Find the nearest root step above the over position (excluding the dragged item)
            let nearestRoot: FlatStep | null = null;
            for (let i = overIndex; i >= 0; i--) {
                if (flatItems[i].step.id === draggedStep.id) continue;
                if (flatItems[i].depth === 0) {
                    nearestRoot = flatItems[i];
                    break;
                }
            }
            if (nearestRoot && PARENT_STEP_TYPES.includes(nearestRoot.step.type as any)) {
                parentId = nearestRoot.step.id;
            } else {
                clampedDepth = 0;
            }
        }
    }

    return { depth: clampedDepth, parentId, overFlatIndex: overIndex, phaseId };
}

/** Shallow equality check for ProjectedPosition to avoid unnecessary re-renders. */
export function projectedEqual(a: ProjectedPosition | null, b: ProjectedPosition | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return a.depth === b.depth && a.parentId === b.parentId && a.overFlatIndex === b.overFlatIndex && a.phaseId === b.phaseId;
}

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
