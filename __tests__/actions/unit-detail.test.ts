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

    expect(result).toEqual({ error: "No autenticado." });
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

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("returns error when visitor tries to update settings", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .mockUnitAccess("unit-1", "user-1", "viewer")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({ name: "My Unit" });
    const result = await updateUnitSettings("unit-1", formData);

    expect(result).toEqual({
      error: "Tu rol de visitante permite consultar, no modificar la configuración del módulo.",
    });
  });

  it("returns error when unit name is empty", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .mockUnitAccess("unit-1", "user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const formData = createFormData({ name: "   " });
    const result = await updateUnitSettings("unit-1", formData);

    expect(result).toEqual({ error: "El nombre de la unidad no puede estar vacío" });
  });

  it("updates unit settings and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockUpdate("units", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

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

    expect(result).toEqual({ error: "No autenticado." });
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

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("returns error when visitor tries to create activity", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "other-teacher" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "viewer" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const formData = createFormData({
      unit_id: "unit-1",
      title: "My Activity",
      type: "mission",
    });
    const result = await createActivity(formData);

    expect(result).toEqual({
      error: "Tu rol de visitante permite consultar, no modificar contenido.",
    });
  });

  it("returns error when required fields are missing", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    // Missing title
    const formData = createFormData({ unit_id: "unit-1" });
    const result = await createActivity(formData);

    expect(result).toEqual({ error: "ID de unidad y título son requeridos" });
  });

  it("calculates order_index as max+1 from last activity and inserts successfully", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockQuery("activities", {
        data: { order_index: 4 },
        error: null,
      })
      .mockInsert("activities", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

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
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      // null data → lastActivity is null → nextOrder = (-1 + 1) = 0
      .mockQuery("activities", { data: null, error: null })
      .mockInsert("activities", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

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
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderActivity("unit-1", "activity-1", "up");

    expect(result).toEqual({ error: "No autenticado." });
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

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("returns error when visitor tries to reorder activity", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "other-teacher" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "viewer" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await reorderActivity("unit-1", "activity-1", "up");

    expect(result).toEqual({
      error: "Tu rol de visitante permite consultar, no modificar contenido.",
    });
  });

  it("swaps order_index with adjacent activity when direction is valid", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockQuery("activities", {
        // First call: current activity. Second call: swap target.
        data: { id: "activity-1", order_index: 2 },
        error: null,
      })
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await reorderActivity("unit-1", "activity-1", "up");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });

  it("returns success without swap when activity is already at boundary", async () => {
    // swapData is null means already at top/bottom edge
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      // First chain call resolves current activity; second resolves null (boundary)
      .mockQuery("activities", {
        data: { id: "activity-1", order_index: 0 },
        error: null,
      })
      .build();

    // Override: make the second activities query (swap target) return null
    const originalFrom = adminClient.from.bind(adminClient);
    let activitiesCallCount = 0;
    adminClient.from = vi.fn((table: string) => {
      const base = originalFrom(table);
      if (table === "activities") {
        activitiesCallCount++;
        if (activitiesCallCount === 2) {
          // swap query — boundary, no candidate
          const { makeChain } = (() => {
            const chain: Record<string, unknown> = {};
            const noop = vi.fn().mockReturnValue(chain);
            for (const m of ["select", "eq", "neq", "lt", "lte", "gt", "gte", "order", "limit", "single", "in", "filter", "or"]) chain[m] = noop;
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
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await reorderActivity("unit-1", "activity-1", "up");

    // boundary: no swap needed, still success
    expect(result).toEqual({ success: true });
  });
});

// ─── reorderMultipleActivities ────────────────────────────────────────────────

describe("reorderMultipleActivities", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderMultipleActivities("unit-1", [
      { id: "activity-1", order_index: 0 },
    ]);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when visitor tries to reorder activities", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "other-teacher" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "viewer" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await reorderMultipleActivities("unit-1", [
      { id: "activity-1", order_index: 0 },
    ]);

    expect(result).toEqual({
      error: "Tu rol de visitante permite consultar, no modificar contenido.",
    });
  });

  it("updates all activity positions and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

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
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteActivity("unit-1", "activity-1");

    expect(result).toEqual({ error: "No autenticado." });
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

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("returns error when visitor tries to delete activity", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "viewer" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await deleteActivity("unit-1", "activity-1");

    expect(result).toEqual({
      error: "Tu rol de visitante permite consultar, no modificar contenido.",
    });
  });

  it("deletes activity and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .mockUnitAccess("unit-1", "user-1")
      .mockDelete("activities", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await deleteActivity("unit-1", "activity-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── updateActivityStatus ─────────────────────────────────────────────────────

describe("updateActivityStatus", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateActivityStatus("activity-1", "published");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when visitor tries to update activity status", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activities", { data: { id: "activity-1", unit_id: "unit-1" }, error: null })
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "viewer" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await updateActivityStatus("activity-1", "published");

    expect(result).toEqual({
      error: "Tu rol de visitante permite consultar, no modificar contenido.",
    });
  });

  it("updates activity status and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activities", { data: { id: "activity-1", unit_id: "unit-1" }, error: null })
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await updateActivityStatus("activity-1", "published");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── updateActivityPosition ───────────────────────────────────────────────────

describe("updateActivityPosition", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateActivityPosition("activity-1", 120, 340);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when visitor tries to update activity position", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activities", { data: { id: "activity-1", unit_id: "unit-1" }, error: null })
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "viewer" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await updateActivityPosition("activity-1", 120, 340);

    expect(result).toEqual({
      error: "Tu rol de visitante permite consultar, no modificar contenido.",
    });
  });

  it("updates activity x/y position and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activities", { data: { id: "activity-1", unit_id: "unit-1" }, error: null })
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await updateActivityPosition("activity-1", 120, 340);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── updateMultipleActivityPositions ─────────────────────────────────────────

describe("updateMultipleActivityPositions", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateMultipleActivityPositions([]);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when visitor tries to update multiple positions", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activities", { data: { id: "activity-1", unit_id: "unit-1" }, error: null })
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "viewer" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await updateMultipleActivityPositions([{ id: "activity-1", x: 10, y: 20 }]);

    expect(result).toEqual({
      error: "Tu rol de visitante permite consultar, no modificar contenido.",
    });
  });

  it("updates all positions in parallel and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activities", { data: { id: "activity-1", unit_id: "unit-1" }, error: null }) // simplified for first activity check
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

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

