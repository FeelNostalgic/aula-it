import { beforeEach, describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createMockUser, createMockSubmission } from "../helpers/fixtures";
import type { SubmissionFile } from "@/types/activity";
import {
  getMyPeerAssignments,
  submitPeerEvaluation,
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

beforeEach(() => {
  vi.resetAllMocks();
  const { client: adminClient } = new SupabaseMockBuilder().build();
  vi_createAdminClient.mockReturnValue(adminClient as any);
});

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
      .mockQuery("profiles", {
        data: [{ id: "student-2", full_name: "Ada Lovelace" }],
        error: null,
      })
      .build();

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("module_groups", { data: [], error: null })
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

  it("auto-generates group assignments for evaluateAllGroups and returns colored group targets", async () => {
    const user = createMockUser();

    function createChain<T>(response: { data: T; error: { message: string } | null; count?: number | null }) {
      const chain: Record<string, unknown> = {};
      const methods = ["select", "eq", "in", "not", "or", "order", "single", "maybeSingle"];

      for (const method of methods) {
        chain[method] = vi.fn().mockReturnValue(chain);
      }

      chain.then = (resolve: (value: typeof response) => void, reject?: (reason: unknown) => void) =>
        Promise.resolve(response).then(resolve, reject);
      chain.catch = (reject: (reason: unknown) => void) => Promise.resolve(response).catch(reject);
      chain.finally = (onFinally: () => void) => Promise.resolve(response).finally(onFinally);

      return chain as Promise<typeof response> & Record<string, unknown>;
    }

    const { client: serverClient } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("activity_steps", {
        data: {
          content: {
            mode: "group",
            evaluateAllGroups: true,
          },
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
      .build();

    const insertSpy = vi.fn((_rows?: unknown) => ({
      select: vi.fn((_cols?: unknown) => createChain({
        data: [{ id: "generated-row" }],
        error: null,
      })),
    }));

    let peerAssignmentSelectCalls = 0;

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === "module_groups") {
          return {
            select: vi.fn(() => createChain({
              data: [{ id: "group-1" }, { id: "group-2" }],
              error: null,
            })),
          };
        }

        if (table === "module_group_members") {
          return {
            select: vi.fn(() => createChain({
              data: { group_id: "group-1" },
              error: null,
            })),
          };
        }

        if (table === "activity_steps") {
          return {
            select: vi.fn(() => createChain({
              data: {
                content: { sourceStepId: "source-step-1" },
                parent_step_id: null,
              },
              error: null,
            })),
          };
        }

        if (table === "activity_submissions") {
          return {
            select: vi.fn(() => createChain({
              data: [
                { id: "submission-1", group_id: "group-1" },
                { id: "submission-2", group_id: "group-2" },
              ],
              error: null,
            })),
          };
        }

        if (table === "peer_evaluation_assignments") {
          return {
            select: vi.fn(() => {
              peerAssignmentSelectCalls += 1;
              if (peerAssignmentSelectCalls === 1) {
                return createChain({
                  data: null,
                  error: null,
                  count: 0,
                });
              }

              return createChain({
                data: [
                  {
                    id: "assignment-1",
                    step_id: STEP_ID,
                    evaluator_id: null,
                    evaluator_group_id: "group-1",
                    target_submission_id: "submission-2",
                    target_student_id: null,
                    eval_submission_id: null,
                    eval_submission: null,
                    target_submission: {
                      id: "submission-2",
                      drive_file_url: null,
                      student_id: null,
                      group_id: "group-2",
                      student: null,
                      group: { name: "Equipo Beta", color: "#00AAFF" },
                    },
                  },
                ],
                error: null,
              });
            }),
            insert: insertSpy,
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    vi_createClient.mockResolvedValue(serverClient as any);
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await getMyPeerAssignments(STEP_ID);

    expect(insertSpy).toHaveBeenCalledWith([
      {
        step_id: STEP_ID,
        evaluator_group_id: "group-1",
        target_submission_id: "submission-2",
      },
      {
        step_id: STEP_ID,
        evaluator_group_id: "group-2",
        target_submission_id: "submission-1",
      },
    ]);
    expect(result.assignments).toEqual([
      expect.objectContaining({
        id: "assignment-1",
        evaluator_group_id: "group-1",
        target_submission: expect.objectContaining({
          group: { name: "Equipo Beta", color: "#00AAFF" },
        }),
      }),
    ]);
  });

  it("preserves live presentation notes stored in eval_submission.files", async () => {
    const user = createMockUser();

    const { client: serverClient } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("activity_steps", {
        data: {
          content: {
            mode: "individual",
          },
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
      .mockQuery("profiles", {
        data: [{ id: "student-2", full_name: "Ada Lovelace" }],
        error: null,
      })
      .build();

    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("module_groups", { data: [], error: null })
      .mockQuery("peer_evaluation_assignments", {
        data: [
          {
            id: "assignment-1",
            step_id: STEP_ID,
            evaluator_id: user.id,
            evaluator_group_id: null,
            target_submission_id: "submission-1",
            target_student_id: "student-2",
            eval_submission_id: "eval-sub-1",
            eval_submission: {
              self_eval_rubric_scores: { criterion_1: 4 },
              self_eval_justifications: { criterion_1: "Buena explicación" },
              files: [{ qaNotes: "Preguntó por la API y respondió bien" }],
            },
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
      .build();

    vi_createClient.mockResolvedValue(serverClient as any);
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await getMyPeerAssignments(STEP_ID);

    expect(result.assignments).toEqual([
      expect.objectContaining({
        id: "assignment-1",
        eval_submission: expect.objectContaining({
          files: [{ qaNotes: "Preguntó por la API y respondió bien" }],
        }),
      }),
    ]);
  });
});

describe("submitPeerEvaluation", () => {
  it("stores live presentation notes in submission files", async () => {
    const user = createMockUser();

    function createChain<T>(response: { data: T; error: { message: string } | null }) {
      const chain: Record<string, unknown> = {};
      const methods = ["select", "eq", "single"];

      for (const method of methods) {
        chain[method] = vi.fn().mockReturnValue(chain);
      }

      chain.then = (resolve: (value: typeof response) => void, reject?: (reason: unknown) => void) =>
        Promise.resolve(response).then(resolve, reject);
      chain.catch = (reject: (reason: unknown) => void) => Promise.resolve(response).catch(reject);
      chain.finally = (onFinally: () => void) => Promise.resolve(response).finally(onFinally);

      return chain as Promise<typeof response> & Record<string, unknown>;
    }

    const serverClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
      },
      from: vi.fn((table: string) => {
        if (table === "peer_evaluation_assignments") {
          return {
            select: vi.fn(() => createChain({
              data: {
                id: "assignment-1",
                step_id: STEP_ID,
                evaluator_id: user.id,
                evaluator_group_id: null,
                target_submission_id: "submission-1",
                eval_submission_id: null,
              },
              error: null,
            })),
          };
        }

        if (table === "activity_steps") {
          return {
            select: vi.fn(() => createChain({
              data: {
                content: {
                  evalMode: "rubric",
                  rubric: [],
                  requireJustification: false,
                },
              },
              error: null,
            })),
          };
        }

        throw new Error(`Unexpected server table: ${table}`);
      }),
    };

    const upsertSpy = vi.fn((_payload?: unknown, _opts?: unknown) => ({
      select: vi.fn(() => createChain({
        data: { id: "eval-sub-1" },
        error: null,
      })),
    }));

    const updateSpy = vi.fn((_payload?: unknown) => ({
      eq: vi.fn(() => createChain({
        data: null,
        error: null,
      })),
    }));

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === "activity_submissions") {
          return {
            upsert: upsertSpy,
          };
        }

        if (table === "peer_evaluation_assignments") {
          return {
            update: updateSpy,
          };
        }

        throw new Error(`Unexpected admin table: ${table}`);
      }),
    };

    vi_createClient.mockResolvedValue(serverClient as any);
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await submitPeerEvaluation(
      "assignment-1",
      ACTIVITY_ID,
      { criterion_1: 4 },
      { criterion_1: "Buena defensa" },
      "Preguntó por la autenticación y respondió con claridad"
    );

    expect(result).toEqual({});
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: user.id,
        step_id: STEP_ID,
        peer_assignment_id: "assignment-1",
        files: [{ qaNotes: "Preguntó por la autenticación y respondió con claridad" }],
      }),
      { onConflict: "peer_assignment_id" }
    );
    expect(updateSpy).toHaveBeenCalledWith({ eval_submission_id: "eval-sub-1" });
    expect(vi_revalidatePath).toHaveBeenCalledWith(`/activities/${ACTIVITY_ID}`);
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

  it("inserts submission and returns data when no previous row exists", async () => {
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
      .mockQuery("activity_submissions", { data: null, error: null })
      .mockInsert("activity_submissions", { data: submission, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await submitDeliverable(STEP_ID, VALID_DRIVE_URL, ACTIVITY_ID);

    expect(result).toEqual({ data: submission });
    expect(vi_revalidatePath).toHaveBeenCalledWith(`/activities/${ACTIVITY_ID}`);
  });

  it("returns error when the DB upsert fails", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("activity_steps", { data: { due_date: null }, error: null })
      .mockQuery("activity_submissions", { data: null, error: null })
      .mockInsert("activity_submissions", {
        data: null,
        error: { message: "unique constraint violation" },
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

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
      .mockQuery("activity_submissions", { data: null, error: null })
      .mockInsert("activity_submissions", { data: submission, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

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
      .mockQuery("activity_submissions", { data: null, error: null })
      .mockInsert("activity_submissions", { data: submission, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

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
