import { describe, expect, it } from "vitest";
import {
  ACTIVITY_NAVIGATION_MODE,
  COMPLETION_MODE,
  STEP_XP_AWARD_TRIGGER,
  UNIT_ACTIVITY_NAVIGATION_MODE,
  UNIT_ACTIVITY_UNLOCK_RULE,
  type ActivityPhaseWithSteps,
} from "@/types/activity";
import {
  createActivityProgressSnapshot,
  getActivityProgressSummary,
  getStepProgressState,
  getUnlockedActivityIdsForUnit,
  getUnlockedStepIdsForActivity,
} from "@/lib/activity-progression";
import { createMockPhase, createMockStep, createMockSubmission } from "../helpers/fixtures";

function buildPhases(steps: ReturnType<typeof createMockStep>[]): ActivityPhaseWithSteps[] {
  return [
    {
      ...createMockPhase(),
      steps: steps.map((step) => ({ ...step, content: step.content as any, children: [] })),
    },
  ];
}

describe("activity progression", () => {
  it("completes viewable steps only after the explicit view mark", () => {
    const step = createMockStep({
      id: "step-view",
      type: "theory",
      completion_mode: COMPLETION_MODE.VIEWABLE,
      xp: 25,
    });

    const pendingState = getStepProgressState(
      step as any,
      createActivityProgressSnapshot({ stepViews: [], stepCompletions: [], submissions: [] }),
    );
    const completedState = getStepProgressState(
      step as any,
      createActivityProgressSnapshot({ stepViews: [{ step_id: "step-view" }], stepCompletions: [], submissions: [] }),
    );

    expect(pendingState).toMatchObject({ tracked: true, completed: false, rule: "view" });
    expect(completedState).toMatchObject({ tracked: true, completed: true, rule: "view" });
  });

  it("completes passive required steps only after the explicit completion mark", () => {
    const step = createMockStep({
      id: "step-complete",
      type: "resource",
      completion_mode: COMPLETION_MODE.REQUIRED,
      xp: 40,
    });

    const pendingState = getStepProgressState(
      step as any,
      createActivityProgressSnapshot({ stepViews: [], stepCompletions: [], submissions: [] }),
    );
    const completedState = getStepProgressState(
      step as any,
      createActivityProgressSnapshot({ stepViews: [], stepCompletions: [{ step_id: "step-complete" }], submissions: [] }),
    );

    expect(pendingState).toMatchObject({ tracked: true, completed: false, rule: "complete" });
    expect(completedState).toMatchObject({ tracked: true, completed: true, rule: "complete" });
  });

  it("uses submit or grade rules for required submission steps", () => {
    const submitStep = createMockStep({
      id: "step-submit",
      type: "deliverable",
      completion_mode: COMPLETION_MODE.REQUIRED,
      xp_award_trigger: STEP_XP_AWARD_TRIGGER.SUBMIT,
    });
    const gradeStep = createMockStep({
      id: "step-grade",
      type: "quiz",
      completion_mode: COMPLETION_MODE.REQUIRED,
      xp_award_trigger: STEP_XP_AWARD_TRIGGER.GRADE,
    });

    const submittedSnapshot = createActivityProgressSnapshot({
      stepViews: [],
      stepCompletions: [],
      submissions: [
        createMockSubmission({ step_id: "step-submit", status: "submitted" }),
        createMockSubmission({ id: "submission-grade", step_id: "step-grade", status: "submitted" }),
      ],
    });
    const gradedSnapshot = createActivityProgressSnapshot({
      stepViews: [],
      stepCompletions: [],
      submissions: [
        createMockSubmission({ step_id: "step-submit", status: "submitted" }),
        createMockSubmission({ id: "submission-grade", step_id: "step-grade", status: "graded" }),
      ],
    });

    expect(getStepProgressState(submitStep as any, submittedSnapshot)).toMatchObject({ completed: true, rule: "submit" });
    expect(getStepProgressState(gradeStep as any, submittedSnapshot)).toMatchObject({ completed: false, rule: "grade" });
    expect(getStepProgressState(gradeStep as any, gradedSnapshot)).toMatchObject({ completed: true, rule: "grade" });
  });

  it("does not let non-tracked steps block strict navigation", () => {
    const phases = buildPhases([
      createMockStep({
        id: "step-none",
        completion_mode: COMPLETION_MODE.NONE,
      }),
      createMockStep({
        id: "step-view",
        order_index: 1,
        completion_mode: COMPLETION_MODE.VIEWABLE,
      }),
      createMockStep({
        id: "step-required",
        order_index: 2,
        completion_mode: COMPLETION_MODE.REQUIRED,
      }),
    ]);

    const unlockedBefore = getUnlockedStepIdsForActivity({
      phases,
      navigationMode: ACTIVITY_NAVIGATION_MODE.STRICT,
      snapshot: createActivityProgressSnapshot({ stepViews: [], stepCompletions: [], submissions: [] }),
    });
    const unlockedAfterView = getUnlockedStepIdsForActivity({
      phases,
      navigationMode: ACTIVITY_NAVIGATION_MODE.STRICT,
      snapshot: createActivityProgressSnapshot({
        stepViews: [{ step_id: "step-view" }],
        stepCompletions: [],
        submissions: [],
      }),
    });

    expect([...unlockedBefore]).toEqual(["step-none", "step-view"]);
    expect([...unlockedAfterView]).toEqual(["step-none", "step-view", "step-required"]);
  });

  it("keeps completion percentages stable after retries or reopened submissions", () => {
    const step = createMockStep({
      id: "step-grade-once",
      type: "deliverable",
      completion_mode: COMPLETION_MODE.REQUIRED,
      xp_award_trigger: STEP_XP_AWARD_TRIGGER.GRADE,
    });
    const phases = buildPhases([step]);

    const gradedSummary = getActivityProgressSummary({
      phases,
      snapshot: createActivityProgressSnapshot({
        stepViews: [],
        stepCompletions: [],
        submissions: [createMockSubmission({ step_id: "step-grade-once", status: "graded" })],
      }),
    });
    const reopenedSummary = getActivityProgressSummary({
      phases,
      snapshot: createActivityProgressSnapshot({
        stepViews: [],
        stepCompletions: [],
        submissions: [createMockSubmission({ step_id: "step-grade-once", status: "submitted" })],
      }),
    });

    expect(gradedSummary.completionPercentage).toBe(100);
    expect(reopenedSummary.completionPercentage).toBe(0);
  });

  it("unlocks activities by required routes and falls back to order when there are no required edges", () => {
    const activityA = { id: "activity-a", order_index: 0, activity_phases: buildPhases([createMockStep({ id: "step-a", completion_mode: COMPLETION_MODE.REQUIRED })]) };
    const activityB = { id: "activity-b", order_index: 1, activity_phases: buildPhases([createMockStep({ id: "step-b", completion_mode: COMPLETION_MODE.REQUIRED })]) };
    const activityC = { id: "activity-c", order_index: 2, activity_phases: buildPhases([createMockStep({ id: "step-c", completion_mode: COMPLETION_MODE.REQUIRED })]) };

    const summariesByActivityId = new Map([
      ["activity-a", getActivityProgressSummary({
        phases: activityA.activity_phases,
        snapshot: createActivityProgressSnapshot({
          stepViews: [],
          stepCompletions: [{ step_id: "step-a" }],
          submissions: [],
        }),
      })],
      ["activity-b", getActivityProgressSummary({
        phases: activityB.activity_phases,
        snapshot: createActivityProgressSnapshot({ stepViews: [], stepCompletions: [], submissions: [] }),
      })],
      ["activity-c", getActivityProgressSummary({
        phases: activityC.activity_phases,
        snapshot: createActivityProgressSnapshot({ stepViews: [], stepCompletions: [], submissions: [] }),
      })],
    ]);

    const unlocked = getUnlockedActivityIdsForUnit({
      activities: [activityA as any, activityB as any, activityC as any],
      connections: [
        {
          source_activity_id: "activity-a",
          target_activity_id: "activity-b",
          route_type: "required",
        },
      ],
      summariesByActivityId,
      navigationMode: UNIT_ACTIVITY_NAVIGATION_MODE.RESTRICTED,
      unlockRule: UNIT_ACTIVITY_UNLOCK_RULE.REQUIRED_STEPS,
      unlockThreshold: 100,
    });

    expect([...unlocked]).toEqual(["activity-a", "activity-b"]);
  });

  it("distinguishes required-steps unlock from percentage unlock", () => {
    const previousActivity = {
      id: "activity-prev",
      order_index: 0,
      activity_phases: buildPhases([
        createMockStep({ id: "prev-view", completion_mode: COMPLETION_MODE.VIEWABLE, order_index: 0 }),
        createMockStep({ id: "prev-required", completion_mode: COMPLETION_MODE.REQUIRED, order_index: 1 }),
      ]),
    };
    const nextActivity = {
      id: "activity-next",
      order_index: 1,
      activity_phases: buildPhases([createMockStep({ id: "next-step", completion_mode: COMPLETION_MODE.REQUIRED })]),
    };

    const summariesByActivityId = new Map([
      ["activity-prev", getActivityProgressSummary({
        phases: previousActivity.activity_phases,
        snapshot: createActivityProgressSnapshot({
          stepViews: [{ step_id: "prev-view" }],
          stepCompletions: [],
          submissions: [],
        }),
      })],
      ["activity-next", getActivityProgressSummary({
        phases: nextActivity.activity_phases,
        snapshot: createActivityProgressSnapshot({ stepViews: [], stepCompletions: [], submissions: [] }),
      })],
    ]);

    const requiredUnlocks = getUnlockedActivityIdsForUnit({
      activities: [previousActivity as any, nextActivity as any],
      connections: [],
      summariesByActivityId,
      navigationMode: UNIT_ACTIVITY_NAVIGATION_MODE.RESTRICTED,
      unlockRule: UNIT_ACTIVITY_UNLOCK_RULE.REQUIRED_STEPS,
      unlockThreshold: 100,
    });
    const percentageUnlocks = getUnlockedActivityIdsForUnit({
      activities: [previousActivity as any, nextActivity as any],
      connections: [],
      summariesByActivityId,
      navigationMode: UNIT_ACTIVITY_NAVIGATION_MODE.RESTRICTED,
      unlockRule: UNIT_ACTIVITY_UNLOCK_RULE.PERCENTAGE,
      unlockThreshold: 50,
    });

    expect(requiredUnlocks.has("activity-next")).toBe(false);
    expect(percentageUnlocks.has("activity-next")).toBe(true);
  });
});
