"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

async function requireTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "teacher") throw new Error("Sin permisos.");
  return { supabase, user };
}

// ── Tipos (importados desde fuente compartida) ────────────────────────────────

import type { ClassroomStudent, TeacherModule } from "@/components/students/types";

// ── Listar alumnos matriculados en módulos del profesor ───────────────────────

export async function getClassroomStudents(): Promise<{
  students?: ClassroomStudent[];
  error?: string;
}> {
  let supabase: any;
  let teacherUser: any;
  try {
    const result = await requireTeacher();
    supabase = result.supabase;
    teacherUser = result.user;
  } catch (e: any) {
    return { error: e.message };
  }

  // 1. Obtener IDs de módulos del profesor
  const { data: teacherModules } = await supabase
    .from("modules")
    .select("id")
    .eq("teacher_id", teacherUser.id);

  const moduleIds: string[] = (teacherModules ?? []).map((m: any) => m.id);
  if (moduleIds.length === 0) return { students: [] };

  // 2. Obtener student_ids de las matrículas de esos módulos
  const { data: enrollments } = await supabase
    .from("module_enrollments")
    .select("student_id, modules(id, name)")
    .in("module_id", moduleIds);

  const enrolledStudentIds = [...new Set((enrollments ?? []).map((e: any) => e.student_id))] as string[];
  if (enrolledStudentIds.length === 0) return { students: [] };

  // 3. Obtener info de auth solo para esos alumnos
  const adminClient = createAdminClient();
  const { data: authData, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (error) return { error: error.message };

  const now = new Date();
  const students: ClassroomStudent[] = (authData.users ?? [])
    .filter((u) => u.email?.endsWith("@aula.local") && enrolledStudentIds.includes(u.id))
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

  // 4. Construir mapa de matrículas (solo módulos del profesor)
  const map = new Map<string, Array<{ id: string; name: string }>>();
  (enrollments ?? []).forEach((e: any) => {
    if (!map.has(e.student_id)) map.set(e.student_id, []);
    if (e.modules) map.get(e.student_id)!.push(e.modules);
  });

  students.forEach((s) => {
    s.enrolledModules = map.get(s.id) ?? [];
  });

  return { students: students.sort((a, b) => a.identifier.localeCompare(b.identifier)) };
}

// ── Listar módulos del profesor ───────────────────────────────────────────────

export async function getTeacherModules(): Promise<{
  modules?: TeacherModule[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { data, error } = await supabase
    .from("modules")
    .select("id, name, status")
    .eq("teacher_id", user.id)
    .order("order_index", { ascending: true });

  if (error) return { error: error.message };
  return { modules: data ?? [] };
}

// ── Matriculación en bloque (por prefijo) ─────────────────────────────────────

export async function bulkEnrollByPrefix(
  prefix: string,
  moduleIds: string[]
): Promise<{ enrolled: number; skipped: number; error?: string }> {
  let supabase: any;
  let teacherUser: any;
  try {
    const r = await requireTeacher();
    supabase = r.supabase;
    teacherUser = r.user;
  } catch (e: any) {
    return { enrolled: 0, skipped: 0, error: e.message };
  }

  if (moduleIds.length === 0) return { enrolled: 0, skipped: 0, error: "Selecciona al menos un módulo" };

  const { data: ownedModules } = await supabase
    .from("modules")
    .select("id")
    .eq("teacher_id", teacherUser.id)
    .in("id", moduleIds);

  const ownedIds: string[] = (ownedModules ?? []).map((m: any) => m.id);
  if (ownedIds.length !== moduleIds.length) {
    return { enrolled: 0, skipped: 0, error: "No tienes permisos sobre alguno de los módulos seleccionados" };
  }

  const adminClient = createAdminClient();
  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const targets = (usersData?.users ?? []).filter((u) => {
    if (!u.email?.endsWith("@aula.local")) return false;
    if (!prefix.trim()) return true;
    return u.email.startsWith(prefix.trim().toLowerCase() + "-");
  });

  if (targets.length === 0) return { enrolled: 0, skipped: 0, error: "No se encontraron alumnos con ese prefijo" };

  const rows = targets.flatMap((s) => ownedIds.map((mId) => ({ module_id: mId, student_id: s.id })));
  const { error, count } = await supabase
    .from("module_enrollments")
    .upsert(rows, { onConflict: "module_id,student_id", ignoreDuplicates: true, count: "exact" });

  if (error) return { enrolled: 0, skipped: 0, error: error.message };

  ownedIds.forEach((mId) => revalidatePath(`/dashboard/modules/${mId}`));
  const enrolled = count ?? rows.length;
  return { enrolled, skipped: rows.length - enrolled };
}

// ── Desmatriculación en bloque (por prefijo) ──────────────────────────────────

export async function bulkUnenrollByPrefix(
  prefix: string,
  moduleIds: string[]
): Promise<{ unenrolled: number; error?: string }> {
  let supabase: any;
  let teacherUser: any;
  try {
    const r = await requireTeacher();
    supabase = r.supabase;
    teacherUser = r.user;
  } catch (e: any) {
    return { unenrolled: 0, error: e.message };
  }

  if (moduleIds.length === 0) return { unenrolled: 0, error: "Selecciona al menos un módulo" };

  const { data: ownedModules } = await supabase
    .from("modules")
    .select("id")
    .eq("teacher_id", teacherUser.id)
    .in("id", moduleIds);

  const ownedIds: string[] = (ownedModules ?? []).map((m: any) => m.id);
  if (ownedIds.length !== moduleIds.length) {
    return { unenrolled: 0, error: "No tienes permisos sobre alguno de los módulos seleccionados" };
  }

  const adminClient = createAdminClient();
  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const targets = (usersData?.users ?? []).filter((u) => {
    if (!u.email?.endsWith("@aula.local")) return false;
    if (!prefix.trim()) return true;
    return u.email.startsWith(prefix.trim().toLowerCase() + "-");
  });

  if (targets.length === 0) return { unenrolled: 0, error: "No se encontraron alumnos con ese prefijo" };

  const studentIds = targets.map((u) => u.id);
  const { error, count } = await supabase
    .from("module_enrollments")
    .delete({ count: "exact" })
    .in("module_id", ownedIds)
    .in("student_id", studentIds);

  if (error) return { unenrolled: 0, error: error.message };

  ownedIds.forEach((mId) => revalidatePath(`/dashboard/modules/${mId}`));
  return { unenrolled: count ?? 0 };
}

// ── Desmatriculación en bloque (por IDs de alumno — desde tabla) ──────────────

export async function bulkUnenrollByStudentIds(
  studentIds: string[],
  moduleIds: string[]
): Promise<{ unenrolled: number; error?: string }> {
  let supabase: any;
  let teacherUser: any;
  try {
    const r = await requireTeacher();
    supabase = r.supabase;
    teacherUser = r.user;
  } catch (e: any) {
    return { unenrolled: 0, error: e.message };
  }

  if (moduleIds.length === 0) return { unenrolled: 0, error: "Selecciona al menos un módulo" };
  if (studentIds.length === 0) return { unenrolled: 0, error: "No hay alumnos seleccionados" };

  const { data: ownedModules } = await supabase
    .from("modules")
    .select("id")
    .eq("teacher_id", teacherUser.id)
    .in("id", moduleIds);

  const ownedIds: string[] = (ownedModules ?? []).map((m: any) => m.id);
  if (ownedIds.length !== moduleIds.length) {
    return { unenrolled: 0, error: "No tienes permisos sobre alguno de los módulos seleccionados" };
  }

  const { error, count } = await supabase
    .from("module_enrollments")
    .delete({ count: "exact" })
    .in("module_id", ownedIds)
    .in("student_id", studentIds);

  if (error) return { unenrolled: 0, error: error.message };

  ownedIds.forEach((mId) => revalidatePath(`/dashboard/modules/${mId}`));
  return { unenrolled: count ?? 0 };
}

// ── Matriculación en bloque (por IDs de alumno — desde tabla) ─────────────────

export async function bulkEnrollByStudentIds(
  studentIds: string[],
  moduleIds: string[]
): Promise<{ enrolled: number; skipped: number; error?: string }> {
  let supabase: any;
  let teacherUser: any;
  try {
    const r = await requireTeacher();
    supabase = r.supabase;
    teacherUser = r.user;
  } catch (e: any) {
    return { enrolled: 0, skipped: 0, error: e.message };
  }

  if (moduleIds.length === 0) return { enrolled: 0, skipped: 0, error: "Selecciona al menos un módulo" };
  if (studentIds.length === 0) return { enrolled: 0, skipped: 0, error: "No hay alumnos seleccionados" };

  const { data: ownedModules } = await supabase
    .from("modules")
    .select("id")
    .eq("teacher_id", teacherUser.id)
    .in("id", moduleIds);

  const ownedIds: string[] = (ownedModules ?? []).map((m: any) => m.id);
  if (ownedIds.length !== moduleIds.length) {
    return { enrolled: 0, skipped: 0, error: "No tienes permisos sobre alguno de los módulos seleccionados" };
  }

  const rows = studentIds.flatMap((sId) => ownedIds.map((mId) => ({ module_id: mId, student_id: sId })));
  const { error, count } = await supabase
    .from("module_enrollments")
    .upsert(rows, { onConflict: "module_id,student_id", ignoreDuplicates: true, count: "exact" });

  if (error) return { enrolled: 0, skipped: 0, error: error.message };

  ownedIds.forEach((mId) => revalidatePath(`/dashboard/modules/${mId}`));
  const enrolled = count ?? rows.length;
  return { enrolled, skipped: rows.length - enrolled };
}

// ── Desmatricular alumno de un módulo concreto ────────────────────────────────

export async function unenrollStudentFromModule(
  studentId: string,
  moduleId: string
): Promise<{ error?: string }> {
  let supabase: any;
  try {
    const r = await requireTeacher();
    supabase = r.supabase;
  } catch (e: any) {
    return { error: e.message };
  }

  const { error } = await supabase
    .from("module_enrollments")
    .delete()
    .match({ module_id: moduleId, student_id: studentId });

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/modules/${moduleId}`);
  return {};
}

// ── Reset de contraseña en bloque ─────────────────────────────────────────────

export async function bulkResetPasswords(
  studentIds: string[],
  newPassword: string
): Promise<{ reset: number; error?: string }> {
  try {
    await requireTeacher();
  } catch (e: any) {
    return { reset: 0, error: e.message };
  }

  if (!newPassword || newPassword.length < 6) return { reset: 0, error: "La contraseña debe tener al menos 6 caracteres" };
  if (studentIds.length === 0) return { reset: 0, error: "No hay alumnos seleccionados" };

  const adminClient = createAdminClient();
  const results = await Promise.all(
    studentIds.map((id) =>
      adminClient.auth.admin.updateUserById(id, { password: newPassword })
        .then(({ error }) => {
          if (error) return false;
          return adminClient.from("profiles").update({ must_change_password: true }).eq("id", id).then(() => true);
        })
    )
  );

  return { reset: results.filter(Boolean).length };
}

// ── Cambio de estado en bloque ────────────────────────────────────────────────

export async function bulkToggleStatus(
  studentIds: string[],
  ban: boolean
): Promise<{ updated: number; error?: string }> {
  try {
    await requireTeacher();
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

// ── Reset de contraseña ───────────────────────────────────────────────────────

export async function resetStudentPassword(
  userId: string,
  newPassword: string
): Promise<{ error?: string }> {
  try {
    await requireTeacher();
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

// ── Desactivar / Reactivar cuenta ─────────────────────────────────────────────

export async function toggleStudentStatus(
  userId: string,
  ban: boolean
): Promise<{ error?: string }> {
  try {
    await requireTeacher();
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
