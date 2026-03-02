"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateUnitSettings(unitId: string, formData: FormData) {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return { error: "Not authenticated" };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        return { error: "Unauthorized: only teachers can update units" };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const status = formData.get("status") as string;
    const view_type = formData.get("view_type") as string;

    if (!name?.trim()) {
        return { error: "Unit name cannot be empty" };
    }

    // Get module_id to revalidate module page
    const { data: unitData } = await supabase
        .from("units")
        .select("module_id")
        .eq("id", unitId)
        .single();

    const { error } = await supabase
        .from("units")
        .update({
            name: name.trim(),
            description: description ? description.trim() : null,
            status: status || 'draft',
            view_type: view_type || 'list'
        })
        .eq("id", unitId);

    if (error) {
        return { error: error.message };
    }

    if (unitData?.module_id) {
        revalidatePath(`/dashboard/modules/${unitData.module_id}`);
    }
    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true };
}

export async function createActivity(formData: FormData) {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return { error: "Not authenticated" };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        return { error: "Unauthorized: only teachers can create activities" };
    }

    const unitId = formData.get("unit_id") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const type = formData.get("type") as string;
    const xp = parseInt(formData.get("xp") as string) || 0;
    const difficulty = formData.get("difficulty") as string;
    const durationRaw = formData.get("duration") as string;
    const duration = parseInt(durationRaw) || 30;

    if (!unitId || !title || !type) {
        return { error: "Unit ID, title, and type are required" };
    }

    // Get the next order_index
    const { data: lastActivity } = await supabase
        .from("activities")
        .select("order_index")
        .eq("unit_id", unitId)
        .order("order_index", { ascending: false })
        .limit(1)
        .single();

    const nextOrder = (lastActivity?.order_index ?? -1) + 1;

    const { error } = await supabase
        .from("activities")
        .insert({
            unit_id: unitId,
            title,
            description: description || null,
            type,
            xp,
            difficulty: difficulty || 'Bajo',
            duration,
            order_index: nextOrder,
            position_x: null,
            position_y: null,
        });

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true };
}

export async function reorderActivity(unitId: string, activityId: string, direction: 'up' | 'down') {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Unauthorized" };

    // Get current activity
    const { data: currentActivity } = await supabase
        .from("activities")
        .select("id, order_index")
        .eq("id", activityId)
        .single();

    if (!currentActivity) return { error: "Activity not found" };

    // Find the activity to swap with
    let swapQuery = supabase
        .from("activities")
        .select("id, order_index")
        .eq("unit_id", unitId);

    if (direction === 'up') {
        swapQuery = swapQuery.lt("order_index", currentActivity.order_index).order("order_index", { ascending: false }).limit(1);
    } else {
        swapQuery = swapQuery.gt("order_index", currentActivity.order_index).order("order_index", { ascending: true }).limit(1);
    }

    const { data: swapData } = await swapQuery.single();

    if (!swapData) {
        // Already at the top/bottom, no need to swap
        return { success: true };
    }

    // Perform the swap (using two updates. In a real production system, use a transaction/RPC)
    await supabase.from("activities").update({ order_index: swapData.order_index }).eq("id", currentActivity.id);
    await supabase.from("activities").update({ order_index: currentActivity.order_index }).eq("id", swapData.id);

    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true };
}

export async function reorderMultipleActivities(unitId: string, updates: { id: string, order_index: number }[]) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Unauthorized" };

    // Perform individual updates for each activity
    // Note: for very large lists, a Postgres function (RPC) would be more efficient
    const updatePromises = updates.map(update =>
        supabase
            .from("activities")
            .update({ order_index: update.order_index })
            .eq("id", update.id)
    );

    await Promise.all(updatePromises);

    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true };
}

export async function deleteActivity(unitId: string, activityId: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Unauthorized" };

    const { error } = await supabase
        .from("activities")
        .delete()
        .eq("id", activityId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true };
}


export async function updateActivityStatus(activityId: string, status: 'published' | 'blocked' | 'draft') {
    const supabase = await createClient();

    const { error } = await supabase
        .from('activities')
        .update({ status })
        .eq('id', activityId);

    if (error) {
        console.error('Error updating activity status:', error);
        return { error: 'No se pudo actualizar el estado de la actividad' };
    }

    revalidatePath('/dashboard/units/[id]', 'page');
    return { success: true };
}

export async function updateActivityPosition(activityId: string, x: number, y: number) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('activities')
        .update({ position_x: x, position_y: y })
        .eq('id', activityId);

    if (error) {
        console.error('Error updating activity position:', error);
        return { error: 'No se pudo actualizar la posición de la actividad' };
    }

    revalidatePath('/dashboard/units/[id]', 'page');
    return { success: true };
}

export async function updateMultipleActivityPositions(updates: { id: string, x: number, y: number }[]) {
    const supabase = await createClient();

    // Optimización: realizar actualizaciones en paralelo o vía RPC si fueran muchas, 
    // pero para el mapa actual un Promise.all es suficiente.
    const results = await Promise.all(
        updates.map(async (update) => {
            const { error } = await supabase
                .from('activities')
                .update({ position_x: update.x, position_y: update.y })
                .eq('id', update.id);
            return { id: update.id, error };
        })
    );

    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
        console.error('Errors updating multiple positions:', errors);
        return { error: 'Algunas posiciones no se pudieron guardar' };
    }

    revalidatePath('/dashboard/units/[id]', 'page');
    return { success: true };
}

export async function addActivityConnection(unitId: string, sourceId: string, targetId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('activity_connections')
        .insert({
            unit_id: unitId,
            source_activity_id: sourceId,
            target_activity_id: targetId
        });

    if (error) {
        if (error.code === '23505') { // Unique violation
            return { error: 'Esta conexión ya existe' };
        }
        console.error('Error adding activity connection:', error);
        return { error: 'No se pudo crear la conexión' };
    }

    revalidatePath('/dashboard/units/[id]', 'page');
    return { success: true };
}

export async function removeActivityConnection(connectionId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('activity_connections')
        .delete()
        .eq('id', connectionId);

    if (error) {
        console.error('Error removing activity connection:', error);
        return { error: 'No se pudo eliminar la conexión' };
    }

    revalidatePath('/dashboard/units/[id]', 'page');
    return { success: true };
}
