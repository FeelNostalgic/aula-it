"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
    getModuleAccess,
} from "@/lib/module-access";
import {
    getModuleRoleLabel,
    getRestrictedActionMessage,
    MODULE_COLLABORATOR_ROLE,
    type ModuleCollaboratorRole,
    type ModulePermissions,
} from "@/lib/module-collaborator-defs";

interface TeacherSummary {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
}

interface CollaboratorSummary extends TeacherSummary {
    role: ModuleCollaboratorRole;
}

const ASSIGNABLE_COLLABORATOR_ROLES: ModuleCollaboratorRole[] = [
    MODULE_COLLABORATOR_ROLE.CO_OWNER,
    MODULE_COLLABORATOR_ROLE.EDITOR,
    MODULE_COLLABORATOR_ROLE.VIEWER,
];

async function requireTeacherUser() {
    const supabase = await createClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { error: "Not authenticated" as const, supabase: null, user: null };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        return { error: "Solo profesores." as const, supabase: null, user: null };
    }

    return { error: null, supabase, user };
}

function getPermissionError(permission: keyof ModulePermissions, role: ModuleCollaboratorRole | null) {
    if (!role) {
        return "Module not found or unauthorized";
    }

    return getRestrictedActionMessage(permission, role);
}

async function requireModulePermission(
    moduleId: string,
    permission: keyof ModulePermissions,
    teacherErrorMessage?: string,
) {
    const auth = await requireTeacherUser();
    if (auth.error || !auth.supabase || !auth.user) {
        return {
            error: auth.error === "Solo profesores." && teacherErrorMessage ? teacherErrorMessage : auth.error,
            supabase: null,
            user: null,
            access: null,
        };
    }

    const access = await getModuleAccess(moduleId, auth.user.id, auth.supabase as any);
    if (!access || !access.permissions[permission]) {
        return {
            error: getPermissionError(permission, access?.role ?? null),
            supabase: auth.supabase,
            user: auth.user,
            access,
        };
    }

    return { error: null, supabase: auth.supabase, user: auth.user, access };
}

function buildTeacherSummaries(
    profileRows: Array<{ id: string; full_name: string | null; avatar_url: string | null }>,
    authUsers: Array<{ id: string; email?: string; user_metadata?: { avatar_url?: string | null } | null }>,
): TeacherSummary[] {
    const authMap = new Map(
        authUsers.map((authUser) => [
            authUser.id,
            {
                email: authUser.email ?? "sin_email@aula.it",
                avatar_url: authUser.user_metadata?.avatar_url ?? null,
            },
        ]),
    );

    return profileRows.map((profileRow) => {
        const authData = authMap.get(profileRow.id);
        return {
            id: profileRow.id,
            full_name: profileRow.full_name,
            email: authData?.email ?? "sin_email@aula.it",
            avatar_url: profileRow.avatar_url ?? authData?.avatar_url ?? null,
        };
    });
}

async function getTeacherDirectoryByIds(teacherIds: string[]): Promise<TeacherSummary[]> {
    if (teacherIds.length === 0) {
        return [];
    }

    const admin = createAdminClient();
    const [{ data: profiles }, { data: usersData }] = await Promise.all([
        admin
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", teacherIds)
            .eq("role", "teacher"),
        admin.auth.admin.listUsers(),
    ]);

    return buildTeacherSummaries(profiles ?? [], usersData?.users ?? []);
}

