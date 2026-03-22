import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createFormData } from "../helpers/form-data";
import { createMockUser } from "../helpers/fixtures";
import {
  getClassroomStudents,
  getTeacherModules,
  bulkEnrollByPrefix,
  bulkUnenrollByPrefix,
  bulkUnenrollByStudentIds,
  unenrollStudentFromModule,
  bulkResetPasswords,
  bulkToggleStatus,
  resetStudentPassword,
  toggleStudentStatus,
} from "@/app/alumnos/actions";
import {
  createBulkStudents,
  bulkDeleteStudents,
  deleteStudent,
} from "@/app/admin/students/actions";

const vi_createClient = vi.mocked(createClient);
const vi_createAdminClient = vi.mocked(createAdminClient);
const vi_revalidatePath = vi.mocked(revalidatePath);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockTeacherAuth(user = createMockUser()) {
  const { client } = new SupabaseMockBuilder()
    .mockAuth(user)
    .mockQuery("profiles", { data: { role: "teacher" }, error: null })
    .build();
  vi_createClient.mockResolvedValue(client as any);
  return user;
}

function mockAdminOps(builder: SupabaseMockBuilder) {
  const { client } = builder.build();
  vi_createAdminClient.mockReturnValue(client as any);
  return client;
}

function mockAdminAuth(user = createMockUser()) {
  // Server client: only for auth.getUser() in requireAdmin
  const { client: serverClient } = new SupabaseMockBuilder().mockAuth(user).build();
  vi_createClient.mockResolvedValue(serverClient as any);

  // Admin client (first call): requireAdmin queries profiles via createAdminClient()
  const { client: adminProfilesClient } = new SupabaseMockBuilder()
    .mockQuery("profiles", { data: { role: "admin" }, error: null })
    .build();
  vi_createAdminClient.mockReturnValueOnce(adminProfilesClient as any);

  return user;
}

// ─── createBulkStudents ───────────────────────────────────────────────────────

describe("createBulkStudents", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const formData = createFormData({ prefix: "ALU", count: "5", password: "password123" });
    const result = await createBulkStudents(null, formData);

    expect(result).toEqual({ error: "No autenticado" });
  });

  it("returns error when user is not an admin", async () => {
    // Server client: only for auth.getUser()
    const { client: serverClient } = new SupabaseMockBuilder()
      .mockAuth(createMockUser())
      .build();
    vi_createClient.mockResolvedValue(serverClient as any);

    // Admin client: profiles returns teacher role → requireAdmin throws "Sin permisos"
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const formData = createFormData({ prefix: "ALU", count: "5", password: "password123" });
    const result = await createBulkStudents(null, formData);

    expect(result).toEqual({ error: "Sin permisos" });
  });

  it("returns error when prefix contains special characters", async () => {
    mockAdminAuth();
    mockAdminOps(new SupabaseMockBuilder());

    const formData = createFormData({ prefix: "ALU-TEST", count: "5", password: "password123" });
    const result = await createBulkStudents(null, formData);

    expect(result).toEqual({ error: "El prefijo solo puede contener letras y números (ej: ALU, 1DAW)" });
  });

  it("returns error when count is 0", async () => {
    mockAdminAuth();
    mockAdminOps(new SupabaseMockBuilder());

    const formData = createFormData({ prefix: "ALU", count: "0", password: "password123" });
    const result = await createBulkStudents(null, formData);

    expect(result).toEqual({ error: "El número de alumnos debe estar entre 1 y 60" });
  });

  it("returns error when count exceeds 60", async () => {
    mockAdminAuth();
    mockAdminOps(new SupabaseMockBuilder());

    const formData = createFormData({ prefix: "ALU", count: "61", password: "password123" });
    const result = await createBulkStudents(null, formData);

    expect(result).toEqual({ error: "El número de alumnos debe estar entre 1 y 60" });
  });

  it("returns error when password is shorter than 6 chars", async () => {
    mockAdminAuth();
    mockAdminOps(new SupabaseMockBuilder());

    const formData = createFormData({ prefix: "ALU", count: "5", password: "abc" });
    const result = await createBulkStudents(null, formData);

    expect(result).toEqual({ error: "La contraseña maestra debe tener al menos 6 caracteres" });
  });

  it("creates students starting at index 1 when no existing students", async () => {
    mockAdminAuth();
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminListUsers({ data: { users: [] }, error: null })
        .mockAdminCreateUser({ data: { user: { id: "new-id-001" } }, error: null })
        .mockUpdate("profiles", { data: null, error: null })
    );

    const formData = createFormData({ prefix: "DAW", count: "2", password: "password123" });
    const result = await createBulkStudents(null, formData);

    expect(result).toHaveProperty("results");
    expect(result.results).toHaveLength(2);
    expect(result.results![0].identifier).toBe("DAW-001");
    expect(result.results![1].identifier).toBe("DAW-002");
  });

  it("continues numbering from existing students", async () => {
    mockAdminAuth();
    const existingUsers = [
      { email: "daw-001@aula.local" },
      { email: "daw-002@aula.local" },
    ];
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminListUsers({ data: { users: existingUsers }, error: null })
        .mockAdminCreateUser({ data: { user: { id: "new-id-003" } }, error: null })
        .mockUpdate("profiles", { data: null, error: null })
    );

    const formData = createFormData({ prefix: "DAW", count: "1", password: "password123" });
    const result = await createBulkStudents(null, formData);

    expect(result.results![0].identifier).toBe("DAW-003");
  });

  it("records error for failed student creation", async () => {
    mockAdminAuth();
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminListUsers({ data: { users: [] }, error: null })
        .mockAdminCreateUser({ data: null, error: { message: "email already exists" } })
    );

    const formData = createFormData({ prefix: "ERR", count: "1", password: "password123" });
    const result = await createBulkStudents(null, formData);

    expect(result.results![0]).toHaveProperty("error", "email already exists");
  });
});

