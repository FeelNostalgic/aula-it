import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getDriveClient,
  extractFileIdFromUrl,
  copyFile,
  shareFile,
} from "@/lib/google-drive-api";
import { verifyTeacherOwnsActivity } from "@/lib/authorization";
import { POST } from "@/app/api/drive/copy/route";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createMockUser } from "../helpers/fixtures";

vi.mock("@/utils/supabase/server");
vi.mock("@/utils/supabase/admin");
vi.mock("@/lib/authorization");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/drive/copy", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/drive/copy", () => {
  it("returns 401 when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const response = await POST(makeRequest({ stepId: "s1", activityId: "a1" }));
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

    const response = await POST(makeRequest({ stepId: "s1", activityId: "a1" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 400 when stepId or activityId are missing", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);
    vi.mocked(verifyTeacherOwnsActivity).mockResolvedValue(true);

    // Missing activityId
    const response = await POST(makeRequest({ stepId: "s1" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/requerido/i);
  });

  it("returns 403 when teacher does not own the activity", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(client as any);
    vi.mocked(verifyTeacherOwnsActivity).mockResolvedValue(false);

    const response = await POST(makeRequest({ stepId: "s1", activityId: "a1" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toMatch(/autorizado/i);
  });

  it("returns 400 when teacher has no Drive token", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);
    vi.mocked(verifyTeacherOwnsActivity).mockResolvedValue(true);
    vi.mocked(extractFileIdFromUrl).mockReturnValue("template-id");

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activity_steps", {
        data: {
          title: "Entregable",
          content: { templateUrl: "https://drive.google.com/file/d/template-id/view" },
          phase: {
            activity: {
              title: "Reto",
              unit: { name: "Unidad", module: { name: "Módulo", teacher_id: "teacher-123" } },
            },
          },
        },
        error: null,
      })
      .mockQuery("teacher_drive_tokens", { data: null, error: null })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const response = await POST(makeRequest({ stepId: "s1", activityId: "a1" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/drive/i);
  });

  it("returns 400 when the step has no templateUrl in content", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);
    vi.mocked(verifyTeacherOwnsActivity).mockResolvedValue(true);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("teacher_drive_tokens", {
        data: { refresh_token: "mock-refresh" },
        error: null,
      })
      .mockQuery("activity_steps", {
        data: { title: "Step Title", content: {} }, // no templateUrl
        error: null,
      })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);
    vi.mocked(extractFileIdFromUrl).mockReturnValue(null as any);

    const response = await POST(makeRequest({ stepId: "s1", activityId: "a1" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/plantilla/i);
  });

  it("copies file for each enrolled student, shares it, and upserts submissions", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);
    vi.mocked(verifyTeacherOwnsActivity).mockResolvedValue(true);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activity_steps", {
        data: {
          title: "Entregable",
          content: { templateUrl: "https://drive.google.com/file/d/template-id/view" },
          phase: {
            activity: {
              title: "Reto",
              unit: { name: "Unidad", module: { name: "Módulo", teacher_id: user.id } },
            },
          },
        },
        error: null,
      })
      .mockQuery("teacher_drive_tokens", {
        data: { refresh_token: "mock-refresh" },
        error: null,
      })
      .mockQuery("activity_submissions", { data: [], error: null }) // no existing copies
      .mockQuery("activities", {
        data: { unit: { module_id: "module-1" } },
        error: null,
      })
      .mockQuery("module_enrollments", {
        data: [
          {
            student_id: "student-1",
            student: { id: "student-1", full_name: "Alice", google_email: "alice@school.com" },
          },
          {
            student_id: "student-2",
            student: { id: "student-2", full_name: null, google_email: null }, // no email → skipped
          },
        ],
        error: null,
      })
      .mockUpsert("activity_submissions", { data: null, error: null })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    // Drive client needs files.list + files.create for getOrCreateFolder, and files.update to move
    const fakeClient = {
      files: {
        list: vi.fn().mockResolvedValue({ data: { files: [] } }),
        create: vi.fn().mockResolvedValue({ data: { id: "folder-id" } }),
        update: vi.fn().mockResolvedValue({ data: { id: "new-file-id" } }),
      },
    };
    vi.mocked(getDriveClient).mockReturnValue(fakeClient as any);
    vi.mocked(extractFileIdFromUrl).mockReturnValue("template-id");
    vi.mocked(copyFile).mockResolvedValue({
      id: "new-file-id",
      webViewLink: "https://drive.google.com/file/d/new-file-id/view",
    } as any);
    vi.mocked(shareFile).mockResolvedValue(undefined as any);

    const response = await POST(makeRequest({ stepId: "s1", activityId: "a1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.copied).toBe(1);
    expect(body.skipped).toBe(1); // student-2 has no google_email
    expect(body.errors).toHaveLength(0);
    expect(copyFile).toHaveBeenCalledWith(fakeClient, "template-id", "[Alice] Entregable", "folder-id");
    expect(shareFile).toHaveBeenCalledWith(fakeClient, "new-file-id", "alice@school.com", "writer");
  });
});
