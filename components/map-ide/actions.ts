"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { getActivityAccess, getUnitAccess } from "@/lib/module-access";
import { getRestrictedActionMessage, type ModulePermissions } from "@/lib/module-collaborator-defs";
import { MAP_ROUTE_TYPE, parseMapNodeId, type MapNodeType, type MapRouteType } from "@/types/unit-map";

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
    routeType: MapRouteType = MAP_ROUTE_TYPE.REQUIRED,
    label: string | null = null,
) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) {
        return { success: false, error: permission.error };
    }

    const source = parseMapNodeId(sourceId);
    const target = parseMapNodeId(targetId);

    const { data, error } = await permission.admin
        .from("activity_connections")
        .insert({
            unit_id: unitId,
            source_activity_id: source.kind === "activity" ? source.id : null,
            target_activity_id: target.kind === "activity" ? target.id : null,
            source_map_node_id: source.kind === "flow" ? source.id : null,
            target_map_node_id: target.kind === "flow" ? target.id : null,
            source_handle: sourceHandle,
            target_handle: targetHandle,
            route_type: routeType,
            route_label: label,
        })
        .select("id")
        .single();

    if (error) {
        console.error("Error creating activity connection:", error);
        return { success: false, error };
    }

    revalidatePath(`/units/${unitId}/map`);
    return { success: true, connection: data };
}

export async function deleteActivityConnection(connectionId: string, unitId: string) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
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

export async function createUnitMapNode(
    unitId: string,
    type: MapNodeType,
    label: string,
    x: number,
    y: number,
    description: string | null = null,
) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) {
        return { success: false, error: permission.error };
    }

    const { data, error } = await permission.admin
        .from("unit_map_nodes")
        .insert({
            unit_id: unitId,
            type,
            label,
            description,
            position_x: x,
            position_y: y,
        })
        .select("id, unit_id, type, label, description, position_x, position_y")
        .single();

    if (error) {
        console.error("Error creating unit map node:", error);
        return { success: false, error };
    }

    revalidatePath(`/units/${unitId}/map`);
    return { success: true, node: data };
}

export async function updateUnitMapNode(
    nodeId: string,
    unitId: string,
    payload: { type: MapNodeType; label: string; description: string | null },
) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) {
        return { success: false, error: permission.error };
    }

    const { error } = await permission.admin
        .from("unit_map_nodes")
        .update(payload)
        .eq("id", nodeId)
        .eq("unit_id", unitId);

    if (error) {
        console.error("Error updating unit map node:", error);
        return { success: false, error };
    }

    revalidatePath(`/units/${unitId}/map`);
    return { success: true };
}

export async function deleteUnitMapNode(nodeId: string, unitId: string) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) {
        return { success: false, error: permission.error };
    }

    const { error } = await permission.admin
        .from("unit_map_nodes")
        .delete()
        .eq("id", nodeId)
        .eq("unit_id", unitId);

    if (error) {
        console.error("Error deleting unit map node:", error);
        return { success: false, error };
    }

    revalidatePath(`/units/${unitId}/map`);
    return { success: true };
}

export async function updateMapConnection(
    connectionId: string,
    unitId: string,
    payload: { label: string | null; routeType: MapRouteType },
) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) {
        return { success: false, error: permission.error };
    }

    const { error } = await permission.admin
        .from("activity_connections")
        .update({
            route_label: payload.label,
            route_type: payload.routeType,
        })
        .eq("id", connectionId)
        .eq("unit_id", unitId);

    if (error) {
        console.error("Error updating map connection:", error);
        return { success: false, error };
    }

    revalidatePath(`/units/${unitId}/map`);
    return { success: true };
}

export async function updateMapLayoutPositions(
    unitId: string,
    updates: Array<{ id: string; x: number; y: number }>,
) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) {
        return { success: false, error: permission.error };
    }

    const results = await Promise.all(
        updates.map(async (update) => {
            const endpoint = parseMapNodeId(update.id);
            const table = endpoint.kind === "activity" ? "activities" : "unit_map_nodes";
            const { error } = await permission.admin
                .from(table)
                .update({
                    position_x: update.x,
                    position_y: update.y,
                })
                .eq("id", endpoint.id);
            return { id: update.id, error };
        })
    );

    const errors = results.filter((result) => result.error);
    if (errors.length > 0) {
        console.error("Errors updating map layout positions:", errors);
        return { success: false, error: "No se pudieron guardar todas las posiciones." };
    }

    revalidatePath(`/units/${unitId}/map`);
    return { success: true };
}

export async function updateFlowNodePosition(nodeId: string, x: number, y: number, unitId: string) {
    return updateMapLayoutPositions(unitId, [{ id: nodeId, x, y }]);
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
