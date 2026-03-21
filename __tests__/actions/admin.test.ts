import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { SupabaseMockBuilder } from "../helpers/supabase-mock";
import { createFormData } from "../helpers/form-data";
import { createMockUser } from "../helpers/fixtures";
import {
  createTeacher,
  listTeachers,
  resetTeacherPassword,
  toggleTeacherStatus,
  deleteTeacher,
} from "@/app/admin/actions";

const vi_createClient = vi.mocked(createClient);
const vi_createAdminClient = vi.mocked(createAdminClient);
const vi_revalidatePath = vi.mocked(revalidatePath);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockAdminAuth(user = createMockUser()) {
  const { client: authClient } = new SupabaseMockBuilder()
    .mockAuth(user)
    .build();
  vi_createClient.mockResolvedValue(authClient as any);
  return user;
}

function mockAdminProfileAndOps(profileRole: string, opsBuilder: SupabaseMockBuilder) {
  // createAdminClient is used for: (1) requireAdmin profile check and (2) the operation itself
  const { client } = opsBuilder
    .mockQuery("profiles", { data: { role: profileRole }, error: null })
    .build();
  vi_createAdminClient.mockReturnValue(client as any);
  return client;
}

// ─── createTeacher ────────────────────────────────────────────────────────────

describe("createTeacher", () => {
  it("returns error when user is not authenticated", async () => {
    const { client: authClient } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(authClient as any);
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("profiles", { data: { role: "admin" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const formData = createFormData({ name: "Test", email: "test@example.com", password: "password123" });
    const result = await createTeacher(null, formData);

    expect(result).toEqual({ error: "No autenticado" });
  });

  it("returns error when user is not an admin", async () => {
    mockAdminAuth();
    mockAdminProfileAndOps("teacher", new SupabaseMockBuilder());

    const formData = createFormData({ name: "Test", email: "test@example.com", password: "password123" });
    const result = await createTeacher(null, formData);

    expect(result).toEqual({ error: "Sin permisos" });
  });

  it("returns error when required fields are missing", async () => {
    mockAdminAuth();
    mockAdminProfileAndOps("admin", new SupabaseMockBuilder());

    const formData = createFormData({ name: "Test", email: "", password: "password123" });
    const result = await createTeacher(null, formData);

    expect(result).toEqual({ error: "Nombre, email y contraseña son obligatorios" });
  });

  it("returns error when email is @aula.local", async () => {
    mockAdminAuth();
    mockAdminProfileAndOps("admin", new SupabaseMockBuilder());

    const formData = createFormData({ name: "Test", email: "test@aula.local", password: "password123" });
    const result = await createTeacher(null, formData);

    expect(result).toEqual({ error: "Los profesores deben tener un email real, no @aula.local" });
  });

  it("creates teacher and returns success", async () => {
    mockAdminAuth();
    mockAdminProfileAndOps(
      "admin",
      new SupabaseMockBuilder()
        .mockAdminCreateUser({ data: { user: { id: "new-teacher-id" } }, error: null })
        .mockUpdate("profiles", { data: null, error: null })
    );

    const formData = createFormData({ name: "New Teacher", email: "teacher@example.com", password: "securepass" });
    const result = await createTeacher(null, formData);

    expect(result).toEqual({ success: true });
    expect(vi_revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("returns error when createUser fails", async () => {
    mockAdminAuth();
    mockAdminProfileAndOps(
      "admin",
      new SupabaseMockBuilder()
        .mockAdminCreateUser({ data: null, error: { message: "email already registered" } })
    );

    const formData = createFormData({ name: "Test", email: "existing@example.com", password: "password123" });
    const result = await createTeacher(null, formData);

    expect(result).toEqual({ error: "email already registered" });
  });
});

// ─── listTeachers ─────────────────────────────────────────────────────────────

describe("listTeachers", () => {
  it("returns error when user is not authenticated", async () => {
    const { client: authClient } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(authClient as any);
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("profiles", { data: { role: "admin" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await listTeachers();

    expect(result).toEqual({ error: "No autenticado" });
  });

  it("returns empty list when no teachers in profiles", async () => {
    mockAdminAuth();

    // requireAdmin (1st call): profile check returns "admin"
    const { client: requireAdminClient } = new SupabaseMockBuilder()
      .mockQuery("profiles", { data: { role: "admin" }, error: null })
      .build();
    // listTeachers (2nd call): teacher profiles query returns empty
    const { client: listTeachersClient } = new SupabaseMockBuilder()
      .mockQuery("profiles", { data: [], error: null })
      .build();
    vi_createAdminClient
      .mockReturnValueOnce(requireAdminClient as any)
      .mockReturnValueOnce(listTeachersClient as any);

    const result = await listTeachers();

    expect(result).toEqual({ teachers: [] });
  });

  it("returns teachers with ban status detected", async () => {
    mockAdminAuth();
    const now = new Date();
    const futureBan = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString();
    const teacherUsers = [
      { id: "t1", email: "teacher1@example.com", user_metadata: { full_name: "Teacher A" }, banned_until: futureBan },
      { id: "t2", email: "teacher2@example.com", user_metadata: { full_name: "Teacher B" }, banned_until: null },
    ];

    // requireAdmin (1st call): profile check
    const { client: requireAdminClient } = new SupabaseMockBuilder()
      .mockQuery("profiles", { data: { role: "admin" }, error: null })
      .build();
    // listTeachers (2nd call): profiles + listUsers
    const { client: listTeachersClient } = new SupabaseMockBuilder()
      .mockQuery("profiles", { data: [{ id: "t1" }, { id: "t2" }], error: null })
      .mockAdminListUsers({ data: { users: teacherUsers }, error: null })
      .build();
    vi_createAdminClient
      .mockReturnValueOnce(requireAdminClient as any)
      .mockReturnValueOnce(listTeachersClient as any);

    const result = await listTeachers();

    expect(result).toHaveProperty("teachers");
    expect(result.teachers).toHaveLength(2);
    const banned = result.teachers!.find((t) => t.id === "t1");
    const notBanned = result.teachers!.find((t) => t.id === "t2");
    expect(banned?.banned).toBe(true);
    expect(notBanned?.banned).toBe(false);
  });
});

// ─── resetTeacherPassword ─────────────────────────────────────────────────────

describe("resetTeacherPassword", () => {
  it("returns error when user is not authenticated", async () => {
    const { client: authClient } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(authClient as any);
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("profiles", { data: { role: "admin" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await resetTeacherPassword("t1", "newpass1234");

    expect(result).toEqual({ error: "No autenticado" });
  });

  it("returns error when password is shorter than 8 chars", async () => {
    mockAdminAuth();
    mockAdminProfileAndOps("admin", new SupabaseMockBuilder());

    const result = await resetTeacherPassword("t1", "short");

    expect(result).toEqual({ error: "La contraseña debe tener al menos 8 caracteres" });
  });

  it("resets password and sets must_change_password", async () => {
    mockAdminAuth();
    mockAdminProfileAndOps(
      "admin",
      new SupabaseMockBuilder()
        .mockAdminUpdateUserById({ data: { user: { id: "t1" } }, error: null })
        .mockUpdate("profiles", { data: null, error: null })
    );

    const result = await resetTeacherPassword("t1", "newpassword123");

    expect(result).toEqual({});
  });
});

// ─── toggleTeacherStatus ──────────────────────────────────────────────────────

describe("toggleTeacherStatus", () => {
  it("returns error when user is not authenticated", async () => {
    const { client: authClient } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(authClient as any);
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("profiles", { data: { role: "admin" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await toggleTeacherStatus("t1", true);

    expect(result).toEqual({ error: "No autenticado" });
  });

  it("bans a teacher and revalidates /admin", async () => {
    mockAdminAuth();
    mockAdminProfileAndOps(
      "admin",
      new SupabaseMockBuilder()
        .mockAdminUpdateUserById({ data: { user: { id: "t1" } }, error: null })
    );

    const result = await toggleTeacherStatus("t1", true);

    expect(result).toEqual({});
    expect(vi_revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("unbans a teacher (ban=false)", async () => {
    mockAdminAuth();
    mockAdminProfileAndOps(
      "admin",
      new SupabaseMockBuilder()
        .mockAdminUpdateUserById({ data: { user: { id: "t1" } }, error: null })
    );

    const result = await toggleTeacherStatus("t1", false);

    expect(result).toEqual({});
  });
});

// ─── deleteTeacher ────────────────────────────────────────────────────────────

describe("deleteTeacher", () => {
  it("returns error when user is not authenticated", async () => {
    const { client: authClient } = new SupabaseMockBuilder().mockAuth(null).build();
    vi_createClient.mockResolvedValue(authClient as any);
    const { client: adminClient } = new SupabaseMockBuilder()
      .mockQuery("profiles", { data: { role: "admin" }, error: null })
      .build();
    vi_createAdminClient.mockReturnValue(adminClient as any);

    const result = await deleteTeacher("t1");

    expect(result).toEqual({ error: "No autenticado" });
  });

  it("returns error when trying to delete @aula.local account", async () => {
    mockAdminAuth();
    mockAdminProfileAndOps(
      "admin",
      new SupabaseMockBuilder()
        .mockAdminGetUserById({ data: { user: { id: "t1", email: "test@aula.local" } }, error: null })
    );

    const result = await deleteTeacher("t1");

    expect(result).toEqual({ error: "No se pueden eliminar cuentas de clase desde el panel de administración" });
  });

  it("deletes teacher with real email and revalidates /admin", async () => {
    mockAdminAuth();
    mockAdminProfileAndOps(
      "admin",
      new SupabaseMockBuilder()
        .mockAdminGetUserById({ data: { user: { id: "t1", email: "teacher@example.com" } }, error: null })
        .mockAdminDeleteUser({ data: null, error: null })
    );

    const result = await deleteTeacher("t1");

    expect(result).toEqual({});
    expect(vi_revalidatePath).toHaveBeenCalledWith("/admin");
  });
});