export async function createUnit(prevState: unknown, formData: FormData) {
    const moduleId = formData.get("module_id") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!moduleId || !name) {
        return { error: "Module ID and unit name are required" };
    }

    const permission = await requireModulePermission(moduleId, "canEditModuleContent", "Unauthorized: only teachers can create units");
    if (permission.error || !permission.supabase) {
        return { error: permission.error };
    }

    const { data: lastUnit } = await permission.supabase
        .from("units")
        .select("order_index")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: false })
        .limit(1)
        .single();

    const nextOrder = (lastUnit?.order_index ?? -1) + 1;
    const { error } = await permission.supabase
        .from("units")
        .insert({
            module_id: moduleId,
            name,
            description: description || null,
            order_index: nextOrder,
        });

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/modules/${moduleId}`);
    return { success: true };
}

export async function enrollStudent(moduleId: string, studentId: string) {
    const permission = await requireModulePermission(moduleId, "canManageStudents", "Unauthorized: only teachers can enroll students");
    if (permission.error || !permission.supabase) {
        return { error: permission.error };
    }

    const { error } = await permission.supabase
        .from("module_enrollments")
        .insert({
            module_id: moduleId,
            student_id: studentId,
        });

    if (error) {
        if (error.code === "23505") {
            return { error: "El alumno ya está matriculado en este módulo" };
        }

        return { error: error.message };
    }

    revalidatePath(`/dashboard/modules/${moduleId}`);
    return { success: true };
}

export async function unenrollStudent(moduleId: string, studentId: string) {
    const permission = await requireModulePermission(moduleId, "canManageStudents", "Unauthorized: only teachers can unenroll students");
    if (permission.error || !permission.supabase) {
        return { error: permission.error };
    }

    const { error } = await permission.supabase
        .from("module_enrollments")
        .delete()
        .match({
            module_id: moduleId,
            student_id: studentId,
        });

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/modules/${moduleId}`);
    return { success: true };
}

