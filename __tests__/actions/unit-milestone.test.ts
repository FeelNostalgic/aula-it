import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createMockUser, createMockProfile } from "../helpers/fixtures";
import {
  createUnitMilestone,
  updateUnitMilestone,
  deleteUnitMilestone,
} from "@/app/dashboard/units/[id]/actions";

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const vi_createClient = vi.mocked(createClient);
const vi_createAdminClient = vi.mocked(createAdminClient);
const vi_revalidatePath = vi.mocked(revalidatePath);

const UNIT_ID = "unit-00000000-0000-0000-0000-000000000001";
const MILESTONE_ID = "milestone-00000000-0000-0000-0000-000000000001";

const MILESTONE_DATA = {
  title: "Finish the unit",
  description: "Complete all activities",
  target_points: 1000,
  reward: "Pizza party",
  status: "draft" as const,
};

// ─── createUnitMilestone ──────────────────────────────────────────────────────

describe("createUnitMilestone", () => {
  it("returns error when not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await createUnitMilestone(UNIT_ID, MILESTONE_DATA);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is a student", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "student" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await createUnitMilestone(UNIT_ID, MILESTONE_DATA);

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("inserts milestone with unit_id and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: UNIT_ID, module: { id: "m1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockQuery("class_milestones", { data: { order_index: 0 }, error: null })
      .mockInsert("class_milestones", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await createUnitMilestone(UNIT_ID, MILESTONE_DATA);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });

  it("returns error when DB insert fails", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: UNIT_ID, module: { id: "m1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockQuery("class_milestones", { data: { order_index: 0 }, error: null })
      .mockInsert("class_milestones", { data: null, error: { message: "unique constraint violation" } })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await createUnitMilestone(UNIT_ID, MILESTONE_DATA);

    expect(result).toEqual({ error: "unique constraint violation" });
  });
});

// ─── updateUnitMilestone ──────────────────────────────────────────────────────

describe("updateUnitMilestone", () => {
  it("returns error when not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await updateUnitMilestone(MILESTONE_ID, UNIT_ID, { title: "New title" });

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is a student", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "student" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await updateUnitMilestone(MILESTONE_ID, UNIT_ID, { title: "New title" });

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("returns error when milestone does not belong to the unit", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);
    
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: UNIT_ID, module: { id: "m1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockQuery("class_milestones", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await updateUnitMilestone(MILESTONE_ID, UNIT_ID, { title: "New title" });

    expect(result).toEqual({ error: "Hito no encontrado o no pertenece a esta unidad" });
  });

  it("updates milestone and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: UNIT_ID, module: { id: "m1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockQuery("class_milestones", { data: { id: MILESTONE_ID }, error: null })
      .mockUpdate("class_milestones", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await updateUnitMilestone(MILESTONE_ID, UNIT_ID, { title: "New title" });

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── deleteUnitMilestone ──────────────────────────────────────────────────────

describe("deleteUnitMilestone", () => {
  it("returns error when not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await deleteUnitMilestone(MILESTONE_ID, UNIT_ID);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is a student", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", { data: createMockProfile({ role: "student" }), error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await deleteUnitMilestone(MILESTONE_ID, UNIT_ID);

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("returns error when milestone does not belong to the unit", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: UNIT_ID, module: { id: "m1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockQuery("class_milestones", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await deleteUnitMilestone(MILESTONE_ID, UNIT_ID);

    expect(result).toEqual({ error: "Hito no encontrado o no pertenece a esta unidad" });
  });

  it("deletes milestone and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: UNIT_ID, module: { id: "m1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockQuery("class_milestones", { data: { id: MILESTONE_ID }, error: null })
      .mockDelete("class_milestones", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await deleteUnitMilestone(MILESTONE_ID, UNIT_ID);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});
