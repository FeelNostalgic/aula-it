import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getDriveClient } from "@/lib/google-drive-api";
import { POST } from "@/app/api/drive/upload/route";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createMockUser } from "../helpers/fixtures";

vi.mock("@/utils/supabase/server");
vi.mock("@/utils/supabase/admin");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Builds a NextRequest with FormData. */
function makeUploadRequest(opts: {
  file?: File | null;
  stepId?: string | null;
  existingDriveFileId?: string;
}): NextRequest {
  const formData = new FormData();
  if (opts.file !== undefined && opts.file !== null) formData.append("file", opts.file);
  if (opts.stepId !== undefined && opts.stepId !== null) formData.append("stepId", opts.stepId);
  if (opts.existingDriveFileId) formData.append("existingDriveFileId", opts.existingDriveFileId);

  return new NextRequest("http://localhost/api/drive/upload", {
    method: "POST",
    body: formData,
  });
}

/** Creates a minimal mock drive client with controllable methods. */
function makeDriveClient(overrides: {
  listResult?: object[];
  createIdResults?: Array<{ id: string; webViewLink?: string; name?: string; mimeType?: string }>;
  deleteImpl?: () => Promise<void>;
}) {
  const listResults = overrides.listResult ?? [];
  const createResults = overrides.createIdResults ?? [
    {
      id: "uploaded-file-id",
      webViewLink: "https://drive.google.com/file/d/uploaded-file-id/view",
      name: "assignment.pdf",
      mimeType: "application/pdf",
    },
  ];

  let createCallCount = 0;

  return {
    files: {
      list: vi.fn().mockResolvedValue({ data: { files: listResults } }),
      create: vi.fn().mockImplementation(() => {
        const result = createResults[createCallCount] ?? createResults[createResults.length - 1];
        createCallCount++;
        return Promise.resolve({ data: result });
      }),
      delete: vi.fn().mockImplementation(overrides.deleteImpl ?? (() => Promise.resolve())),
    },
  };
}

/**
 * The upload route calls admin.from("activity_steps") TWICE:
 *   1. select("title, content, due_date") → needs step config
 *   2. select("phase:activity_phases(...)") → needs teacher_id hierarchy
 *
 * SupabaseMockBuilder returns one fixed response per table, so we need a
 * manual admin mock that returns different data on successive calls.
 */
