import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createMockUser, createMockSubmission } from "../helpers/fixtures";
import type { SubmissionFile } from "@/types/activity";
import {
  getMyPeerAssignments,
  submitDeliverable,
  submitFileUpload,
  submitFileUploadMulti,
  getStudentSubmissionsForActivity,
  getStepSubmissions,
} from "@/app/activities/[id]/actions";

const vi_createClient = vi.mocked(createClient);
const vi_createAdminClient = vi.mocked(createAdminClient);
const vi_revalidatePath = vi.mocked(revalidatePath);

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const STEP_ID = "step-00000000-0000-0000-0000-000000000001";
const ACTIVITY_ID = "activity-00000000-0000-0000-0000-000000000001";
const VALID_DRIVE_URL = "https://drive.google.com/file/d/abc123/view";
const VALID_DOCS_URL = "https://docs.google.com/document/d/abc123/edit";

const PAST_DATE = new Date(Date.now() - 86_400_000).toISOString(); // yesterday
const FUTURE_DATE = new Date(Date.now() + 86_400_000).toISOString(); // tomorrow

// ─── getMyPeerAssignments ─────────────────────────────────────────────────────

describe("getMyPeerAssignments", () => {
  it("hydrates intra-group target student names via profiles without relying on a direct FK join", async () => {
    const user = createMockUser();

    const { client: serverClient } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("activity_steps", {
        data: {
          phase: {
            activity: {
              unit: {
                module_id: "module-1",
              },
            },
          },
        },
        error: null,
      })
      .mockQuery("peer_evaluation_assignments", {
        data: [
          {
            id: "assignment-1",
            step_id: STEP_ID,
            evaluator_id: user.id,
            evaluator_group_id: null,
            target_submission_id: "submission-1",
            target_student_id: "student-2",
            eval_submission_id: null,
            target_submission: {
              id: "submission-1",
              drive_file_url: null,
              student_id: "student-2",
              group_id: null,
              student: null,
              group: null,
            },
          },
        ],
        error: null,
      })
      .mockQuery("profiles", {
        data: [{ id: "student-2", full_name: "Ada Lovelace" }],
        error: null,
      })
      .build();

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("module_groups", { data: [], error: null })
      .build();

    vi_createClient.mockResolvedValue(serverClient as any);
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await getMyPeerAssignments(STEP_ID);

    expect(result.error).toBeUndefined();
    expect(result.assignments).toEqual([
      expect.objectContaining({
        id: "assignment-1",
        target_student_id: "student-2",
        target_student: { full_name: "Ada Lovelace" },
      }),
    ]);
  });
});

// ─── submitDeliverable ────────────────────────────────────────────────────────

describe("submitDeliverable", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await submitDeliverable(STEP_ID, VALID_DRIVE_URL, ACTIVITY_ID);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error for an invalid URL (not a Google Drive/Docs URL)", async () => {
    // Auth doesn't even get called — URL is validated first
    const { client } = new SupabaseMockBuilder().mockAuth(createMockUser()).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await submitDeliverable(STEP_ID, "https://github.com/repo", ACTIVITY_ID);

    expect(result).toEqual({
      error: "La URL debe ser un enlace de Google Drive o Google Docs válido.",
    });
  });

  it("returns error for an empty URL", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(createMockUser()).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await submitDeliverable(STEP_ID, "", ACTIVITY_ID);

    expect(result).toEqual({
      error: "La URL debe ser un enlace de Google Drive o Google Docs válido.",
    });
  });

  it("returns error when the step deadline has passed", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("activity_steps", { data: { due_date: PAST_DATE }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await submitDeliverable(STEP_ID, VALID_DRIVE_URL, ACTIVITY_ID);

    expect(result).toEqual({ error: "El plazo de entrega ha finalizado." });
  });

  it("upserts submission with correct conflict target on success", async () => {
    const user = createMockUser();
    const submission = createMockSubmission({
      student_id: user.id,
      step_id: STEP_ID,
      drive_file_url: VALID_DRIVE_URL,
      status: "submitted",
    });

    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("activity_steps", { data: { due_date: FUTURE_DATE }, error: null })
      .mockUpsert("activity_submissions", { data: submission, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await submitDeliverable(STEP_ID, VALID_DRIVE_URL, ACTIVITY_ID);

    expect(result).toEqual({ data: submission });
    expect(vi_revalidatePath).toHaveBeenCalledWith(`/activities/${ACTIVITY_ID}`);
  });

  it("returns error when the DB upsert fails", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("activity_steps", { data: { due_date: null }, error: null })
      .mockUpsert("activity_submissions", {
        data: null,
        error: { message: "unique constraint violation" },
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await submitDeliverable(STEP_ID, VALID_DRIVE_URL, ACTIVITY_ID);

    expect(result).toEqual({ error: "unique constraint violation" });
  });

  it("accepts all valid Google domain variants", async () => {
    const user = createMockUser();
    const submission = createMockSubmission();

    const validUrls = [
      "https://docs.google.com/document/d/abc/edit",
      "https://drive.google.com/file/d/abc/view",
      "https://sheets.google.com/spreadsheets/d/abc/edit",
      "https://slides.google.com/presentation/d/abc/edit",
      "https://forms.google.com/forms/d/abc/edit",
    ];

    for (const url of validUrls) {
      const { client } = new SupabaseMockBuilder()
        .mockAuth(user)
        .mockQuery("activity_steps", { data: { due_date: null }, error: null })
        .mockUpsert("activity_submissions", { data: submission, error: null })
        .build();
      vi_createClient.mockResolvedValue(client as any);

      const result = await submitDeliverable(STEP_ID, url, ACTIVITY_ID);
      expect(result).not.toHaveProperty("error");
    }
  });
});

// ─── submitFileUpload ─────────────────────────────────────────────────────────

describe("submitFileUpload", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await submitFileUpload(
      STEP_ID,
      ACTIVITY_ID,
      VALID_DRIVE_URL,
      "file-id-123",
      "report.pdf",
      "application/pdf"
    );

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when the step deadline has passed", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("activity_steps", { data: { due_date: PAST_DATE }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await submitFileUpload(
      STEP_ID,
      ACTIVITY_ID,
      VALID_DRIVE_URL,
      "file-id-123",
      "report.pdf",
      "application/pdf"
    );

    expect(result).toEqual({ error: "El plazo de entrega ha finalizado." });
  });

  it("upserts submission and returns data on success", async () => {
    const user = createMockUser();
    const submission = createMockSubmission({
      student_id: user.id,
      step_id: STEP_ID,
      drive_file_url: VALID_DRIVE_URL,
      drive_file_id: "file-id-123",
      drive_file_name: "report.pdf",
      drive_mime_type: "application/pdf",
      status: "submitted",
    });

    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("activity_steps", { data: { due_date: null }, error: null })
      .mockUpsert("activity_submissions", { data: submission, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await submitFileUpload(
      STEP_ID,
      ACTIVITY_ID,
      VALID_DRIVE_URL,
      "file-id-123",
      "report.pdf",
      "application/pdf"
    );

    expect(result).toEqual({ data: submission });
    expect(vi_revalidatePath).toHaveBeenCalledWith(`/activities/${ACTIVITY_ID}`);
  });
});