// ─── getClassroomStudents ─────────────────────────────────────────────────────

describe("getClassroomStudents", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);
    mockAdminOps(new SupabaseMockBuilder());

    const result = await getClassroomStudents();

    expect(result).toEqual({ error: "No autenticado" });
  });

  it("returns empty list when teacher has no modules", async () => {
    const user = createMockUser();
    // Server client: auth + profiles + modules returns empty (no modules for this teacher)
    const { client: serverClient } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .mockQuery("modules", { data: [], error: null })
      .build();
    vi_createClient.mockResolvedValue(serverClient as any);

    const result = await getClassroomStudents();

    expect(result).toHaveProperty("students");
    expect(result.students).toHaveLength(0);
  });

  it("returns students filtered to @aula.local and sorted alphabetically", async () => {
    const user = createMockUser();
    const now = new Date();
    const futureBan = new Date(now.getTime() + 1000 * 60 * 60).toISOString();

    // Server client: auth + requireTeacher profiles + modules + module_enrollments
    const { client: serverClient } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .mockQuery("modules", { data: [{ id: "m1" }], error: null })
      .mockQuery("module_enrollments", {
        data: [
          { student_id: "u1", modules: { id: "m1", name: "M1" } },
          { student_id: "u2", modules: { id: "m1", name: "M1" } },
        ],
        error: null,
      })
      .build();
    vi_createClient.mockResolvedValue(serverClient as any);

    // Admin client: listUsers with both aula.local students
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminListUsers({
          data: {
            users: [
              { id: "u2", email: "zzz-001@aula.local", user_metadata: { full_name: "ZZZ-001" }, banned_until: null },
              { id: "u1", email: "aaa-001@aula.local", user_metadata: { full_name: "AAA-001" }, banned_until: futureBan },
            ],
          },
          error: null,
        })
    );

    const result = await getClassroomStudents();

    expect(result.students).toHaveLength(2);
    expect(result.students![0].identifier).toBe("AAA-001");
    expect(result.students![0].is_banned).toBe(true);
    expect(result.students![1].identifier).toBe("ZZZ-001");
  });
});

