export const MODULE_COLLABORATOR_ROLE = {
    CREATOR: "creator",
    CO_OWNER: "co_owner",
    EDITOR: "editor",
    VIEWER: "viewer",
} as const;

export type ModuleCollaboratorRole =
    (typeof MODULE_COLLABORATOR_ROLE)[keyof typeof MODULE_COLLABORATOR_ROLE];

export interface ModulePermissions {
    canViewModule: boolean;
    canEditModuleContent: boolean;
    canManageStudents: boolean;
    canManageModuleSettings: boolean;
    canManageSensitiveSettings: boolean;
    canManageCollaborators: boolean;
    canArchiveModule: boolean;
    canDeleteModule: boolean;
}

export function getModuleRoleLabel(role: ModuleCollaboratorRole): string {
    switch (role) {
        case MODULE_COLLABORATOR_ROLE.CREATOR:
            return "Creador";
        case MODULE_COLLABORATOR_ROLE.CO_OWNER:
            return "Codueño";
        case MODULE_COLLABORATOR_ROLE.EDITOR:
            return "Editor";
        case MODULE_COLLABORATOR_ROLE.VIEWER:
            return "Visitante";
        default:
            return "Profesor";
    }
}

export function getRestrictedActionMessage(action: keyof ModulePermissions, role: ModuleCollaboratorRole): string {
    if (action === "canManageCollaborators") {
        return "Solo el creador puede gestionar profesores de este módulo.";
    }

    if (action === "canArchiveModule" || action === "canDeleteModule" || action === "canManageSensitiveSettings") {
        return "Solo el creador puede archivar o eliminar este módulo.";
    }

    if (action === "canManageModuleSettings") {
        if (role === MODULE_COLLABORATOR_ROLE.EDITOR) {
            return "Tu rol de editor permite contenido y alumnos, pero no la configuración del módulo.";
        }

        return "Tu rol de visitante permite consultar, no modificar la configuración del módulo.";
    }

    if (action === "canManageStudents") {
        return role === MODULE_COLLABORATOR_ROLE.VIEWER
            ? "Tu rol de visitante permite consultar, no gestionar alumnos."
            : "No tienes permisos para gestionar alumnos en este módulo.";
    }

    if (action === "canEditModuleContent") {
        return role === MODULE_COLLABORATOR_ROLE.VIEWER
            ? "Tu rol de visitante permite consultar, no modificar contenido."
            : "No tienes permisos para editar el contenido de este módulo.";
    }

    return "No tienes permisos suficientes para realizar esta acción.";
}
