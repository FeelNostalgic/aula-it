import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  verifyTeacherOwnsActivity,
  verifyTeacherOwnsPhase,
  verifyTeacherOwnsStep,
} from "@/lib/authorization";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import {
  createMockUser,
  createMockPhase,
  createMockStep,
  createMockActivity,
} from "../helpers/fixtures";
import {
  getActivityPhases,
  createPhase,
  createStep,
  updateStepContent,
  updateStepTitle,
  updatePhaseTitle,
  deletePhase,
  deleteStep,
  reorderPhases,
  reorderSteps,
  updateActivitySettings,
  updateActivityStatus,
  updateStepVisibility,
  updateStepDueDate,
  updateStepLock,
} from "@/app/activities/[id]/edit/actions";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/authorization", () => ({
  verifyTeacherOwnsActivity: vi.fn(),
  verifyTeacherOwnsPhase: vi.fn(),
  verifyTeacherOwnsStep: vi.fn(),
}));

const vi_createClient = vi.mocked(createClient);
const vi_createAdminClient = vi.mocked(createAdminClient);
const vi_verifyOwnsActivity = vi.mocked(verifyTeacherOwnsActivity);
const vi_verifyOwnsPhase = vi.mocked(verifyTeacherOwnsPhase);
const vi_verifyOwnsStep = vi.mocked(verifyTeacherOwnsStep);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockAuthClient(user: ReturnType<typeof createMockUser> | null) {
  const { client } = new SupabaseMockBuilder().mockAuth(user).build();
  vi_createClient.mockResolvedValue(client as any);
  return client;
}

function mockAdminClient() {
  const { client } = new SupabaseMockBuilder().build();
  vi_createAdminClient.mockReturnValue(client as any);
  return client;
}

// ─── Reusable setup combinator ────────────────────────────────────────────────

function setupAuthAndAdmin(
  user: ReturnType<typeof createMockUser> | null,
  adminBuilder: SupabaseMockBuilder
) {
  const { client: authClient } = new SupabaseMockBuilder()
    .mockAuth(user)
    .build();
  vi_createClient.mockResolvedValue(authClient as any);

  const { client: adminClient } = adminBuilder.build();
  vi_createAdminClient.mockReturnValue(adminClient as any);

  return { authClient, adminClient };
}

// ─── getActivityPhases ────────────────────────────────────────────────────────

describe("getActivityPhases", () => {
  it("returns phases with steps sorted by order_index", async () => {
    const stepA = createMockStep({ order_index: 1, id: "step-a" });
    const stepB = createMockStep({ order_index: 0, id: "step-b" });
    const phase = createMockPhase({ order_index: 0, steps: [stepA, stepB] } as any);

    const { client } = new SupabaseMockBuilder()
      .mockQuery("activity_phases", { data: [phase], error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await getActivityPhases("activity-1");

    expect(result).not.toHaveProperty("error");
    const data = (result as { data: any[] }).data;
    expect(data).toHaveLength(1);
    // steps sorted ascending by order_index
    expect(data[0].steps[0].id).toBe("step-b");
    expect(data[0].steps[1].id).toBe("step-a");
  });

  it("returns error object when DB query fails", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockQuery("activity_phases", {
        data: null,
        error: { message: "relation not found" },
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await getActivityPhases("activity-1");

    expect(result).toEqual({ error: "relation not found" });
  });
});

// ─── createPhase ──────────────────────────────────────────────────────────────

describe("createPhase", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await createPhase("activity-1", "Intro", 0);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when teacher does not own the activity", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder().mockAuth(user).build();
    vi_createClient.mockResolvedValue(client as any);
    vi_verifyOwnsActivity.mockResolvedValue(false);

    const result = await createPhase("activity-1", "Intro", 0);

    expect(result).toEqual({ error: "No autorizado." });
  });

  it("inserts phase via admin client and returns data on success", async () => {
    const user = createMockUser();
    const phase = createMockPhase({ title: "Intro", order_index: 0 });

    setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockInsert("activity_phases", {
        data: phase,
        error: null,
      })
    );
    vi_verifyOwnsActivity.mockResolvedValue(true);

    const result = await createPhase("activity-1", "Intro", 0);

    expect(result).toEqual({ data: phase });
  });
});

// ─── createStep ───────────────────────────────────────────────────────────────