export async function updateModuleSettings(moduleId: string, formData: FormData) {
    const permission = await requireModulePermission(moduleId, "canManageModuleSettings", "Unauthorized: only teachers can update modules");
    if (permission.error || !permission.supabase) {
        return { error: permission.error };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const status = formData.get("status") as string;
    const icon = formData.get("icon") as string;
    const icon_style = formData.get("icon_style") as string;
    const custom_icon_url = formData.get("custom_icon_url") as string;

    if (!name?.trim()) {
        return { error: "Module name cannot be empty" };
    }

    const updates: Record<string, unknown> = {
        name: name.trim(),
        description: description ? description.trim() : null,
        icon: icon || "BookOpen",
        icon_style: icon_style || "default",
        custom_icon_url: custom_icon_url || null,
    };

    if (permission.access?.permissions.canManageSensitiveSettings) {
        updates.status = status || "draft";
    }

    const { error } = await permission.supabase
        .from("modules")
        .update(updates)
        .eq("id", moduleId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/modules/${moduleId}`);
    revalidatePath("/dashboard");
    return { success: true };
}

export async function archiveModule(moduleId: string) {
    const permission = await requireModulePermission(moduleId, "canArchiveModule", "Unauthorized: only teachers can archive modules");
    if (permission.error || !permission.supabase) {
        return { error: permission.error };
    }

    const { error } = await permission.supabase
        .from("modules")
        .update({ status: "archived" })
        .eq("id", moduleId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/modules/${moduleId}`);
    revalidatePath("/dashboard");
    return { success: true };
}

export async function deleteModule(moduleId: string) {
    const permission = await requireModulePermission(moduleId, "canDeleteModule", "Unauthorized: only teachers can delete modules");
    if (permission.error || !permission.supabase) {
        return { error: permission.error };
    }

    const { error } = await permission.supabase
        .from("modules")
        .delete()
        .eq("id", moduleId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
}

export async function getAvailableStudents(moduleId: string, query?: string, prefix?: string) {
    const supabase = await createClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { error: "Not authenticated" };
    }

    const access = await getModuleAccess(moduleId, user.id, supabase as any);
    if (!access?.permissions.canManageStudents) {
        return { error: getPermissionError("canManageStudents", access?.role ?? null) };
    }

    const { data: enrolled } = await supabase
        .from("module_enrollments")
        .select("student_id")
        .eq("module_id", moduleId);

    const enrolledIds = enrolled?.map((enrollment) => enrollment.student_id) || [];
    let studentQuery = supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("role", "student");

    if (enrolledIds.length > 0) {
        studentQuery = studentQuery.not("id", "in", `(${enrolledIds.join(",")})`);
    }

    if (prefix?.trim()) {
        studentQuery = studentQuery.ilike("full_name", `${prefix.trim()}-%`);
    }

    if (query?.trim()) {
        studentQuery = studentQuery.ilike("full_name", `%${query.trim()}%`);
    }

    const { data, error } = await studentQuery.order("full_name", { ascending: true });
    if (error) {
        return { error: error.message };
    }

    let availableStudents = data.map((student) => ({
        id: student.id,
        full_name: student.full_name,
        email: `${student.full_name?.toLowerCase().replace(/\s+/g, ".")}@aula-it.edu`,
        avatar_url: student.avatar_url as string | null,
    }));

    if (availableStudents.length > 0) {
        const adminSupabase = createAdminClient();
        const { data: usersData } = await adminSupabase.auth.admin.listUsers();

        if (usersData?.users) {
            const authMap = new Map(
                usersData.users.map((user) => [
                    user.id,
                    {
                        email: user.email,
                        avatar_url: user.user_metadata?.avatar_url,
                    },
                ]),
            );

            availableStudents = availableStudents.map((student) => {
                const authData = authMap.get(student.id);
                return {
                    ...student,
                    email: authData?.email || student.email,
                    avatar_url: student.avatar_url || authData?.avatar_url || null,
                };
            });
        }
    }

    return {
        success: true,
        students: availableStudents,
    };
}

export async function bulkEnrollStudents(moduleId: string, studentIds: string[]) {
    const permission = await requireModulePermission(moduleId, "canManageStudents");
    if (permission.error || !permission.supabase) {
        return { error: permission.error };
    }

    if (studentIds.length === 0) {
        return { error: "No hay alumnos seleccionados" };
    }

    const rows = studentIds.map((studentId) => ({ module_id: moduleId, student_id: studentId }));
    const { error, count } = await permission.supabase
        .from("module_enrollments")
        .upsert(rows, { onConflict: "module_id,student_id", ignoreDuplicates: true, count: "exact" });

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/modules/${moduleId}`);
    return { success: true, enrolled: count ?? rows.length };
}

export async function listModuleCollaborators(moduleId: string): Promise<{
    collaborators?: CollaboratorSummary[];
    creator?: CollaboratorSummary;
    roleLabel?: string;
    error?: string;
}> {
    const permission = await requireModulePermission(moduleId, "canViewModule");
    if (permission.error || !permission.access) {
        return { error: permission.error ?? "No tienes acceso a este módulo." };
    }

    const admin = createAdminClient();
    const { data: moduleRecord, error: moduleError } = await admin
        .from("modules")
        .select("id, teacher_id")
        .eq("id", moduleId)
        .single();

    if (moduleError || !moduleRecord) {
        return { error: "No se encontró el módulo." };
    }

    const { data: collaboratorRows, error: collaboratorError } = await admin
        .from("module_collaborators")
        .select("teacher_id, role")
        .eq("module_id", moduleId);

    if (collaboratorError) {
        return { error: collaboratorError.message };
    }

    const teacherIds = [moduleRecord.teacher_id, ...(collaboratorRows ?? []).map((row) => row.teacher_id)];
    const teacherDirectory = await getTeacherDirectoryByIds(teacherIds);
    const teacherMap = new Map(teacherDirectory.map((teacher) => [teacher.id, teacher]));

    const creatorTeacher = teacherMap.get(moduleRecord.teacher_id);
    const creator: CollaboratorSummary | undefined = creatorTeacher
        ? { ...creatorTeacher, role: MODULE_COLLABORATOR_ROLE.CREATOR }
        : undefined;

    const collaborators = (collaboratorRows ?? [])
        .map((row) => {
            const teacher = teacherMap.get(row.teacher_id);
            if (!teacher) {
                return null;
            }

            return {
                ...teacher,
                role: row.role as ModuleCollaboratorRole,
            };
        })
        .filter((row): row is CollaboratorSummary => row !== null);

    return {
        creator,
        collaborators,
        roleLabel: getModuleRoleLabel(permission.access.role),
    };
}

export async function listAvailableTeachersForModule(moduleId: string, query?: string): Promise<{
    teachers?: TeacherSummary[];
    error?: string;
}> {
    const permission = await requireModulePermission(moduleId, "canManageCollaborators");
    if (permission.error) {
        return { error: permission.error };
    }

    const admin = createAdminClient();
    const [{ data: moduleRecord }, { data: collaboratorRows }, { data: teacherProfiles }, { data: usersData }] = await Promise.all([
        admin.from("modules").select("teacher_id").eq("id", moduleId).single(),
        admin.from("module_collaborators").select("teacher_id").eq("module_id", moduleId),
        admin
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("role", "teacher")
            .order("full_name", { ascending: true }),
        admin.auth.admin.listUsers(),
    ]);

    const excludedIds = new Set<string>([
        moduleRecord?.teacher_id,
        ...(collaboratorRows ?? []).map((row) => row.teacher_id),
    ].filter(Boolean) as string[]);

    const normalizedQuery = query?.trim().toLowerCase() ?? "";
    const teachers = buildTeacherSummaries(teacherProfiles ?? [], usersData?.users ?? []).filter((teacher) => {
        if (excludedIds.has(teacher.id)) {
            return false;
        }

        if (!normalizedQuery) {
            return true;
        }

        return (
            teacher.full_name?.toLowerCase().includes(normalizedQuery) ||
            teacher.email.toLowerCase().includes(normalizedQuery)
        );
    });

    return { teachers };
}

export async function addModuleCollaborator(moduleId: string, teacherId: string, role: ModuleCollaboratorRole) {
    const permission = await requireModulePermission(moduleId, "canManageCollaborators");
    if (permission.error || !permission.user) {
        return { error: permission.error };
    }

    if (!ASSIGNABLE_COLLABORATOR_ROLES.includes(role)) {
        return { error: "Rol de profesor no válido." };
    }

    const admin = createAdminClient();
    const [{ data: moduleRecord }, { data: teacherProfile }] = await Promise.all([
        admin.from("modules").select("teacher_id").eq("id", moduleId).single(),
        admin.from("profiles").select("id, role").eq("id", teacherId).single(),
    ]);

    if (!moduleRecord || moduleRecord.teacher_id === teacherId) {
        return { error: "El creador ya tiene acceso completo al módulo." };
    }

    if (!teacherProfile || teacherProfile.role !== "teacher") {
        return { error: "Solo puedes añadir perfiles con rol de profesor." };
    }

    const { error } = await admin
        .from("module_collaborators")
        .upsert(
            {
                module_id: moduleId,
                teacher_id: teacherId,
                role,
                created_by: permission.user.id,
            },
            { onConflict: "module_id,teacher_id" },
        );

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/modules/${moduleId}`);
    revalidatePath("/dashboard");
    return { success: true };
}