// ─── getTeacherModules ────────────────────────────────────────────────────────

describe("getTeacherModules", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await getTeacherModules();

    expect(result).toEqual({ error: "No autenticado" });
  });

  it("returns modules owned by the teacher", async () => {
    const user = createMockUser();
    const modules = [
      { id: "m1", name: "Module A", status: "published" },
      { id: "m2", name: "Module B", status: "draft" },
    ];
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("modules", { data: modules, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await getTeacherModules();

    expect(result).toEqual({ modules });
  });
});

// ─── bulkEnrollByPrefix ───────────────────────────────────────────────────────

describe("bulkEnrollByPrefix", () => {
  it("returns error when user is not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await bulkEnrollByPrefix("ALU", ["m1"]);

    expect(result).toMatchObject({ error: "No autenticado", enrolled: 0, skipped: 0 });
  });

  it("returns error when moduleIds is empty", async () => {
    mockTeacherAuth();
    mockAdminOps(new SupabaseMockBuilder());

    const result = await bulkEnrollByPrefix("ALU", []);

    expect(result).toMatchObject({ error: "Selecciona al menos un módulo" });
  });

  it("returns error when teacher does not own all modules", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .mockQuery("modules", { data: [{ id: "m1" }], error: null }) // only owns m1, not m2
      .build();
    vi_createClient.mockResolvedValue(client as any);
    mockAdminOps(new SupabaseMockBuilder());

    const result = await bulkEnrollByPrefix("ALU", ["m1", "m2"]);

    expect(result).toMatchObject({ error: "No tienes permisos sobre alguno de los módulos seleccionados" });
  });

  it("returns error when no students match the prefix", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .mockQuery("modules", { data: [{ id: "m1" }], error: null })
      .mockUpsert("module_enrollments", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminListUsers({ data: { users: [] }, error: null })
    );

    const result = await bulkEnrollByPrefix("NOEXIST", ["m1"]);

    expect(result).toMatchObject({ error: "No se encontraron alumnos con ese prefijo" });
  });

  it("enrolls matching students and returns count", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .mockQuery("modules", { data: [{ id: "m1" }], error: null })
      .mockUpsert("module_enrollments", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminListUsers({
          data: { users: [{ email: "alu-001@aula.local" }, { email: "alu-002@aula.local" }] },
          error: null,
        })
    );

    const result = await bulkEnrollByPrefix("ALU", ["m1"]);

    expect(result).not.toHaveProperty("error");
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/modules/m1");
  });
});

// ─── bulkUnenrollByPrefix ─────────────────────────────────────────────────────

describe("bulkUnenrollByPrefix", () => {
  it("returns error when not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await bulkUnenrollByPrefix("ALU", ["m1"]);

    expect(result).toMatchObject({ error: "No autenticado" });
  });

  it("returns error when moduleIds is empty", async () => {
    mockTeacherAuth();
    mockAdminOps(new SupabaseMockBuilder());

    const result = await bulkUnenrollByPrefix("ALU", []);

    expect(result).toMatchObject({ error: "Selecciona al menos un módulo" });
  });

  it("unenrolls students and returns count", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .mockQuery("modules", { data: [{ id: "m1" }], error: null })
      .mockDelete("module_enrollments", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminListUsers({
          data: { users: [{ email: "alu-001@aula.local" }] },
          error: null,
        })
    );

    const result = await bulkUnenrollByPrefix("ALU", ["m1"]);

    expect(result).not.toHaveProperty("error");
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/modules/m1");
  });
});

// ─── bulkUnenrollByStudentIds ─────────────────────────────────────────────────

