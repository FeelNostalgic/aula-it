import { describe, it, expect, vi } from "vitest";
import { createAdminClient } from "@/utils/supabase/admin";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import {
  verifyTeacherOwnsActivity,
  verifyTeacherOwnsPhase,
  verifyTeacherOwnsStep,
} from "@/lib/authorization";

const vi_createAdminClient = vi.mocked(createAdminClient);

// ─── verifyTeacherOwnsActivity ────────────────────────────────────────────────

describe("verifyTeacherOwnsActivity", () => {
  it("returns true when the teacher_id matches userId", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockQuery("activities", {
        data: { unit: { module: { id: "module-1", teacher_id: "user-1" } } },
        error: null,
      })
      .build();
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await verifyTeacherOwnsActivity("activity-1", "user-1");

    expect(result).toBe(true);
  });

  it("returns false when the teacher_id does not match userId", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockQuery("activities", {
        data: { unit: { module: { id: "module-1", teacher_id: "user-other" } } },
        error: null,
      })
      .build();
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await verifyTeacherOwnsActivity("activity-1", "user-1");

    expect(result).toBe(false);
  });

  it("returns false when createAdminClient throws", async () => {
    vi_createAdminClient.mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await verifyTeacherOwnsActivity("activity-1", "user-1");

    expect(result).toBe(false);
  });

  it("returns true when the user is an editor collaborator", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockQuery("activities", {
        data: { unit: { module: { id: "module-1", teacher_id: "owner-1" } } },
        error: null,
      })
      .mockQuery("module_collaborators", {
        data: { role: "editor" },
        error: null,
      })
      .build();
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await verifyTeacherOwnsActivity("activity-1", "user-1");

    expect(result).toBe(true);
  });
});

// ─── verifyTeacherOwnsPhase ───────────────────────────────────────────────────

describe("verifyTeacherOwnsPhase", () => {
  it("returns true when the teacher_id matches userId", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockQuery("activity_phases", {
        data: { activity: { unit: { module: { id: "module-1", teacher_id: "user-1" } } } },
        error: null,
      })
      .build();
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await verifyTeacherOwnsPhase("phase-1", "user-1");

    expect(result).toBe(true);
  });

  it("returns false when the teacher_id does not match userId", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockQuery("activity_phases", {
        data: { activity: { unit: { module: { id: "module-1", teacher_id: "user-other" } } } },
        error: null,
      })
      .build();
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await verifyTeacherOwnsPhase("phase-1", "user-1");

    expect(result).toBe(false);
  });

  it("returns false when createAdminClient throws", async () => {
    vi_createAdminClient.mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await verifyTeacherOwnsPhase("phase-1", "user-1");

    expect(result).toBe(false);
  });
});

// ─── verifyTeacherOwnsStep ────────────────────────────────────────────────────

describe("verifyTeacherOwnsStep", () => {
  it("returns true when the teacher_id matches userId", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockQuery("activity_steps", {
        data: {
          phase: {
            activity: { unit: { module: { id: "module-1", teacher_id: "user-1" } } },
          },
        },
        error: null,
      })
      .build();
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await verifyTeacherOwnsStep("step-1", "user-1");

    expect(result).toBe(true);
  });

  it("returns false when the teacher_id does not match userId", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockQuery("activity_steps", {
        data: {
          phase: {
            activity: { unit: { module: { id: "module-1", teacher_id: "user-other" } } },
          },
        },
        error: null,
      })
      .build();
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await verifyTeacherOwnsStep("step-1", "user-1");

    expect(result).toBe(false);
  });

  it("returns false when createAdminClient throws", async () => {
    vi_createAdminClient.mockImplementation(() => {
      throw new Error("DB connection failed");
    });

    const result = await verifyTeacherOwnsStep("step-1", "user-1");

    expect(result).toBe(false);
  });
});
