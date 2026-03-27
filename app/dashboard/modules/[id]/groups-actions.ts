"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getModuleAccess } from "@/lib/module-access";
import type { ModuleGroupWithMembers, GroupsEnrollmentMode } from "@/types/groups";

// ─── Helpers de autenticación ────────────────────────────────────────────────

async function requireTeacher() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." as const, supabase: null, user: null };

    const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();

    if (profile?.role !== "teacher") {
        return { error: "Solo profesores." as const, supabase: null, user: null };
    }
    return { error: null, supabase, user };
}

async function requireManageStudents(moduleId: string) {
    const auth = await requireTeacher();
    if (auth.error || !auth.supabase || !auth.user) {
        return { error: auth.error, supabase: null, user: null };
    }
    const access = await getModuleAccess(moduleId, auth.user.id);
    if (!access?.permissions.canManageStudents) {
        return { error: "No tienes permiso para gestionar grupos en este módulo.", supabase: null, user: null };
    }
    return { error: null, supabase: auth.supabase, user: auth.user };
}

async function requireStudent() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." as const, supabase: null, user: null };

    const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();

    if (profile?.role !== "student") {
        return { error: "Solo alumnos." as const, supabase: null, user: null };
    }
    return { error: null, supabase, user };
}

// ─── Lectura ─────────────────────────────────────────────────────────────────

export async function getModuleGroups(
    moduleId: string,
): Promise<{ groups?: ModuleGroupWithMembers[]; error?: string }> {
    const admin = createAdminClient();

    const { data, error } = await admin
        .from("module_groups")
        .select(`
            id, module_id, name, status, color, max_members, created_by, created_at, updated_at,
            members:module_group_members(
                id, group_id, student_id, joined_at,
                profile:profiles(id, full_name, avatar_url)
            )
        `)
        .eq("module_id", moduleId)
        .eq("status", "active")
        .order("created_at");

    if (error) return { error: error.message };
    return { groups: (data as unknown as ModuleGroupWithMembers[]) ?? [] };
}

export async function getModuleGroupsEnrollmentMode(
    moduleId: string,
): Promise<{ mode?: GroupsEnrollmentMode; error?: string }> {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("modules")
        .select("groups_enrollment_mode")
        .eq("id", moduleId)
        .single();

    if (error) return { error: error.message };
    return { mode: (data?.groups_enrollment_mode ?? "teacher_assigned") as GroupsEnrollmentMode };
}

// ─── Acciones del profesor ────────────────────────────────────────────────────

export async function createGroup(
    moduleId: string,
    name: string,
    color?: string,
    maxMembers?: number,
): Promise<{ error?: string }> {
    const { error: authError, user } = await requireManageStudents(moduleId);
    if (authError || !user) return { error: authError ?? "Sin permisos." };

    const admin = createAdminClient();
    const { error } = await admin.from("module_groups").insert({
        module_id: moduleId,
        name: name.trim(),
        color: color ?? null,
        max_members: maxMembers ?? null,
        created_by: user.id,
    });

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/modules/${moduleId}`);
    return {};
}

export async function updateGroup(
    moduleId: string,
    groupId: string,
    patch: { name?: string; color?: string | null; status?: "active" | "archived"; max_members?: number | null },
): Promise<{ error?: string }> {
    const { error: authError } = await requireManageStudents(moduleId);
    if (authError) return { error: authError };

    const admin = createAdminClient();
    const { error } = await admin
        .from("module_groups")
        .update({ ...patch, ...(patch.name ? { name: patch.name.trim() } : {}) })
        .eq("id", groupId)
        .eq("module_id", moduleId);

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/modules/${moduleId}`);
    return {};
}

export async function deleteGroup(
    moduleId: string,
    groupId: string,
): Promise<{ error?: string }> {
    const { error: authError } = await requireManageStudents(moduleId);
    if (authError) return { error: authError };

    const admin = createAdminClient();
    const { error } = await admin
        .from("module_groups")
        .delete()
        .eq("id", groupId)
        .eq("module_id", moduleId);

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/modules/${moduleId}`);
    return {};
}

export async function addStudentToGroup(
    moduleId: string,
    groupId: string,
    studentId: string,
): Promise<{ error?: string }> {
    const { error: authError } = await requireManageStudents(moduleId);
    if (authError) return { error: authError };

    const admin = createAdminClient();

    // Primero quitar al alumno de cualquier otro grupo en este módulo
    const { data: existingGroups } = await admin
        .from("module_groups")
        .select("id")
        .eq("module_id", moduleId);

    const groupIds = (existingGroups ?? []).map((g: { id: string }) => g.id);
    if (groupIds.length > 0) {
        await admin
            .from("module_group_members")
            .delete()
            .eq("student_id", studentId)
            .in("group_id", groupIds)
            .neq("group_id", groupId);
    }

    const { error } = await admin
        .from("module_group_members")
        .upsert({ group_id: groupId, student_id: studentId }, { onConflict: "group_id,student_id" });

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/modules/${moduleId}`);
    return {};
}

