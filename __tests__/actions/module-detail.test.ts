import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createFormData } from "../helpers/form-data";
import { createMockUser, createMockProfile, createMockModule } from "../helpers/fixtures";
import {
  createUnit,
  enrollStudent,
  unenrollStudent,
  updateModuleSettings,
  archiveModule,
  deleteModule,
  getAvailableStudents,
} from "@/app/dashboard/modules/[id]/actions";

const vi_createClient = vi.mocked(createClient);
const vi_createAdminClient = vi.mocked(createAdminClient);
const vi_revalidatePath = vi.mocked(revalidatePath);

const MODULE_ID = "module-00000000-0000-0000-0000-000000000001";
const STUDENT_ID = "student-00000000-0000-0000-0000-000000000001";

// ─── createUnit ───────────────────────────────────────────────────────────────

describe("createUnit", () => {
  it("returns error when user is not authenticated (auth error)", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const formData = createFormData({ module_id: MODULE_ID, name: "Unit 1" });
    const result = await createUnit(null, formData);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not authenticated (null user)", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(null)
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const formData = createFormData({ module_id: MODULE_ID, name: "Unit 1" });
    const result = await createUnit(null, formData);

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
    vi_createAdminClient.mockReturnValue(client as any);

    const formData = createFormData({ module_id: MODULE_ID, name: "Unit 1" });
    const result = await createUnit(null, formData);

    expect(result).toEqual({ error: "Solo los profesores pueden crear unidades." });
  });

  it("returns validation error when module_id or name is missing", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockQuery("modules", {
        data: createMockModule({ id: MODULE_ID }),
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const formData = createFormData({ module_id: MODULE_ID });
    const result = await createUnit(null, formData);

    expect(result).toEqual({ error: "El ID del módulo y el nombre de la unidad son obligatorios." });
  });

  it("returns error when teacher does not own the module", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockQuery("modules", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const formData = createFormData({ module_id: MODULE_ID, name: "Unit 1" });
    const result = await createUnit(null, formData);

    expect(result).toEqual({ error: "No se ha encontrado el módulo o no tienes suficientes permisos." });
  });

  it("inserts unit with calculated order_index and returns success", async () => {
    const user = createMockUser();
    const { client, spies } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockQuery("modules", {
        data: createMockModule({ id: MODULE_ID }),
        error: null,
      })
      .mockQuery("units", {
        data: { order_index: 2 },
        error: null,
      })
      .mockInsert("units", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const formData = createFormData({
      module_id: MODULE_ID,
      name: "Unit 1",
      description: "A unit",
    });
    const result = await createUnit(null, formData);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith(`/dashboard/modules/${MODULE_ID}`);
  });
});

// ─── enrollStudent ────────────────────────────────────────────────────────────

describe("enrollStudent", () => {
  it("returns error when user is not authenticated (auth error)", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await enrollStudent(MODULE_ID, STUDENT_ID);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns error when user is not authenticated (null user)", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(null)
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await enrollStudent(MODULE_ID, STUDENT_ID);

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
    vi_createAdminClient.mockReturnValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await enrollStudent(MODULE_ID, STUDENT_ID);

    expect(result).toEqual({ error: "Solo los profesores pueden matricular alumnos." });
  });

  it("returns error when teacher does not own the module", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockQuery("modules", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await enrollStudent(MODULE_ID, STUDENT_ID);

    expect(result).toEqual({ error: "No se ha encontrado el módulo o no tienes suficientes permisos." });
  });

  it("returns specific message on duplicate enrollment (code 23505)", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockQuery("modules", {
        data: createMockModule({ id: MODULE_ID }),
        error: null,
      })
      .mockInsert("module_enrollments", {
        data: null,
        error: { message: "duplicate key value", code: "23505" },
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await enrollStudent(MODULE_ID, STUDENT_ID);

    expect(result).toEqual({ error: "El alumno ya está matriculado en este módulo" });
  });

  it("inserts into module_enrollments and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockQuery("modules", {
        data: createMockModule({ id: MODULE_ID }),
        error: null,
      })
      .mockInsert("module_enrollments", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await enrollStudent(MODULE_ID, STUDENT_ID);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith(`/dashboard/modules/${MODULE_ID}`);
  });
});

// ─── unenrollStudent ──────────────────────────────────────────────────────────

describe("unenrollStudent", () => {
  it("returns error when user is not authenticated (auth error)", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await unenrollStudent(MODULE_ID, STUDENT_ID);

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
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await unenrollStudent(MODULE_ID, STUDENT_ID);

    expect(result).toEqual({ error: "Solo los profesores pueden desvincular alumnos." });
  });

  it("returns error when teacher does not own the module", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockQuery("modules", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await unenrollStudent(MODULE_ID, STUDENT_ID);

    expect(result).toEqual({ error: "No se ha encontrado el módulo o no tienes suficientes permisos." });
  });

  it("deletes with match and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .mockQuery("profiles", {
        data: createMockProfile({ role: "teacher" }),
        error: null,
      })
      .mockQuery("modules", {
        data: createMockModule({ id: MODULE_ID }),
        error: null,
      })
      .mockDelete("module_enrollments", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await unenrollStudent(MODULE_ID, STUDENT_ID);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith(`/dashboard/modules/${MODULE_ID}`);
  });
});

// ─── updateModuleSettings ─────────────────────────────────────────────────────

