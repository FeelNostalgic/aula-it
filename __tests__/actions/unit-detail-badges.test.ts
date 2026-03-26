import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createMockUser, createMockProfile } from "../helpers/fixtures";
import {
  createClassBadge,
  updateClassBadge,
  deleteClassBadge,
  reorderUnitMilestones,
} from "@/app/dashboard/units/[id]/actions";

vi.mock("@/utils/supabase/server");
vi.mock("@/utils/supabase/admin");
vi.mock("next/cache");

const vi_createClient = vi.mocked(createClient);
const vi_createAdminClient = vi.mocked(createAdminClient);
const vi_revalidatePath = vi.mocked(revalidatePath);

// ─── createClassBadge ─────────────────────────────────────────────────────────

describe("createClassBadge", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await createClassBadge("unit-1", {
      title: "First Badge",
      is_hidden: false,
      condition_payload: { type: "xp_threshold", value: 100 },
    });

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user role is not teacher", async () => {
    const builder = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "student" }),
        error: null,
      });
    
    vi_createClient.mockResolvedValue(builder.build().client as any);

    const result = await createClassBadge("unit-1", {
      title: "First Badge",
      is_hidden: false,
      condition_payload: { type: "xp_threshold", value: 100 },
    });

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("returns error when visitor tries to create badge", async () => {
    const user = createMockUser();
    const builder = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockTeacherAccess(user.id)
      .mockUnitAccess("unit-1", user.id, "viewer");
    
    vi_createClient.mockResolvedValue(builder.build().client as any);
    vi_createAdminClient.mockReturnValue(builder.build().client as any);

    const result = await createClassBadge("unit-1", {
      title: "First Badge",
      is_hidden: false,
      condition_payload: { type: "xp_threshold", value: 100 },
    });

    expect(result).toEqual({ error: "Tu rol de visitante permite consultar, no modificar contenido." });
  });

  it("returns error when DB insert fails", async () => {
    const user = createMockUser();
    const builder = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockTeacherAccess(user.id)
      .mockUnitAccess("unit-1", user.id, "editor")
      .mockInsert("class_badges", {
        data: null,
        error: { message: "insert error" },
      });
    
    vi_createClient.mockResolvedValue(builder.build().client as any);
    vi_createAdminClient.mockReturnValue(builder.build().client as any);

    const result = await createClassBadge("unit-1", {
      title: "First Badge",
      is_hidden: false,
      condition_payload: { type: "xp_threshold", value: 100 },
    });

    expect(result).toEqual({ error: "insert error" });
  });

  it("inserts badge and revalidates path on success", async () => {
    const user = createMockUser();
    const builder = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockTeacherAccess(user.id)
      .mockUnitAccess("unit-1", user.id, "editor")
      .mockInsert("class_badges", { data: null, error: null });
    
    vi_createClient.mockResolvedValue(builder.build().client as any);
    vi_createAdminClient.mockReturnValue(builder.build().client as any);

    const result = await createClassBadge("unit-1", {
      title: "First Badge",
      description: "Complete 100 XP",
      icon_url: null,
      is_hidden: false,
      condition_payload: { type: "xp_threshold", value: 100 },
      activity_id: null,
      xp_reward: 50,
    });

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── updateClassBadge ─────────────────────────────────────────────────────────

describe("updateClassBadge", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("jwt expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateClassBadge("badge-1", "unit-1", {
      title: "Updated Badge",
    });

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user role is not teacher", async () => {
    const builder = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "student" }),
        error: null,
      });
    
    vi_createClient.mockResolvedValue(builder.build().client as any);

    const result = await updateClassBadge("badge-1", "unit-1", {
      title: "Updated Badge",
    });

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("returns error when DB update fails", async () => {
    const user = createMockUser();
    const builder = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockTeacherAccess(user.id)
      .mockUnitAccess("unit-1", user.id, "editor")
      .mockUpdate("class_badges", {
        data: null,
        error: { message: "update error" },
      });
    
    vi_createClient.mockResolvedValue(builder.build().client as any);
    vi_createAdminClient.mockReturnValue(builder.build().client as any);

    const result = await updateClassBadge("badge-1", "unit-1", {
      title: "Updated Badge",
    });

    expect(result).toEqual({ error: "update error" });
  });

  it("updates badge and revalidates path on success", async () => {
    const user = createMockUser();
    const builder = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockTeacherAccess(user.id)
      .mockUnitAccess("unit-1", user.id, "editor")
      .mockUpdate("class_badges", { data: null, error: null });
    
    vi_createClient.mockResolvedValue(builder.build().client as any);
    vi_createAdminClient.mockReturnValue(builder.build().client as any);

    const result = await updateClassBadge("badge-1", "unit-1", {
      title: "Updated Badge",
      description: "New description",
      is_hidden: true,
      xp_reward: 75,
    });

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── deleteClassBadge ─────────────────────────────────────────────────────────

describe("deleteClassBadge", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteClassBadge("badge-1", "unit-1");

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user role is not teacher", async () => {
    const builder = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "student" }),
        error: null,
      });
    
    vi_createClient.mockResolvedValue(builder.build().client as any);

    const result = await deleteClassBadge("badge-1", "unit-1");

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("returns error when DB delete fails", async () => {
    const user = createMockUser();
    const builder = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockTeacherAccess(user.id)
      .mockUnitAccess("unit-1", user.id, "editor")
      .mockDelete("class_badges", {
        data: null,
        error: { message: "delete error" },
      });
    
    vi_createClient.mockResolvedValue(builder.build().client as any);
    vi_createAdminClient.mockReturnValue(builder.build().client as any);

    const result = await deleteClassBadge("badge-1", "unit-1");

    expect(result).toEqual({ error: "delete error" });
  });

  it("deletes badge and revalidates path on success", async () => {
    const user = createMockUser();
    const builder = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockTeacherAccess(user.id)
      .mockUnitAccess("unit-1", user.id, "editor")
      .mockDelete("class_badges", { data: null, error: null });
    
    vi_createClient.mockResolvedValue(builder.build().client as any);
    vi_createAdminClient.mockReturnValue(builder.build().client as any);

    const result = await deleteClassBadge("badge-1", "unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});

// ─── reorderUnitMilestones ────────────────────────────────────────────────────

describe("reorderUnitMilestones", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderUnitMilestones("unit-1", [
      "milestone-1",
      "milestone-2",
    ]);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user role is not teacher", async () => {
    const builder = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "student" }),
        error: null,
      });
    
    vi_createClient.mockResolvedValue(builder.build().client as any);

    const result = await reorderUnitMilestones("unit-1", [
      "milestone-1",
      "milestone-2",
    ]);

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("returns error when a DB update fails", async () => {
    const user = createMockUser();
    const builder = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockTeacherAccess(user.id)
      .mockUnitAccess("unit-1", user.id, "editor")
      .mockUpdate("class_milestones", {
        data: null,
        error: { message: "constraint violation" },
      });
    
    vi_createClient.mockResolvedValue(builder.build().client as any);
    vi_createAdminClient.mockReturnValue(builder.build().client as any);

    const result = await reorderUnitMilestones("unit-1", [
      "milestone-1",
      "milestone-2",
    ]);

    expect(result).toEqual({ error: "constraint violation" });
  });

  it("updates milestone order and revalidates path on success", async () => {
    const user = createMockUser();
    const builder = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockTeacherAccess(user.id)
      .mockUnitAccess("unit-1", user.id, "editor")
      .mockUpdate("class_milestones", { data: null, error: null });
    
    vi_createClient.mockResolvedValue(builder.build().client as any);
    vi_createAdminClient.mockReturnValue(builder.build().client as any);

    const result = await reorderUnitMilestones("unit-1", [
      "milestone-2",
      "milestone-1",
      "milestone-3",
    ]);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/[id]", "layout");
  });
});