describe("addActivityConnection", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await addActivityConnection("unit-1", "source-1", "target-1");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when visitor tries to add connection", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "viewer" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await addActivityConnection("unit-1", "source-1", "target-1");

    expect(result).toEqual({
      error: "Tu rol de visitante permite consultar, no modificar contenido.",
    });
  });

  it("inserts connection and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockInsert("activity_connections", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await addActivityConnection("unit-1", "source-1", "target-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });

  it("returns spanish error message when connection already exists (23505 duplicate)", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockInsert("activity_connections", {
        data: null,
        error: { message: "duplicate key value", code: "23505" },
      })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await addActivityConnection("unit-1", "source-1", "target-1");

    expect(result).toEqual({ error: "Esta conexión ya existe" });
  });
});

// ─── removeActivityConnection ─────────────────────────────────────────────────

describe("removeActivityConnection", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await removeActivityConnection("connection-1");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when visitor tries to remove connection", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .mockQuery("activity_connections", { data: { source_activity_id: "activity-1" }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activities", { data: { id: "activity-1", unit_id: "unit-1" }, error: null })
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "viewer" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await removeActivityConnection("connection-1");

    expect(result).toEqual({
      error: "Tu rol de visitante permite consultar, no modificar contenido.",
    });
  });

  it("deletes connection and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .mockQuery("activity_connections", { data: { source_activity_id: "activity-1" }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activities", { data: { id: "activity-1", unit_id: "unit-1" }, error: null })
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-1" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockDelete("activity_connections", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await removeActivityConnection("connection-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── getUnitStepSubmissions ───────────────────────────────────────────────────

