"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

// ── Types ──────────────────────────────────────────────────────────────────────

export type Teacher = {
  id: string;
  name: string;
  email: string;
  banned: boolean;
};

// ── Auth guard ─────────────────────────────────────────────────────────────────

async function requireAdmin() {
  // createClient() verifica el JWT del usuario (con RLS)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // createAdminClient() para leer el perfil: evita cualquier política RLS
  // que pueda bloquear la lectura en el contexto de una server action
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Sin permisos");
  return { supabase, user };
}

// ── Create teacher ─────────────────────────────────────────────────────────────

export async function createTeacher(
  prevState: any,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { error: e.message };
  }

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!name || !email || !password) {
    return { error: "Nombre, email y contraseña son obligatorios" };
  }

  if (email.endsWith("@aula.local")) {
    return { error: "Los profesores deben tener un email real, no @aula.local" };
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role: "teacher" },
  });

  if (error) return { error: error.message };

  await adminClient
    .from("profiles")
    .update({ role: "teacher", must_change_password: true })
    .eq("id", data.user.id);

  revalidatePath("/admin");
  return { success: true };
}

// ── List teachers ──────────────────────────────────────────────────────────────

export async function listTeachers(): Promise<{ teachers?: Teacher[]; error?: string }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { error: e.message };
  }

  const adminClient = createAdminClient();

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("role", "teacher");

  if (profilesError) return { error: profilesError.message };
  if (!profiles || profiles.length === 0) return { teachers: [] };

  const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) return { error: usersError.message };

  const teacherIds = new Set(profiles.map((p: any) => p.id));
  const now = new Date();

  const teachers: Teacher[] = (usersData?.users ?? [])
    .filter((u) => teacherIds.has(u.id))
    .map((u) => ({
      id: u.id,
      name: (u.user_metadata?.full_name as string) || "",
      email: u.email || "",
      banned: !!(u as any).banned_until && new Date((u as any).banned_until) > now,
    }));

  return { teachers: teachers.sort((a, b) => a.name.localeCompare(b.name)) };
}

// ── Reset teacher password ─────────────────────────────────────────────────────

export async function resetTeacherPassword(
  userId: string,
  newPassword: string
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { error: e.message };
  }

  if (!newPassword || newPassword.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres" };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return { error: error.message };

  await adminClient.from("profiles").update({ must_change_password: true }).eq("id", userId);
  return {};
}

// ── Toggle teacher status ──────────────────────────────────────────────────────

export async function toggleTeacherStatus(
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
  revalidatePath("/admin");
  return {};
}

// ── Delete teacher ─────────────────────────────────────────────────────────────

export async function deleteTeacher(userId: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch (e: any) {
    return { error: e.message };
  }

  const adminClient = createAdminClient();
  const { data } = await adminClient.auth.admin.getUserById(userId);

  if (data.user?.email?.endsWith("@aula.local")) {
    return { error: "No se pueden eliminar cuentas de clase desde el panel de administración" };
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  return {};
}
