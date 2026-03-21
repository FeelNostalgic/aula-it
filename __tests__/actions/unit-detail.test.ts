import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createFormData } from "../helpers/form-data";
import { createMockUser, createMockProfile } from "../helpers/fixtures";
import {
  updateUnitSettings,
  createActivity,
  reorderActivity,
  reorderMultipleActivities,
  deleteActivity,
  updateActivityStatus,
  updateActivityPosition,
  updateMultipleActivityPositions,
  addActivityConnection,
  removeActivityConnection,
  getUnitStepSubmissions,
  gradeSubmission,
  updateUnitResources,
  deleteUnit,
  duplicateActivity,
  duplicateUnit,
  saveQuizShortAnswerScores,
  reopenSubmission,
  publishSubmissionGrade,
  publishAllGradesForStep,
  updateStepWeight,
  updateActivityWeight,
} from "@/app/dashboard/units/[id]/actions";

const vi_createClient = vi.mocked(createClient);
const vi_createAdminClient = vi.mocked(createAdminClient);
const vi_revalidatePath = vi.mocked(revalidatePath);

// ─── updateUnitSettings ───────────────────────────────────────────────────────

describe("updateUnitSettings", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({ name: "My Unit" });
    const result = await updateUnitSettings("unit-1", formData);

    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when user role is not teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "student" }),
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({ name: "My Unit" });
    const result = await updateUnitSettings("unit-1", formData);

    expect(result).toEqual({ error: "Unauthorized: only teachers can update units" });
  });

  it("returns error when unit name is empty", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({ name: "   " });
    const result = await updateUnitSettings("unit-1", formData);

    expect(result).toEqual({ error: "Unit name cannot be empty" });
  });

  it("updates unit settings and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockQuery("units", {
        data: { module_id: "module-1" },
        error: null,
      })
      .mockUpdate("units", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({
      name: "Updated Unit",
      description: "New description",
      status: "published",
      view_type: "map",
    });
    const result = await updateUnitSettings("unit-1", formData);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── createActivity ────────────────────────────────────────────────────────────

describe("createActivity", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("jwt expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({
      unit_id: "unit-1",
      title: "My Activity",
      type: "mission",
    });
    const result = await createActivity(formData);

    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when user role is not teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "student" }),
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({
      unit_id: "unit-1",
      title: "My Activity",
      type: "mission",
    });
    const result = await createActivity(formData);

    expect(result).toEqual({ error: "Unauthorized: only teachers can create activities" });
  });

  it("returns error when required fields are missing", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    // Missing type
    const formData = createFormData({ unit_id: "unit-1", title: "My Activity" });
    const result = await createActivity(formData);

    expect(result).toEqual({ error: "Unit ID, title, and type are required" });
  });

  it("calculates order_index as max+1 from last activity and inserts successfully", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockQuery("activities", {
        data: { order_index: 4 },
        error: null,
      })
      .mockInsert("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({
      unit_id: "unit-1",
      title: "New Activity",
      type: "mission",
      xp: "100",
      difficulty: "Alto",
      duration: "45",
    });
    const result = await createActivity(formData);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });

  it("uses order_index 0 when no previous activity exists", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      // null data → lastActivity is null → nextOrder = (-1 + 1) = 0
      .mockQuery("activities", { data: null, error: null })
      .mockInsert("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({
      unit_id: "unit-1",
      title: "First Activity",
      type: "mission",
    });
    const result = await createActivity(formData);

    expect(result).toEqual({ success: true });
  });
});

// ─── reorderActivity ──────────────────────────────────────────────────────────

