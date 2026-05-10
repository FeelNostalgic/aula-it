"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getModuleAccess } from "@/lib/module-access";
import type {
    GroupRoleMode,
    ModuleGroupRole,
    ModuleGroupWithMembers,
    ModuleGroupWorkLog,
    GroupsEnrollmentMode,
} from "@/types/groups";

interface TeacherWorkLog extends ModuleGroupWorkLog {
    group: {
        id: string;
        name: string;
        color: string | null;
    } | null;
}

interface TeacherWorkLogRow {
    id: string;
    group_id: string;
    student_id: string;
    entry_date: string;
    content: string;
    created_at: string;
    updated_at: string;
    profile: Array<{
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    }>;
    group: Array<{
        id: string;
        name: string;
        color: string | null;
    }>;
}

interface StudentWorkLogRow {
    id: string;
    group_id: string;
    student_id: string;
    entry_date: string;
    content: string;
    created_at: string;
    updated_at: string;
    profile: Array<{
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    }>;
}

interface StudentGroupMembership {
    id: string;
    group_id: string;
    student_id: string;
    role_text: string | null;
    predefined_role_id: string | null;
}

interface GroupIdentityPatch {
    color?: string | null;
    name?: string;
}

interface GroupUpdatePatch extends GroupIdentityPatch {
    status?: "active" | "archived";
    max_members?: number | null;
}

interface GroupRoleSettings {
    mode: GroupRoleMode;
    roles: ModuleGroupRole[];
}

const GROUP_ROLE_MODE = {
    FREE_TEXT: "free_text",
    PREDEFINED: "predefined",
} as const;

const MAX_ROLE_NAME_LENGTH = 80;
const MAX_WORK_LOG_LENGTH = 4000;
const MADRID_TIMEZONE = "Europe/Madrid";

type PostgrestLikeError = {
    code?: string;
    message: string;
};

// ─── Helpers de normalización ────────────────────────────────────────────────

function normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, " ");
}

function todayInMadrid(): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: MADRID_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

function isUniqueViolation(error: PostgrestLikeError | null | undefined): boolean {
    return error?.code === "23505";
}

function isCheckViolation(error: PostgrestLikeError | null | undefined): boolean {
    return error?.code === "23514";
}

function isForeignKeyViolation(error: PostgrestLikeError | null | undefined): boolean {
    return error?.code === "23503";
}

function mapRoleAssignmentError(error: PostgrestLikeError | null | undefined): string {
    if (isUniqueViolation(error)) {
        return "Ese rol ya está ocupado en tu grupo.";
    }
    if (isForeignKeyViolation(error)) {
        return "El rol predefinido seleccionado ya no existe.";
    }
    if (isCheckViolation(error)) {
        return "Solo puedes guardar un tipo de rol a la vez.";
    }
    return error?.message ?? "No se pudo guardar el rol del grupo.";
}

async function ensureModuleEnrollment(moduleId: string, studentId: string): Promise<boolean> {
    const admin = createAdminClient();
    const { data } = await admin
        .from("module_enrollments")
        .select("student_id")
        .eq("module_id", moduleId)
        .eq("student_id", studentId)
        .maybeSingle();

    return !!data;
}

async function ensureModuleStudentViewer(moduleId: string, studentId: string): Promise<boolean> {
    return ensureModuleEnrollment(moduleId, studentId);
}

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

async function getActiveModuleGroupIds(moduleId: string): Promise<string[]> {
    const admin = createAdminClient();
    const { data } = await admin
        .from("module_groups")
        .select("id")
        .eq("module_id", moduleId)
        .eq("status", "active");

    return (data ?? []).map((group: { id: string }) => group.id);
}

async function getStudentMembershipForModule(moduleId: string, studentId: string): Promise<StudentGroupMembership | null> {
    const admin = createAdminClient();
    const groupIds = await getActiveModuleGroupIds(moduleId);

    if (groupIds.length === 0) {
        return null;
    }

    const { data } = await admin
        .from("module_group_members")
        .select("id, group_id, student_id, role_text, predefined_role_id")
        .eq("student_id", studentId)
        .in("group_id", groupIds)
        .maybeSingle();

    return (data as StudentGroupMembership | null) ?? null;
}