describe("createStep", () => {
  it("returns error when teacher does not own the phase", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder().mockAuth(user).build();
    vi_createClient.mockResolvedValue(client as any);
    vi_verifyOwnsPhase.mockResolvedValue(false);

    const result = await createStep("phase-1", "Step Title", "theory", 0);

    expect(result).toEqual({ error: "No autorizado." });
  });

  it("inserts with default content { markdown: '' } for theory type", async () => {
    const user = createMockUser();
    const step = createMockStep({
      type: "theory",
      content: { markdown: "" },
    });

    const { adminClient } = setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockInsert("activity_steps", {
        data: step,
        error: null,
      })
    );
    vi_verifyOwnsPhase.mockResolvedValue(true);

    const result = await createStep("phase-1", "Theory Step", "theory", 0);

    expect(result).toEqual({ data: step });
    // verify the admin client was used for the insert (not the auth client)
    expect(vi_createAdminClient).toHaveBeenCalled();
  });

  it("inserts with default content for deliverable type", async () => {
    const user = createMockUser();
    const step = createMockStep({
      type: "deliverable",
      content: { templateUrl: "", instructionsMarkdown: "" },
    });

    setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockInsert("activity_steps", {
        data: step,
        error: null,
      })
    );
    vi_verifyOwnsPhase.mockResolvedValue(true);

    const result = await createStep("phase-1", "Deliverable Step", "deliverable", 0);

    expect(result).toEqual({ data: step });
  });

  it("inserts with default content for file_upload type", async () => {
    const user = createMockUser();
    const step = createMockStep({
      type: "file_upload",
      content: {
        instructionsMarkdown: "",
        allowedTypes: ["pdf", "image", "word"],
        maxFileSizeMb: 10,
        maxFiles: 1,
      },
    });

    setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockInsert("activity_steps", {
        data: step,
        error: null,
      })
    );
    vi_verifyOwnsPhase.mockResolvedValue(true);

    const result = await createStep("phase-1", "Upload Step", "file_upload", 0);

    expect(result).toEqual({ data: step });
  });
});

// ─── updateStepContent ────────────────────────────────────────────────────────

describe("updateStepContent", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateStepContent("step-1", { markdown: "hello" });

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("updates content via admin client and returns data on success", async () => {
    const user = createMockUser();
    const step = createMockStep({ content: { markdown: "updated" } });

    setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockUpdate("activity_steps", {
        data: step,
        error: null,
      })
    );
    vi_verifyOwnsStep.mockResolvedValue(true);

    const result = await updateStepContent("step-1", { markdown: "updated" });

    expect(result).toEqual({ data: step });
  });
});

// ─── updateStepTitle ──────────────────────────────────────────────────────────

describe("updateStepTitle", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateStepTitle("step-1", "New Title");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("updates title via admin client and returns data on success", async () => {
    const user = createMockUser();
    const step = createMockStep({ title: "New Title" });

    setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockUpdate("activity_steps", {
        data: step,
        error: null,
      })
    );
    vi_verifyOwnsStep.mockResolvedValue(true);

    const result = await updateStepTitle("step-1", "New Title");

    expect(result).toEqual({ data: step });
  });
});

// ─── updatePhaseTitle ─────────────────────────────────────────────────────────

describe("updatePhaseTitle", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updatePhaseTitle("phase-1", "activity-1", "New Title");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("updates phase title via admin client and returns data on success", async () => {
    const user = createMockUser();
    const phase = createMockPhase({ title: "New Title" });

    setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockUpdate("activity_phases", {
        data: phase,
        error: null,
      })
    );
    vi_verifyOwnsPhase.mockResolvedValue(true);

    const result = await updatePhaseTitle("phase-1", "activity-1", "New Title");

    expect(result).toEqual({ data: phase });
  });
});

// ─── deletePhase ──────────────────────────────────────────────────────────────

describe("deletePhase", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deletePhase("phase-1", "activity-1");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("deletes phase via admin client and returns success", async () => {
    const user = createMockUser();

    setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockDelete("activity_phases", {
        data: null,
        error: null,
      })
    );
    vi_verifyOwnsPhase.mockResolvedValue(true);

    const result = await deletePhase("phase-1", "activity-1");

    expect(result).toEqual({ success: true });
  });
});

// ─── deleteStep ───────────────────────────────────────────────────────────────

describe("deleteStep", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteStep("step-1");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("deletes step via admin client and returns success", async () => {
    const user = createMockUser();

    setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockDelete("activity_steps", {
        data: null,
        error: null,
      })
    );
    vi_verifyOwnsStep.mockResolvedValue(true);

    const result = await deleteStep("step-1");

    expect(result).toEqual({ success: true });
  });
});

