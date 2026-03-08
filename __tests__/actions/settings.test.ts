import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createMockUser, createMockProfile } from "../helpers/fixtures";
import { disconnectDrive, updateProfile } from "@/app/settings/actions";

const vi_createClient = vi.mocked(createClient);
const vi_revalidatePath = vi.mocked(revalidatePath);

// ─── disconnectDrive ──────────────────────────────────────────────────────────

describe("disconnectDrive", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("jwt expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await disconnectDrive();

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

    const result = await disconnectDrive();

    expect(result).toEqual({ error: "Solo profesores." });
  });

  it("deletes drive token and returns success for teacher", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockDelete("teacher_drive_tokens", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await disconnectDrive();

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/settings");
  });
});

// ─── updateProfile ────────────────────────────────────────────────────────────

describe("updateProfile", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(null)
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateProfile({
      fullName: "Test User",
      googleEmail: "test@gmail.com",
    });

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("updates profile with full_name and google_email and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockUpdate("profiles", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateProfile({
      fullName: "Ana García",
      googleEmail: "ana@gmail.com",
    });

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/settings");
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("skips full_name in update payload when fullName is empty", async () => {
    // When fullName is empty string, fullName.trim() is falsy so full_name
    // is NOT added to the updates object. google_email is always set.
    // The update still runs and the action should succeed.
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockUpdate("profiles", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateProfile({
      fullName: "",
      googleEmail: "user@gmail.com",
    });

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/settings");
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("returns error when supabase update fails", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockUpdate("profiles", {
        data: null,
        error: { message: "row-level security violation" },
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await updateProfile({
      fullName: "Test User",
      googleEmail: "test@gmail.com",
    });

    expect(result).toEqual({ error: "row-level security violation" });
  });
});