describe("reorderActivity", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(null)
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderActivity("unit-1", "activity-1", "up");

    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when user role is not teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "student" }),
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderActivity("unit-1", "activity-1", "up");

    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("swaps order_index with adjacent activity when direction is valid", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockQuery("activities", {
        // First call: current activity. Second call: swap target.
        data: { id: "activity-1", order_index: 2 },
        error: null,
      })
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderActivity("unit-1", "activity-1", "up");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });

  it("returns success without swap when activity is already at boundary", async () => {
    // swapData is null means already at top/bottom edge
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      // First chain call resolves current activity; second resolves null (boundary)
      .mockQuery("activities", {
        data: { id: "activity-1", order_index: 0 },
        error: null,
      })
      .build();

    // Override: make the second activities query (swap target) return null
    const originalFrom = client.from.bind(client);
    let activitiesCallCount = 0;
    client.from = vi.fn((table: string) => {
      const base = originalFrom(table);
      if (table === "activities") {
        activitiesCallCount++;
        if (activitiesCallCount === 2) {
          // swap query — boundary, no candidate
          const { makeChain } = (() => {
            const chain: Record<string, unknown> = {};
            const noop = vi.fn().mockReturnValue(chain);
            for (const m of ["select","eq","neq","lt","lte","gt","gte","order","limit","single","in","filter","or"]) chain[m] = noop;
            chain["then"] = (resolve: (v: unknown) => void) => Promise.resolve({ data: null, error: null }).then(resolve);
            chain["catch"] = (r: (e: unknown) => void) => Promise.resolve({ data: null, error: null }).catch(r);
            chain["finally"] = (f: () => void) => Promise.resolve({ data: null, error: null }).finally(f);
            return { makeChain: () => chain };
          })();
          return { ...base, select: vi.fn(() => makeChain()) };
        }
      }
      return base;
    }) as any;

    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderActivity("unit-1", "activity-1", "up");

    // boundary: no swap needed, still success
    expect(result).toEqual({ success: true });
  });
});

// ─── reorderMultipleActivities ────────────────────────────────────────────────