// ─── reorderPhases ────────────────────────────────────────────────────────────

describe("reorderPhases", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderPhases("activity-1", [{ id: "phase-1", order_index: 0 }]);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("updates all phases in parallel via admin client and returns success", async () => {
    const user = createMockUser();

    setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockUpdate("activity_phases", {
        data: null,
        error: null,
      })
    );
    vi_verifyOwnsActivity.mockResolvedValue(true);

    const updates = [
      { id: "phase-1", order_index: 0 },
      { id: "phase-2", order_index: 1 },
    ];

    const result = await reorderPhases("activity-1", updates);

    expect(result).toEqual({ success: true });
  });
});

// ─── reorderSteps ────────────────────────────────────────────────────────────

describe("reorderSteps", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderSteps("activity-1", [
      { id: "step-1", phase_id: "phase-1", order_index: 0 },
    ]);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("updates all steps in parallel via admin client and returns success", async () => {
    const user = createMockUser();

    setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockUpdate("activity_steps", {
        data: null,
        error: null,
      })
    );
    vi_verifyOwnsActivity.mockResolvedValue(true);

    const updates = [
      { id: "step-1", phase_id: "phase-1", order_index: 0 },
      { id: "step-2", phase_id: "phase-1", order_index: 1 },
    ];

    const result = await reorderSteps("activity-1", updates);

    expect(result).toEqual({ success: true });
  });
});

// ─── updateActivitySettings ───────────────────────────────────────────────────

describe("updateActivitySettings", () => {
  it("returns error when ownership check fails", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder().mockAuth(user).build();
    vi_createClient.mockResolvedValue(client as any);
    vi_verifyOwnsActivity.mockResolvedValue(false);

    const result = await updateActivitySettings("activity-1", { title: "New" });

    expect(result).toEqual({ error: "No autorizado." });
  });

  it("updates activity settings via admin client and returns data on success", async () => {
    const user = createMockUser();
    const activity = createMockActivity({ title: "New Title" });

    setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockUpdate("activities", {
        data: activity,
        error: null,
      })
    );
    vi_verifyOwnsActivity.mockResolvedValue(true);

    const result = await updateActivitySettings("activity-1", { title: "New Title" });

    expect(result).toEqual({ data: activity });
  });
});

// ─── updateActivityStatus ─────────────────────────────────────────────────────

describe("updateActivityStatus", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateActivityStatus("activity-1", "draft");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("updates activity status via admin client and returns data on success", async () => {
    const user = createMockUser();
    const activity = createMockActivity({ status: "draft" });

    setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockUpdate("activities", {
        data: activity,
        error: null,
      })
    );
    vi_verifyOwnsActivity.mockResolvedValue(true);

    const result = await updateActivityStatus("activity-1", "draft");

    expect(result).toEqual({ data: activity });
  });
});

// ─── updateStepVisibility ─────────────────────────────────────────────────────

describe("updateStepVisibility", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateStepVisibility("step-1", false);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("updates is_visible via admin client and returns data on success", async () => {
    const user = createMockUser();
    const step = createMockStep({ is_visible: false });

    setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockUpdate("activity_steps", {
        data: step,
        error: null,
      })
    );
    vi_verifyOwnsStep.mockResolvedValue(true);

    const result = await updateStepVisibility("step-1", false);

    expect(result).toEqual({ data: step });
  });
});

// ─── updateStepDueDate ────────────────────────────────────────────────────────

describe("updateStepDueDate", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateStepDueDate("step-1", "2026-03-15");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("updates due_date via admin client and returns data on success", async () => {
    const user = createMockUser();
    const step = createMockStep({ due_date: "2026-03-15" });

    setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockUpdate("activity_steps", {
        data: step,
        error: null,
      })
    );
    vi_verifyOwnsStep.mockResolvedValue(true);

    const result = await updateStepDueDate("step-1", "2026-03-15");

    expect(result).toEqual({ data: step });
  });
});

// ─── updateStepLock ───────────────────────────────────────────────────────────

describe("updateStepLock", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateStepLock("step-1", true);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("updates is_locked via admin client and returns data on success", async () => {
    const user = createMockUser();
    const step = createMockStep({ is_locked: true });

    setupAuthAndAdmin(
      user,
      new SupabaseMockBuilder().mockUpdate("activity_steps", {
        data: step,
        error: null,
      })
    );
    vi_verifyOwnsStep.mockResolvedValue(true);

    const result = await updateStepLock("step-1", true);

    expect(result).toEqual({ data: step });
  });
});