// ─── submitFileUploadMulti ────────────────────────────────────────────────────

describe("submitFileUploadMulti", () => {
  it("returns error immediately when files array is empty", async () => {
    // No client interaction needed — guard fires before createClient()
    const { client } = new SupabaseMockBuilder().mockAuth(createMockUser()).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await submitFileUploadMulti(STEP_ID, ACTIVITY_ID, []);

    expect(result).toEqual({ error: "Se requiere al menos un archivo." });
  });

  it("upserts with first file data and full files array on success", async () => {
    const user = createMockUser();
    const files: SubmissionFile[] = [
      {
        driveFileId: "file-id-001",
        driveFileUrl: "https://drive.google.com/file/d/001/view",
        driveFileName: "first.pdf",
        driveMimeType: "application/pdf",
      },
      {
        driveFileId: "file-id-002",
        driveFileUrl: "https://drive.google.com/file/d/002/view",
        driveFileName: "second.pdf",
        driveMimeType: "application/pdf",
      },
    ];

    const submission = createMockSubmission({
      student_id: user.id,
      step_id: STEP_ID,
      drive_file_url: files[0].driveFileUrl,
      drive_file_id: files[0].driveFileId,
      drive_file_name: files[0].driveFileName,
      drive_mime_type: files[0].driveMimeType,
      files: files as any,
      status: "submitted",
    });

    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("activity_steps", { data: { due_date: null }, error: null })
      .mockUpsert("activity_submissions", { data: submission, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await submitFileUploadMulti(STEP_ID, ACTIVITY_ID, files);

    expect(result).toEqual({ data: submission });
    expect(vi_revalidatePath).toHaveBeenCalledWith(`/activities/${ACTIVITY_ID}`);
  });
});

// ─── getStudentSubmissionsForActivity ─────────────────────────────────────────

describe("getStudentSubmissionsForActivity", () => {
  it("returns empty object when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await getStudentSubmissionsForActivity(ACTIVITY_ID);

    expect(result).toEqual({});
  });

  it("returns a Record keyed by step_id on success", async () => {
    const user = createMockUser();
    const stepIdA = "step-aaa";
    const stepIdB = "step-bbb";

    const submissionA = createMockSubmission({ step_id: stepIdA, student_id: user.id });
    const submissionB = createMockSubmission({
      id: "submission-00000000-0000-0000-0000-000000000002",
      step_id: stepIdB,
      student_id: user.id,
    });

    // activity_phases returns phases with nested steps of deliverable type
    const phases = [
      {
        steps: [
          { id: stepIdA, type: "deliverable" },
          { id: stepIdB, type: "file_upload" },
        ],
      },
    ];

    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("activity_phases", { data: phases, error: null })
      .mockQuery("activity_submissions", { data: [submissionA, submissionB], error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await getStudentSubmissionsForActivity(ACTIVITY_ID);

    expect(result).toEqual({
      [stepIdA]: submissionA,
      [stepIdB]: submissionB,
    });
  });

  it("returns empty object when no deliverable steps exist in phases", async () => {
    const user = createMockUser();
    const phases = [{ steps: [{ id: "step-theory", type: "theory" }] }];

    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("activity_phases", { data: phases, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await getStudentSubmissionsForActivity(ACTIVITY_ID);

    expect(result).toEqual({});
  });
});

// ─── getStepSubmissions ───────────────────────────────────────────────────────

describe("getStepSubmissions", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await getStepSubmissions(STEP_ID);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns submissions array with joined profile on success", async () => {
    const user = createMockUser();
    const submissionsWithProfile = [
      {
        ...createMockSubmission({ step_id: STEP_ID }),
        student: { id: user.id, full_name: "Test User", avatar_url: null },
      },
    ];

    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("activity_submissions", { data: submissionsWithProfile, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await getStepSubmissions(STEP_ID);

    expect(result).toEqual({ data: submissionsWithProfile });
  });

  it("returns error when DB query fails", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("activity_submissions", {
        data: null,
        error: { message: "relation not found" },
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await getStepSubmissions(STEP_ID);

    expect(result).toEqual({ error: "relation not found" });
  });
});