async function getGroupRoleMode(moduleId: string): Promise<GroupRoleMode> {
    const admin = createAdminClient();
    const { data } = await admin
        .from("modules")
        .select("group_role_mode")
        .eq("id", moduleId)
        .single();

    return (data?.group_role_mode ?? GROUP_ROLE_MODE.FREE_TEXT) as GroupRoleMode;
}

async function getRoleCount(moduleId: string): Promise<number> {
    const admin = createAdminClient();
    const { count } = await admin
        .from("module_group_roles")
        .select("id", { count: "exact", head: true })
        .eq("module_id", moduleId);

    return count ?? 0;
}

async function getGroupMemberCount(groupId: string): Promise<number> {
    const admin = createAdminClient();
    const { count } = await admin
        .from("module_group_members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", groupId);

    return count ?? 0;
}

async function ensureActiveGroupIdentityAvailable(
    moduleId: string,
    patch: GroupIdentityPatch,
    excludeGroupId?: string,
): Promise<string | null> {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("module_groups")
        .select("id, name, color")
        .eq("module_id", moduleId)
        .eq("status", "active");

    if (error) {
        return error.message;
    }

    const normalizedName = patch.name ? normalizeText(patch.name).toLocaleLowerCase() : null;
    const normalizedColor = patch.color ? patch.color.toLocaleLowerCase() : null;

    for (const group of data ?? []) {
        if (excludeGroupId && group.id === excludeGroupId) {
            continue;
        }
        if (normalizedName && normalizeText(group.name).toLocaleLowerCase() === normalizedName) {
            return "Ya existe un grupo activo con ese nombre.";
        }
        if (normalizedColor && group.color?.toLocaleLowerCase() === normalizedColor) {
            return "Ya existe un grupo activo con ese color.";
        }
    }

    return null;
}

async function ensurePredefinedRoleCapacity(moduleId: string, nextGroupSizes: number[]): Promise<string | null> {
    const roleMode = await getGroupRoleMode(moduleId);
    if (roleMode !== GROUP_ROLE_MODE.PREDEFINED) {
        return null;
    }

    const roleCount = await getRoleCount(moduleId);
    if (roleCount === 0) {
        return "No puedes usar roles predefinidos sin haber creado antes los roles del módulo.";
    }

    const exceeds = nextGroupSizes.some((size) => size > roleCount);
    if (exceeds) {
        return `No hay suficientes roles predefinidos únicos. Cada grupo necesita como máximo ${roleCount} roles disponibles.`;
    }

    return null;
}

async function getCurrentGroupSizes(moduleId: string): Promise<number[]> {
    const { groups } = await getModuleGroups(moduleId);
    return (groups ?? []).map((group) => group.members.length);
}

async function getModuleGroupRoles(moduleId: string): Promise<ModuleGroupRole[]> {
    const admin = createAdminClient();
    const { data } = await admin
        .from("module_group_roles")
        .select("id, module_id, name, position, created_at, updated_at")
        .eq("module_id", moduleId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });

    return (data as ModuleGroupRole[] | null) ?? [];
}

function normalizeEntryDate(entryDate?: string): string {
    const normalized = entryDate?.trim() || todayInMadrid();
    return normalized;
}

function normalizeTeacherWorkLog(row: TeacherWorkLogRow): TeacherWorkLog {
    return {
        id: row.id,
        group_id: row.group_id,
        student_id: row.student_id,
        entry_date: row.entry_date,
        content: row.content,
        created_at: row.created_at,
        updated_at: row.updated_at,
        profile: row.profile[0] ?? null,
        group: row.group[0] ?? null,
    };
}

function normalizeStudentWorkLog(row: StudentWorkLogRow): ModuleGroupWorkLog {
    return {
        id: row.id,
        group_id: row.group_id,
        student_id: row.student_id,
        entry_date: row.entry_date,
        content: row.content,
        created_at: row.created_at,
        updated_at: row.updated_at,
        profile: row.profile[0] ?? null,
    };
}

