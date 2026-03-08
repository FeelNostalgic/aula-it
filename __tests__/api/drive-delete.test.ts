import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getDriveClient } from "@/lib/google-drive-api";
import { DELETE } from "@/app/api/drive/delete/route";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createMockUser } from "../helpers/fixtures";

vi.mock("@/utils/supabase/server");
vi.mock("@/utils/supabase/admin");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/drive/delete", {
    method: "DELETE",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeDriveClient(deleteImpl?: () => Promise<void>) {
  return {
    files: {
      delete: vi.fn().mockImplementation(deleteImpl ?? (() => Promise.resolve())),
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DELETE /api/drive/delete", () => {
  it("returns 401 when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const response = await DELETE(makeRequest({ driveFileId: "file-1", stepId: "step-1" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 400 when driveFileId or stepId are missing", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder().mockAuth(user).build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const { client: adminClient } = new SupabaseMockBuilder().build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const response = await DELETE(makeRequest({ driveFileId: "file-1" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/requerido/i);
  });

  it("treats a Drive 404 as success — file was already gone", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockDelete("activity_submissions", { data: null, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activity_steps", {
        data: { phase: { activity: { unit: { module: { teacher_id: user.id } } } } },
        error: null,
      })
      .mockQuery("teacher_drive_tokens", {
        data: { refresh_token: "mock-refresh-token" },
        error: null,
      })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const notFoundError = Object.assign(new Error("Not Found"), { code: 404 });
    vi.mocked(getDriveClient).mockReturnValue(makeDriveClient(() => Promise.reject(notFoundError)) as any);

    const response = await DELETE(makeRequest({ driveFileId: "file-gone", stepId: "step-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
  });

  it("deletes from Drive and DB on success", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockDelete("activity_submissions", { data: null, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activity_steps", {
        data: { phase: { activity: { unit: { module: { teacher_id: user.id } } } } },
        error: null,
      })
      .mockQuery("teacher_drive_tokens", {
        data: { refresh_token: "mock-refresh-token" },
        error: null,
      })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const driveDeleteMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getDriveClient).mockReturnValue({ files: { delete: driveDeleteMock } } as any);

    const response = await DELETE(makeRequest({ driveFileId: "file-123", stepId: "step-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(driveDeleteMock).toHaveBeenCalledWith({ fileId: "file-123" });
  });
});