describe("getUnitStepSubmissions", () => {
  it("returns empty array immediately when activityIds is empty", async () => {
    const result = await getUnitStepSubmissions([]);
    expect(result).toEqual({ data: [] });
  });

  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("jwt expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await getUnitStepSubmissions(["activity-1"]);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("allows visitor to see submissions", async () => {
    const submissions = [{ id: "submission-1", step_id: "step-1", student_id: "student-1" }];
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .mockQuery("activity_phases", { data: [{ id: "phase-1", activity_id: "activity-1" }], error: null })
      .mockQuery("activity_steps", { data: [{ id: "step-1", type: "deliverable", title: "Step 1", phase_id: "phase-1" }], error: null })
      .mockQuery("activities", { data: [{ id: "activity-1", title: "Activity 1" }], error: null })
      .mockQuery("activity_submissions", { data: submissions, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await getUnitStepSubmissions(["activity-1"]);

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
  });

  it("queries phases → steps → activities → submissions and returns mapped rows", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .mockQuery("activity_phases", {
        data: [{ id: "phase-1", activity_id: "activity-1" }],
        error: null,
      })
      .mockQuery("activity_steps", {
        data: [
          {
            id: "step-1",
            type: "deliverable",
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
            status: "submitted",
            submitted_at: "2024-01-15T10:00:00.000Z",
            student: { id: "student-1", full_name: "Ana García" },
          },
        ],
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

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
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("jwt expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await gradeSubmission("submission-1", {
      gradingMode: "score",
      score: 85,
    });

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser({ id: "user-1" }))
      .mockQuery("profiles", { data: { role: "student" }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await gradeSubmission("submission-1", {
      gradingMode: "score",
      score: 85,
    });

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("updates submission with score and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .mockUpdate("activity_submissions", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await gradeSubmission("submission-1", {
      gradingMode: "score",
      score: 90,
      feedback: "Buen trabajo",
    });

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── updateUnitResources ──────────────────────────────────────────────────────

describe("updateUnitResources", () => {
  it("returns error when unitId is missing", async () => {
    const result = await updateUnitResources("", []);
    expect(result).toEqual({ error: "ID de unidad es requerido." });
  });

  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("jwt expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateUnitResources("unit-1", []);
    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user lacks permission", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
       .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: [], error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await updateUnitResources("unit-1", []);
    expect(result).toEqual({ error: "No tienes permiso para modificar esta unidad." });
  });

  it("returns error when user is a visitor", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "viewer" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await updateUnitResources("unit-1", []);
    expect(result).toEqual({ error: "Tu rol de visitante permite consultar, no modificar contenido." });
  });

  it("updates unit resources and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "editor" }, error: null })
      .mockUpdate("units", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await updateUnitResources("unit-1", [{ title: "Libro", url: "http://test.com" }]);
    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── deleteUnit ───────────────────────────────────────────────────────────────

describe("deleteUnit", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuthError("jwt expired").build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteUnit("unit-1");
    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser({ id: "user-1" }))
      .mockQuery("profiles", { data: { role: "student" }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteUnit("unit-1");
    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("returns error when user lacks permission", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: [], error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await deleteUnit("unit-1");
    expect(result).toEqual({ error: "No tienes permiso para modificar esta unidad." });
  });

  it("deletes unit and revalidates paths", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module_id: "module-1", module: { id: "module-1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "editor" }, error: null })
      .mockDelete("units", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await deleteUnit("unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/modules/module-1");
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

// ─── saveQuizShortAnswerScores ────────────────────────────────────────────────

describe("saveQuizShortAnswerScores", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuthError("jwt expired").build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await saveQuizShortAnswerScores("attempt-1", {}, {}, 5);
    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser({ id: "user-1" }))
      .mockQuery("profiles", { data: { role: "student" }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await saveQuizShortAnswerScores("attempt-1", {}, {}, 5);
    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("calculates totalEarned and updates attempt", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .mockUnitAccess("unit-1", "user-1", "editor")
      .mockUpdate("quiz_attempts", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await saveQuizShortAnswerScores(
      "attempt-1",
      { "q1": 3, "q2": 2 },
      { "q1": "Good", "q2": "Correct" },
      5
    );

    expect(result).toEqual({ success: true });
  });
});

// ─── reopenSubmission ─────────────────────────────────────────────────────────

describe("reopenSubmission", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuthError("jwt expired").build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reopenSubmission("sub-1");
    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser({ id: "user-1" }))
      .mockQuery("profiles", { data: { role: "student" }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reopenSubmission("sub-1");
    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("resets submission to submitted and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .mockUnitAccess("unit-1", "user-1", "editor")
      .mockUpdate("activity_submissions", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await reopenSubmission("sub-1");

    expect(result).toEqual({ success: true, warning: null });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── publishSubmissionGrade ───────────────────────────────────────────────────

describe("publishSubmissionGrade", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuthError("jwt expired").build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await publishSubmissionGrade("sub-1");
    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser({ id: "user-1" }))
      .mockQuery("profiles", { data: { role: "student" }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await publishSubmissionGrade("sub-1");
    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("sets published_at and status=published", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .mockUnitAccess("unit-1", "user-1", "editor")
      .mockUpdate("activity_submissions", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await publishSubmissionGrade("sub-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── publishAllGradesForStep ──────────────────────────────────────────────────

describe("publishAllGradesForStep", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuthError("jwt expired").build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await publishAllGradesForStep("step-1");
    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser({ id: "user-1" }))
      .mockQuery("profiles", { data: { role: "student" }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await publishAllGradesForStep("step-1");
    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("publishes all graded submissions and returns count", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess("user-1")
      .mockUnitAccess("unit-1", "user-1", "editor")
      .mockUpdate("activity_submissions", {
        data: [{ id: "sub-1" }, { id: "sub-2" }],
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await publishAllGradesForStep("step-1");

    expect(result).toEqual({ success: true, count: 2 });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── updateStepWeight ─────────────────────────────────────────────────────────

describe("updateStepWeight", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuthError("jwt expired").build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateStepWeight("step-1", 20);
    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser({ id: "user-1" }))
      .mockQuery("profiles", { data: { role: "student" }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateStepWeight("step-1", 20);
    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("updates step weight and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient, spies } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "editor" }, error: null })
      .mockQuery("activity_steps", { data: { activity_id: "activity-1" }, error: null })
      .mockUpdate("activity_steps", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await updateStepWeight("step-1", 25);

    expect(result).toEqual({ success: true });
    const activityStepsCallIndex = spies.from.mock.calls.reduce((lastIndex, call, index) => (
      call[0] === "activity_steps" ? index : lastIndex
    ), -1);
    const activityStepsTable = spies.from.mock.results[activityStepsCallIndex]?.value;
    expect(activityStepsTable?.update).toHaveBeenCalledWith({ grade_weight: 25 });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── updateActivityWeight ─────────────────────────────────────────────────────

describe("updateActivityWeight", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuthError("jwt expired").build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateActivityWeight("activity-1", 10);
    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser({ id: "user-1" }))
      .mockQuery("profiles", { data: { role: "student" }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateActivityWeight("activity-1", 10);
    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("updates activity weight and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient, spies } = new SupabaseMockBuilder()
      .mockQuery("activities", { data: { id: "activity-1", unit_id: "unit-1" }, error: null })
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "editor" }, error: null })
      .mockUpdate("activities", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await updateActivityWeight("activity-1", 10);

    expect(result).toEqual({ success: true });
    const activitiesCallIndex = spies.from.mock.calls.reduce((lastIndex, call, index) => (
      call[0] === "activities" ? index : lastIndex
    ), -1);
    const activitiesTable = spies.from.mock.results[activitiesCallIndex]?.value;
    expect(activitiesTable?.update).toHaveBeenCalledWith({ grade_weight: 10 });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── duplicateActivity ────────────────────────────────────────────────────────

describe("duplicateActivity", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuthError("jwt expired").build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await duplicateActivity("unit-1", "act-1");
    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser({ id: "user-1" }))
      .mockQuery("profiles", { data: { role: "student" }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await duplicateActivity("unit-1", "act-1");
    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("returns error when user lacks permission", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: [], error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await duplicateActivity("unit-1", "act-1");
    expect(result).toEqual({ error: "No tienes permiso para modificar esta unidad." });
  });

  it("duplicates activity and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activities", { data: [{ id: "act-1", title: "Original" }], error: null }) // array? actually for original check it could be object
      .mockQuery("units", { data: { id: "unit-1", module: { id: "module-1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "editor" }, error: null })
      .mockInsert("activities", { data: { id: "act-new" }, error: null })
      .build();

    // override to handle both activities select and duplicate
    const originalFrom = adminClient.from.bind(adminClient);
    let activitiesCallCount = 0;
    adminClient.from = vi.fn((table: string) => {
      const base = originalFrom(table);
      if (table === "activities") {
        activitiesCallCount++;
        if (activitiesCallCount === 1) { // permission check via nested lookup? no wait, the permission is checked via mockActivityAccess? no, duplicateActivity passes unitId.
            // nevermind, we can just let it fall through or we can mock it
            return base;
        }
      }
      return base;
    }) as any;

    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await duplicateActivity("unit-1", "act-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── duplicateUnit ────────────────────────────────────────────────────────────

describe("duplicateUnit", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuthError("jwt expired").build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await duplicateUnit("mod-1", "unit-1");
    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not a teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser({ id: "user-1" }))
      .mockQuery("profiles", { data: { role: "student" }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await duplicateUnit("mod-1", "unit-1");
    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("duplicates unit and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module_id: "mod-1", module: { id: "module-1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "editor" }, error: null })
      .mockRpc("duplicate_unit", { data: { id: "unit-new" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await duplicateUnit("mod-1", "unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/modules/mod-1");
  });
});
