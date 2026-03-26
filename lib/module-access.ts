import { createAdminClient } from "@/utils/supabase/admin";
import {
    MODULE_COLLABORATOR_ROLE,
    type ModuleCollaboratorRole,
    type ModulePermissions,
} from "@/lib/module-collaborator-defs";

export interface ModuleAccessInfo {
    moduleId: string;
    creatorId: string;
    role: ModuleCollaboratorRole;
    permissions: ModulePermissions;
}

interface ResourceModuleRecord {
    id: string;
    teacher_id: string;
}

interface SupabaseLikeClient {
    from: (table: string) => {
        select: (query?: string) => any;
    };
}

const EDITOR_ROLES = new Set<ModuleCollaboratorRole>([
    MODULE_COLLABORATOR_ROLE.CREATOR,
    MODULE_COLLABORATOR_ROLE.CO_OWNER,
    MODULE_COLLABORATOR_ROLE.EDITOR,
]);

const STUDENT_MANAGER_ROLES = new Set<ModuleCollaboratorRole>([
    MODULE_COLLABORATOR_ROLE.CREATOR,
    MODULE_COLLABORATOR_ROLE.CO_OWNER,
    MODULE_COLLABORATOR_ROLE.EDITOR,
]);

const SETTINGS_MANAGER_ROLES = new Set<ModuleCollaboratorRole>([
    MODULE_COLLABORATOR_ROLE.CREATOR,
    MODULE_COLLABORATOR_ROLE.CO_OWNER,
]);

function getModulePermissions(role: ModuleCollaboratorRole): ModulePermissions {
    return {
        canViewModule: true,
        canEditModuleContent: EDITOR_ROLES.has(role),
        canManageStudents: STUDENT_MANAGER_ROLES.has(role),
        canManageModuleSettings: SETTINGS_MANAGER_ROLES.has(role),
        canManageSensitiveSettings: role === MODULE_COLLABORATOR_ROLE.CREATOR,
        canManageCollaborators: role === MODULE_COLLABORATOR_ROLE.CREATOR,
        canArchiveModule: role === MODULE_COLLABORATOR_ROLE.CREATOR,
        canDeleteModule: role === MODULE_COLLABORATOR_ROLE.CREATOR,
    };
}

async function resolveCollaboratorRole(moduleId: string, userId: string, client?: SupabaseLikeClient): Promise<ModuleCollaboratorRole | null> {
    const db = client ?? createAdminClient();
    const { data, error } = await db
        .from("module_collaborators")
        .select("role")
        .eq("module_id", moduleId)
        .eq("teacher_id", userId)
        .maybeSingle();

    if (error || !data?.role) {
        return null;
    }

    return data.role as ModuleCollaboratorRole;
}

function buildModuleAccess(moduleRecord: ResourceModuleRecord, userId: string, collaboratorRole: ModuleCollaboratorRole | null): ModuleAccessInfo | null {
    if (moduleRecord.teacher_id === userId) {
        return {
            moduleId: moduleRecord.id,
            creatorId: moduleRecord.teacher_id,
            role: MODULE_COLLABORATOR_ROLE.CREATOR,
            permissions: getModulePermissions(MODULE_COLLABORATOR_ROLE.CREATOR),
        };
    }

    if (!collaboratorRole) {
        return null;
    }

    return {
        moduleId: moduleRecord.id,
        creatorId: moduleRecord.teacher_id,
        role: collaboratorRole,
        permissions: getModulePermissions(collaboratorRole),
    };
}

export async function getModuleAccess(
    moduleId: string,
    userId: string,
    client?: SupabaseLikeClient,
): Promise<ModuleAccessInfo | null> {
    try {
        const db = client ?? createAdminClient();
        const { data: moduleRecord, error } = await db
            .from("modules")
            .select("id, teacher_id")
            .eq("id", moduleId)
            .maybeSingle();

        if (error || !moduleRecord) {
            return null;
        }

        const collaboratorRole = await resolveCollaboratorRole(moduleRecord.id, userId, client);
        return buildModuleAccess(moduleRecord, userId, collaboratorRole);
    } catch {
        return null;
    }
}

async function getAccessFromNestedResource(
    table: "units" | "activities" | "activity_phases" | "activity_steps",
    resourceId: string,
    selectClause: string,
    getModuleRecord: (data: any) => ResourceModuleRecord | null,
    userId: string,
): Promise<ModuleAccessInfo | null> {
    try {
        const admin = createAdminClient();
        const { data, error } = await admin
            .from(table)
            .select(selectClause)
            .eq("id", resourceId)
            .maybeSingle();

        if (error || !data) {
            return null;
        }

        const moduleRecord = getModuleRecord(data);
        if (!moduleRecord) {
            return null;
        }

        const collaboratorRole = await resolveCollaboratorRole(moduleRecord.id, userId);
        return buildModuleAccess(moduleRecord, userId, collaboratorRole);
    } catch {
        return null;
    }
}

export async function getActivityAccess(activityId: string, userId: string): Promise<ModuleAccessInfo | null> {
    return getAccessFromNestedResource(
        "activities",
        activityId,
        "unit:units(module:modules(id, teacher_id))",
        (data) => {
            const moduleRecord = data?.unit?.module;
            if (!moduleRecord?.id || !moduleRecord?.teacher_id) {
                return null;
            }

            return {
                id: moduleRecord.id,
                teacher_id: moduleRecord.teacher_id,
            };
        },
        userId,
    );
}

export async function getUnitAccess(unitId: string, userId: string): Promise<ModuleAccessInfo | null> {
    return getAccessFromNestedResource(
        "units",
        unitId,
        "id, module:modules(id, teacher_id)",
        (data) => {
            const moduleRecord = data?.module;
            if (!moduleRecord?.id || !moduleRecord?.teacher_id) {
                return null;
            }

            return {
                id: moduleRecord.id,
                teacher_id: moduleRecord.teacher_id,
            };
        },
        userId,
    );
}

export async function getPhaseAccess(phaseId: string, userId: string): Promise<ModuleAccessInfo | null> {
    return getAccessFromNestedResource(
        "activity_phases",
        phaseId,
        "activity:activities(unit:units(module:modules(id, teacher_id)))",
        (data) => {
            const moduleRecord = data?.activity?.unit?.module;
            if (!moduleRecord?.id || !moduleRecord?.teacher_id) {
                return null;
            }

            return {
                id: moduleRecord.id,
                teacher_id: moduleRecord.teacher_id,
            };
        },
        userId,
    );
}

export async function getStepAccess(stepId: string, userId: string): Promise<ModuleAccessInfo | null> {
    return getAccessFromNestedResource(
        "activity_steps",
        stepId,
        "phase:activity_phases(activity:activities(unit:units(module:modules(id, teacher_id))))",
        (data) => {
            const moduleRecord = data?.phase?.activity?.unit?.module;
            if (!moduleRecord?.id || !moduleRecord?.teacher_id) {
                return null;
            }

            return {
                id: moduleRecord.id,
                teacher_id: moduleRecord.teacher_id,
            };
        },
        userId,
    );
}