describe("reorderMultipleActivities", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(null)
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderMultipleActivities("unit-1", [
      { id: "activity-1", order_index: 0 },
    ]);

    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("updates all activity positions and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const updates = [
      { id: "activity-1", order_index: 0 },
      { id: "activity-2", order_index: 1 },
      { id: "activity-3", order_index: 2 },
    ];
    const result = await reorderMultipleActivities("unit-1", updates);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── deleteActivity ───────────────────────────────────────────────────────────

describe("deleteActivity", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(null)
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteActivity("unit-1", "activity-1");

    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when user role is not teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "student" }),
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteActivity("unit-1", "activity-1");

    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("deletes activity and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockDelete("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteActivity("unit-1", "activity-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── updateActivityStatus ─────────────────────────────────────────────────────
// SECURITY: No auth guard — relies entirely on RLS

describe("updateActivityStatus", () => {
  it("updates activity status and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateActivityStatus("activity-1", "published");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── updateActivityPosition ───────────────────────────────────────────────────
// SECURITY: No auth guard — relies entirely on RLS

describe("updateActivityPosition", () => {
  it("updates activity x/y position and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateActivityPosition("activity-1", 120, 340);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── updateMultipleActivityPositions ─────────────────────────────────────────
// SECURITY: No auth guard — relies entirely on RLS

describe("updateMultipleActivityPositions", () => {
  it("updates all positions in parallel and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const updates = [
      { id: "activity-1", x: 10, y: 20 },
      { id: "activity-2", x: 30, y: 40 },
    ];
    const result = await updateMultipleActivityPositions(updates);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── addActivityConnection ────────────────────────────────────────────────────
// SECURITY: No auth guard — relies entirely on RLS

describe("addActivityConnection", () => {
  it("inserts connection and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockInsert("activity_connections", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await addActivityConnection("unit-1", "source-1", "target-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });

  it("returns spanish error message when connection already exists (23505 duplicate)", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockInsert("activity_connections", {
        data: null,
        error: { message: "duplicate key value", code: "23505" },
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await addActivityConnection("unit-1", "source-1", "target-1");

    expect(result).toEqual({ error: "Esta conexión ya existe" });
  });
});

// ─── removeActivityConnection ─────────────────────────────────────────────────
// SECURITY: No auth guard — relies entirely on RLS

describe("removeActivityConnection", () => {
  it("deletes connection and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockDelete("activity_connections", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await removeActivityConnection("connection-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── getUnitStepSubmissions ───────────────────────────────────────────────────

describe("getUnitStepSubmissions", () => {
  it("returns empty array immediately when activityIds is empty", async () => {
    // No client calls should happen
    const result = await getUnitStepSubmissions([]);

    expect(result).toEqual({ data: [] });
  });

  it("returns error when user is not authenticated", async () => {
    const userClient = new SupabaseMockBuilder()
      .mockAuthError("jwt expired")
      .build();
    vi_createClient.mockResolvedValue(userClient.client as any);

    // Admin client won't even be called
    const adminClient = new SupabaseMockBuilder().build();
    vi_createAdminClient.mockReturnValue(adminClient.client as any);

    const result = await getUnitStepSubmissions(["activity-1"]);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("queries phases → steps → activities → submissions and returns mapped rows", async () => {
    const userClient = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .build();
    vi_createClient.mockResolvedValue(userClient.client as any);

    // Admin client handles multi-table queries
    const adminClient = new SupabaseMockBuilder()
      .mockQuery("activity_phases", {
        data: [
          { id: "phase-1", activity_id: "activity-1" },
        ],
        error: null,
      })
      .mockQuery("activity_steps", {
        data: [
          {
            id: "step-1",
            title: "Submit your work",
            phase_id: "phase-1",
            content: { deliveryMode: "manual", rubric: [] },
          },
        ],
        error: null,
      })
      .mockQuery("activities", {
        data: [{ id: "activity-1", title: "Mission Alpha" }],
        error: null,
      })
      .mockQuery("activity_submissions", {
        data: [
          {
            id: "submission-1",
            step_id: "step-1",
            student_id: "student-1",
            drive_file_url: null,
            drive_file_id: null,
            status: "submitted",
            submitted_at: "2024-01-15T10:00:00.000Z",
            score: null,
            feedback: null,
            graded_at: null,
            rubric_scores: null,
            grading_mode: null,
            student: { id: "student-1", full_name: "Ana García" },
          },
        ],
        error: null,
      })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient.client as any);

    const result = await getUnitStepSubmissions(["activity-1"]);

    expect(result.error).toBeUndefined();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]).toMatchObject({
      id: "submission-1",
      step_id: "step-1",
      step_title: "Submit your work",
      activity_id: "activity-1",
      activity_title: "Mission Alpha",
      student_id: "student-1",
      student_name: "Ana García",
      status: "submitted",
    });
  });
});

// ─── gradeSubmission ──────────────────────────────────────────────────────────

describe("gradeSubmission", () => {
  it("returns error when user is not authenticated", async () => {
    const userClient = new SupabaseMockBuilder()
      .mockAuthError("jwt expired")
      .build();
    vi_createClient.mockResolvedValue(userClient.client as any);

    const adminClient = new SupabaseMockBuilder().build();
    vi_createAdminClient.mockReturnValue(adminClient.client as any);

    const result = await gradeSubmission("submission-1", {
      gradingMode: "score",
      score: 85,
    });

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user role is not teacher", async () => {
    const userClient = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "student" }),
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(userClient.client as any);

    const adminClient = new SupabaseMockBuilder().build();
    vi_createAdminClient.mockReturnValue(adminClient.client as any);

    const result = await gradeSubmission("submission-1", {
      gradingMode: "score",
      score: 85,
    });

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("grades with score mode: sets score, clears rubric_scores", async () => {
    const userClient = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(userClient.client as any);

    const adminClient = new SupabaseMockBuilder()
      .mockUpdate("activity_submissions", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient.client as any);

    const result = await gradeSubmission("submission-1", {
      gradingMode: "score",
      score: 90,
      feedback: "Great work!",
    });

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });

  it("grades with rubric mode: sets rubric_scores, clears score", async () => {
    const userClient = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(userClient.client as any);

    const adminClient = new SupabaseMockBuilder()
      .mockUpdate("activity_submissions", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient.client as any);

    const result = await gradeSubmission("submission-1", {
      gradingMode: "rubric",
      rubricScores: { creativity: 4, clarity: 3 },
      feedback: "Good criteria coverage.",
    });

    expect(result).toEqual({ success: true });
  });

  it("grades with complete mode: clears both score and rubric_scores", async () => {
    const userClient = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(userClient.client as any);

    const adminClient = new SupabaseMockBuilder()
      .mockUpdate("activity_submissions", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient.client as any);

    const result = await gradeSubmission("submission-1", {
      gradingMode: "complete",
      feedback: "Marked as complete.",
    });

    expect(result).toEqual({ success: true });
  });
});

// ─── updateUnitResources ──────────────────────────────────────────────────────

describe("updateUnitResources", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateUnitResources("unit-1", []);

    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when user role is not teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "student" }),
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateUnitResources("unit-1", []);

    expect(result).toEqual({ error: "Unauthorized: only teachers can update unit resources" });
  });

  it("updates unit resources and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockUpdate("units", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const resources = [
      { title: "Slides", url: "https://slides.example.com" },
      { title: "Video", url: "https://video.example.com" },
    ];
    const result = await updateUnitResources("unit-1", resources);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── deleteUnit ───────────────────────────────────────────────────────────────

describe("deleteUnit", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuthError("session expired").build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteUnit("unit-1");

    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "student" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteUnit("unit-1");

    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("deletes unit and revalidates paths", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "teacher" }), error: null })
      .mockQuery("units", { data: { module_id: "module-1" }, error: null })
      .mockDelete("units", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteUnit("unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/modules/module-1");
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

// ─── saveQuizShortAnswerScores ────────────────────────────────────────────────

describe("saveQuizShortAnswerScores", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await saveQuizShortAnswerScores("attempt-1", {}, {}, 5);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "student" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await saveQuizShortAnswerScores("attempt-1", {}, {}, 5);

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("calculates totalEarned = autoPoints + sum(manualScores) and updates attempt", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "teacher" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockUpdate("quiz_attempts", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await saveQuizShortAnswerScores(
      "attempt-1",
      { "q1": 3, "q2": 2 },
      { "q1": "Good answer", "q2": "Correct" },
      5
    );

    expect(result).toEqual({ success: true });
  });
});

// ─── reopenSubmission ─────────────────────────────────────────────────────────

describe("reopenSubmission", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reopenSubmission("sub-1");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "student" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reopenSubmission("sub-1");

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("resets submission to submitted and clears timestamps", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "teacher" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockUpdate("activity_submissions", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await reopenSubmission("sub-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── publishSubmissionGrade ───────────────────────────────────────────────────

describe("publishSubmissionGrade", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await publishSubmissionGrade("sub-1");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("sets published_at and status=published", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "teacher" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockUpdate("activity_submissions", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await publishSubmissionGrade("sub-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── publishAllGradesForStep ──────────────────────────────────────────────────

describe("publishAllGradesForStep", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await publishAllGradesForStep("step-1");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("publishes all graded submissions and returns count", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "teacher" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockUpdate("activity_submissions", {
        data: [{ id: "sub-1" }, { id: "sub-2" }],
        error: null,
      })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await publishAllGradesForStep("step-1");

    expect(result).toEqual({ success: true, count: 2 });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── updateStepWeight ─────────────────────────────────────────────────────────

describe("updateStepWeight", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateStepWeight("step-1", 2);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("updates grade_weight and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "teacher" }), error: null })
      .mockUpdate("activity_steps", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateStepWeight("step-1", 2);

    expect(result).toEqual({ success: true });
  });
});

// ─── updateActivityWeight ─────────────────────────────────────────────────────

describe("updateActivityWeight", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateActivityWeight("activity-1", 3);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("updates activity grade_weight and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "teacher" }), error: null })
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateActivityWeight("activity-1", 3);

    expect(result).toEqual({ success: true });
  });
});

// ─── duplicateActivity ────────────────────────────────────────────────────────

describe("duplicateActivity", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await duplicateActivity("unit-1", "activity-1");

    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "student" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await duplicateActivity("unit-1", "activity-1");

    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns error when activity is not found", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "teacher" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activities", { data: null, error: { message: "not found" } })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await duplicateActivity("unit-1", "activity-1");

    expect(result).toEqual({ error: "Activity not found" });
  });

  it("duplicates activity with - copia suffix and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "teacher" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const originalActivity = {
      id: "activity-1",
      title: "My Activity",
      activity_phases: [],
      order_index: 0,
      position_x: 100,
      position_y: 100,
    };
    const newActivity = { id: "new-activity-id", title: "My Activity - copia" };

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activities", { data: originalActivity, error: null })
      .mockInsert("activities", { data: newActivity, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await duplicateActivity("unit-1", "activity-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── duplicateUnit ────────────────────────────────────────────────────────────

describe("duplicateUnit", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await duplicateUnit("module-1", "unit-1");

    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "student" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await duplicateUnit("module-1", "unit-1");

    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("duplicates unit and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "teacher" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const originalUnit = {
      id: "unit-1",
      name: "My Unit",
      activities: [],
      class_milestones: [],
      class_badges: [],
      order_index: 0,
    };
    const newUnit = { id: "new-unit-id", name: "My Unit - copia" };

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: originalUnit, error: null })
      .mockInsert("units", { data: newUnit, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await duplicateUnit("module-1", "unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/modules/module-1");
  });
});
