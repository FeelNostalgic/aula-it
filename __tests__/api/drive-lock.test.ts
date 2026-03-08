import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getDriveClient,
  listPermissions,
  removePermission,
  shareFile,
} from "@/lib/google-drive-api";
import { verifyTeacherOwnsStep } from "@/lib/authorization";
import { POST } from "@/app/api/drive/lock/route";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createMockUser } from "../helpers/fixtures";

vi.mock("@/utils/supabase/server");
vi.mock("@/utils/supabase/admin");
vi.mock("@/lib/authorization");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/drive/lock", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/drive/lock", () => {
  it("returns 401 when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const response = await POST(makeRequest({ stepId: "step-1" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 403 when user is not a teacher", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "student" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const response = await POST(makeRequest({ stepId: "step-1" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 400 when stepId is missing", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    vi.mocked(verifyTeacherOwnsStep).mockResolvedValue(true);

    const response = await POST(makeRequest({}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/requerido/i);
  });

  it("returns 400 when teacher has no Drive token", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    vi.mocked(verifyTeacherOwnsStep).mockResolvedValue(true);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("teacher_drive_tokens", { data: null, error: null })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const response = await POST(makeRequest({ stepId: "step-1" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/drive/i);
  });

  it("revokes writer permission and adds reader for each submission with a drive file", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    vi.mocked(verifyTeacherOwnsStep).mockResolvedValue(true);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("teacher_drive_tokens", {
        data: { refresh_token: "mock-refresh", access_token: "mock-access" },
        error: null,
      })
      .mockQuery("activity_submissions", {
        data: [
          {
            id: "sub-1",
            student_id: "student-1",
            drive_file_id: "file-1",
            student: { google_email: "student@school.com" },
          },
          {
            id: "sub-2",
            student_id: "student-2",
            drive_file_id: null, // no file — should be skipped
            student: { google_email: "other@school.com" },
          },
        ],
        error: null,
      })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const fakeClient = {};
    vi.mocked(getDriveClient).mockReturnValue(fakeClient as any);
    vi.mocked(listPermissions).mockResolvedValue([
      { id: "perm-writer-id", emailAddress: "student@school.com", role: "writer" },
    ] as any);
    vi.mocked(removePermission).mockResolvedValue(undefined as any);
    vi.mocked(shareFile).mockResolvedValue(undefined as any);

    const response = await POST(makeRequest({ stepId: "step-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.locked).toBe(1);
    expect(body.errors).toHaveLength(0);
    expect(removePermission).toHaveBeenCalledWith(fakeClient, "file-1", "perm-writer-id");
    expect(shareFile).toHaveBeenCalledWith(fakeClient, "file-1", "student@school.com", "reader");
  });
});