// ─── Lectura ─────────────────────────────────────────────────────────────────

export async function getModuleGroups(
    moduleId: string,
): Promise<{ groups?: ModuleGroupWithMembers[]; error?: string }> {
    const admin = createAdminClient();

    const { data, error } = await admin
        .from("module_groups")
        .select(`
            id, module_id, name, status, color, max_members, representative_student_id, created_by, created_at, updated_at,
            members:module_group_members(
                id, group_id, student_id, joined_at, role_text, predefined_role_id,
                profile:profiles(id, full_name, avatar_url),
                predefined_role:module_group_roles(id, module_id, name, position, created_at, updated_at)
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

export async function getModuleGroupRoleSettings(
    moduleId: string,
): Promise<{ settings?: GroupRoleSettings; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile) return { error: "Perfil no encontrado." };

    if (profile.role === "teacher") {
        const access = await getModuleAccess(moduleId, user.id);
        if (!access) return { error: "No tienes acceso a este módulo." };
    } else {
        const enrolled = await ensureModuleStudentViewer(moduleId, user.id);
        if (!enrolled) return { error: "No estás matriculado en este módulo." };
    }

    const [mode, roles] = await Promise.all([
        getGroupRoleMode(moduleId),
        getModuleGroupRoles(moduleId),
    ]);

    return { settings: { mode, roles } };
}

export async function getTeacherGroupWorkLogs(
    moduleId: string,
    entryDate?: string,
): Promise<{ logs?: TeacherWorkLog[]; error?: string }> {
    const { error: authError } = await requireManageStudents(moduleId);
    if (authError) return { error: authError };

    const admin = createAdminClient();
    const normalizedDate = entryDate?.trim();
    const groupIds = await getActiveModuleGroupIds(moduleId);
    if (groupIds.length === 0) return { logs: [] };

    let query = admin
        .from("module_group_work_logs")
        .select(`
            id, group_id, student_id, entry_date, content, created_at, updated_at,
            profile:profiles(id, full_name, avatar_url),
            group:module_groups(id, name, color)
        `)
        .in("group_id", groupIds)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

    if (normalizedDate) {
        query = query.eq("entry_date", normalizedDate);
    }

    const { data, error } = await query;
    if (error) return { error: error.message };
    return { logs: ((data as TeacherWorkLogRow[] | null) ?? []).map(normalizeTeacherWorkLog) };
}

export async function getMyGroupWorkLogs(
    moduleId: string,
): Promise<{ logs?: ModuleGroupWorkLog[]; error?: string }> {
    const { error: authError, user } = await requireStudent();
    if (authError || !user) return { error: authError ?? "Sin permisos." };

    const membership = await getStudentMembershipForModule(moduleId, user.id);
    if (!membership) {
        return { logs: [] };
    }

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("module_group_work_logs")
        .select("id, group_id, student_id, entry_date, content, created_at, updated_at, profile:profiles(id, full_name, avatar_url)")
        .eq("group_id", membership.group_id)
        .eq("student_id", user.id)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) return { error: error.message };
    return { logs: ((data as StudentWorkLogRow[] | null) ?? []).map(normalizeStudentWorkLog) };
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

    const normalizedName = normalizeText(name);
    const identityError = await ensureActiveGroupIdentityAvailable(moduleId, {
        name: normalizedName,
        color: color ?? null,
    });
    if (identityError) return { error: identityError };

    const admin = createAdminClient();
    const { error } = await admin.from("module_groups").insert({
        module_id: moduleId,
        name: normalizedName,
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
    patch: GroupUpdatePatch,
): Promise<{ error?: string }> {
    const { error: authError } = await requireManageStudents(moduleId);
    if (authError) return { error: authError };

    const normalizedPatch: GroupUpdatePatch = {
        ...patch,
        ...(patch.name ? { name: normalizeText(patch.name) } : {}),
    };

    if (normalizedPatch.name || normalizedPatch.color !== undefined) {
        const identityError = await ensureActiveGroupIdentityAvailable(
            moduleId,
            {
                name: normalizedPatch.name,
                color: normalizedPatch.color,
            },
            groupId,
        );
        if (identityError) return { error: identityError };
    }

    const admin = createAdminClient();
    const { error } = await admin
        .from("module_groups")
        .update(normalizedPatch)
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

    const [existingMembership, targetGroupSize] = await Promise.all([
        getStudentMembershipForModule(moduleId, studentId),
        getGroupMemberCount(groupId),
    ]);
    const nextSize = existingMembership?.group_id === groupId ? targetGroupSize : targetGroupSize + 1;
    const capacityError = await ensurePredefinedRoleCapacity(moduleId, [nextSize]);
    if (capacityError) return { error: capacityError };

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
        .upsert(
            {
                group_id: groupId,
                student_id: studentId,
                role_text: null,
                predefined_role_id: null,
            },
            { onConflict: "group_id,student_id" },
        );

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
    const sizeByGroup = new Map<string, number>();

    for (const groupId of allGroupIds) {
        sizeByGroup.set(groupId, await getGroupMemberCount(groupId));
    }

    const shuffled = [...unassigned].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i += 1) {
        const groupId = allGroupIds[i % allGroupIds.length];
        sizeByGroup.set(groupId, (sizeByGroup.get(groupId) ?? 0) + 1);
    }

    const capacityError = await ensurePredefinedRoleCapacity(moduleId, [...sizeByGroup.values()]);
    if (capacityError) return { error: capacityError };

    const insertRows = shuffled.map((studentId, i) => ({
        group_id: allGroupIds[i % allGroupIds.length],
        student_id: studentId,
        role_text: null,
        predefined_role_id: null,
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

export async function setModuleGroupRoleMode(
    moduleId: string,
    mode: GroupRoleMode,
): Promise<{ error?: string }> {
    const { error: authError } = await requireManageStudents(moduleId);
    if (authError) return { error: authError };

    if (mode === GROUP_ROLE_MODE.PREDEFINED) {
        const sizeError = await ensurePredefinedRoleCapacity(moduleId, await getCurrentGroupSizes(moduleId));
        if (sizeError) return { error: sizeError };
    }

    const admin = createAdminClient();
    const { error } = await admin
        .from("modules")
        .update({ group_role_mode: mode })
        .eq("id", moduleId);

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/modules/${moduleId}`);
    return {};
}

