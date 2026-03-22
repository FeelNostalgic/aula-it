"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "../auth-guard";
import type { ClassroomStudent, BulkCreateResult } from "@/components/students/types";

// ── Creación masiva ───────────────────────────────────────────────────────────

export async function createBulkStudents(
  prevState: any,
  formData: FormData
): Promise<{ results?: BulkCreateResult[]; error?: string }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { error: e.message };
  }

  const prefix = (formData.get("prefix") as string)?.trim().toUpperCase();
  const count = parseInt(formData.get("count") as string, 10);
  const password = formData.get("password") as string;

  if (!prefix || !/^[A-Z0-9]+$/.test(prefix)) {
    return { error: "El prefijo solo puede contener letras y números (ej: ALU, 1DAW)" };
  }
  if (isNaN(count) || count < 1 || count > 60) {
    return { error: "El número de alumnos debe estar entre 1 y 60" };
  }
  if (!password || password.length < 6) {
    return { error: "La contraseña maestra debe tener al menos 6 caracteres" };
  }

  const adminClient = createAdminClient();
  const results: BulkCreateResult[] = [];

  const { data: existingUsers } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const prefixEmail = prefix.toLowerCase() + "-";
  const existingNumbers = (existingUsers?.users ?? [])
    .filter((u) => u.email?.startsWith(prefixEmail) && u.email?.endsWith("@aula.local"))
    .map((u) => {
      const match = u.email!.replace("@aula.local", "").slice(prefixEmail.length);
      return parseInt(match, 10);
    })
    .filter((n) => !isNaN(n));
  const startIndex = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

  for (let i = startIndex; i < startIndex + count; i++) {
    const num = String(i).padStart(3, "0");
    const identifier = `${prefix}-${num}`;
    const email = `${prefix.toLowerCase()}-${num}@aula.local`;

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: identifier, role: "student" },
    });

    if (error) {
      results.push({ identifier, password, error: error.message });
      continue;
    }

    await adminClient
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", data.user.id);

    results.push({ identifier, password, userId: data.user.id, email });
  }

  return { results };
}

// ── Listar todos los alumnos del sistema ──────────────────────────────────────

export async function getAdminStudents(): Promise<{
  students?: ClassroomStudent[];
  error?: string;
}> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { error: e.message };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (error) return { error: error.message };

  const now = new Date();
  const students: ClassroomStudent[] = (data.users ?? [])
    .filter((u) => u.email?.endsWith("@aula.local"))
    .map((u) => {
      const bannedUntil = (u as any).banned_until as string | undefined;
      return {
        id: u.id,
        identifier: (u.user_metadata?.full_name as string) ?? u.email ?? u.id,
        email: u.email ?? "",
        is_banned: !!bannedUntil && new Date(bannedUntil) > now,
        enrolledModules: [],
      };
    });

  if (students.length > 0) {
    const studentIds = students.map((s) => s.id);
    const { data: enrollments } = await adminClient
      .from("module_enrollments")
      .select("student_id, modules(id, name)")
      .in("student_id", studentIds);

    const map = new Map<string, Array<{ id: string; name: string }>>();
    (enrollments ?? []).forEach((e: any) => {
      if (!map.has(e.student_id)) map.set(e.student_id, []);
      if (e.modules) map.get(e.student_id)!.push(e.modules);
    });

    students.forEach((s) => {
      s.enrolledModules = map.get(s.id) ?? [];
    });
  }

  return {
    students: students.sort((a, b) => a.identifier.localeCompare(b.identifier)),
  };
}

// ── Reset de contraseña ───────────────────────────────────────────────────────

export async function resetStudentPassword(
  userId: string,
  newPassword: string
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { error: e.message };
  }

  if (!newPassword || newPassword.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres" };

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return { error: error.message };

  await adminClient.from("profiles").update({ must_change_password: true }).eq("id", userId);
  return {};
}

// ── Reset en bloque ───────────────────────────────────────────────────────────

export async function bulkResetPasswords(
  studentIds: string[],
  newPassword: string
): Promise<{ reset: number; error?: string }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { reset: 0, error: e.message };
  }

  if (!newPassword || newPassword.length < 6) return { reset: 0, error: "La contraseña debe tener al menos 6 caracteres" };
  if (studentIds.length === 0) return { reset: 0, error: "No hay alumnos seleccionados" };

  const adminClient = createAdminClient();
  const results = await Promise.all(
    studentIds.map((id) =>
      adminClient.auth.admin.updateUserById(id, { password: newPassword }).then(({ error }) => {
        if (error) return false;
        return adminClient.from("profiles").update({ must_change_password: true }).eq("id", id).then(() => true);
      })
    )
  );

  return { reset: results.filter(Boolean).length };
}

// ── Cambio de estado ──────────────────────────────────────────────────────────

export async function toggleStudentStatus(
  userId: string,
  ban: boolean
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { error: e.message };
  }

  const adminClient = createAdminClient();
  const { error } = await (adminClient.auth.admin.updateUserById as any)(userId, {
    ban_duration: ban ? "876600h" : "none",
  });

  if (error) return { error: error.message };
  return {};
}

// ── Cambio de estado en bloque ────────────────────────────────────────────────

export async function bulkToggleStatus(
  studentIds: string[],
  ban: boolean
): Promise<{ updated: number; error?: string }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { updated: 0, error: e.message };
  }

  if (studentIds.length === 0) return { updated: 0, error: "No hay alumnos seleccionados" };

  const adminClient = createAdminClient();
  const results = await Promise.all(
    studentIds.map((id) =>
      (adminClient.auth.admin.updateUserById as any)(id, {
        ban_duration: ban ? "876600h" : "none",
      }).then(({ error }: any) => !error)
    )
  );

  return { updated: results.filter(Boolean).length };
}

// ── Eliminar cuenta ───────────────────────────────────────────────────────────

export async function deleteStudent(userId: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { error: e.message };
  }

  const adminClient = createAdminClient();
  const { data: targetUserData } = await adminClient.auth.admin.getUserById(userId);
  if (!targetUserData.user?.email?.endsWith("@aula.local")) {
    return { error: "Solo se pueden eliminar cuentas de clase (@aula.local)" };
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  return {};
}

// ── Eliminación en bloque ─────────────────────────────────────────────────────

export async function bulkDeleteStudents(
  studentIds: string[]
): Promise<{ deleted: number; error?: string }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { deleted: 0, error: e.message };
  }

  if (studentIds.length === 0) return { deleted: 0, error: "No hay alumnos seleccionados" };

  const adminClient = createAdminClient();
  let deleted = 0;

  for (const id of studentIds) {
    const { data } = await adminClient.auth.admin.getUserById(id);
    if (!data.user?.email?.endsWith("@aula.local")) continue;
    const { error } = await adminClient.auth.admin.deleteUser(id);
    if (!error) deleted++;
  }

  return { deleted };
}

// ── Desmatricular de módulo concreto ─────────────────────────────────────────

export async function unenrollStudentFromModule(
  studentId: string,
  moduleId: string
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { error: e.message };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("module_enrollments")
    .delete()
    .match({ module_id: moduleId, student_id: studentId });

  if (error) return { error: error.message };
  return {};
}