describe("bulkUnenrollByStudentIds", () => {
  it("returns error when not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await bulkUnenrollByStudentIds(["s1"], ["m1"]);

    expect(result).toMatchObject({ error: "No autenticado" });
  });

  it("returns error when moduleIds is empty", async () => {
    mockTeacherAuth();
    mockAdminOps(new SupabaseMockBuilder());

    const result = await bulkUnenrollByStudentIds(["s1"], []);

    expect(result).toMatchObject({ error: "Selecciona al menos un módulo" });
  });

  it("returns error when studentIds is empty", async () => {
    mockTeacherAuth();
    mockAdminOps(new SupabaseMockBuilder());

    const result = await bulkUnenrollByStudentIds([], ["m1"]);

    expect(result).toMatchObject({ error: "No hay alumnos seleccionados" });
  });

  it("unenrolls specific students from modules", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .mockQuery("modules", { data: [{ id: "m1" }], error: null })
      .mockDelete("module_enrollments", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);
    mockAdminOps(new SupabaseMockBuilder());

    const result = await bulkUnenrollByStudentIds(["s1", "s2"], ["m1"]);

    expect(result).not.toHaveProperty("error");
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/modules/m1");
  });
});

// ─── unenrollStudentFromModule ────────────────────────────────────────────────

describe("unenrollStudentFromModule", () => {
  it("returns error when not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await unenrollStudentFromModule("s1", "m1");

    expect(result).toEqual({ error: "No autenticado" });
  });

  it("deletes enrollment and revalidates path", async () => {
    const user = createMockUser();
    const { client } = new SupabaseMockBuilder()
      .mockAuth(user)
      .mockQuery("profiles", { data: { role: "teacher" }, error: null })
      .mockDelete("module_enrollments", { data: null, error: null })
      .build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await unenrollStudentFromModule("s1", "m1");

    expect(result).toEqual({});
    expect(vi_revalidatePath).toHaveBeenCalledWith("/dashboard/modules/m1");
  });
});

// ─── bulkResetPasswords ───────────────────────────────────────────────────────

describe("bulkResetPasswords", () => {
  it("returns error when not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await bulkResetPasswords(["s1"], "newpass123");

    expect(result).toMatchObject({ error: "No autenticado" });
  });

  it("returns error when password is shorter than 6 chars", async () => {
    mockTeacherAuth();
    mockAdminOps(new SupabaseMockBuilder());

    const result = await bulkResetPasswords(["s1"], "abc");

    expect(result).toEqual({ reset: 0, error: "La contraseña debe tener al menos 6 caracteres" });
  });

  it("returns error when studentIds is empty", async () => {
    mockTeacherAuth();
    mockAdminOps(new SupabaseMockBuilder());

    const result = await bulkResetPasswords([], "password123");

    expect(result).toEqual({ reset: 0, error: "No hay alumnos seleccionados" });
  });

  it("resets passwords and sets must_change_password", async () => {
    mockTeacherAuth();
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminUpdateUserById({ data: { user: { id: "s1" } }, error: null })
        .mockUpdate("profiles", { data: null, error: null })
    );

    const result = await bulkResetPasswords(["s1", "s2"], "newpass123");

    expect(result).toHaveProperty("reset");
    expect(result.reset).toBe(2);
  });
});

// ─── bulkToggleStatus ─────────────────────────────────────────────────────────

describe("bulkToggleStatus", () => {
  it("returns error when not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await bulkToggleStatus(["s1"], true);

    expect(result).toMatchObject({ error: "No autenticado" });
  });

  it("returns error when studentIds is empty", async () => {
    mockTeacherAuth();
    mockAdminOps(new SupabaseMockBuilder());

    const result = await bulkToggleStatus([], true);

    expect(result).toEqual({ updated: 0, error: "No hay alumnos seleccionados" });
  });

  it("bans students and returns updated count", async () => {
    mockTeacherAuth();
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminUpdateUserById({ data: { user: { id: "s1" } }, error: null })
    );

    const result = await bulkToggleStatus(["s1", "s2"], true);

    expect(result).toHaveProperty("updated", 2);
  });

  it("unbans students (ban=false)", async () => {
    mockTeacherAuth();
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminUpdateUserById({ data: { user: { id: "s1" } }, error: null })
    );

    const result = await bulkToggleStatus(["s1"], false);

    expect(result).toHaveProperty("updated", 1);
  });
});

