"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { evaluateStudentBadges } from "@/lib/gamification/rule-engine";

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

    revalidatePath(`/dashboard/units/${unitId}`);
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
    score: number | null;
    feedback: string | null;
    graded_at: string | null;
    rubric_scores: Record<string, number> | null;
    grading_mode: 'score' | 'rubric' | 'complete' | null;
    step_rubric: import('@/types/activity').RubricCriteria[];
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

    // Step 2: get deliverable and file_upload steps in those phases
    const { data: steps, error: stepsError } = await supabase
        .from("activity_steps")
        .select("id, title, phase_id, content")
        .in("type", ["deliverable", "file_upload"])
        .in("phase_id", phaseIds);

    if (stepsError) return { error: stepsError.message };
    if (!steps || steps.length === 0) return { data: [] };

    const stepIds = steps.map(s => s.id);
    const stepMeta: Record<string, { title: string; activityId: string; deliveryMode: 'manual' | 'teacher_copy' | undefined; rubric: import('@/types/activity').RubricCriteria[] }> = {};
    for (const s of steps) {
        stepMeta[s.id] = {
            title: s.title,
            activityId: phaseActivityMap[s.phase_id] ?? "",
            deliveryMode: (s.content as any)?.deliveryMode,
            rubric: (s.content as any)?.rubric ?? [],
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
        .select("id, step_id, student_id, drive_file_url, drive_file_id, status, submitted_at, score, feedback, graded_at, rubric_scores, grading_mode, student:profiles(id, full_name)")
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
            score: row.score ?? null,
            feedback: row.feedback ?? null,
            graded_at: row.graded_at ?? null,
            rubric_scores: row.rubric_scores ?? null,
            grading_mode: row.grading_mode ?? null,
            step_rubric: meta?.rubric ?? [],
        };
    });

    return { data: rows };
}

export async function gradeSubmission(
    submissionId: string,
    data: {
        gradingMode: 'score' | 'rubric' | 'complete';
        score?: number | null;
        rubricScores?: Record<string, number>;
        feedback?: string | null;
    }
): Promise<{ success?: boolean; error?: string }> {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Solo profesores." };

    const admin = createAdminClient();

    const updates: Record<string, any> = {
        feedback: data.feedback ?? null,
        grading_mode: data.gradingMode,
        status: "graded",
        graded_at: new Date().toISOString(),
    };

    if (data.gradingMode === 'score') {
        updates.score = data.score ?? null;
        updates.rubric_scores = null;
    } else if (data.gradingMode === 'rubric') {
        updates.score = null;
        updates.rubric_scores = data.rubricScores ?? null;
    } else {
        // complete
        updates.score = null;
        updates.rubric_scores = null;
    }

    const { error } = await admin
        .from("activity_submissions")
        .update(updates)
        .eq("id", submissionId);

    if (error) return { error: error.message };

    const { data: submissionData, error: subError } = await admin
        .from("activity_submissions")
        .select(`
            student_id,
            activity_steps!inner (
                activity_phases!inner (
                    activities!inner (
                        unit_id
                    )
                )
            )
        `)
        .eq("id", submissionId)
        .single();

    if (submissionData) {
        const sub = submissionData as any;
        const unitId = sub.activity_steps?.activity_phases?.activities?.unit_id;
        if (unitId) {
            // Evaluate badges asynchronously (don't block the response)
            evaluateStudentBadges(sub.student_id, unitId, submissionId).catch(err => {
                console.error("[Gamification] Error evaluating badges:", err);
            });
            
            revalidatePath(`/dashboard/units/${unitId}`);
        }
    }

    revalidatePath("/dashboard/units/[id]", "page");
    return { success: true };
}

export async function createUnitMilestone(
    unitId: string,
    data: {
        title: string;
        description?: string | null;
        target_points: number;
        reward: string;
        status: 'draft' | 'active' | 'completed' | 'archived';
    }
) {
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
        return { error: "Unauthorized: only teachers can create milestones" };
    }

    const { data: maxOrder } = await supabase
        .from("class_milestones")
        .select("order_index")
        .eq("unit_id", unitId)
        .order("order_index", { ascending: false })
        .limit(1)
        .single();

    const nextOrder = (maxOrder?.order_index ?? -1) + 1;

    const { error } = await supabase
        .from("class_milestones")
        .insert({
            unit_id: unitId,
            title: data.title,
            description: data.description ?? null,
            target_points: data.target_points,
            reward: data.reward,
            status: data.status,
            order_index: nextOrder,
        });

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true };
}