export async function updateModuleCollaboratorRole(moduleId: string, teacherId: string, role: ModuleCollaboratorRole) {
    const permission = await requireModulePermission(moduleId, "canManageCollaborators");
    if (permission.error) {
        return { error: permission.error };
    }

    if (!ASSIGNABLE_COLLABORATOR_ROLES.includes(role)) {
        return { error: "Rol de profesor no válido." };
    }

    const admin = createAdminClient();
    const { data: moduleRecord } = await admin
        .from("modules")
        .select("teacher_id")
        .eq("id", moduleId)
        .single();

    if (moduleRecord?.teacher_id === teacherId) {
        return { error: "No puedes cambiar el rol del creador del módulo." };
    }

    const { error } = await admin
        .from("module_collaborators")
        .update({ role })
        .eq("module_id", moduleId)
        .eq("teacher_id", teacherId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/modules/${moduleId}`);
    revalidatePath("/dashboard");
    return { success: true };
}

export async function removeModuleCollaborator(moduleId: string, teacherId: string) {
    const permission = await requireModulePermission(moduleId, "canManageCollaborators");
    if (permission.error) {
        return { error: permission.error };
    }

    const admin = createAdminClient();
    const { data: moduleRecord } = await admin
        .from("modules")
        .select("teacher_id")
        .eq("id", moduleId)
        .single();

    if (moduleRecord?.teacher_id === teacherId) {
        return { error: "No puedes eliminar al creador del módulo." };
    }

    const { error } = await admin
        .from("module_collaborators")
        .delete()
        .eq("module_id", moduleId)
        .eq("teacher_id", teacherId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/modules/${moduleId}`);
    revalidatePath("/dashboard");
    return { success: true };
}