function makeAdminClientWithDualStepQuery(opts: {
  stepConfig: { title: string; content: object; due_date: string | null };
  teacherId: string;
  studentName?: string;
  refreshToken?: string;
}) {
  const { stepConfig, teacherId, studentName = "Alice", refreshToken = "mock-refresh-token" } =
    opts;

  // Responses keyed by table, returned sequentially per table
  const responses: Record<string, unknown[]> = {
    activity_steps: [
      { data: stepConfig, error: null },
      {
        data: { phase: { activity: { unit: { module: { teacher_id: teacherId } } } } },
        error: null,
      },
    ],
    profiles: [{ data: { full_name: studentName }, error: null }],
    teacher_drive_tokens: [{ data: { refresh_token: refreshToken }, error: null }],
  };

  const callCounts: Record<string, number> = {};

  const fromFn = vi.fn((table: string) => {
    callCounts[table] = (callCounts[table] ?? 0) + 1;
    const idx = (callCounts[table] ?? 1) - 1;
    const tableResponses = responses[table] ?? [{ data: null, error: null }];
    const response = tableResponses[idx] ?? tableResponses[tableResponses.length - 1];

    const chain: Record<string, unknown> = {};
    const chainMethods = ["select", "eq", "neq", "single", "maybeSingle", "order", "limit", "in"];
    for (const method of chainMethods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    chain["then"] = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
      Promise.resolve(response).then(resolve, reject);
    chain["catch"] = (r: (e: unknown) => void) => Promise.resolve(response).catch(r);
    chain["finally"] = (f: () => void) => Promise.resolve(response).finally(f);

    return chain;
  });

  return { from: fromFn, auth: { getUser: vi.fn() } };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/drive/upload", () => {
  it("returns 401 when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi.mocked(createClient).mockResolvedValue(client as any);

    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    const response = await POST(makeUploadRequest({ file, stepId: "step-1" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  it("returns 400 when file is missing", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder().mockAuth(user).build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activity_steps", {
        data: { title: "Step", content: { allowedTypes: ["pdf"], maxFileSizeMb: 10 }, due_date: null },
        error: null,
      })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const response = await POST(makeUploadRequest({ file: null, stepId: "step-1" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/requerido/i);
  });

  it("returns 400 when stepId is missing", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder().mockAuth(user).build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activity_steps", {
        data: { title: "Step", content: { allowedTypes: ["pdf"], maxFileSizeMb: 10 }, due_date: null },
        error: null,
      })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    const response = await POST(makeUploadRequest({ file, stepId: null }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/requerido/i);
  });

  it("returns 400 when the deadline has passed", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder().mockAuth(user).build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const pastDate = new Date(Date.now() - 86_400_000).toISOString();
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activity_steps", {
        data: { title: "Step", content: { allowedTypes: ["pdf"], maxFileSizeMb: 10 }, due_date: pastDate },
        error: null,
      })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const file = new File(["content"], "assignment.pdf", { type: "application/pdf" });
    const response = await POST(makeUploadRequest({ file, stepId: "step-1" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/plazo/i);
  });

  it("returns 400 when the file exceeds the maximum size", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder().mockAuth(user).build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activity_steps", {
        data: { title: "Step", content: { allowedTypes: ["pdf"], maxFileSizeMb: 1 }, due_date: null },
        error: null,
      })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const bigContent = new Uint8Array(2 * 1024 * 1024); // 2 MB
    const file = new File([bigContent], "big.pdf", { type: "application/pdf" });
    const response = await POST(makeUploadRequest({ file, stepId: "step-1" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/tamaño/i);
  });

  it("returns 400 when MIME type is not in the allowed list", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder().mockAuth(user).build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("activity_steps", {
        data: { title: "Step", content: { allowedTypes: ["pdf"], maxFileSizeMb: 10 }, due_date: null },
        error: null,
      })
      .build();
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const file = new File(["img"], "photo.png", { type: "image/png" });
    const response = await POST(makeUploadRequest({ file, stepId: "step-1" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/tipo de archivo/i);
  });

  it("allows .pka files when pka is in allowedTypes even though MIME is octet-stream", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder().mockAuth(user).build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const adminClient = makeAdminClientWithDualStepQuery({
      stepConfig: { title: "Packet Step", content: { allowedTypes: ["pka"], maxFileSizeMb: 10 }, due_date: null },
      teacherId: user.id,
    });
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const driveClient = makeDriveClient({
      listResult: [],
      createIdResults: [
        { id: "folder-root" },
        { id: "folder-step" },
        { id: "folder-student" },
        {
          id: "uploaded-pka-id",
          webViewLink: "https://drive.google.com/file/d/uploaded-pka-id/view",
          name: "packet.pka",
          mimeType: "application/octet-stream",
        },
      ],
    });
    vi.mocked(getDriveClient).mockReturnValue(driveClient as any);

    const pkaFile = new File(["pka-data"], "packet.pka", { type: "application/octet-stream" });
    const response = await POST(makeUploadRequest({ file: pkaFile, stepId: "step-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.driveFileId).toBe("uploaded-pka-id");
  });

  it("deletes the existing Drive file before uploading when re-submitting", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder().mockAuth(user).build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const adminClient = makeAdminClientWithDualStepQuery({
      stepConfig: { title: "Upload Step", content: { allowedTypes: ["pdf"], maxFileSizeMb: 10 }, due_date: null },
      teacherId: user.id,
    });
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const deleteMock = vi.fn().mockResolvedValue(undefined);
    const driveClient = makeDriveClient({
      listResult: [],
      createIdResults: [
        { id: "folder-root" },
        { id: "folder-step" },
        { id: "folder-student" },
        {
          id: "new-upload-id",
          webViewLink: "https://drive.google.com/file/d/new-upload-id/view",
          name: "assignment.pdf",
          mimeType: "application/pdf",
        },
      ],
      deleteImpl: deleteMock,
    });
    vi.mocked(getDriveClient).mockReturnValue(driveClient as any);

    const file = new File(["pdf-content"], "assignment.pdf", { type: "application/pdf" });
    const response = await POST(
      makeUploadRequest({ file, stepId: "step-1", existingDriveFileId: "old-file-id" })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.driveFileId).toBe("new-upload-id");
    expect(deleteMock).toHaveBeenCalledWith({ fileId: "old-file-id" });
  });

  it("uploads to Drive and returns file metadata on success", async () => {
    const user = createMockUser();
    const { client: userClient } = new SupabaseMockBuilder().mockAuth(user).build();
    vi.mocked(createClient).mockResolvedValue(userClient as any);

    const adminClient = makeAdminClientWithDualStepQuery({
      stepConfig: { title: "Upload Step", content: { allowedTypes: ["pdf"], maxFileSizeMb: 10 }, due_date: null },
      teacherId: user.id,
      studentName: "Test User",
    });
    vi.mocked(createAdminClient).mockReturnValue(adminClient as any);

    const driveClient = makeDriveClient({
      listResult: [],
      createIdResults: [
        { id: "folder-root" },
        { id: "folder-step" },
        { id: "folder-student" },
        {
          id: "final-file-id",
          webViewLink: "https://drive.google.com/file/d/final-file-id/view",
          name: "report.pdf",
          mimeType: "application/pdf",
        },
      ],
    });
    vi.mocked(getDriveClient).mockReturnValue(driveClient as any);

    const file = new File(["pdf-content"], "report.pdf", { type: "application/pdf" });
    const response = await POST(makeUploadRequest({ file, stepId: "step-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      driveFileId: "final-file-id",
      driveFileUrl: "https://drive.google.com/file/d/final-file-id/view",
      driveFileName: "report.pdf",
      driveMimeType: "application/pdf",
    });
  });
});