export async function createModuleGroupRole(
    moduleId: string,
    name: string,
): Promise<{ error?: string }> {
    const { error: authError } = await requireManageStudents(moduleId);
    if (authError) return { error: authError };

    const normalizedName = normalizeText(name);
    if (!normalizedName) return { error: "El rol no puede estar vacío." };
    if (normalizedName.length > MAX_ROLE_NAME_LENGTH) {
        return { error: `El rol no puede superar los ${MAX_ROLE_NAME_LENGTH} caracteres.` };
    }

    const existingRoles = await getModuleGroupRoles(moduleId);
    const duplicate = existingRoles.some((role) => role.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase());
    if (duplicate) return { error: "Ya existe un rol predefinido con ese nombre." };

    const admin = createAdminClient();
    const position = existingRoles.length;
    const { error } = await admin
        .from("module_group_roles")
        .insert({ module_id: moduleId, name: normalizedName, position });

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/modules/${moduleId}`);
    return {};
}

export async function deleteModuleGroupRole(
    moduleId: string,
    roleId: string,
): Promise<{ error?: string }> {
    const { error: authError } = await requireManageStudents(moduleId);
    if (authError) return { error: authError };

    const roleMode = await getGroupRoleMode(moduleId);
    if (roleMode === GROUP_ROLE_MODE.PREDEFINED) {
        const currentRoleCount = await getRoleCount(moduleId);
        const nextRoleCount = Math.max(currentRoleCount - 1, 0);
        const groupSizes = await getCurrentGroupSizes(moduleId);
        if (groupSizes.some((size) => size > nextRoleCount)) {
            return { error: "No puedes borrar ese rol porque dejarías a uno o más grupos sin suficientes roles únicos." };
        }
    }

    const admin = createAdminClient();
    const { error } = await admin
        .from("module_group_roles")
        .delete()
        .eq("id", roleId)
        .eq("module_id", moduleId);

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/modules/${moduleId}`);
    return {};
}

