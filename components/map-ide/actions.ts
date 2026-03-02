"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateActivityPosition(activityId: string, x: number | null, y: number | null, unitId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('activities')
        .update({
            position_x: x,
            position_y: y
        })
        .eq('id', activityId);

    if (error) {
        console.error('Error updating activity position:', error);
        return { success: false, error };
    }

    revalidatePath(`/units/${unitId}/map`);
    return { success: true };
}

export async function createActivityConnection(
    unitId: string,
    sourceId: string,
    targetId: string,
    sourceHandle: string = 'bottom',
    targetHandle: string = 'top'
) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('activity_connections')
        .insert({
            unit_id: unitId,
            source_activity_id: sourceId,
            target_activity_id: targetId,
            source_handle: sourceHandle,
            target_handle: targetHandle
        });

    if (error) {
        console.error('Error creating activity connection:', error);
        return { success: false, error };
    }

    revalidatePath(`/units/${unitId}/map`);
    return { success: true };
}

export async function deleteActivityConnection(connectionId: string, unitId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('activity_connections')
        .delete()
        .eq('id', connectionId);

    if (error) {
        console.error('Error deleting activity connection:', error);
        return { success: false, error };
    }

    revalidatePath(`/units/${unitId}/map`);
    return { success: true };
}

export async function removeActivityFromMap(activityId: string, unitId: string) {
    return updateActivityPosition(activityId, null, null, unitId);
}
