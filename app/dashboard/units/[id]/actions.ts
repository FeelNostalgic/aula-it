"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
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

export type StepSubmissionRow = {
    id: string;
    step_id: string;
    step_title: string;
    activity_id: string;
    activity_title: string;
    student_id: string;
    student_name: string | null;
    student_email: string;
    drive_file_url: string | null;
    drive_file_id: string | null;
    status: string;
    submitted_at: string | null;
    delivery_mode: 'manual' | 'teacher_copy' | undefined;
};

export async function getUnitStepSubmissions(activityIds: string[]): Promise<{ data?: StepSubmissionRow[]; error?: string }> {
    if (activityIds.length === 0) return { data: [] };

    // Verify the caller is authenticated (admin client bypasses RLS below)
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const supabase = createAdminClient();

    // Step 1: get all phases for these activities
    const { data: phases, error: phasesError } = await supabase
        .from("activity_phases")
        .select("id, activity_id")
        .in("activity_id", activityIds);

    if (phasesError) return { error: phasesError.message };
    if (!phases || phases.length === 0) return { data: [] };

    const phaseIds = phases.map(p => p.id);
    const phaseActivityMap: Record<string, string> = {};
    for (const p of phases) phaseActivityMap[p.id] = p.activity_id;

    // Step 2: get deliverable steps in those phases
    const { data: steps, error: stepsError } = await supabase
        .from("activity_steps")
        .select("id, title, phase_id, content")
        .eq("type", "deliverable")
        .in("phase_id", phaseIds);

    if (stepsError) return { error: stepsError.message };
    if (!steps || steps.length === 0) return { data: [] };

    const stepIds = steps.map(s => s.id);
    const stepMeta: Record<string, { title: string; activityId: string; deliveryMode: 'manual' | 'teacher_copy' | undefined }> = {};
    for (const s of steps) {
        stepMeta[s.id] = {
            title: s.title,
            activityId: phaseActivityMap[s.phase_id] ?? "",
            deliveryMode: (s.content as any)?.deliveryMode,
        };
    }

    // Step 3: get activity titles
    const { data: activities, error: activitiesError } = await supabase
        .from("activities")
        .select("id, title")
        .in("id", activityIds);

    if (activitiesError) return { error: activitiesError.message };
    const activityTitles: Record<string, string> = {};
    for (const a of activities ?? []) activityTitles[a.id] = a.title;

    // Step 4: get submissions for those steps
    const { data: subs, error: subsError } = await supabase
        .from("activity_submissions")
        .select("id, step_id, student_id, drive_file_url, drive_file_id, status, submitted_at, student:profiles(id, full_name)")
        .in("step_id", stepIds)
        .order("submitted_at", { ascending: false });

    if (subsError) return { error: subsError.message };

    const rows: StepSubmissionRow[] = (subs || []).map((row: any) => {
        const meta = stepMeta[row.step_id];
        return {
            id: row.id,
            step_id: row.step_id,
            step_title: meta?.title ?? "—",
            activity_id: meta?.activityId ?? "",
            activity_title: activityTitles[meta?.activityId ?? ""] ?? "—",
            student_id: row.student_id,
            student_name: row.student?.full_name ?? null,
            student_email: row.student_id,
            drive_file_url: row.drive_file_url,
            drive_file_id: row.drive_file_id ?? null,
            status: row.status,
            submitted_at: row.submitted_at,
            delivery_mode: meta?.deliveryMode,
        };
    });

    return { data: rows };
}

export async function updateUnitResources(unitId: string, resources: any[]) {
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
        return { error: "Unauthorized: only teachers can update unit resources" };
    }

    const { error } = await supabase
        .from("units")
        .update({ resources })
        .eq("id", unitId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true };
}