export async function assignGroupRepresentative(
    moduleId: string,
    groupId: string,
    studentId: string | null,
): Promise<{ error?: string }> {
    const { error: authError } = await requireManageStudents(moduleId);
    if (authError) return { error: authError };

    const admin = createAdminClient();
    if (studentId) {
        const { data: membership } = await admin
            .from("module_group_members")
            .select("id")
            .eq("group_id", groupId)
            .eq("student_id", studentId)
            .maybeSingle();

        if (!membership) {
            return { error: "El representante debe pertenecer al grupo." };
        }
    }

    const { error } = await admin
        .from("module_groups")
        .update({ representative_student_id: studentId })
        .eq("id", groupId)
        .eq("module_id", moduleId);

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/modules/${moduleId}`);
    return {};
}

// ─── Acciones del alumno ─────────────────────────────────────────────────────

export async function studentJoinGroup(
    groupId: string,
): Promise<{ error?: string }> {
    const { error: authError, supabase, user } = await requireStudent();
    if (authError || !supabase || !user) return { error: authError ?? "Sin permisos." };

    const { data: group, error: groupError } = await supabase
        .from("module_groups")
        .select("id, module_id, max_members, status")
        .eq("id", groupId)
        .eq("status", "active")
        .single();

    if (groupError || !group) return { error: "Grupo no encontrado." };

    const { data: module } = await supabase
        .from("modules")
        .select("groups_enrollment_mode")
        .eq("id", group.module_id)
        .single();

    if (module?.groups_enrollment_mode === "locked") {
        return { error: "Los grupos están cerrados. No puedes unirte a ningún grupo ahora." };
    }
    if (module?.groups_enrollment_mode !== "self_enrollment") {
        return { error: "La inscripción libre no está habilitada en este módulo." };
    }

    const { data: enrollment } = await supabase
        .from("module_enrollments")
        .select("student_id")
        .eq("module_id", group.module_id)
        .eq("student_id", user.id)
        .single();

    if (!enrollment) return { error: "No estás matriculado en este módulo." };

    if (group.max_members !== null) {
        const { count } = await supabase
            .from("module_group_members")
            .select("id", { count: "exact", head: true })
            .eq("group_id", groupId);

        if ((count ?? 0) >= group.max_members) {
            return { error: "Este grupo ya está completo." };
        }
    }

    const [existingMembership, currentCount] = await Promise.all([
        getStudentMembershipForModule(group.module_id, user.id),
        getGroupMemberCount(groupId),
    ]);
    const nextSize = existingMembership?.group_id === groupId ? currentCount : currentCount + 1;
    const capacityError = await ensurePredefinedRoleCapacity(group.module_id, [nextSize]);
    if (capacityError) return { error: capacityError };

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

    const { error: insertError } = await admin
        .from("module_group_members")
        .insert({ group_id: groupId, student_id: user.id, role_text: null, predefined_role_id: null });

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

    const admin = createAdminClient();
    const { data: moduleGroups } = await admin
        .from("module_groups")
        .select("id")
        .eq("module_id", moduleId)
        .eq("status", "active");

    const groupIds = (moduleGroups ?? []).map((g: { id: string }) => g.id);
    if (groupIds.length === 0) return { group: null };

    const { data, error } = await admin
        .from("module_group_members")
        .select(`
            group:module_groups(
                id, module_id, name, status, color, max_members, representative_student_id, created_by, created_at, updated_at,
                members:module_group_members(
                    id, group_id, student_id, joined_at, role_text, predefined_role_id,
                    profile:profiles(id, full_name, avatar_url),
                    predefined_role:module_group_roles(id, module_id, name, position, created_at, updated_at)
                )
            )
        `)
        .eq("student_id", user.id)
        .in("group_id", groupIds)
        .maybeSingle();

    if (error) return { error: error.message };
    return { group: (data as { group?: ModuleGroupWithMembers | null } | null)?.group ?? null };
}

export async function getMyGroupMembership(
    moduleId: string,
): Promise<{ membership?: StudentGroupMembership | null; error?: string }> {
    const { error: authError, user } = await requireStudent();
    if (authError || !user) return { error: authError ?? "Sin permisos." };

    const membership = await getStudentMembershipForModule(moduleId, user.id);
    return { membership };
}

export async function generateEmptyGroups(
    moduleId: string,
    count: number,
    maxMembers?: number,
): Promise<{ error?: string }> {
    if (count < 1 || count > 50) return { error: "El número de grupos debe estar entre 1 y 50." };

    const { error: authError, user } = await requireManageStudents(moduleId);
    if (authError || !user) return { error: authError ?? "Sin permisos." };

    const admin = createAdminClient();

    const { data: existing } = await admin
        .from("module_groups")
        .select("id, name, color")
        .eq("module_id", moduleId)
        .eq("status", "active");

    const baseIndex = (existing ?? []).length;
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

    const newGroups = Array.from({ length: count }, (_, i) => ({
        module_id: moduleId,
        name: `Grupo ${baseIndex + i + 1}`,
        color: colors[(baseIndex + i) % colors.length],
        max_members: maxMembers ?? null,
        created_by: user.id,
    }));

    const existingNames = new Set((existing ?? []).map((group) => normalizeText(group.name).toLocaleLowerCase()));
    const existingColors = new Set((existing ?? []).map((group) => group.color?.toLocaleLowerCase()).filter(Boolean));

    for (const group of newGroups) {
        if (existingNames.has(normalizeText(group.name).toLocaleLowerCase())) {
            return { error: "Ya existe un grupo activo con uno de los nombres generados." };
        }
        if (group.color && existingColors.has(group.color.toLocaleLowerCase())) {
            return { error: "No hay suficientes colores únicos disponibles para generar más grupos automáticamente." };
        }
        existingNames.add(normalizeText(group.name).toLocaleLowerCase());
        if (group.color) existingColors.add(group.color.toLocaleLowerCase());
    }

    const { error } = await admin.from("module_groups").insert(newGroups);
    if (error) return { error: error.message };

    revalidatePath(`/dashboard/modules/${moduleId}`);
    return {};
}

export async function studentLeaveGroup(
    groupId: string,
): Promise<{ error?: string }> {
    const { error: authError, supabase, user } = await requireStudent();
    if (authError || !supabase || !user) return { error: authError ?? "Sin permisos." };

    const { data: group } = await supabase
        .from("module_groups")
        .select("module_id")
        .eq("id", groupId)
        .single();

    if (!group) return { error: "Grupo no encontrado." };

    const { data: module } = await supabase
        .from("modules")
        .select("groups_enrollment_mode")
        .eq("id", group.module_id)
        .single();

    if (module?.groups_enrollment_mode === "locked") {
        return { error: "Los grupos están cerrados. No puedes salir del grupo ahora." };
    }
    if (module?.groups_enrollment_mode !== "self_enrollment") {
        return { error: "No puedes salir del grupo manualmente en este módulo." };
    }

    const admin = createAdminClient();
    const { error: deleteError } = await admin
        .from("module_group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("student_id", user.id);

    if (deleteError) return { error: deleteError.message };
    revalidatePath(`/dashboard/modules/${group.module_id}`);
    return {};
}

export async function saveMyGroupRole(
    moduleId: string,
    payload: { roleText?: string; predefinedRoleId?: string },
): Promise<{ error?: string }> {
    const { error: authError, user } = await requireStudent();
    if (authError || !user) return { error: authError ?? "Sin permisos." };

    const membership = await getStudentMembershipForModule(moduleId, user.id);
    if (!membership) return { error: "No perteneces a ningún grupo en este módulo." };

    const roleMode = await getGroupRoleMode(moduleId);
    const admin = createAdminClient();

    if (roleMode === GROUP_ROLE_MODE.FREE_TEXT) {
        const roleText = normalizeText(payload.roleText ?? "");
        if (!roleText) return { error: "Escribe tu rol dentro del grupo." };
        if (roleText.length > MAX_ROLE_NAME_LENGTH) {
            return { error: `El rol no puede superar los ${MAX_ROLE_NAME_LENGTH} caracteres.` };
        }

        const { error } = await admin
            .from("module_group_members")
            .update({ role_text: roleText, predefined_role_id: null })
            .eq("id", membership.id)
            .eq("student_id", user.id);

        if (error) return { error: mapRoleAssignmentError(error) };
    } else {
        const predefinedRoleId = payload.predefinedRoleId?.trim();
        if (!predefinedRoleId) return { error: "Selecciona uno de los roles predefinidos." };

        const { data: role } = await admin
            .from("module_group_roles")
            .select("id")
            .eq("id", predefinedRoleId)
            .eq("module_id", moduleId)
            .maybeSingle();

        if (!role) return { error: "Ese rol predefinido ya no existe en el módulo." };

        const { error } = await admin
            .from("module_group_members")
            .update({ predefined_role_id: predefinedRoleId, role_text: null })
            .eq("id", membership.id)
            .eq("student_id", user.id);

        if (error) return { error: mapRoleAssignmentError(error) };
    }

    revalidatePath(`/dashboard/modules/${moduleId}`);
    return {};
}

export async function studentUpdateOwnedGroup(
    groupId: string,
    patch: GroupIdentityPatch,
): Promise<{ error?: string }> {
    const { error: authError, user } = await requireStudent();
    if (authError || !user) return { error: authError ?? "Sin permisos." };

    const admin = createAdminClient();
    const { data: group } = await admin
        .from("module_groups")
        .select("id, module_id, representative_student_id")
        .eq("id", groupId)
        .maybeSingle();

    if (!group) return { error: "Grupo no encontrado." };
    if (group.representative_student_id !== user.id) {
        return { error: "Solo el representante del grupo puede cambiar el nombre o el color." };
    }

    const normalizedPatch: GroupIdentityPatch = {
        ...(patch.name ? { name: normalizeText(patch.name) } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
    };

    const identityError = await ensureActiveGroupIdentityAvailable(group.module_id, normalizedPatch, groupId);
    if (identityError) return { error: identityError };

    const { error } = await admin
        .from("module_groups")
        .update(normalizedPatch)
        .eq("id", groupId);

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/modules/${group.module_id}`);
    return {};
}