export async function updateUnitMilestone(
    milestoneId: string,
    unitId: string,
    data: Partial<{
        title: string;
        description: string | null;
        target_points: number;
        reward: string;
        status: 'draft' | 'active' | 'completed' | 'archived';
        order_index: number;
    }>
) {
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
        return { error: "Unauthorized: only teachers can update milestones" };
    }

    // Verify the milestone belongs to this unit
    const { data: existing } = await supabase
        .from("class_milestones")
        .select("id")
        .eq("id", milestoneId)
        .eq("unit_id", unitId)
        .single();

    if (!existing) {
        return { error: "Milestone not found or does not belong to this unit" };
    }

    // If we are activating this milestone, we no longer need to deactivate others
    // as multiple active milestones are allowed and they fill sequentially by order_index.


    const { error } = await supabase
        .from("class_milestones")
        .update(data)
        .eq("id", milestoneId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true };
}

export async function deleteUnitMilestone(milestoneId: string, unitId: string) {
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
        return { error: "Unauthorized: only teachers can delete milestones" };
    }

    // Verify the milestone belongs to this unit
    const { data: existing } = await supabase
        .from("class_milestones")
        .select("id")
        .eq("id", milestoneId)
        .eq("unit_id", unitId)
        .single();

    if (!existing) {
        return { error: "Milestone not found or does not belong to this unit" };
    }

    const { error } = await supabase
        .from("class_milestones")
        .delete()
        .eq("id", milestoneId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true };
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

export async function reorderUnitMilestones(
    unitId: string,
    milestoneIdOrder: string[]
) {
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
        return { error: "Unauthorized" };
    }

    // Update each milestone's order_index in a loop
    const updates = milestoneIdOrder.map((id, index) =>
        supabase
            .from("class_milestones")
            .update({ order_index: index })
            .eq("id", id)
            .eq("unit_id", unitId)
    );

    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error);

    if (firstError?.error) {
        return { error: firstError.error.message };
    }

    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true };
}

export async function createClassBadge(
    unitId: string, // Used for revalidation
    data: {
        title: string;
        description?: string | null;
        icon_url?: string | null;
        is_hidden: boolean;
        condition_payload: any;
        activity_id?: string | null;
        xp_reward?: number;
    }
) {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "Not authenticated" };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Unauthorized" };

    const { error } = await supabase
        .from("class_badges")
        .insert({
            unit_id: unitId,
            activity_id: data.activity_id ?? null,
            title: data.title,
            description: data.description ?? null,
            icon_url: data.icon_url ?? null,
            is_hidden: data.is_hidden,
            condition_payload: data.condition_payload,
            xp_reward: data.xp_reward ?? 0,
        });

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true };
}

export async function updateClassBadge(
    badgeId: string,
    unitId: string, // Used for revalidation
    data: Partial<{
        title: string;
        description: string | null;
        icon_url: string | null;
        is_hidden: boolean;
        condition_payload: any;
        activity_id: string | null;
        xp_reward: number;
    }>
) {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "Not authenticated" };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Unauthorized" };

    const { error } = await supabase
        .from("class_badges")
        .update(data)
        .eq("id", badgeId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true };
}

export async function deleteClassBadge(badgeId: string, unitId: string) {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "Not authenticated" };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Unauthorized" };

    const { error } = await supabase
        .from("class_badges")
        .delete()
        .eq("id", badgeId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true };
}

export async function deleteUnit(unitId: string) {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "Not authenticated" };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Unauthorized" };

    // Get module_id for revalidation before deletion
    const { data: unit } = await supabase
        .from("units")
        .select("module_id")
        .eq("id", unitId)
        .single();

    const { error } = await supabase
        .from("units")
        .delete()
        .eq("id", unitId);

    if (error) {
        return { error: error.message };
    }

    if (unit?.module_id) {
        revalidatePath(`/dashboard/modules/${unit.module_id}`);
    }
    revalidatePath("/dashboard");
    return { success: true };
}

