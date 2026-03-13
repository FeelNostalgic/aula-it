import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createMockUser, createMockProfile } from "../helpers/fixtures";
import {
  createClassBadge,
  updateClassBadge,
  deleteClassBadge,
  reorderUnitMilestones,
} from "@/app/dashboard/units/[id]/actions";

const vi_createClient = vi.mocked(createClient);
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

    const result = await createClassBadge("unit-1", {
      title: "First Badge",
      is_hidden: false,
      condition_payload: { type: "xp_threshold", value: 100 },
    });

    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns error when DB insert fails", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockInsert("class_badges", {
        data: null,
        error: { message: "insert error" },
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await createClassBadge("unit-1", {
      title: "First Badge",
      is_hidden: false,
      condition_payload: { type: "xp_threshold", value: 100 },
    });

    expect(result).toEqual({ error: "insert error" });
  });

  it("inserts badge and revalidates path on success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockInsert("class_badges", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

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
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/unit-1");
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

    const result = await updateClassBadge("badge-1", "unit-1", {
      title: "Updated Badge",
    });

    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns error when DB update fails", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockUpdate("class_badges", {
        data: null,
        error: { message: "update error" },
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateClassBadge("badge-1", "unit-1", {
      title: "Updated Badge",
    });

    expect(result).toEqual({ error: "update error" });
  });

  it("updates badge and revalidates path on success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockUpdate("class_badges", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateClassBadge("badge-1", "unit-1", {
      title: "Updated Badge",
      description: "New description",
      is_hidden: true,
      xp_reward: 75,
    });

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/unit-1");
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

    const result = await deleteClassBadge("badge-1", "unit-1");

    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns error when DB delete fails", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockDelete("class_badges", {
        data: null,
        error: { message: "delete error" },
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteClassBadge("badge-1", "unit-1");

    expect(result).toEqual({ error: "delete error" });
  });

  it("deletes badge and revalidates path on success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockDelete("class_badges", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteClassBadge("badge-1", "unit-1");

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/unit-1");
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

    const result = await reorderUnitMilestones("unit-1", [
      "milestone-1",
      "milestone-2",
    ]);

    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("returns error when a DB update fails", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockUpdate("class_milestones", {
        data: null,
        error: { message: "constraint violation" },
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderUnitMilestones("unit-1", [
      "milestone-1",
      "milestone-2",
    ]);

    expect(result).toEqual({ error: "constraint violation" });
  });

  it("updates milestone order and revalidates path on success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockUpdate("class_milestones", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await reorderUnitMilestones("unit-1", [
      "milestone-2",
      "milestone-1",
      "milestone-3",
    ]);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/units/unit-1");
  });
});