export async function upsertMyGroupWorkLog(
    moduleId: string,
    content: string,
    entryDate?: string,
): Promise<{ error?: string }> {
    const { error: authError, user } = await requireStudent();
    if (authError || !user) return { error: authError ?? "Sin permisos." };

    const membership = await getStudentMembershipForModule(moduleId, user.id);
    if (!membership) return { error: "No perteneces a ningún grupo en este módulo." };

    const normalizedContent = content.trim();
    if (!normalizedContent) return { error: "Escribe qué has hecho hoy en el grupo." };
    if (normalizedContent.length > MAX_WORK_LOG_LENGTH) {
        return { error: `El diario no puede superar los ${MAX_WORK_LOG_LENGTH} caracteres.` };
    }

    const normalizedDate = normalizeEntryDate(entryDate);
    if (normalizedDate !== todayInMadrid()) {
        return { error: "Solo puedes crear o editar la entrada del día actual." };
    }

    const admin = createAdminClient();
    const { error } = await admin
        .from("module_group_work_logs")
        .upsert(
            {
                group_id: membership.group_id,
                student_id: user.id,
                entry_date: normalizedDate,
                content: normalizedContent,
            },
            { onConflict: "group_id,student_id,entry_date" },
        );

    if (error) return { error: error.message };
    revalidatePath(`/dashboard/modules/${moduleId}`);
    return {};
}