export async function duplicateActivity(unitId: string, activityId: string) {
    const userClient = await createClient();
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return { error: "Not authenticated" };

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Unauthorized" };

    const supabase = createAdminClient();

    // 1. Get original activity with phases and steps
    const { data: activity, error: activityError } = await supabase
        .from("activities")
        .select(`
            *,
            activity_phases (
                *,
                activity_steps (*)
            )
        `)
        .eq("id", activityId)
        .single();

    if (activityError || !activity) return { error: "Activity not found" };

    // 2. Insert new activity
    const { data: newActivity, error: newActivityError } = await supabase
        .from("activities")
        .insert({
            unit_id: unitId,
            title: `${activity.title} - copia`,
            description: activity.description,
            type: activity.type,
            xp: activity.xp,
            duration: activity.duration,
            difficulty: activity.difficulty,
            status: 'draft',
            order_index: (activity.order_index ?? 0) + 1,
            position_x: (activity.position_x ?? 0) + 20,
            position_y: (activity.position_y ?? 0) + 20,
            logo_url: activity.logo_url
        })
        .select()
        .single();

    if (newActivityError) return { error: newActivityError.message };

    // 3. Duplicate phases and steps
    for (const phase of (activity.activity_phases || [])) {
        const { data: newPhase, error: newPhaseError } = await supabase
            .from("activity_phases")
            .insert({
                activity_id: newActivity.id,
                title: phase.title,
                description: phase.description,
                order_index: phase.order_index
            })
            .select()
            .single();

        if (newPhaseError) continue;

        for (const step of (phase.activity_steps || [])) {
            await supabase
                .from("activity_steps")
                .insert({
                    phase_id: newPhase.id,
                    title: step.title,
                    content: step.content,
                    type: step.type,
                    order_index: step.order_index,
                    xp_reward: step.xp_reward,
                    completion_mode: step.completion_mode,
                    config: step.config
                });
        }
    }

    revalidatePath(`/dashboard/units/${unitId}`);
    return { success: true };
}

export async function duplicateUnit(moduleId: string, unitId: string) {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return { error: "Not authenticated" };

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Unauthorized" };

    const supabase = createAdminClient();

    // 1. Get original unit with all related data
    const { data: unit, error: unitError } = await supabase
        .from("units")
        .select(`
            *,
            activities (
                *,
                activity_phases (
                    *,
                    activity_steps (*)
                )
            ),
            class_milestones (*),
            class_badges (*)
        `)
        .eq("id", unitId)
        .single();

    if (unitError || !unit) return { error: "Unit not found" };

    // 2. Insert new unit
    const { data: newUnit, error: newUnitError } = await supabase
        .from("units")
        .insert({
            module_id: moduleId,
            name: `${unit.name} - copia`,
            description: unit.description,
            status: 'draft',
            view_type: unit.view_type || 'list',
            order_index: (unit.order_index ?? 0) + 1,
            resources: unit.resources
        })
        .select()
        .single();

    if (newUnitError) return { error: newUnitError.message };

    // 3. Duplicate activities
    for (const activity of (unit.activities || [])) {
        const { data: newActivity, error: newActivityError } = await supabase
            .from("activities")
            .insert({
                unit_id: newUnit.id,
                title: activity.title,
                description: activity.description,
                type: activity.type,
                xp: activity.xp,
                duration: activity.duration,
                difficulty: activity.difficulty,
                status: 'draft',
                order_index: activity.order_index,
                position_x: activity.position_x,
                position_y: activity.position_y,
                logo_url: activity.logo_url
            })
            .select()
            .single();

        if (newActivityError) continue;

        for (const phase of (activity.activity_phases || [])) {
            const { data: newPhase, error: newPhaseError } = await supabase
                .from("activity_phases")
                .insert({
                    activity_id: newActivity.id,
                    title: phase.title,
                    description: phase.description,
                    order_index: phase.order_index
                })
                .select()
                .single();

            if (newPhaseError) continue;

            for (const step of (phase.activity_steps || [])) {
                await supabase
                    .from("activity_steps")
                    .insert({
                        phase_id: newPhase.id,
                        title: step.title,
                        content: step.content,
                        type: step.type,
                        order_index: step.order_index,
                        xp_reward: step.xp_reward,
                        completion_mode: step.completion_mode,
                        config: step.config
                    });
            }
        }
    }

    // 4. Duplicate milestones
    for (const milestone of (unit.class_milestones || [])) {
        await supabase
            .from("class_milestones")
            .insert({
                unit_id: newUnit.id,
                title: milestone.title,
                description: milestone.description,
                target_points: milestone.target_points,
                reward: milestone.reward,
                status: 'draft',
                order_index: milestone.order_index
            });
    }

    // 5. Duplicate badges
    for (const badge of (unit.class_badges || [])) {
        await supabase
            .from("class_badges")
            .insert({
                unit_id: newUnit.id,
                title: badge.title,
                description: badge.description,
                icon_url: badge.icon_url,
                is_hidden: badge.is_hidden,
                condition_payload: badge.condition_payload,
                xp_reward: badge.xp_reward
            });
    }

    revalidatePath(`/dashboard/modules/${moduleId}`);
    return { success: true };
}

