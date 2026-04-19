import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getDriveClient } from "@/lib/google-drive-api";
import { DELETE } from "@/app/api/drive/delete-bulk/route";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createMockUser } from "../helpers/fixtures";

vi.mock("@/utils/supabase/server");
vi.mock("@/utils/supabase/admin");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/drive/delete-bulk", {
    method: "DELETE",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DELETE /api/drive/delete-bulk", () => {
  it("returns 401 when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const response = await DELETE(
      makeRequest({ driveFileIds: ["file-1"], stepId: "step-1" })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 400 when driveFileIds is missing or empty", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder().mockAuth(user).build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const { client: adminClient } = new SupabaseMockBuilder().build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    // Missing driveFileIds entirely
    const response1 = await DELETE(makeRequest({ stepId: "step-1" }));
    expect(response1.status).toBe(400);
    expect((await response1.json()).error).toMatch(/requerido/i);

    // Empty array
    const response2 = await DELETE(makeRequest({ driveFileIds: [], stepId: "step-1" }));
    expect(response2.status).toBe(400);
  });

  it("handles partial Drive failures gracefully and still returns success", async () => {
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

    // First file succeeds, second throws a non-404 error (should be swallowed)
    const driveDeleteMock = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(Object.assign(new Error("Internal error"), { code: 500 }));

    vi.mocked(getDriveClient).mockReturnValue({ files: { delete: driveDeleteMock } } as any);

    const response = await DELETE(
      makeRequest({ driveFileIds: ["file-ok", "file-err"], stepId: "step-1" })
    );
    const body = await response.json();

    // Route swallows Drive errors — still returns 200 with success
    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(driveDeleteMock).toHaveBeenCalledTimes(2);
  });

  it("batch deletes all files from Drive and removes the DB submission on success", async () => {
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

    const fileIds = ["file-a", "file-b", "file-c"];
    const response = await DELETE(makeRequest({ driveFileIds: fileIds, stepId: "step-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(driveDeleteMock).toHaveBeenCalledTimes(3);
    for (const id of fileIds) {
      expect(driveDeleteMock).toHaveBeenCalledWith({
        fileId: id,
        supportsAllDrives: true,
      });
    }
  });
});
