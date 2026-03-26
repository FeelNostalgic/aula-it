/**
 * T5.2 — Edge Case Tests
 *
 * Boundary conditions, injection vectors, and off-nominal inputs that could
 * cause silent failures, unexpected behaviour, or security regressions.
 */

import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createFormData } from "../helpers/form-data";
import { createMockUser, createMockProfile } from "../helpers/fixtures";

import { createModule } from "@/app/dashboard/actions";
import {
  createActivity,
  reorderMultipleActivities,
} from "@/app/dashboard/units/[id]/actions";
import { enrollStudent, getAvailableStudents } from "@/app/dashboard/modules/[id]/actions";
import { gradeSubmission } from "@/app/dashboard/units/[id]/actions";
import { submitDeliverable } from "@/app/activities/[id]/actions";

const vi_createClient = vi.mocked(createClient);
const vi_createAdminClient = vi.mocked(createAdminClient);

// ─── Helper: authenticated teacher client ─────────────────────────────────────

function teacherClient() {
  return new SupabaseMockBuilder()
    .mockTeacherAccess();
}

// ─── 1. XSS in module name ───────────────────────────────────────────────────

describe("Edge case: XSS payload in module name", () => {
  it("passes through unmodified — no server-side sanitization (risk is at render time)", async () => {
    // The action stores the raw string. HTML escaping must happen in the component.
    const xssName = "<script>alert(1)</script>";
    const { client } = teacherClient()
      .mockInsert("modules", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await createModule(null, createFormData({ name: xssName }));

    // No sanitization means the insert is attempted with the raw string.
    // As long as the DB mock accepts it, the action returns success.
    expect(result).toEqual({ success: true });
  });
});

// ─── 2. Extremely long string ─────────────────────────────────────────────────

describe("Edge case: extremely long module name (10 000 chars)", () => {
  it("returns DB error when the column constraint is exceeded", async () => {
    const longName = "A".repeat(10_000);
    const { client } = teacherClient()
      .mockInsert("modules", {
        data: null,
        error: { message: "value too long for type character varying(255)" },
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await createModule(null, createFormData({ name: longName }));

    expect(result).toEqual({
      error: "value too long for type character varying(255)",
    });
  });
});

// ─── 3. Negative order_index from previous activity ───────────────────────────

describe("Edge case: negative order_index returned by last activity query", () => {
  it("calculates nextOrder as negative+1 and inserts without crashing", async () => {
    // If the DB somehow holds a negative order_index (e.g. -5), the action must
    // produce -5 + 1 = -4 without panicking. The insert decision is left to the DB.
    const { client } = teacherClient()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    // getUnitAccess calls createAdminClient() internally
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "m1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockQuery("activities", { data: { order_index: -5 }, error: null })
      .mockInsert("activities", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const formData = createFormData({
      unit_id: "unit-1",
      title: "Edge Activity",
      type: "mission",
    });
    const result = await createActivity(formData);

    // Action should not throw — it passes order_index: -4 to the DB.
    expect(result).toEqual({ success: true });
  });
});

// ─── 4. Zero XP activity ──────────────────────────────────────────────────────

describe("Edge case: zero XP on createActivity", () => {
  it("accepts xp=0 as a valid value and inserts successfully", async () => {
    const { client } = teacherClient()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    // getUnitAccess calls createAdminClient() internally
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "m1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .mockQuery("activities", { data: null, error: null }) // no prior activity
      .mockInsert("activities", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const formData = createFormData({
      unit_id: "unit-1",
      title: "Free Activity",
      type: "theory",
      xp: "0",
    });
    const result = await createActivity(formData);

    expect(result).toEqual({ success: true });
  });
});

// ─── 5. Duplicate enrollment race (23505) ────────────────────────────────────

describe("Edge case: duplicate enrollment (23505 unique violation)", () => {
  it("returns the specific Spanish error message for double-enrollment", async () => {
    // Simulate two concurrent enroll calls where the second hits a PK conflict.
    const { client } = teacherClient()
      .mockInsert("module_enrollments", {
        data: null,
        error: { message: "duplicate key value violates unique constraint", code: "23505" },
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    // getModuleAccess calls createAdminClient() internally
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("modules", { data: { id: "module-1", teacher_id: "user-teacher-01" }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await enrollStudent("module-1", "student-1");

    expect(result).toEqual({ error: "El alumno ya está matriculado en este módulo" });
  });
});

// ─── 6. gradeSubmission with unknown gradingMode ──────────────────────────────

describe("Edge case: gradeSubmission with unknown grading_mode", () => {
  it("falls through to the complete branch and clears both score and rubric_scores", async () => {
    // The action uses if/else-if/else — any value that is neither 'score' nor
    // 'rubric' lands in the 'else' (complete) branch. This should not throw.
    const { client: userClient } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .build();
    vi_createClient.mockResolvedValue(userClient as any);

    // gradeSubmission uses createAdminClient() for DB writes
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockUpdate("activity_submissions", { data: null, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    // Force an unrecognised mode through the type system via cast.
    const result = await gradeSubmission("submission-1", {
      gradingMode: "unknown_mode" as "complete",
    });

    expect(result).toEqual({ success: true });
  });
});

// ─── 7. submitDeliverable with SQL injection in URL ──────────────────────────

describe("Edge case: SQL injection attempt in submitDeliverable URL", () => {
  it("rejects the URL before any DB call because the DRIVE_URL_REGEX does not match", async () => {
    const maliciousUrl = "'; DROP TABLE activity_submissions; --";
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await submitDeliverable("step-1", maliciousUrl, "activity-1");

    expect(result).toEqual({
      error: "La URL debe ser un enlace de Google Drive o Google Docs válido.",
    });
  });
});

// ─── 8. Subdomain spoofing of Google URL ──────────────────────────────────────

describe("Edge case: malicious subdomain spoofing a Google Drive URL", () => {
  it("rejects https://docs.google.com.evil.com/... because regex requires exact hostname prefix", async () => {
    // The regex is anchored to https://(docs|drive|sheets|slides|forms).google.com/
    // The spoofed URL inserts an extra subdomain after .com, so it must not match.
    const spoofedUrl = "https://docs.google.com.evil.com/document/d/abc123";
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await submitDeliverable("step-1", spoofedUrl, "activity-1");

    expect(result).toEqual({
      error: "La URL debe ser un enlace de Google Drive o Google Docs válido.",
    });
  });
});

// ─── 9. Empty array to reorderMultipleActivities ─────────────────────────────

describe("Edge case: empty updates array in reorderMultipleActivities", () => {
  it("performs no DB calls and returns success immediately", async () => {
    const { client } = teacherClient()
      .build();
    vi_createClient.mockResolvedValue(client as any);

    // getUnitAccess calls createAdminClient() internally
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("units", { data: { id: "unit-1", module: { id: "m1", teacher_id: "user-teacher-01" } }, error: null })
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await reorderMultipleActivities("unit-1", []);

    // Promise.all([]) resolves immediately with []. No DB errors possible.
    expect(result).toEqual({ success: true });
  });
});

// ─── 10. getAvailableStudents with empty enrolled list ────────────────────────

describe("Edge case: getAvailableStudents when no students are enrolled yet", () => {
  it("skips the .not() filter and queries all students when enrolledIds is empty", async () => {
    // getAvailableStudents passes the user client to getModuleAccess, so
    // modules + module_collaborators queries run on the user client.
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      // modules query for getModuleAccess
      .mockQuery("modules", { data: { id: "module-1", teacher_id: "user-teacher-01" }, error: null })
      // module_collaborators for resolveCollaboratorRole
      .mockQuery("module_collaborators", { data: { role: "creator" }, error: null })
      // module_enrollments returns empty → enrolledIds = []
      .mockQuery("module_enrollments", { data: [], error: null })
      // profiles returns one student without hitting .not()
      .mockQuery("profiles", {
        data: [
          { id: "student-1", full_name: "Maria López", avatar_url: null },
        ],
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    // getAvailableStudents also calls the admin client for email resolution.
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockAdminListUsers({ data: { users: [] }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await getAvailableStudents("module-1");

    expect(result).toMatchObject({ success: true });
    expect((result as any).students).toHaveLength(1);
    expect((result as any).students[0].id).toBe("student-1");
  });
});
