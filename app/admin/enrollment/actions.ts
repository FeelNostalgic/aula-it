"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "../auth-guard";
import type { AdminModule } from "@/components/students/types";

export type AdminTeacher = {
  id: string;
  name: string;
};

// ── Listar todos los módulos con su profesor ──────────────────────────────────

export async function getAllModulesWithTeachers(): Promise<{
  modules?: AdminModule[];
  error?: string;
}> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { error: e.message };
  }

  const adminClient = createAdminClient();

  const [{ data: modulesData, error }, { data: profilesData }] = await Promise.all([
    adminClient.from("modules").select("id, name, status, teacher_id").order("name", { ascending: true }),
    adminClient.from("profiles").select("id, full_name").eq("role", "teacher"),
  ]);

  if (error) return { error: error.message };

  const teacherMap = new Map((profilesData ?? []).map((p: any) => [p.id, p.full_name ?? "Sin nombre"]));

  const modules: AdminModule[] = (modulesData ?? []).map((m: any) => ({
    id: m.id,
    name: m.name,
    status: m.status,
    teacher_id: m.teacher_id,
    teacher_name: teacherMap.get(m.teacher_id) ?? "Sin profesor",
  }));

  return { modules };
}

// ── Listar todos los profesores ───────────────────────────────────────────────

export async function getAllTeachers(): Promise<{
  teachers?: AdminTeacher[];
  error?: string;
}> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { error: e.message };
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .eq("role", "teacher")
    .order("full_name", { ascending: true });

  if (error) return { error: error.message };

  const teachers: AdminTeacher[] = (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.full_name ?? p.id,
  }));

  return { teachers };
}

// ── Matriculación en bloque (por prefijo, sin restricción de ownership) ───────

export async function adminBulkEnrollByPrefix(
  prefix: string,
  moduleIds: string[]
): Promise<{ enrolled: number; skipped: number; error?: string }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { enrolled: 0, skipped: 0, error: e.message };
  }

  if (moduleIds.length === 0) return { enrolled: 0, skipped: 0, error: "Selecciona al menos un módulo" };

  const adminClient = createAdminClient();
  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const targets = (usersData?.users ?? []).filter((u) => {
    if (!u.email?.endsWith("@aula.local")) return false;
    if (!prefix.trim()) return true;
    return u.email.startsWith(prefix.trim().toLowerCase() + "-");
  });

  if (targets.length === 0) return { enrolled: 0, skipped: 0, error: "No se encontraron alumnos con ese prefijo" };

  const rows = targets.flatMap((s) => moduleIds.map((mId) => ({ module_id: mId, student_id: s.id })));
  const { error, count } = await adminClient
    .from("module_enrollments")
    .upsert(rows, { onConflict: "module_id,student_id", ignoreDuplicates: true, count: "exact" });

  if (error) return { enrolled: 0, skipped: 0, error: error.message };

  const enrolled = count ?? rows.length;
  return { enrolled, skipped: rows.length - enrolled };
}

// ── Desmatriculación en bloque (por prefijo, sin restricción de ownership) ────

export async function adminBulkUnenrollByPrefix(
  prefix: string,
  moduleIds: string[]
): Promise<{ unenrolled: number; error?: string }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { unenrolled: 0, error: e.message };
  }

  if (moduleIds.length === 0) return { unenrolled: 0, error: "Selecciona al menos un módulo" };

  const adminClient = createAdminClient();
  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const targets = (usersData?.users ?? []).filter((u) => {
    if (!u.email?.endsWith("@aula.local")) return false;
    if (!prefix.trim()) return true;
    return u.email.startsWith(prefix.trim().toLowerCase() + "-");
  });

  if (targets.length === 0) return { unenrolled: 0, error: "No se encontraron alumnos con ese prefijo" };

  const studentIds = targets.map((u) => u.id);
  const { error, count } = await adminClient
    .from("module_enrollments")
    .delete({ count: "exact" })
    .in("module_id", moduleIds)
    .in("student_id", studentIds);

  if (error) return { unenrolled: 0, error: error.message };
  return { unenrolled: count ?? 0 };
}

// ── Matriculación en bloque (por IDs de alumno) ───────────────────────────────

export async function adminBulkEnrollByStudentIds(
  studentIds: string[],
  moduleIds: string[]
): Promise<{ enrolled: number; skipped: number; error?: string }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { enrolled: 0, skipped: 0, error: e.message };
  }

  if (moduleIds.length === 0) return { enrolled: 0, skipped: 0, error: "Selecciona al menos un módulo" };
  if (studentIds.length === 0) return { enrolled: 0, skipped: 0, error: "No hay alumnos seleccionados" };

  const adminClient = createAdminClient();
  const rows = studentIds.flatMap((sId) => moduleIds.map((mId) => ({ module_id: mId, student_id: sId })));
  const { error, count } = await adminClient
    .from("module_enrollments")
    .upsert(rows, { onConflict: "module_id,student_id", ignoreDuplicates: true, count: "exact" });

  if (error) return { enrolled: 0, skipped: 0, error: error.message };

  const enrolled = count ?? rows.length;
  return { enrolled, skipped: rows.length - enrolled };
}

// ── Desmatriculación en bloque (por IDs de alumno) ────────────────────────────

export async function adminBulkUnenrollByStudentIds(
  studentIds: string[],
  moduleIds: string[]
): Promise<{ unenrolled: number; error?: string }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { unenrolled: 0, error: e.message };
  }

  if (moduleIds.length === 0) return { unenrolled: 0, error: "Selecciona al menos un módulo" };
  if (studentIds.length === 0) return { unenrolled: 0, error: "No hay alumnos seleccionados" };

  const adminClient = createAdminClient();
  const { error, count } = await adminClient
    .from("module_enrollments")
    .delete({ count: "exact" })
    .in("module_id", moduleIds)
    .in("student_id", studentIds);

  if (error) return { unenrolled: 0, error: error.message };
  return { unenrolled: count ?? 0 };
}