// ─── bulkDeleteStudents ───────────────────────────────────────────────────────

describe("bulkDeleteStudents", () => {
  it("returns error when not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await bulkDeleteStudents(["s1"]);

    expect(result).toMatchObject({ error: "No autenticado" });
  });

  it("returns error when studentIds is empty", async () => {
    mockAdminAuth();
    mockAdminOps(new SupabaseMockBuilder());

    const result = await bulkDeleteStudents([]);

    expect(result).toEqual({ deleted: 0, error: "No hay alumnos seleccionados" });
  });

  it("skips non-@aula.local accounts", async () => {
    mockAdminAuth();
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminGetUserById({ data: { user: { id: "s1", email: "teacher@example.com" } }, error: null })
        .mockAdminDeleteUser({ data: null, error: null })
    );

    const result = await bulkDeleteStudents(["s1"]);

    expect(result).toEqual({ deleted: 0 });
  });

  it("deletes only @aula.local accounts", async () => {
    mockAdminAuth();
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminGetUserById({ data: { user: { id: "s1", email: "alu-001@aula.local" } }, error: null })
        .mockAdminDeleteUser({ data: null, error: null })
    );

    const result = await bulkDeleteStudents(["s1"]);

    expect(result).toEqual({ deleted: 1 });
  });
});

// ─── resetStudentPassword ─────────────────────────────────────────────────────

describe("resetStudentPassword", () => {
  it("returns error when not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await resetStudentPassword("s1", "newpass123");

    expect(result).toEqual({ error: "No autenticado" });
  });

  it("returns error when password is shorter than 6 chars", async () => {
    mockTeacherAuth();
    mockAdminOps(new SupabaseMockBuilder());

    const result = await resetStudentPassword("s1", "abc");

    expect(result).toEqual({ error: "La contraseña debe tener al menos 6 caracteres" });
  });

  it("resets password and sets must_change_password", async () => {
    mockTeacherAuth();
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminUpdateUserById({ data: { user: { id: "s1" } }, error: null })
        .mockUpdate("profiles", { data: null, error: null })
    );

    const result = await resetStudentPassword("s1", "newpass123");

    expect(result).toEqual({});
  });
});

// ─── toggleStudentStatus ──────────────────────────────────────────────────────

describe("toggleStudentStatus", () => {
  it("returns error when not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await toggleStudentStatus("s1", true);

    expect(result).toEqual({ error: "No autenticado" });
  });

  it("bans a student (ban=true)", async () => {
    mockTeacherAuth();
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminUpdateUserById({ data: { user: { id: "s1" } }, error: null })
    );

    const result = await toggleStudentStatus("s1", true);

    expect(result).toEqual({});
  });

  it("unbans a student (ban=false)", async () => {
    mockTeacherAuth();
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminUpdateUserById({ data: { user: { id: "s1" } }, error: null })
    );

    const result = await toggleStudentStatus("s1", false);

    expect(result).toEqual({});
  });
});

// ─── deleteStudent ────────────────────────────────────────────────────────────

describe("deleteStudent", () => {
  it("returns error when not authenticated", async () => {
    const { client } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(client as any);

    const result = await deleteStudent("s1");

    expect(result).toEqual({ error: "No autenticado" });
  });

  it("returns error when trying to delete non-@aula.local account", async () => {
    mockAdminAuth();
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminGetUserById({ data: { user: { id: "s1", email: "teacher@example.com" } }, error: null })
    );

    const result = await deleteStudent("s1");

    expect(result).toEqual({ error: "Solo se pueden eliminar cuentas de clase (@aula.local)" });
  });

  it("deletes @aula.local account successfully", async () => {
    mockAdminAuth();
    mockAdminOps(
      new SupabaseMockBuilder()
        .mockAdminGetUserById({ data: { user: { id: "s1", email: "alu-001@aula.local" } }, error: null })
        .mockAdminDeleteUser({ data: null, error: null })
    );

    const result = await deleteStudent("s1");

    expect(result).toEqual({});
  });
});
