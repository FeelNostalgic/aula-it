import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getDriveClient, getDriveFolderMetadata } from "@/lib/google-drive-api";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createMockUser, createMockProfile } from "../helpers/fixtures";
import { disconnectDrive, saveDriveStorageSettings, updateProfile } from "@/app/settings/actions";
import { DRIVE_STORAGE_MODE } from "@/lib/drive-storage-settings";

const vi_createClient = vi.mocked(createClient);
const vi_revalidatePath = vi.mocked(revalidatePath);
const vi_getDriveClient = vi.mocked(getDriveClient);
const vi_getDriveFolderMetadata = vi.mocked(getDriveFolderMetadata);

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

// ─── saveDriveStorageSettings ────────────────────────────────────────────────

describe("saveDriveStorageSettings", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(null)
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await saveDriveStorageSettings({ mode: DRIVE_STORAGE_MODE.AUTO_ROOT });

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("stores automatic root mode for teachers", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockUpsert("app_settings", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await saveDriveStorageSettings({ mode: DRIVE_STORAGE_MODE.AUTO_ROOT });

    expect(result).toEqual({
      success: true,
      settings: {
        mode: DRIVE_STORAGE_MODE.AUTO_ROOT,
        folderId: null,
        folderName: null,
        folderUrl: null,
      },
    });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("validates and stores a custom folder", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockQuery("teacher_drive_tokens", {
        data: { refresh_token: "refresh-xyz" },
        error: null,
      })
      .mockUpsert("app_settings", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_getDriveClient.mockReturnValue({ files: {} } as any);
    vi_getDriveFolderMetadata.mockResolvedValue({
      id: "folder-123",
      name: "Entregas Centro",
      url: "https://drive.google.com/drive/folders/folder-123",
    });

    const result = await saveDriveStorageSettings({
      mode: DRIVE_STORAGE_MODE.CUSTOM_FOLDER,
      folderId: "folder-123",
    });

    expect(result).toEqual({
      success: true,
      settings: {
        mode: DRIVE_STORAGE_MODE.CUSTOM_FOLDER,
        folderId: "folder-123",
        folderName: "Entregas Centro",
        folderUrl: "https://drive.google.com/drive/folders/folder-123",
      },
    });
    expect(vi_getDriveFolderMetadata).toHaveBeenCalledWith({ files: {} }, "folder-123");
    expect(vi_revalidatePath).toHaveBeenCalledWith("/settings");
  });
});
