"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { getActivityAccess, getUnitAccess } from "@/lib/module-access";
import { getRestrictedActionMessage, type ModulePermissions } from "@/lib/module-collaborator-defs";

async function requireTeacher() {
    const supabase = await createClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        return { error: "No autenticado." as const };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        return { error: "Solo profesores." as const };
    }

    return { user, admin: createAdminClient() };
}

async function requireUnitPermission(unitId: string, permission: keyof ModulePermissions) {
    const auth = await requireTeacher();
    if ("error" in auth) {
        return auth;
    }

    const access = await getUnitAccess(unitId, auth.user.id);
    if (!access?.permissions[permission]) {
        return { error: getRestrictedActionMessage(permission, access?.role ?? "viewer") };
    }

    return { ...auth, access };
}

async function requireActivityPermission(activityId: string, permission: keyof ModulePermissions) {
    const auth = await requireTeacher();
    if ("error" in auth) {
        return auth;
    }

    const access = await getActivityAccess(activityId, auth.user.id);
    if (!access?.permissions[permission]) {
        return { error: getRestrictedActionMessage(permission, access?.role ?? "viewer") };
    }

    return { ...auth, access };
}

export async function updateActivityPosition(activityId: string, x: number | null, y: number | null, unitId: string) {
    const permission = await requireActivityPermission(activityId, "canEditModuleContent");
    if ("error" in permission) {
        return { success: false, error: permission.error };
    }

    const { error } = await permission.admin
        .from("activities")
        .update({
            position_x: x,
            position_y: y,
        })
        .eq("id", activityId);

    if (error) {
        console.error("Error updating activity position:", error);
        return { success: false, error };
    }

    revalidatePath(`/units/${unitId}/map`);
    return { success: true };
}

export async function createActivityConnection(
    unitId: string,
    sourceId: string,
    targetId: string,
    sourceHandle: string = "bottom",
    targetHandle: string = "top",
) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) {
        return { success: false, error: permission.error };
    }

    const { error } = await permission.admin
        .from("activity_connections")
        .insert({
            unit_id: unitId,
            source_activity_id: sourceId,
            target_activity_id: targetId,
            source_handle: sourceHandle,
            target_handle: targetHandle,
        });

    if (error) {
        console.error("Error creating activity connection:", error);
        return { success: false, error };
    }

    revalidatePath(`/units/${unitId}/map`);
    return { success: true };
}

export async function deleteActivityConnection(connectionId: string, unitId: string) {
    const auth = await requireTeacher();
    if ("error" in auth) {
        return { success: false, error: auth.error };
    }

    const { data: connection, error: connectionError } = await auth.admin
        .from("activity_connections")
        .select("source_activity_id")
        .eq("id", connectionId)
        .single();

    if (connectionError || !connection?.source_activity_id) {
        console.error("Error resolving activity connection:", connectionError);
        return { success: false, error: "No se pudo resolver la conexión." };
    }

    const permission = await requireActivityPermission(connection.source_activity_id, "canEditModuleContent");
    if ("error" in permission) {
        return { success: false, error: permission.error };
    }

    const { error } = await permission.admin
        .from("activity_connections")
        .delete()
        .eq("id", connectionId);

    if (error) {
        console.error("Error deleting activity connection:", error);
        return { success: false, error };
    }

    revalidatePath(`/units/${unitId}/map`);
    return { success: true };
}

export async function removeActivityFromMap(activityId: string, unitId: string) {
    return updateActivityPosition(activityId, null, null, unitId);
}

export async function updateActivityTitlePosition(activityId: string, position: string, unitId: string) {
    const permission = await requireActivityPermission(activityId, "canEditModuleContent");
    if ("error" in permission) {
        return { success: false, error: permission.error };
    }

    const { error } = await permission.admin
        .from("activities")
        .update({
            title_position: position,
        })
        .eq("id", activityId);

    if (error) {
        console.error("Error updating activity title position:", error);
        return { success: false, error };
    }

    revalidatePath(`/units/${unitId}/map`);
    return { success: true };
}