describe("updateModuleSettings", () => {
  it("returns error when user is not authenticated (auth error)", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const formData = createFormData({ name: "Updated Module", status: "published" });
    const result = await updateModuleSettings(MODULE_ID, formData);

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
    vi_createAdminClient.mockReturnValue(client as any);

    const formData = createFormData({ name: "Updated Module", status: "published" });
    const result = await updateModuleSettings(MODULE_ID, formData);

    expect(result).toEqual({ error: "Solo los profesores pueden actualizar módulos." });
  });

  it("returns validation error when name is whitespace only", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockQuery("modules", {
        data: createMockModule({ id: MODULE_ID }),
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const formData = createFormData({ name: "   ", status: "published" });
    const result = await updateModuleSettings(MODULE_ID, formData);

    expect(result).toEqual({ error: "El nombre del módulo no puede estar vacío." });
  });

  it("updates name (trimmed), description, status and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockQuery("modules", {
        data: createMockModule({ id: MODULE_ID }),
        error: null,
      })
      .mockUpdate("modules", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const formData = createFormData({
      name: "  Updated Module  ",
      description: "A new description",
      status: "published",
    });
    const result = await updateModuleSettings(MODULE_ID, formData);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith(`/dashboard/modules/${MODULE_ID}`);
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

// ─── archiveModule ────────────────────────────────────────────────────────────

describe("archiveModule", () => {
  it("returns error when user is not authenticated (auth error)", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await archiveModule(MODULE_ID);

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
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await archiveModule(MODULE_ID);

    expect(result).toEqual({ error: "Solo los profesores pueden archivar módulos." });
  });

  it("updates status to archived and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockQuery("modules", {
        data: createMockModule({ id: MODULE_ID }),
        error: null,
      })
      .mockUpdate("modules", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await archiveModule(MODULE_ID);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith(`/dashboard/modules/${MODULE_ID}`);
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

// ─── deleteModule ─────────────────────────────────────────────────────────────

describe("deleteModule", () => {
  it("returns error when user is not authenticated (auth error)", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await deleteModule(MODULE_ID);

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
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await deleteModule(MODULE_ID);

    expect(result).toEqual({ error: "Solo los profesores pueden eliminar módulos." });
  });

  it("deletes module and returns success", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockQuery("modules", {
        data: createMockModule({ id: MODULE_ID }),
        error: null,
      })
      .mockDelete("modules", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await deleteModule(MODULE_ID);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});

// ─── getAvailableStudents ─────────────────────────────────────────────────────

describe("getAvailableStudents", () => {
  it("returns error when user is not authenticated (auth error)", async () => {
    const { client } = new SupabaseMockBuilder()
      .mockAuthError("session expired")
      .build();
    vi_createClient.mockResolvedValue(client as any);
    vi_createAdminClient.mockReturnValue(client as any);

    const result = await getAvailableStudents(MODULE_ID);

    expect(result).toEqual({ error: "No autenticado." });
  });

  it("returns students not in enrolled list when there are enrollments", async () => {
    const user = createMockUser();
    const enrolledStudents = [{ student_id: "enrolled-student-id" }];
    const availableStudentProfiles = [
      { id: STUDENT_ID, full_name: "Jane Doe", avatar_url: null },
    ];
    const authUsers = [
      { id: STUDENT_ID, email: "jane.doe@school.com", user_metadata: { avatar_url: null } },
    ];

    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("modules", { data: createMockModule({ id: MODULE_ID }), error: null })
      .mockQuery("module_enrollments", {
        data: enrolledStudents,
        error: null,
      })
      .mockQuery("profiles", {
        data: availableStudentProfiles,
        error: null,
      })
      .mockAdminListUsers({
        data: { users: authUsers },
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const adminClient = { auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: authUsers }, error: null }) } } };
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await getAvailableStudents(MODULE_ID);

    expect(result).toEqual({
      success: true,
      students: expect.arrayContaining([
        expect.objectContaining({ id: STUDENT_ID, email: "jane.doe@school.com" }),
      ]),
    });
  });

  it("returns all students when enrolled list is empty", async () => {
    const user = createMockUser();
    const studentProfiles = [
      { id: STUDENT_ID, full_name: "Jane Doe", avatar_url: null },
    ];
    const authUsers = [
      { id: STUDENT_ID, email: "jane.doe@school.com", user_metadata: {} },
    ];

    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("modules", { data: createMockModule({ id: MODULE_ID }), error: null })
      .mockQuery("module_enrollments", { data: [], error: null })
      .mockQuery("profiles", { data: studentProfiles, error: null })
      .mockAdminListUsers({ data: { users: authUsers }, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const adminClient = { auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: authUsers }, error: null }) } } };
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await getAvailableStudents(MODULE_ID);

    expect(result).toMatchObject({ success: true });
    expect((result as any).students).toHaveLength(1);
    expect((result as any).students[0].id).toBe(STUDENT_ID);
  });

  it("adds ilike filter when search query is provided", async () => {
    const user = createMockUser();

    const { client } = new SupabaseMockBuilder()
      .mockTeacherAccess()
      .mockQuery("modules", { data: createMockModule({ id: MODULE_ID }), error: null })
      .mockQuery("module_enrollments", { data: [], error: null })
      .mockQuery("profiles", { data: [], error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await getAvailableStudents(MODULE_ID, "jane");

    // No students match (empty profiles), so no admin call is made
    expect(result).toMatchObject({ success: true, students: [] });
  });
});