export async function removeStudentFromGroup(
    moduleId: string,
    groupId: string,
    studentId: string,
): Promise<{ error?: string }> {
    const { error: authError } = await requireManageStudents(moduleId);
    if (authError) return { error: authError };

    const admin = createAdminClient();
    const { error } = await admin
        .from("module_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("student_id", studentId);

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/modules/${moduleId}`);
    return {};
}

export async function autoAssignGroups(
    moduleId: string,
    groupCount: number,
): Promise<{ error?: string; assigned?: number }> {
    const { error: authError } = await requireManageStudents(moduleId);
    if (authError) return { error: authError };

    const admin = createAdminClient();

    // Obtener alumnos matriculados sin grupo
    const { data: enrollments } = await admin
        .from("module_enrollments")
        .select("student_id")
        .eq("module_id", moduleId);

    const allStudentIds: string[] = (enrollments ?? []).map((e: { student_id: string }) => e.student_id);

    const { data: existingGroups } = await admin
        .from("module_groups")
        .select("id")
        .eq("module_id", moduleId)
        .eq("status", "active");

    const existingGroupIds = (existingGroups ?? []).map((g: { id: string }) => g.id);

    let alreadyAssigned: string[] = [];
    if (existingGroupIds.length > 0) {
        const { data: members } = await admin
            .from("module_group_members")
            .select("student_id")
            .in("group_id", existingGroupIds);
        alreadyAssigned = (members ?? []).map((m: { student_id: string }) => m.student_id);
    }

    const unassigned = allStudentIds.filter((id) => !alreadyAssigned.includes(id));
    if (unassigned.length === 0) return { assigned: 0 };

    // Crear los grupos si no existen suficientes
    const groupsNeeded = Math.max(0, groupCount - existingGroupIds.length);
    const newGroupIds: string[] = [];

    if (groupsNeeded > 0) {
        const newGroups = Array.from({ length: groupsNeeded }, (_, i) => ({
            module_id: moduleId,
            name: `Grupo ${existingGroupIds.length + i + 1}`,
        }));
        const { data: created, error: createError } = await admin
            .from("module_groups")
            .insert(newGroups)
            .select("id");
        if (createError) return { error: createError.message };
        newGroupIds.push(...(created ?? []).map((g: { id: string }) => g.id));
    }

    const allGroupIds = [...existingGroupIds, ...newGroupIds].slice(0, groupCount);

    // Distribución round-robin aleatoria
    const shuffled = [...unassigned].sort(() => Math.random() - 0.5);
    const insertRows = shuffled.map((studentId, i) => ({
        group_id: allGroupIds[i % allGroupIds.length],
        student_id: studentId,
    }));

    const { error: insertError } = await admin
        .from("module_group_members")
        .insert(insertRows);

    if (insertError) return { error: insertError.message };
    revalidatePath(`/dashboard/modules/${moduleId}`);
    return { assigned: insertRows.length };
}

export async function setModuleGroupsMode(
    moduleId: string,
    mode: GroupsEnrollmentMode,
): Promise<{ error?: string }> {
    const { error: authError } = await requireManageStudents(moduleId);
    if (authError) return { error: authError };

    const admin = createAdminClient();
    const { error } = await admin
        .from("modules")
        .update({ groups_enrollment_mode: mode })
        .eq("id", moduleId);

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/modules/${moduleId}`);
    return {};
}

// ─── Acción del alumno ────────────────────────────────────────────────────────

export async function studentJoinGroup(
    groupId: string,
): Promise<{ error?: string }> {
    const { error: authError, supabase, user } = await requireStudent();
    if (authError || !supabase || !user) return { error: authError ?? "Sin permisos." };

    // Verificar que el grupo existe, está activo y en modo self_enrollment
    const { data: group, error: groupError } = await supabase
        .from("module_groups")
        .select("id, module_id, max_members, status")
        .eq("id", groupId)
        .eq("status", "active")
        .single();

    if (groupError || !group) return { error: "Grupo no encontrado." };

    // Verificar modo self_enrollment en el módulo
    const { data: module } = await supabase
        .from("modules")
        .select("groups_enrollment_mode")
        .eq("id", group.module_id)
        .single();

    if (module?.groups_enrollment_mode !== "self_enrollment") {
        return { error: "La inscripción libre no está habilitada en este módulo." };
    }

    // Verificar que el alumno está matriculado en el módulo
    const { data: enrollment } = await supabase
        .from("module_enrollments")
        .select("student_id")
        .eq("module_id", group.module_id)
        .eq("student_id", user.id)
        .single();

    if (!enrollment) return { error: "No estás matriculado en este módulo." };

    // Verificar máximo de miembros si está configurado
    if (group.max_members !== null) {
        const { count } = await supabase
            .from("module_group_members")
            .select("id", { count: "exact", head: true })
            .eq("group_id", groupId);

        if ((count ?? 0) >= group.max_members) {
            return { error: "Este grupo ya está completo." };
        }
    }

    // Quitar al alumno de cualquier otro grupo en este módulo antes de unirse
    const admin = createAdminClient();
    const { data: moduleGroups } = await admin
        .from("module_groups")
        .select("id")
        .eq("module_id", group.module_id);

    const moduleGroupIds = (moduleGroups ?? []).map((g: { id: string }) => g.id);
    if (moduleGroupIds.length > 0) {
        await admin
            .from("module_group_members")
            .delete()
            .eq("student_id", user.id)
            .in("group_id", moduleGroupIds)
            .neq("group_id", groupId);
    }

    const { error: insertError } = await supabase
        .from("module_group_members")
        .insert({ group_id: groupId, student_id: user.id });

    if (insertError) return { error: insertError.message };
    revalidatePath(`/dashboard/modules/${group.module_id}`);
    return {};
}

export async function getMyGroupForModule(
    moduleId: string,
): Promise<{ group?: ModuleGroupWithMembers | null; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };

    const { data, error } = await supabase
        .from("module_group_members")
        .select(`
            group:module_groups(
                id, module_id, name, status, color, max_members, created_by, created_at, updated_at,
                members:module_group_members(
                    id, group_id, student_id, joined_at,
                    profile:profiles(id, full_name, avatar_url)
                )
            )
        `)
        .eq("student_id", user.id)
        .filter("group.module_id", "eq", moduleId)
        .maybeSingle();

    if (error) return { error: error.message };
    return { group: (data as any)?.group ?? null };
}
