"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { evaluateStudentBadges } from "@/lib/gamification/rule-engine";
import { getUnitAccess } from "@/lib/module-access";
import { getRestrictedActionMessage, type ModulePermissions } from "@/lib/module-collaborator-defs";
import {
    ACTIVITY_NAVIGATION_MODE,
    UNIT_ACTIVITY_NAVIGATION_MODE,
    UNIT_ACTIVITY_UNLOCK_RULE,
} from "@/types/activity";

async function requireTeacher() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        return { error: "No autenticado." as const, user: null, access: null, admin: null };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        return { error: "Solo profesores." as const, user: null, access: null, admin: null };
    }

    return { user, access: null, admin: createAdminClient(), supabase };
}

async function requireUnitPermission(unitId: string, permission: keyof ModulePermissions) {
    const auth = await requireTeacher();
    if ("error" in auth) {
        return auth;
    }

    const adminOrFallback = (auth.admin as typeof auth.admin | undefined) ?? auth.supabase;
    const access = await getUnitAccess(unitId, auth.user.id, adminOrFallback);
    if (!access) {
        return { error: "No tienes permiso para modificar esta unidad." as const, user: auth.user, access: null, admin: null };
    }
    if (!access.permissions[permission]) {
        return { error: getRestrictedActionMessage(permission, access.role), user: auth.user, access: null, admin: null };
    }

    return { user: auth.user, access, admin: auth.admin };
}

async function requireActivityPermission(activityId: string, permission: keyof ModulePermissions) {
    const auth = await requireTeacher();
    if ("error" in auth) {
        return auth;
    }

    const { data: activity } = await auth.admin
        .from("activities")
        .select("unit_id")
        .eq("id", activityId)
        .single();

    if (!activity?.unit_id) {
        return { error: getRestrictedActionMessage(permission, "viewer"), user: auth.user, access: null, admin: null };
    }

    const access = await getUnitAccess(activity.unit_id, auth.user.id);
    if (!access) {
        return { error: "No tienes permiso para modificar esta unidad." as const, user: auth.user, access: null, admin: null };
    }
    if (!access.permissions[permission]) {
        return { error: getRestrictedActionMessage(permission, access.role), user: auth.user, access: null, admin: null };
    }

    return { user: auth.user, access, admin: auth.admin };
}

async function requireStepPermission(stepId: string, permission: keyof ModulePermissions) {
    const auth = await requireTeacher();
    if ("error" in auth) {
        return auth;
    }

    return { user: auth.user, access: null, admin: auth.admin };
}

export async function updateUnitSettings(unitId: string, formData: FormData) {
    const permission = await requireUnitPermission(unitId, "canManageModuleSettings");
    if ("error" in permission) {
        return { error: permission.error };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const status = formData.get("status") as string;
    const view_type = formData.get("view_type") as string;
    const activity_navigation_mode = formData.get("activity_navigation_mode") as string;
    const activity_unlock_rule = formData.get("activity_unlock_rule") as string;
    const activity_unlock_threshold_raw = formData.get("activity_unlock_threshold") as string;

    if (!name?.trim()) {
        return { error: "El nombre de la unidad no puede estar vacío" };
    }

    const activityUnlockThreshold = Number.parseInt(activity_unlock_threshold_raw || "100", 10);
    if (Number.isNaN(activityUnlockThreshold) || activityUnlockThreshold < 1 || activityUnlockThreshold > 100) {
        return { error: "El umbral de desbloqueo debe estar entre 1 y 100." };
    }

    // Get module_id to revalidate module page
    const { data: unitData } = await permission.admin
        .from("units")
        .select("module_id")
        .eq("id", unitId)
        .single();

    const { error } = await permission.admin
        .from("units")
        .update({
            name: name.trim(),
            description: description ? description.trim() : null,
            status: status || 'draft',
            view_type: view_type || 'list',
            activity_navigation_mode: activity_navigation_mode || UNIT_ACTIVITY_NAVIGATION_MODE.FREE,
            activity_unlock_rule: activity_unlock_rule || UNIT_ACTIVITY_UNLOCK_RULE.REQUIRED_STEPS,
            activity_unlock_threshold: activityUnlockThreshold,
        })
        .eq("id", unitId);

    if (error) {
        return { error: error.message };
    }

    if (unitData?.module_id) {
        revalidatePath(`/dashboard/modules/${unitData.module_id}`);
    }
    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function createActivity(formData: FormData) {
    const unitId = formData.get("unit_id") as string;
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");    if ("error" in permission) {
        return { error: permission.error };
    }
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const type = (formData.get("type") as string) || "other";
    const difficulty = formData.get("difficulty") as string;
    const logoUrl = formData.get("logo_url") as string;
    const durationRaw = formData.get("duration") as string;
    const duration = parseInt(durationRaw) || 30;

    if (!unitId || !title) {
        return { error: "ID de unidad y título son requeridos" };
    }

    // Get the next order_index
    const { data: lastActivity } = await permission.admin
        .from("activities")
        .select("order_index")
        .eq("unit_id", unitId)
        .order("order_index", { ascending: false })
        .limit(1)
        .single();

    const nextOrder = (lastActivity?.order_index ?? -1) + 1;

    const { error } = await permission.admin
        .from("activities")
        .insert({
            unit_id: unitId,
            title,
            description: description || null,
            type,
            difficulty: difficulty || 'Bajo',
            duration,
            logo_url: logoUrl || null,
            order_index: nextOrder,
            position_x: null,
            position_y: null,
            navigation_mode: ACTIVITY_NAVIGATION_MODE.FREE,
        });

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function reorderActivity(unitId: string, activityId: string, direction: 'up' | 'down') {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    // Get current activity
    const { data: currentActivity } = await permission.admin
        .from("activities")
        .select("id, order_index")
        .eq("id", activityId)
        .single();

    if (!currentActivity) return { error: "Actividad no encontrada" };

    // Find the activity to swap with
    const { data: swapData } = await (direction === "up"
        ? permission.admin
            .from("activities")
            .select("id, order_index")
            .eq("unit_id", unitId)
            .lt("order_index", currentActivity.order_index)
            .order("order_index", { ascending: false })
            .limit(1)
            .single()
        : permission.admin
            .from("activities")
            .select("id, order_index")
            .eq("unit_id", unitId)
            .gt("order_index", currentActivity.order_index)
            .order("order_index", { ascending: true })
            .limit(1)
            .single());

    if (!swapData) {
        // Already at the top/bottom, no need to swap
        return { success: true };
    }

    // Perform the swap
    await permission.admin.from("activities").update({ order_index: swapData.order_index }).eq("id", currentActivity.id);
    await permission.admin.from("activities").update({ order_index: currentActivity.order_index }).eq("id", swapData.id);

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function reorderMultipleActivities(unitId: string, updates: { id: string, order_index: number }[]) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    // Perform individual updates for each activity
    // Note: for very large lists, a Postgres function (RPC) would be more efficient
    const updatePromises = updates.map(update =>
        permission.admin
            .from("activities")
            .update({ order_index: update.order_index })
            .eq("id", update.id)
    );

    await Promise.all(updatePromises);

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function deleteActivity(unitId: string, activityId: string) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    const { error } = await permission.admin
        .from("activities")
        .delete()
        .eq("id", activityId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}


export async function updateActivityStatus(activityId: string, status: 'published' | 'blocked' | 'draft') {
    const permission = await requireActivityPermission(activityId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    const { error } = await permission.admin
        .from('activities')
        .update({ status })
        .eq('id', activityId);

    if (error) {
        console.error('Error updating activity status:', error);
        return { error: 'No se pudo actualizar el estado de la actividad' };
    }

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function updateActivityPosition(activityId: string, x: number, y: number) {
    const permission = await requireActivityPermission(activityId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    const { error } = await permission.admin
        .from('activities')
        .update({ position_x: x, position_y: y })
        .eq('id', activityId);

    if (error) {
        console.error('Error updating activity position:', error);
        return { error: 'No se pudo actualizar la posición de la actividad' };
    }

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function updateMultipleActivityPositions(updates: { id: string, x: number, y: number }[]) {
    if (updates.length === 0) {
        const auth = await requireTeacher();
        if ("error" in auth) return { error: auth.error };
        return { success: true };
    }
    const permission = await requireActivityPermission(updates[0].id, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    // Optimización: realizar actualizaciones en paralelo o vía RPC si fueran muchas, 
    // pero para el mapa actual un Promise.all es suficiente.
    const results = await Promise.all(
        updates.map(async (update) => {
            const { error } = await permission.admin
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

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function addActivityConnection(unitId: string, sourceId: string, targetId: string) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    const { error } = await permission.admin
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

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function removeActivityConnection(connectionId: string) {
    const permission = await requireTeacher();
    if ("error" in permission) return { error: permission.error };

    const supabase = await createClient();
    const { data: connection } = await supabase
        .from("activity_connections")
        .select("source_activity_id")
        .eq("id", connectionId)
        .single();

    if (!connection?.source_activity_id) {
        return { error: "No se pudo resolver la conexión." };
    }

    const activityPermission = await requireActivityPermission(connection.source_activity_id, "canEditModuleContent");
    if ("error" in activityPermission) return { error: activityPermission.error };

    const { error } = await activityPermission.admin
        .from('activity_connections')
        .delete()
        .eq('id', connectionId);

    if (error) {
        console.error('Error removing activity connection:', error);
        return { error: 'No se pudo eliminar la conexión' };
    }

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export type SubmissionFile = {
    driveFileId: string;
    driveFileUrl: string;
    driveFileName: string;
    driveMimeType: string;
};

export type StepSubmissionRow = {
    id: string;
    step_id: string;
    step_title: string;
    step_type: import('@/types/activity').ActivityStepType;
    activity_id: string;
    activity_title: string;
    student_id: string;
    student_name: string | null;
    student_email: string;
    drive_file_url: string | null;
    drive_file_id: string | null;
    files: SubmissionFile[] | null;
    status: string;
    submitted_at: string | null;
    delivery_mode: 'manual' | 'teacher_copy' | undefined;
    score: number | null;
    feedback: string | null;
    graded_at: string | null;
    published_at: string | null;
    rubric_scores: Record<string, number> | null;
    grading_mode: 'score' | 'rubric' | 'complete' | null;
    step_rubric: import('@/types/activity').RubricCriteria[];
    quiz_content: import('@/types/activity').QuizContent | null;
    quiz_attempt: {
        id: string;
        attempt_number: number;
        answers: Record<string, string[]>;
        short_answers: Record<string, string>;
        structured_answers: import('@/types/activity').QuizStructuredAnswers;
        short_answer_scores: Record<string, number>;
        short_answer_feedback: Record<string, string>;
        points_earned: number;
        points_total: number;
        resolved_questions: import('@/types/activity').QuizQuestion[];
    } | null;
    quiz_attempts?: {
        id: string;
        attempt_number: number;
        answers: Record<string, string[]>;
        short_answers: Record<string, string>;
        structured_answers: import('@/types/activity').QuizStructuredAnswers;
        short_answer_scores: Record<string, number>;
        short_answer_feedback: Record<string, string>;
        points_earned: number;
        points_total: number;
        resolved_questions: import('@/types/activity').QuizQuestion[];
        completed_at: string;
    }[];
    group_id?: string | null;
    group_name?: string | null;
    group_color?: string | null;
    group_members?: { student_id: string; full_name: string | null }[];
    is_group_submission?: boolean;
    synthetic?: boolean; // true = no real submission, injected for display
    step_is_locked?: boolean;
    // self-evaluation fields (only populated for self_evaluation steps)
    self_eval_rubric_scores: Record<string, number> | null;
    self_eval_justifications: Record<string, string> | null;
    step_eval_mode: import('@/types/activity').EvalMode | null;
    step_eval_rubric: import('@/types/activity').RubricCriteria[] | null;
    step_eval_questions: import('@/types/activity').QuizQuestion[] | null;
    step_eval_counts_toward_grade: boolean | null;
    step_eval_weight: number | null;
    // For deliverable/file_upload rows: populated when linked eval steps exist
    linked_self_eval_score?: number | null;          // student's self-eval normalised score (0–10)
    linked_self_eval_weight?: number | null;         // selfEvalWeight % from the self-eval step content
    linked_peer_eval_score?: number | null;          // average group peer eval normalised score (0–10)
    linked_peer_eval_weight?: number | null;         // peerEvalWeight % from deliverable gradeComposition
    linked_intra_peer_eval_score?: number | null;    // avg intra-group received score (0–10), per student (propagated rows)
    linked_intra_peer_eval_weight?: number | null;   // intraGroupWeight % from deliverable gradeComposition
    linked_quiz_score?: number | null;               // nested built-in quiz score (0–10)
    linked_quiz_weight?: number | null;              // quizWeight % from deliverable gradeComposition
    // For canonical/synthetic group rows: per-student intra-group scores (available before publishing)
    intra_peer_scores_by_student?: Record<string, { score: number; weight: number }>;
    // Structural fields for nesting in grading view
    parent_step_id?: string | null;
    is_activity_closed?: boolean;
    step_order_index?: number;
};

export async function getUnitStepSubmissions(
    activityIds: string[],
    students?: { student_id: string; name: string }[]
): Promise<{ data?: StepSubmissionRow[]; error?: string }> {
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

    // Step 2: get gradeable + eval steps in those phases
    const { data: steps, error: stepsError } = await supabase
        .from("activity_steps")
        .select("id, type, title, phase_id, content, is_locked, is_activity_closed, parent_step_id, order_index")
        .in("type", ["deliverable", "file_upload", "quiz", "self_evaluation", "peer_evaluation"])
        .in("phase_id", phaseIds)
        .order("order_index", { ascending: true });

    if (stepsError) return { error: stepsError.message };
    if (!steps || steps.length === 0) return { data: [] };

    const stepIds = steps.map(s => s.id);

    // Fetch activity titles + module_id (via unit join) for group-step placeholder logic
    const { data: activities } = await supabase
        .from("activities")
        .select("id, title, unit:units(module_id)")
        .in("id", activityIds);
    const activityTitles: Record<string, string> = {};
    activities?.forEach(a => activityTitles[a.id] = a.title);
    const moduleId = ((activities?.[0] as any)?.unit as any)?.module_id as string | undefined;

    const stepMeta: Record<string, { title: string; stepType: string; activityId: string; activityTitle: string; deliveryMode: any; rubric: any; quizContent: any; isLocked: boolean; isActivityClosed: boolean; isGroupSubmission: boolean; evalMode: any; evalQuestions: any; countsTowardGrade: boolean; selfEvalWeight: number | null; parentStepId: string | null; orderIndex: number }> = {};
    for (const s of steps) {
        const activityId = phaseActivityMap[s.phase_id] ?? "";
        stepMeta[s.id] = {
            title: s.title,
            stepType: s.type,
            activityId,
            activityTitle: activityTitles[activityId] ?? "",
            deliveryMode: (s.content as any)?.deliveryMode,
            rubric: (s.content as any)?.rubric ?? [],
            quizContent: s.type === 'quiz' ? (s.content as any) : null,
            isLocked: (s as any).is_locked ?? false,
            isActivityClosed: (s as any).is_activity_closed ?? false,
            isGroupSubmission: (s.content as any)?.is_group_submission === true,
            evalMode: (s.type === 'self_evaluation' || s.type === 'peer_evaluation') ? ((s.content as any)?.evalMode ?? 'rubric') : null,
            evalQuestions: (s.type === 'self_evaluation' || s.type === 'peer_evaluation') ? ((s.content as any)?.questions ?? []) : null,
            countsTowardGrade: s.type === 'self_evaluation' ? (((s.content as any)?.countsTowardGrade) === true) : false,
            selfEvalWeight: s.type === 'self_evaluation' ? ((s.content as any)?.selfEvalWeight ?? null) : null,
            parentStepId: (s as any).parent_step_id ?? null,
            orderIndex: (s as any).order_index ?? 0,
        };
    }

    // Separate step categories:
    // - eval-only: self_evaluation / peer_evaluation — rendered by specialized teacher views, need virtual placeholder rows
    // - group: deliverable/file_upload with is_group_submission
    // - individual: everything else
    const evalOnlyTypes = new Set(["self_evaluation", "peer_evaluation"]);
    const evalOnlyStepIds = steps.filter(s => evalOnlyTypes.has(s.type)).map(s => s.id);
    const groupStepIds = steps.filter(s => !evalOnlyTypes.has(s.type) && (s.content as any)?.is_group_submission === true).map(s => s.id);
    const individualStepIds = steps.filter(s => !evalOnlyTypes.has(s.type) && !(s.content as any)?.is_group_submission).map(s => s.id);

    // Step 3a: get individual submissions (non-group steps only)
    let submissions: any[] = [];
    if (individualStepIds.length > 0) {
        let query = supabase
            .from("activity_submissions")
            .select(`
                *,
                student:profiles!inner(full_name)
            `)
            .in("step_id", individualStepIds);

        if (students && students.length > 0) {
            query = query.in("student_id", students.map(s => s.student_id));
        }

        const { data: indivSubs, error: subError } = await query;
        if (subError) return { error: subError.message };
        submissions = indivSubs ?? [];
    }

    // Step 3c: get propagated individual rows for group steps (for gradebook)
    // publishGroupGrade creates these with group_id = NULL (individual grade copies).
    // The canonical group submission (group_id IS NOT NULL) is already in groupResults.
    let propagatedResults: StepSubmissionRow[] = [];
    if (groupStepIds.length > 0) {
        let propQuery = supabase
            .from("activity_submissions")
            .select(`*, student:profiles!inner(full_name)`)
            .in("step_id", groupStepIds)
            .is("group_id", null);

        if (students && students.length > 0) {
            propQuery = propQuery.in("student_id", students.map(s => s.student_id));
        }

        const { data: propSubs } = await propQuery;
        propagatedResults = (propSubs ?? []).map((sub: any) => {
            const meta = stepMeta[sub.step_id];
            return {
                id: sub.id,
                step_id: sub.step_id,
                step_title: meta?.title ?? "",
                step_type: meta?.stepType as any,
                activity_id: meta?.activityId ?? "",
                activity_title: meta?.activityTitle ?? "",
                student_id: sub.student_id,
                student_name: (sub.student as any)?.full_name ?? null,
                student_email: "",
                drive_file_url: sub.drive_file_url,
                drive_file_id: sub.drive_file_id,
                files: sub.files,
                status: sub.status,
                submitted_at: sub.submitted_at,
                delivery_mode: meta?.deliveryMode,
                score: sub.score,
                feedback: sub.feedback,
                graded_at: sub.graded_at,
                published_at: sub.published_at,
                rubric_scores: sub.rubric_scores,
                grading_mode: sub.grading_mode,
                step_rubric: meta?.rubric ?? [],
                quiz_content: null,
                quiz_attempt: null,
                quiz_attempts: [],
                group_id: sub.group_id,
                step_is_locked: meta?.isLocked,
                self_eval_rubric_scores: null,
                self_eval_justifications: null,
                step_eval_mode: null,
                step_eval_rubric: null,
                step_eval_questions: null,
                step_eval_counts_toward_grade: null,
                step_eval_weight: null,
                parent_step_id: meta?.parentStepId ?? null,
                is_activity_closed: meta?.isActivityClosed ?? false,
                step_order_index: meta?.orderIndex ?? 0,
            };
        });
    }

    // Step 3b: get canonical group submissions (group_id IS NOT NULL)
    // One row per group per step due to idx_submission_group unique index.
    // Used in the teacher correction table.
    let groupResults: StepSubmissionRow[] = [];
    // Hoisted to function scope so post-processing blocks (intra-group, peer-eval) can access it.
    const groupMembersMap: Record<string, { student_id: string; full_name: string | null }[]> = {};
    if (groupStepIds.length > 0) {
        const { data: groupSubs } = await supabase
            .from("activity_submissions")
            .select(`*, group:module_groups(id, name, color)`)
            .in("step_id", groupStepIds)
            .not("group_id", "is", null);

    if (groupSubs && groupSubs.length > 0) {
            const uniqueGroupIds = [...new Set(groupSubs.map((s: any) => s.group_id).filter(Boolean))] as string[];

            if (uniqueGroupIds.length > 0) {
                const { data: members } = await supabase
                    .from("module_group_members")
                    .select("group_id, student_id, student:profiles(full_name)")
                    .in("group_id", uniqueGroupIds);
                for (const m of members ?? []) {
                    if (!groupMembersMap[m.group_id]) groupMembersMap[m.group_id] = [];
                    groupMembersMap[m.group_id].push({
                        student_id: m.student_id,
                        full_name: (m.student as any)?.full_name ?? null,
                    });
                }
            }

            groupResults = (groupSubs ?? []).map((sub: any) => {
                const meta = stepMeta[sub.step_id];
                const group = sub.group as any;
                return {
                    id: sub.id,
                    step_id: sub.step_id,
                    step_title: meta?.title ?? "",
                    step_type: meta?.stepType as any,
                    activity_id: meta?.activityId ?? "",
                    activity_title: meta?.activityTitle ?? "",
                    student_id: "",
                    student_name: group?.name ?? "Grupo",
                    student_email: "",
                    drive_file_url: sub.drive_file_url,
                    drive_file_id: sub.drive_file_id,
                    files: sub.files,
                    status: sub.status,
                    submitted_at: sub.submitted_at,
                    delivery_mode: meta?.deliveryMode,
                    score: sub.score,
                    feedback: sub.feedback,
                    graded_at: sub.graded_at,
                    published_at: sub.published_at,
                    rubric_scores: sub.rubric_scores,
                    grading_mode: sub.grading_mode,
                    step_rubric: meta?.rubric ?? [],
                    quiz_content: null,
                    quiz_attempt: null,
                    quiz_attempts: [],
                    group_id: sub.group_id,
                    group_name: group?.name ?? null,
                    group_color: group?.color ?? null,
                    group_members: groupMembersMap[sub.group_id] ?? [],
                    is_group_submission: true,
                    step_is_locked: meta?.isLocked,
                    self_eval_rubric_scores: null,
                    self_eval_justifications: null,
                    step_eval_mode: null,
                    step_eval_rubric: null,
                    step_eval_questions: null,
                    step_eval_counts_toward_grade: null,
                    step_eval_weight: null,
                    parent_step_id: meta?.parentStepId ?? null,
                    is_activity_closed: meta?.isActivityClosed ?? false,
                    step_order_index: meta?.orderIndex ?? 0,
                };
            });
        }

        // For group steps: add per-group synthetic placeholders for every group that hasn't submitted.
        // This ensures ALL module groups appear in the teacher table, not just those that submitted.
        const submittedGroupsByStep = new Map<string, Set<string>>();
        for (const r of groupResults) {
            if (r.group_id) {
                if (!submittedGroupsByStep.has(r.step_id)) submittedGroupsByStep.set(r.step_id, new Set());
                submittedGroupsByStep.get(r.step_id)!.add(r.group_id);
            }
        }

        if (moduleId) {
            const { data: allModuleGroups } = await supabase
                .from("module_groups")
                .select("id, name, color")
                .eq("module_id", moduleId)
                .eq("status", "active");

            if (allModuleGroups && allModuleGroups.length > 0) {
                // Fetch members for groups not already loaded (i.e. those that haven't submitted)
                const unloadedIds = allModuleGroups.map(g => g.id).filter(id => !groupMembersMap[id]);
                if (unloadedIds.length > 0) {
                    const { data: extraMembers } = await supabase
                        .from("module_group_members")
                        .select("group_id, student_id, student:profiles(full_name)")
                        .in("group_id", unloadedIds);
                    for (const m of extraMembers ?? []) {
                        if (!groupMembersMap[m.group_id]) groupMembersMap[m.group_id] = [];
                        groupMembersMap[m.group_id].push({
                            student_id: m.student_id,
                            full_name: (m.student as any)?.full_name ?? null,
                        });
                    }
                }

                for (const stepId of groupStepIds) {
                    const meta = stepMeta[stepId];
                    if (!meta) continue;
                    const submittedGroups = submittedGroupsByStep.get(stepId) ?? new Set<string>();
                    for (const group of allModuleGroups) {
                        if (submittedGroups.has(group.id)) continue;
                        groupResults.push({
                            id: `virtual:group:${stepId}:${group.id}`,
                            step_id: stepId,
                            step_title: meta.title,
                            step_type: meta.stepType as any,
                            activity_id: meta.activityId,
                            activity_title: meta.activityTitle,
                            student_id: "",
                            student_name: group.name ?? "Grupo",
                            student_email: "",
                            drive_file_url: null,
                            drive_file_id: null,
                            files: null,
                            status: "not_submitted",
                            submitted_at: null,
                            delivery_mode: meta.deliveryMode,
                            score: null,
                            feedback: null,
                            graded_at: null,
                            published_at: null,
                            rubric_scores: null,
                            grading_mode: null,
                            step_rubric: meta.rubric ?? [],
                            quiz_content: null,
                            quiz_attempt: null,
                            quiz_attempts: [],
                            group_id: group.id,
                            group_name: group.name ?? null,
                            group_color: (group as any).color ?? null,
                            group_members: groupMembersMap[group.id] ?? [],
                            is_group_submission: true,
                            synthetic: true,
                            step_is_locked: meta.isLocked,
                            self_eval_rubric_scores: null,
                            self_eval_justifications: null,
                            step_eval_mode: null,
                            step_eval_rubric: null,
                            step_eval_questions: null,
                            step_eval_counts_toward_grade: null,
                            step_eval_weight: null,
                            parent_step_id: meta.parentStepId ?? null,
                            is_activity_closed: meta.isActivityClosed ?? false,
                            step_order_index: meta?.orderIndex ?? 0,
                        });
                    }
                }
            }
        } else {
            // Fallback (no moduleId): one placeholder per step with zero submissions
            for (const stepId of groupStepIds) {
                if (submittedGroupsByStep.has(stepId)) continue;
                const meta = stepMeta[stepId];
                if (!meta) continue;
                groupResults.push({
                    id: `virtual:group:${stepId}`,
                    step_id: stepId,
                    step_title: meta.title,
                    step_type: meta.stepType as any,
                    activity_id: meta.activityId,
                    activity_title: meta.activityTitle,
                    student_id: "",
                    student_name: "",
                    student_email: "",
                    drive_file_url: null,
                    drive_file_id: null,
                    files: null,
                    status: "not_submitted",
                    submitted_at: null,
                    delivery_mode: meta.deliveryMode,
                    score: null,
                    feedback: null,
                    graded_at: null,
                    published_at: null,
                    rubric_scores: null,
                    grading_mode: null,
                    step_rubric: meta.rubric ?? [],
                    quiz_content: null,
                    quiz_attempt: null,
                    quiz_attempts: [],
                    group_id: null,
                    is_group_submission: true,
                    synthetic: true,
                    step_is_locked: meta.isLocked,
                    self_eval_rubric_scores: null,
                    self_eval_justifications: null,
                    step_eval_mode: null,
                    step_eval_rubric: null,
                    step_eval_questions: null,
                    step_eval_counts_toward_grade: null,
                    step_eval_weight: null,
                    parent_step_id: meta.parentStepId ?? null,
                    is_activity_closed: meta.isActivityClosed ?? false,
                    step_order_index: meta?.orderIndex ?? 0,
                });
            }
        }
    }

    // Step 4: fetch quiz_attempts separately — no FK between activity_submissions and quiz_attempts,
    // so PostgREST cannot embed them. Join on (student_id, step_id) instead.
    const quizStepIds = steps.filter(s => s.type === 'quiz').map(s => s.id);
    const attemptsMap: Record<string, any[]> = {};
    if (quizStepIds.length > 0 && (submissions ?? []).length > 0) {
        const quizStudentIds = [...new Set((submissions ?? []).map(s => s.student_id))];
        const { data: quizAttempts } = await supabase
            .from("quiz_attempts")
            .select("*")
            .in("step_id", quizStepIds)
            .in("student_id", quizStudentIds);
        for (const attempt of quizAttempts ?? []) {
            const key = `${attempt.student_id}:${attempt.step_id}`;
            if (!attemptsMap[key]) attemptsMap[key] = [];
            attemptsMap[key].push(attempt);
        }
    }

    const results: StepSubmissionRow[] = (submissions ?? []).map(sub => {
        const meta = stepMeta[sub.step_id];
        const attempts = (attemptsMap[`${sub.student_id}:${sub.step_id}`] ?? [])
            .sort((a: any, b: any) => a.attempt_number - b.attempt_number);
        const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;

        return {
            id: sub.id,
            step_id: sub.step_id,
            step_title: meta?.title ?? "",
            step_type: meta?.stepType as any,
            activity_id: meta?.activityId ?? "",
            activity_title: meta?.activityTitle ?? "",
            student_id: sub.student_id,
            student_name: (sub.student as any)?.full_name ?? null,
            student_email: (sub.student as any)?.email ?? "",
            drive_file_url: sub.drive_file_url,
            drive_file_id: sub.drive_file_id,
            files: sub.files,
            status: sub.status,
            submitted_at: sub.submitted_at,
            delivery_mode: meta?.deliveryMode,
            score: sub.score,
            feedback: sub.feedback,
            graded_at: sub.graded_at,
            published_at: sub.published_at,
            rubric_scores: sub.rubric_scores,
            grading_mode: sub.grading_mode,
            step_rubric: meta?.rubric ?? [],
            quiz_content: meta?.quizContent,
            quiz_attempt: lastAttempt,
            quiz_attempts: attempts,
            group_id: sub.group_id ?? null,
            step_is_locked: meta?.isLocked,
            self_eval_rubric_scores: null,
            self_eval_justifications: null,
            step_eval_mode: null,
            step_eval_rubric: null,
            step_eval_questions: null,
            step_eval_counts_toward_grade: null,
            step_eval_weight: null,
            parent_step_id: meta?.parentStepId ?? null,
            is_activity_closed: meta?.isActivityClosed ?? false,
            step_order_index: meta?.orderIndex ?? 0,
        };
    });

    // Add virtual rows for students who haven't submitted yet (non-eval, non-group steps only)
    if (students && students.length > 0) {
        const submittedKeys = new Set(results.map(r => `${r.student_id}:${r.step_id}`));
        for (const step of steps) {
            if (evalOnlyTypes.has(step.type)) continue; // handled separately below
            if ((step.content as any)?.is_group_submission === true) continue; // group steps handled separately
            const meta = stepMeta[step.id];
            if (!meta) continue;
            for (const student of students) {
                const key = `${student.student_id}:${step.id}`;
                if (submittedKeys.has(key)) continue;
                results.push({
                    id: `virtual:${key}`,
                    step_id: step.id,
                    step_title: meta.title,
                    step_type: meta.stepType as any,
                    activity_id: meta.activityId,
                    activity_title: meta.activityTitle,
                    student_id: student.student_id,
                    student_name: student.name,
                    student_email: "",
                    drive_file_url: null,
                    drive_file_id: null,
                    files: null,
                    status: "not_submitted",
                    submitted_at: null,
                    delivery_mode: meta.deliveryMode,
                    score: null,
                    feedback: null,
                    graded_at: null,
                    published_at: null,
                    rubric_scores: null,
                    grading_mode: null,
                    step_rubric: meta.rubric ?? [],
                    quiz_content: meta.quizContent,
                    quiz_attempt: null,
                    quiz_attempts: [],
                    step_is_locked: meta.isLocked,
                    synthetic: true,
                    self_eval_rubric_scores: null,
                    self_eval_justifications: null,
                    step_eval_mode: null,
                    step_eval_rubric: null,
                    step_eval_questions: null,
                    step_eval_counts_toward_grade: null,
                    step_eval_weight: null,
                    parent_step_id: meta.parentStepId ?? null,
                    is_activity_closed: meta.isActivityClosed ?? false,
                    step_order_index: meta.orderIndex ?? 0,
                });
            }
        }
    }

    // Step 5a: Real rows for self_evaluation steps — each student's submission with self-eval data
    const selfEvalStepIds = steps.filter(s => s.type === 'self_evaluation').map(s => s.id);
    let selfEvalResults: StepSubmissionRow[] = [];
    if (selfEvalStepIds.length > 0) {
        let selfQuery = supabase
            .from("activity_submissions")
            .select(`*, student:profiles!inner(full_name)`)
            .in("step_id", selfEvalStepIds)
            .or("self_eval_rubric_scores.not.is.null,self_eval_justifications.not.is.null");

        if (students && students.length > 0) {
            selfQuery = selfQuery.in("student_id", students.map(s => s.student_id));
        }

        const { data: selfSubs } = await selfQuery;
        selfEvalResults = (selfSubs ?? []).map((sub: any) => {
            const meta = stepMeta[sub.step_id];
            return {
                id: sub.id,
                step_id: sub.step_id,
                step_title: meta?.title ?? "",
                step_type: meta?.stepType as any,
                activity_id: meta?.activityId ?? "",
                activity_title: meta?.activityTitle ?? "",
                student_id: sub.student_id,
                student_name: (sub.student as any)?.full_name ?? null,
                student_email: "",
                drive_file_url: null,
                drive_file_id: null,
                files: null,
                status: sub.status,
                submitted_at: sub.submitted_at,
                delivery_mode: undefined,
                score: sub.score,
                feedback: sub.feedback,
                graded_at: sub.graded_at,
                published_at: sub.published_at,
                rubric_scores: sub.rubric_scores,
                grading_mode: sub.grading_mode,
                step_rubric: meta?.rubric ?? [],
                quiz_content: null,
                quiz_attempt: null,
                quiz_attempts: [],
                group_id: null,
                step_is_locked: meta?.isLocked,
                self_eval_rubric_scores: sub.self_eval_rubric_scores,
                self_eval_justifications: sub.self_eval_justifications,
                step_eval_mode: meta?.evalMode ?? null,
                step_eval_rubric: meta?.rubric ?? null,
                step_eval_questions: meta?.evalQuestions ?? null,
                step_eval_counts_toward_grade: meta?.countsTowardGrade ?? null,
                step_eval_weight: meta?.selfEvalWeight ?? null,
                parent_step_id: meta?.parentStepId ?? null,
                is_activity_closed: meta?.isActivityClosed ?? false,
                step_order_index: meta?.orderIndex ?? 0,
            };
        });

        // Add virtual rows for students who haven't submitted their self-eval yet
        if (students && students.length > 0) {
            const submittedSelfKeys = new Set(selfEvalResults.map(r => `${r.student_id}:${r.step_id}`));
            for (const stepId of selfEvalStepIds) {
                const meta = stepMeta[stepId];
                if (!meta) continue;
                for (const student of students) {
                    const key = `${student.student_id}:${stepId}`;
                    if (submittedSelfKeys.has(key)) continue;
                    selfEvalResults.push({
                        id: `virtual:self:${key}`,
                        step_id: stepId,
                        step_title: meta.title,
                        step_type: meta.stepType as any,
                        activity_id: meta.activityId,
                        activity_title: meta.activityTitle,
                        student_id: student.student_id,
                        student_name: student.name,
                        student_email: "",
                        drive_file_url: null,
                        drive_file_id: null,
                        files: null,
                        status: "not_submitted",
                        submitted_at: null,
                        delivery_mode: undefined,
                        score: null,
                        feedback: null,
                        graded_at: null,
                        published_at: null,
                        rubric_scores: null,
                        grading_mode: null,
                        step_rubric: meta.rubric ?? [],
                        quiz_content: null,
                        quiz_attempt: null,
                        quiz_attempts: [],
                        step_is_locked: meta.isLocked,
                        synthetic: true,
                        self_eval_rubric_scores: null,
                        self_eval_justifications: null,
                        step_eval_mode: meta.evalMode ?? null,
                        step_eval_rubric: meta.rubric ?? null,
                        step_eval_questions: meta.evalQuestions ?? null,
                        step_eval_counts_toward_grade: meta.countsTowardGrade ?? null,
                        step_eval_weight: meta.selfEvalWeight ?? null,
                        parent_step_id: meta.parentStepId ?? null,
                        is_activity_closed: meta.isActivityClosed ?? false,
                        step_order_index: meta.orderIndex ?? 0,
                    });
                }
            }
        }
    }

    // Post-process: enrich deliverable/file_upload rows with the student's linked self-eval score.
    // This lets GradingModal preview the weighted formula before the teacher publishes.
    // Questions-mode self-evals always have weight=0 (they don't count toward grade, only completion).
    {
        const selfEvalByDeliverable: Record<string, {
            stepId: string; weight: number; rubric: any[]; isQuestions: boolean; questions: any[]; hasNumericWithWeight: boolean;
        }> = {};
        for (const step of steps) {
            if (step.type !== 'self_evaluation') continue;
            const c = step.content as any;
            if (!c?.referenceStepId) continue;
            const isQuestions = c.evalMode === 'questions';
            const qs = c.questions ?? [];
            const hasNumericWithWeight = isQuestions && qs.some((q: any) => q.type === 'numeric' && (q.points ?? 0) > 0);
            selfEvalByDeliverable[c.referenceStepId] = {
                stepId: step.id,
                weight: isQuestions
                    ? (hasNumericWithWeight && c.countsTowardGrade ? (c.selfEvalWeight ?? 20) : 0)
                    : (c.countsTowardGrade ? (c.selfEvalWeight ?? 20) : 0),
                rubric: c.rubric ?? [],
                isQuestions,
                questions: qs,
                hasNumericWithWeight,
            };
        }
        if (Object.keys(selfEvalByDeliverable).length > 0) {
            const selfScoresMap: Record<string, Record<string, number>> = {};
            const questionsAnswersMap: Record<string, Record<string, string>> = {};
            for (const row of selfEvalResults) {
                if (row.self_eval_rubric_scores) {
                    selfScoresMap[`${row.student_id}:${row.step_id}`] = row.self_eval_rubric_scores;
                }
                if (row.self_eval_justifications && Object.keys(row.self_eval_justifications).length > 0) {
                    questionsAnswersMap[`${row.student_id}:${row.step_id}`] = row.self_eval_justifications as Record<string, string>;
                }
            }
            // Also cover propagated group rows (per-student copies) — they share the same step_id
            for (const row of [...results, ...propagatedResults]) {
                if (row.step_type !== 'deliverable' && row.step_type !== 'file_upload') continue;
                if (!row.student_id) continue;
                const seInfo = selfEvalByDeliverable[row.step_id];
                if (!seInfo) continue;

                if (seInfo.isQuestions) {
                    const answers = questionsAnswersMap[`${row.student_id}:${seInfo.stepId}`];
                    if (!answers) continue;
                    if ((seInfo as any).hasNumericWithWeight) {
                        // Numeric questions with weight: weighted average of normalised values
                        const numericQs = seInfo.questions.filter((q: any) => q.type === 'numeric' && (q.points ?? 0) > 0);
                        let weightedSum = 0, totalWeight = 0;
                        for (const q of numericQs) {
                            const raw = parseFloat(answers[q.id] ?? '');
                            if (isNaN(raw)) continue;
                            const min = q.numericMin ?? 0, max = q.numericMax ?? 10;
                            const norm = max > min ? ((raw - min) / (max - min)) * 10 : 5;
                            weightedSum += norm * (q.points ?? 1);
                            totalWeight += (q.points ?? 1);
                        }
                        row.linked_self_eval_score = totalWeight > 0
                            ? Math.round(weightedSum / totalWeight * 100) / 100
                            : null;
                        row.linked_self_eval_weight = seInfo.weight;
                    } else {
                        // Questions mode without numeric: completion gate only — weight is 0
                        const totalQ = seInfo.questions.length;
                        const answeredQ = totalQ > 0
                            ? seInfo.questions.filter((q: any) => {
                                const v = answers[q.id];
                                return v != null && String(v).trim().length > 0;
                            }).length
                            : 0;
                        row.linked_self_eval_score = totalQ > 0
                            ? Math.round((answeredQ / totalQ) * 1000) / 100
                            : 10;
                        row.linked_self_eval_weight = 0;
                    }
                } else {
                    // Rubric mode: compute normalised score
                    const rubricScores = selfScoresMap[`${row.student_id}:${seInfo.stepId}`];
                    if (!rubricScores) continue;
                    const rubricMax = seInfo.rubric.reduce((sum: number, c: any) =>
                        sum + Math.max(0, ...(c.levels ?? []).map((l: any) => l.points ?? 0)), 0);
                    if (rubricMax === 0) continue;
                    const selfTotal = Object.values(rubricScores).reduce((a: number, b: number) => a + b, 0);
                    row.linked_self_eval_score = Math.round((selfTotal / rubricMax) * 1000) / 100;
                    row.linked_self_eval_weight = seInfo.weight;
                }
            }
        }
    }

    // Post-process: enrich deliverable/file_upload rows with group peer eval average score.
    // "group" mode peer evals: target_submission_id → canonical group submission.
    // Score propagates to every group member's propagated row.
    {
        // peerEvalByDeliverable: deliverableStepId → { weight, rubric } — only "group" mode
        const peerEvalByDeliverable: Record<string, { weight: number; rubric: any[] }> = {};
        for (const step of steps) {
            if (step.type !== 'peer_evaluation') continue;
            const c = step.content as any;
            if (c?.mode === 'intra_group') continue; // handled separately below
            const parentStepId = (step as any).parent_step_id;
            if (!parentStepId) continue;
            const parentStep = steps.find(s => s.id === parentStepId);
            if (!parentStep || (parentStep.type !== 'deliverable' && parentStep.type !== 'file_upload')) continue;
            const gc = (parentStep.content as any)?.gradeComposition;
            const weight = gc?.peerEvalWeight ?? 0;
            if (weight === 0) continue;
            peerEvalByDeliverable[parentStepId] = {
                weight,
                rubric: c?.rubric ?? [],
            };
        }

        if (Object.keys(peerEvalByDeliverable).length > 0) {
            // Include both individual AND canonical group submissions as peer-eval targets
            const indivSubIds = results
                .filter(r => (r.step_type === 'deliverable' || r.step_type === 'file_upload')
                          && !!peerEvalByDeliverable[r.step_id]
                          && !r.id.startsWith('virtual:'))
                .map(r => r.id);
            const groupSubIds = groupResults
                .filter(r => !!peerEvalByDeliverable[r.step_id] && !r.id.startsWith('virtual:'))
                .map(r => r.id);
            const relevantSubIds = [...indivSubIds, ...groupSubIds];

            if (relevantSubIds.length > 0) {
                const { data: peerAssignments } = await supabase
                    .from('peer_evaluation_assignments')
                    .select('target_submission_id, eval_submission:activity_submissions!eval_submission_id(self_eval_rubric_scores)')
                    .in('target_submission_id', relevantSubIds)
                    .not('eval_submission_id', 'is', null);

                // submission_id → step_id lookup (covers both individual and group)
                const subToStepId: Record<string, string> = {};
                for (const row of [...results, ...groupResults]) {
                    if (row.step_type !== 'deliverable' && row.step_type !== 'file_upload') continue;
                    if (!peerEvalByDeliverable[row.step_id]) continue;
                    subToStepId[row.id] = row.step_id;
                }

                const peerScoreAgg: Record<string, { sum: number; count: number }> = {};
                for (const a of peerAssignments ?? []) {
                    const stepId = subToStepId[a.target_submission_id];
                    if (!stepId) continue;
                    const peInfo = peerEvalByDeliverable[stepId];
                    const scores = (a.eval_submission as any)?.self_eval_rubric_scores as Record<string, number> | null;
                    if (!scores || !peInfo?.rubric?.length) continue;
                    const rubricMax = peInfo.rubric.reduce((sum: number, c: any) =>
                        sum + Math.max(0, ...(c.levels ?? []).map((l: any) => l.points ?? 0)), 0);
                    if (rubricMax === 0) continue;
                    const total = Object.values(scores).reduce((a: number, b: number) => a + b, 0);
                    const norm = Math.round((total / rubricMax) * 1000) / 100;
                    if (!peerScoreAgg[a.target_submission_id]) peerScoreAgg[a.target_submission_id] = { sum: 0, count: 0 };
                    peerScoreAgg[a.target_submission_id].sum += norm;
                    peerScoreAgg[a.target_submission_id].count++;
                }

                // Assign to individual rows
                for (const row of results) {
                    if (row.step_type !== 'deliverable' && row.step_type !== 'file_upload') continue;
                    const peInfo = peerEvalByDeliverable[row.step_id];
                    if (!peInfo) continue;
                    const agg = peerScoreAgg[row.id];
                    if (!agg || agg.count === 0) continue;
                    row.linked_peer_eval_score = Math.round((agg.sum / agg.count) * 100) / 100;
                    row.linked_peer_eval_weight = peInfo.weight;
                }

                // Assign to canonical group rows + propagate to member rows
                // Build: groupSubId → peer score
                const groupSubPeerScore: Record<string, { score: number; weight: number }> = {};
                for (const gr of groupResults) {
                    const peInfo = peerEvalByDeliverable[gr.step_id];
                    if (!peInfo) continue;
                    const agg = peerScoreAgg[gr.id];
                    if (!agg || agg.count === 0) continue;
                    const score = Math.round((agg.sum / agg.count) * 100) / 100;
                    gr.linked_peer_eval_score = score;
                    gr.linked_peer_eval_weight = peInfo.weight;
                    if (gr.group_id) groupSubPeerScore[`${gr.group_id}:${gr.step_id}`] = { score, weight: peInfo.weight };
                }

                // Propagate group peer-eval score to each member's propagated row
                // Reverse-lookup: student+step → group_id via group_members on canonical rows
                const studentStepToGroupId: Record<string, string> = {};
                for (const gr of groupResults) {
                    if (!gr.group_id) continue;
                    for (const m of gr.group_members ?? []) {
                        studentStepToGroupId[`${m.student_id}:${gr.step_id}`] = gr.group_id;
                    }
                }
                for (const row of propagatedResults) {
                    if (!row.student_id) continue;
                    const groupId = studentStepToGroupId[`${row.student_id}:${row.step_id}`];
                    if (!groupId) continue;
                    const ps = groupSubPeerScore[`${groupId}:${row.step_id}`];
                    if (!ps) continue;
                    row.linked_peer_eval_score = ps.score;
                    row.linked_peer_eval_weight = ps.weight;
                }
            }
        }
    }

    // Post-process: enrich propagated member rows with intra-group peer eval avg received score.
    // "intra_group" mode: target_student_id → each member gets a per-student average.
    {
        const intraGroupByDeliverable: Record<string, {
            stepId: string; weight: number; evalMode: string; rubric: any[]; questions: any[];
        }> = {};
        for (const step of steps) {
            if (step.type !== 'peer_evaluation') continue;
            const c = step.content as any;
            if (c?.mode !== 'intra_group') continue;
            const parentStepId = (step as any).parent_step_id;
            if (!parentStepId) continue;
            const parentStep = steps.find(s => s.id === parentStepId);
            if (!parentStep || (parentStep.type !== 'deliverable' && parentStep.type !== 'file_upload')) continue;
            const gc = (parentStep.content as any)?.gradeComposition;
            const weight = gc?.intraGroupWeight ?? 0;
            if (weight === 0) continue;
            intraGroupByDeliverable[parentStepId] = {
                stepId: step.id,
                weight,
                evalMode: c.evalMode ?? 'rubric',
                rubric: c.rubric ?? [],
                questions: c.questions ?? [],
            };
        }

        if (Object.keys(intraGroupByDeliverable).length > 0) {
            // Collect ALL group students (from groupMembersMap which includes all module groups,
            // not just those with submissions). This ensures scores show even before publishing.
            const allGroupStudentIds = new Set<string>();
            for (const members of Object.values(groupMembersMap)) {
                for (const m of members) allGroupStudentIds.add(m.student_id);
            }
            // Also include members listed on canonical/synthetic group rows (safety net)
            for (const gr of groupResults) {
                for (const m of gr.group_members ?? []) allGroupStudentIds.add(m.student_id);
            }

            const targetStudentIds = [...allGroupStudentIds];
            if (targetStudentIds.length > 0) {
                const intraStepIds = Object.values(intraGroupByDeliverable).map(v => v.stepId);

                const { data: intraAssignments } = await supabase
                    .from('peer_evaluation_assignments')
                    .select('target_student_id, step_id, eval_submission:activity_submissions!eval_submission_id(self_eval_rubric_scores, self_eval_justifications)')
                    .in('step_id', intraStepIds)
                    .in('target_student_id', targetStudentIds)
                    .not('eval_submission_id', 'is', null);

                // student_id + intraStepId → list of completed evaluations received
                const intraAsgByStudentStep: Record<string, any[]> = {};
                for (const a of intraAssignments ?? []) {
                    const key = `${a.target_student_id}:${a.step_id}`;
                    if (!intraAsgByStudentStep[key]) intraAsgByStudentStep[key] = [];
                    intraAsgByStudentStep[key].push(a);
                }

                // Reverse-lookup: student_id + step_id (deliverable) → group row
                const groupRowByGroupStep: Record<string, StepSubmissionRow> = {};
                for (const gr of groupResults) {
                    if (gr.group_id) groupRowByGroupStep[`${gr.group_id}:${gr.step_id}`] = gr;
                }
                const studentToGroupKey: Record<string, string> = {}; // `studentId:stepId` → `groupId:stepId`
                for (const gr of groupResults) {
                    if (!gr.group_id) continue;
                    for (const m of gr.group_members ?? []) {
                        studentToGroupKey[`${m.student_id}:${gr.step_id}`] = `${gr.group_id}:${gr.step_id}`;
                    }
                }

                // Also cover students in groups that have no canonical/synthetic row via groupMembersMap
                // Find step_ids for each intra-group deliverable
                const deliverableStepIds = Object.keys(intraGroupByDeliverable);
                for (const [groupId, members] of Object.entries(groupMembersMap)) {
                    for (const stepId of deliverableStepIds) {
                        const key = `${groupId}:${stepId}`;
                        if (!groupRowByGroupStep[key]) continue; // only if we have a group row
                        for (const m of members) {
                            const sKey = `${m.student_id}:${stepId}`;
                            if (!studentToGroupKey[sKey]) studentToGroupKey[sKey] = key;
                        }
                    }
                }

                // Compute per-student avg and store on group rows
                for (const [compositeKey, assignments] of Object.entries(intraAsgByStudentStep)) {
                    const [studentId, intraStepId] = compositeKey.split(':');
                    // Find the deliverable step_id for this intraStepId
                    const deliverableStepId = Object.entries(intraGroupByDeliverable)
                        .find(([, v]) => v.stepId === intraStepId)?.[0];
                    if (!deliverableStepId) continue;
                    const intraInfo = intraGroupByDeliverable[deliverableStepId];

                    let sum = 0, count = 0;
                    for (const a of assignments) {
                        const sub = a.eval_submission;
                        if (!sub) continue;
                        if (intraInfo.evalMode === 'rubric') {
                            const scores = sub.self_eval_rubric_scores as Record<string, number> | null;
                            if (!scores) continue;
                            const rubricMax = intraInfo.rubric.reduce((s: number, c: any) =>
                                s + Math.max(0, ...(c.levels ?? []).map((l: any) => l.points ?? 0)), 0);
                            if (rubricMax === 0) continue;
                            const total = Object.values(scores).reduce((a: number, b: number) => a + b, 0);
                            sum += (total / rubricMax) * 10;
                            count++;
                        } else {
                            const answers = sub.self_eval_justifications as Record<string, string> | null;
                            if (!answers) continue;
                            const numericQs = intraInfo.questions.filter((q: any) => q.type === 'numeric' && (q.points ?? 0) > 0);
                            if (numericQs.length === 0) continue;
                            let wSum = 0, wTotal = 0;
                            for (const q of numericQs) {
                                const raw = parseFloat(answers[q.id] ?? '');
                                if (isNaN(raw)) continue;
                                const min = q.numericMin ?? 0, max = q.numericMax ?? 10;
                                const norm = max > min ? ((raw - min) / (max - min)) * 10 : 5;
                                wSum += norm * (q.points ?? 1);
                                wTotal += (q.points ?? 1);
                            }
                            if (wTotal === 0) continue;
                            sum += wSum / wTotal;
                            count++;
                        }
                    }

                    if (count === 0) continue;
                    const avgScore = Math.round((sum / count) * 100) / 100;

                    // Store on canonical/synthetic group row (available before publishing)
                    const groupKey = studentToGroupKey[`${studentId}:${deliverableStepId}`];
                    if (groupKey) {
                        const gr = groupRowByGroupStep[groupKey];
                        if (gr) {
                            if (!gr.intra_peer_scores_by_student) gr.intra_peer_scores_by_student = {};
                            gr.intra_peer_scores_by_student[studentId] = { score: avgScore, weight: intraInfo.weight };
                        }
                    }

                    // Also store on propagated row if it exists (for gradebook compatibility)
                    for (const row of propagatedResults) {
                        if (row.student_id === studentId && row.step_id === deliverableStepId) {
                            row.linked_intra_peer_eval_score = avgScore;
                            row.linked_intra_peer_eval_weight = intraInfo.weight;
                        }
                    }
                }
            }
        }
    }

    // Post-process: enrich deliverable/file_upload rows with nested built-in quiz score.
    // Nested Google Forms are intentionally ignored: only built-in quizzes can be embedded.
    {
        const nestedQuizByParent: Record<string, { stepId: string; weight: number }> = {};
        for (const step of steps) {
            if (step.type !== 'quiz') continue;
            const parentStepId = (step as any).parent_step_id as string | null;
            if (!parentStepId) continue;
            const parentStep = steps.find(s => s.id === parentStepId);
            if (!parentStep || (parentStep.type !== 'deliverable' && parentStep.type !== 'file_upload')) continue;

            const quizContent = step.content as { quizMode?: string; googleFormUrl?: string | null } | null;
            const quizMode = quizContent?.quizMode ?? (quizContent?.googleFormUrl ? 'google_form' : 'builtin');
            if (quizMode !== 'builtin') continue;

            const gc = (parentStep.content as any)?.gradeComposition;
            const weight = gc?.quizWeight ?? 0;
            if (weight === 0) continue;
            nestedQuizByParent[parentStepId] = { stepId: step.id, weight };
        }

        if (Object.keys(nestedQuizByParent).length > 0) {
            const quizScoreByStudentStep: Record<string, number> = {};
            for (const row of results) {
                if (row.step_type !== 'quiz') continue;
                if (!row.student_id || row.score == null) continue;
                quizScoreByStudentStep[`${row.student_id}:${row.step_id}`] = row.score;
            }

            for (const row of [...results, ...propagatedResults]) {
                if (row.step_type !== 'deliverable' && row.step_type !== 'file_upload') continue;
                if (!row.student_id) continue;
                const quizInfo = nestedQuizByParent[row.step_id];
                if (!quizInfo) continue;
                const score = quizScoreByStudentStep[`${row.student_id}:${quizInfo.stepId}`];
                if (score == null) continue;
                row.linked_quiz_score = score;
                row.linked_quiz_weight = quizInfo.weight;
            }

            for (const gr of groupResults) {
                const quizInfo = nestedQuizByParent[gr.step_id];
                if (!quizInfo) continue;
                const memberScores = (gr.group_members ?? [])
                    .map(member => quizScoreByStudentStep[`${member.student_id}:${quizInfo.stepId}`])
                    .filter((score): score is number => score != null);
                if (memberScores.length === 0) continue;
                gr.linked_quiz_score = Math.round((memberScores.reduce((a, b) => a + b, 0) / memberScores.length) * 100) / 100;
                gr.linked_quiz_weight = quizInfo.weight;
            }
        }
    }

    // Step 5b: Virtual placeholder rows for peer_evaluation steps only (still uses specialized teacher view)
    const peerEvalStepIds = steps.filter(s => s.type === 'peer_evaluation').map(s => s.id);
    const evalPlaceholders: StepSubmissionRow[] = [];
    for (const stepId of peerEvalStepIds) {
        const meta = stepMeta[stepId];
        if (!meta) continue;
        evalPlaceholders.push({
            id: `virtual:eval:${stepId}`,
            step_id: stepId,
            step_title: meta.title,
            step_type: meta.stepType as any,
            activity_id: meta.activityId,
            activity_title: meta.activityTitle,
            student_id: "",
            student_name: "",
            student_email: "",
            drive_file_url: null,
            drive_file_id: null,
            files: null,
            status: "not_submitted",
            submitted_at: null,
            delivery_mode: undefined,
            score: null,
            feedback: null,
            graded_at: null,
            published_at: null,
            rubric_scores: null,
            grading_mode: null,
            step_rubric: meta.rubric ?? [],
            quiz_content: null,
            quiz_attempt: null,
            quiz_attempts: [],
            step_is_locked: meta.isLocked,
            synthetic: true,
            self_eval_rubric_scores: null,
            self_eval_justifications: null,
            step_eval_mode: null,
            step_eval_rubric: null,
            step_eval_questions: null,
            step_eval_counts_toward_grade: null,
            step_eval_weight: null,
            parent_step_id: meta.parentStepId ?? null,
            is_activity_closed: meta.isActivityClosed ?? false,
            step_order_index: meta.orderIndex ?? 0,
        });
    }

    return { data: [...results, ...groupResults, ...propagatedResults, ...selfEvalResults, ...evalPlaceholders] };
}

export async function gradeSubmission(
    submissionId: string,
    data: {
        gradingMode: 'score' | 'rubric' | 'complete';
        score?: number | null;
        feedback?: string | null;
        rubricScores?: Record<string, number>;
        selfEvalRubricScores?: Record<string, number>; // teacher-adjusted self-eval scores
    }
) {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const admin = auth.admin;

    // Fetch step_id for rubric mode (optional - non-blocking)
    const { data: subCheck } = await admin
        .from("activity_submissions")
        .select("step_id")
        .eq("id", submissionId)
        .single();

    const updates: any = {
        feedback: data.feedback ?? null,
        grading_mode: data.gradingMode,
        status: "graded",
        graded_at: new Date().toISOString(),
    };

    if (data.gradingMode === 'score') {
        updates.score = data.score ?? null;
        updates.rubric_scores = null;
    } else if (data.gradingMode === 'rubric') {
        updates.rubric_scores = data.rubricScores ?? null;

        if (subCheck?.step_id) {
            const { data: stepData } = await admin
                .from("activity_steps")
                .select("content")
                .eq("id", subCheck.step_id)
                .single();

            const rubric = ((stepData?.content as any)?.rubric ?? []) as any[];
            let rubricMax = 0;
            rubric.forEach(criterion => {
                const maxLevel = Math.max(0, ...(criterion.levels ?? []).map((l: any) => (l.points ?? 0)));
                rubricMax += maxLevel;
            });

            const rubricTotal = Object.values(data.rubricScores ?? {}).reduce((sum, points) => sum + points, 0);
            updates.score = rubricMax > 0
                ? Math.round(((rubricTotal / rubricMax) * 10) * 100) / 100
                : 0;
        } else {
            updates.score = 0;
        }
    } else {
        updates.score = null;
        updates.rubric_scores = null;
    }

    // If teacher adjusted self-eval rubric scores, persist them
    if (data.selfEvalRubricScores && Object.keys(data.selfEvalRubricScores).length > 0) {
        updates.self_eval_rubric_scores = data.selfEvalRubricScores;
    }

    const { error } = await admin
        .from("activity_submissions")
        .update(updates)
        .eq("id", submissionId);

    if (error) return { error: error.message };

    const { data: submissionData } = await admin
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
            evaluateStudentBadges(sub.student_id, unitId, submissionId).catch(err => {
                console.error("[Gamification] Error evaluating badges:", err);
            });
        }
    }

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function publishSubmissionGrade(submissionId: string) {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const { error } = await auth.admin
        .from("activity_submissions")
        .update({
            status: "published",
            published_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

    if (error) return { error: error.message };

    // Apply weighted formula if this involves a self-evaluation with countsTowardGrade.
    // Two triggers:
    //   A) Publishing the self-eval → update the linked deliverable's score
    //   B) Publishing the deliverable → update its own score using existing self-eval scores
    try {
        const { data: sub } = await auth.admin
            .from("activity_submissions")
            .select("student_id, step_id, self_eval_rubric_scores, score")
            .eq("id", submissionId)
            .single();

        if (!sub?.student_id || !sub?.step_id) throw new Error("no sub");

        const { data: step } = await auth.admin
            .from("activity_steps")
            .select("content, type")
            .eq("id", sub.step_id)
            .single();

        if (step?.type === 'self_evaluation' && sub.self_eval_rubric_scores) {
            // ── A: Publishing self-eval → update linked deliverable ──────────
            const content = step.content as any;
            if (content?.countsTowardGrade && content?.referenceStepId) {
                const rubricMax = (content.rubric as any[] ?? []).reduce((sum: number, c: any) =>
                    sum + Math.max(0, ...(c.levels ?? []).map((l: any) => l.points ?? 0)), 0);
                if (rubricMax > 0) {
                    const selfTotal = Object.values(sub.self_eval_rubric_scores as Record<string, number>).reduce((a, b) => a + b, 0);
                    const selfScore = Math.round((selfTotal / rubricMax) * 1000) / 100;
                    const selfWeight = content.selfEvalWeight ?? 50;

                    const { data: delivSub } = await auth.admin
                        .from("activity_submissions")
                        .select("id, score")
                        .eq("student_id", sub.student_id)
                        .eq("step_id", content.referenceStepId)
                        .maybeSingle();

                    if (delivSub?.score != null) {
                        const finalScore = Math.round(
                            ((selfWeight / 100) * selfScore + ((100 - selfWeight) / 100) * delivSub.score) * 100
                        ) / 100;
                        await auth.admin
                            .from("activity_submissions")
                            .update({ score: finalScore })
                            .eq("id", delivSub.id);
                    }
                }
            }
        } else if (step?.type === 'deliverable' || step?.type === 'file_upload') {
            const delivContent = step.content as any;
            const gradeComp = delivContent?.gradeComposition as { selfEvalWeight: number; peerEvalWeight: number; intraGroupWeight: number; quizWeight?: number } | undefined;
            const teacherScore = sub.score ?? 0;

            if (gradeComp && (gradeComp.selfEvalWeight > 0 || gradeComp.peerEvalWeight > 0 || gradeComp.intraGroupWeight > 0 || (gradeComp.quizWeight ?? 0) > 0)) {
                // ── B-NEW: 360° formula using gradeComposition from children ──
                const selfW = gradeComp.selfEvalWeight / 100;
                const peerW = gradeComp.peerEvalWeight / 100;
                const intraW = gradeComp.intraGroupWeight / 100;
                const quizW = (gradeComp.quizWeight ?? 0) / 100;

                // Fetch all child steps of this deliverable
                const { data: children } = await auth.admin
                    .from("activity_steps")
                    .select("id, type, content")
                    .eq("parent_step_id", sub.step_id);

                const selfEvalChild = (children ?? []).find((c: any) => c.type === "self_evaluation");
                const peerEvalChild = (children ?? []).find((c: any) => c.type === "peer_evaluation" && (c.content as any)?.mode !== "intra_group");
                const intraGroupChild = (children ?? []).find((c: any) => c.type === "peer_evaluation" && (c.content as any)?.mode === "intra_group");
                const quizChild = (children ?? []).find((c: any) => {
                    if (c.type !== "quiz") return false;
                    const quizContent = c.content as { quizMode?: string; googleFormUrl?: string | null } | null;
                    const quizMode = quizContent?.quizMode ?? (quizContent?.googleFormUrl ? "google_form" : "builtin");
                    return quizMode === "builtin";
                });

                // Helper: compute normalized rubric score for a submission's self_eval_rubric_scores
                function computeNormalizedScore(rubricScores: Record<string, number>, rubric: any[]): number | null {
                    const rubricMax = rubric.reduce((sum: number, c: any) =>
                        sum + Math.max(0, ...(c.levels ?? []).map((l: any) => l.points ?? 0)), 0);
                    if (rubricMax <= 0) return null;
                    const total = Object.values(rubricScores).reduce((a, b) => a + b, 0);
                    return Math.round((total / rubricMax) * 1000) / 100; // normalize to /10
                }

                let selfScore: number | null = null;
                if (selfEvalChild && selfW > 0) {
                    const { data: selfSub } = await auth.admin
                        .from("activity_submissions")
                        .select("self_eval_rubric_scores")
                        .eq("student_id", sub.student_id)
                        .eq("step_id", selfEvalChild.id)
                        .not("self_eval_rubric_scores", "is", null)
                        .maybeSingle();
                    if (selfSub?.self_eval_rubric_scores) {
                        selfScore = computeNormalizedScore(
                            selfSub.self_eval_rubric_scores as Record<string, number>,
                            (selfEvalChild.content as any)?.rubric ?? []
                        );
                    }
                }

                let peerScore: number | null = null;
                if (peerEvalChild && peerW > 0) {
                    // Find this student's submission to use as target
                    const { data: peerAssignments } = await auth.admin
                        .from("peer_evaluation_assignments")
                        .select("eval_submission_id")
                        .eq("step_id", peerEvalChild.id)
                        .eq("target_submission_id", submissionId)
                        .not("eval_submission_id", "is", null);

                    const evalSubIds = (peerAssignments ?? []).map((a: any) => a.eval_submission_id).filter(Boolean);
                    if (evalSubIds.length > 0) {
                        const { data: evalSubs } = await auth.admin
                            .from("activity_submissions")
                            .select("self_eval_rubric_scores")
                            .in("id", evalSubIds);
                        const rubric = (peerEvalChild.content as any)?.rubric ?? [];
                        const scores = (evalSubs ?? [])
                            .map((es: any) => es.self_eval_rubric_scores
                                ? computeNormalizedScore(es.self_eval_rubric_scores as Record<string, number>, rubric)
                                : null)
                            .filter((s): s is number => s !== null);
                        if (scores.length > 0) {
                            peerScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100;
                        }
                    }
                }

                let intraScore: number | null = null;
                if (intraGroupChild && intraW > 0) {
                    const intraContent = intraGroupChild.content as any;
                    const intraEvalMode = intraContent?.evalMode ?? 'rubric';
                    const intraQuestions = intraContent?.questions ?? [];
                    const numericQs = intraQuestions.filter((q: any) => q.type === 'numeric' && (q.points ?? 0) > 0);

                    // For questions mode without numeric questions, no grade contribution
                    if (intraEvalMode !== 'questions' || numericQs.length > 0) {
                        // Find evaluations received by this student as target_student_id
                        const { data: intraAssignments } = await auth.admin
                            .from("peer_evaluation_assignments")
                            .select("eval_submission_id")
                            .eq("step_id", intraGroupChild.id)
                            .eq("target_student_id", sub.student_id)
                            .not("eval_submission_id", "is", null);

                        const evalSubIds = (intraAssignments ?? []).map((a: any) => a.eval_submission_id).filter(Boolean);
                        if (evalSubIds.length > 0) {
                            if (intraEvalMode === 'questions') {
                                // Numeric questions mode: average normalized numeric answers
                                const { data: evalSubs } = await auth.admin
                                    .from("activity_submissions")
                                    .select("self_eval_justifications")
                                    .in("id", evalSubIds);
                                const scores = (evalSubs ?? []).map((es: any) => {
                                    const answers = es.self_eval_justifications ?? {};
                                    let weightedSum = 0, totalWeight = 0;
                                    for (const q of numericQs) {
                                        const raw = parseFloat(answers[q.id] ?? '');
                                        if (isNaN(raw)) continue;
                                        const min = q.numericMin ?? 0, max = q.numericMax ?? 10;
                                        const norm = max > min ? ((raw - min) / (max - min)) * 10 : 5;
                                        weightedSum += norm * (q.points ?? 1);
                                        totalWeight += (q.points ?? 1);
                                    }
                                    return totalWeight > 0 ? weightedSum / totalWeight : null;
                                }).filter((s): s is number => s !== null);
                                if (scores.length > 0) {
                                    intraScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100;
                                }
                            } else {
                                // Rubric mode: average normalized rubric scores
                                const { data: evalSubs } = await auth.admin
                                    .from("activity_submissions")
                                    .select("self_eval_rubric_scores")
                                    .in("id", evalSubIds);
                                const rubric = intraContent?.rubric ?? [];
                                const scores = (evalSubs ?? [])
                                    .map((es: any) => es.self_eval_rubric_scores
                                        ? computeNormalizedScore(es.self_eval_rubric_scores as Record<string, number>, rubric)
                                        : null)
                                    .filter((s): s is number => s !== null);
                                if (scores.length > 0) {
                                    intraScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100;
                                }
                            }
                        }
                    }
                }

                let quizScore: number | null = null;
                if (quizChild && quizW > 0) {
                    const { data: quizSub } = await auth.admin
                        .from("activity_submissions")
                        .select("score")
                        .eq("student_id", sub.student_id)
                        .eq("step_id", quizChild.id)
                        .not("score", "is", null)
                        .maybeSingle();
                    quizScore = quizSub?.score ?? null;
                }

                // Compute weighted final score. If a child score is missing, redistribute its weight to teacher.
                let effectiveSelfW = selfScore !== null ? selfW : 0;
                let effectivePeerW = peerScore !== null ? peerW : 0;
                let effectiveIntraW = intraScore !== null ? intraW : 0;
                let effectiveQuizW = quizScore !== null ? quizW : 0;
                const effectiveTeacherW = 1 - effectiveSelfW - effectivePeerW - effectiveIntraW - effectiveQuizW;

                const finalScore = Math.round(
                    (effectiveTeacherW * teacherScore
                     + effectiveSelfW * (selfScore ?? 0)
                     + effectivePeerW * (peerScore ?? 0)
                     + effectiveIntraW * (intraScore ?? 0)
                     + effectiveQuizW * (quizScore ?? 0)
                    ) * 100
                ) / 100;

                await auth.admin
                    .from("activity_submissions")
                    .update({ score: finalScore })
                    .eq("id", submissionId);

            } else {
                // ── B-LEGACY: look for a linked self-eval via referenceStepId ──
                const { data: selfEvalStep } = await auth.admin
                    .from("activity_steps")
                    .select("id, content")
                    .eq("type", "self_evaluation")
                    .contains("content", { referenceStepId: sub.step_id })
                    .maybeSingle();

                const seContent = selfEvalStep?.content as any;
                if (selfEvalStep && seContent?.countsTowardGrade) {
                    const { data: selfSub } = await auth.admin
                        .from("activity_submissions")
                        .select("self_eval_rubric_scores")
                        .eq("student_id", sub.student_id)
                        .eq("step_id", selfEvalStep.id)
                        .not("self_eval_rubric_scores", "is", null)
                        .maybeSingle();

                    if (selfSub?.self_eval_rubric_scores && sub.score != null) {
                        const rubricMax = (seContent.rubric as any[] ?? []).reduce((sum: number, c: any) =>
                            sum + Math.max(0, ...(c.levels ?? []).map((l: any) => l.points ?? 0)), 0);
                        if (rubricMax > 0) {
                            const selfTotal = Object.values(selfSub.self_eval_rubric_scores as Record<string, number>).reduce((a, b) => a + b, 0);
                            const selfScore = Math.round((selfTotal / rubricMax) * 1000) / 100;
                            const selfWeight = seContent.selfEvalWeight ?? 50;
                            const finalScore = Math.round(
                                ((selfWeight / 100) * selfScore + ((100 - selfWeight) / 100) * sub.score) * 100
                            ) / 100;
                            await auth.admin
                                .from("activity_submissions")
                                .update({ score: finalScore })
                                .eq("id", submissionId);
                        }
                    }
                }
            }
        }
    } catch {
        // Non-fatal: weighted grade update failed silently
    }

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function publishAllGradesForStep(stepId: string) {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const { data, error } = await auth.admin
        .from("activity_submissions")
        .update({
            status: "published",
            published_at: new Date().toISOString(),
        })
        .eq("step_id", stepId)
        .eq("status", "graded")
        .select("id");

    if (error) return { error: error.message };
    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true, count: data?.length ?? 0 };
}

export async function saveQuizShortAnswerScores(
    attemptId: string,
    scores: Record<string, number>,
    feedback: Record<string, string>,
    autoPoints: number
) {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const admin = createAdminClient();

    const manualPoints = Object.values(scores).reduce((a, b) => a + b, 0);
    const totalEarned = autoPoints + manualPoints;

    const { error } = await admin
        .from("quiz_attempts")
        .update({
            short_answer_scores: scores,
            short_answer_feedback: feedback,
            points_earned: totalEarned
        })
        .eq("id", attemptId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function reopenSubmission(submissionId: string) {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const { error } = await auth.admin
        .from("activity_submissions")
        .update({
            status: "submitted",
            graded_at: null,
            published_at: null,
            score: null,
            rubric_scores: null,
        })
        .eq("id", submissionId);

    if (error) return { error: error.message };
    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true, warning: null as string | null };
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
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    const { data: maxOrder } = await permission.admin
        .from("class_milestones")
        .select("order_index")
        .eq("unit_id", unitId)
        .order("order_index", { ascending: false })
        .limit(1)
        .single();

    const nextOrder = (maxOrder?.order_index ?? -1) + 1;

    const { error } = await permission.admin
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

    revalidatePath("/dashboard/units/[id]", "layout");
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
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    // Verify the milestone belongs to this unit
    const { data: existing } = await permission.admin
        .from("class_milestones")
        .select("id")
        .eq("id", milestoneId)
        .eq("unit_id", unitId)
        .single();

    if (!existing) {
        return { error: "Objetivo no encontrado o no pertenece a esta unidad" };
    }

    // If we are activating this milestone, we no longer need to deactivate others
    // as multiple active milestones are allowed and they fill sequentially by order_index.


    const { error } = await permission.admin
        .from("class_milestones")
        .update(data)
        .eq("id", milestoneId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function deleteUnitMilestone(milestoneId: string, unitId: string) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    // Verify the milestone belongs to this unit
    const { data: existing } = await permission.admin
        .from("class_milestones")
        .select("id")
        .eq("id", milestoneId)
        .eq("unit_id", unitId)
        .single();

    if (!existing) {
        return { error: "Objetivo no encontrado o no pertenece a esta unidad" };
    }

    const { error } = await permission.admin
        .from("class_milestones")
        .delete()
        .eq("id", milestoneId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

/**
 * Publishes a group submission's grade and propagates it to individual rows
 * for each group member, creating them if they don't exist.
 */
export async function publishGroupGrade(submissionId: string) {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const admin = auth.admin;

    // Fetch the group submission with grade data
    const { data: sub } = await admin
        .from("activity_submissions")
        .select("id, step_id, group_id, score, rubric_scores, feedback, grading_mode, drive_file_url, drive_file_id")
        .eq("id", submissionId)
        .single();

    if (!sub) return { error: "Entrega no encontrada." };
    if (!sub.group_id) return { error: "Esta entrega no es grupal." };
    if (sub.score === null && sub.rubric_scores === null) {
        return { error: "La entrega aún no tiene nota. Califica primero antes de publicar." };
    }

    // Fetch group members
    const { data: members } = await admin
        .from("module_group_members")
        .select("student_id")
        .eq("group_id", sub.group_id);

    if (!members || members.length === 0) {
        return { error: "El grupo no tiene miembros." };
    }

    const now = new Date().toISOString();

    // Publish the group submission itself
    await admin
        .from("activity_submissions")
        .update({ status: "published", published_at: now })
        .eq("id", submissionId);

    // Upsert individual rows for each member.
    // group_id is intentionally omitted so these rows use idx_submission_individual
    // (UNIQUE student_id+step_id WHERE group_id IS NULL) — not idx_submission_group
    // which is already occupied by the canonical group submission.
    const propagatedPayload = {
        drive_file_url: sub.drive_file_url,
        drive_file_id: sub.drive_file_id,
        score: sub.score,
        rubric_scores: sub.rubric_scores,
        feedback: sub.feedback,
        grading_mode: sub.grading_mode,
        status: "published" as const,
        submitted_at: now,
        graded_at: now,
        published_at: now,
    };

    for (const m of members) {
        const { data: existing } = await admin
            .from("activity_submissions")
            .select("id")
            .eq("student_id", m.student_id)
            .eq("step_id", sub.step_id)
            .is("group_id", null)
            .maybeSingle();

        if (existing?.id) {
            await admin.from("activity_submissions")
                .update(propagatedPayload)
                .eq("id", existing.id);
        } else {
            await admin.from("activity_submissions")
                .insert({ student_id: m.student_id, step_id: sub.step_id, ...propagatedPayload });
        }
    }

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true, propagated: members.length };
}

// ─── Coevaluación — acciones del profesor ────────────────────────────────────

/**
 * Generates balanced peer evaluation assignments for a step.
 * Each submission is assigned to `submissionsPerEvaluator` different evaluators.
 * Skips re-generation if assignments already exist for this step.
 */
export async function deletePeerAssignments(
    stepId: string,
): Promise<{ error?: string }> {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const { error } = await auth.admin
        .from("peer_evaluation_assignments")
        .delete()
        .eq("step_id", stepId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/units/[id]", "layout");
    return {};
}

export async function setAssignmentOutlier(
    assignmentId: string,
    isOutlier: boolean,
): Promise<{ error?: string }> {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const { error } = await auth.admin
        .from("peer_evaluation_assignments")
        .update({ is_outlier: isOutlier })
        .eq("id", assignmentId);

    if (error) return { error: error.message };
    return {};
}

/**
 * Sets the validated state of a specific numeric question answer within an assignment.
 * Teachers validate numeric answers before they count toward the average received score.
 * Only applies to numeric questions with requireJustification = true.
 */
export async function setQuestionValidation(
    assignmentId: string,
    questionId: string,
    validated: boolean,
): Promise<{ error?: string; validated_numeric_answers?: Record<string, boolean> }> {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    // Fetch existing validated_numeric_answers
    const { data: existing, error: fetchErr } = await auth.admin
        .from("peer_evaluation_assignments")
        .select("validated_numeric_answers")
        .eq("id", assignmentId)
        .single();

    if (fetchErr) return { error: fetchErr.message };

    const current: Record<string, boolean> = (existing?.validated_numeric_answers as any) ?? {};
    if (validated) {
        current[questionId] = true;
    } else {
        delete current[questionId];
    }

    const { error } = await auth.admin
        .from("peer_evaluation_assignments")
        .update({ validated_numeric_answers: current })
        .eq("id", assignmentId);

    if (error) return { error: error.message };
    return { validated_numeric_answers: current };
}

/**
 * Bulk-validates (or invalidates) specific numeric question answers across multiple assignments.
 * Used to approve received scores in intra-group peer eval in one click.
 */
export async function bulkValidateNumericAnswers(
    assignmentIds: string[],
    questionIds: string[],
    validated: boolean,
): Promise<{ error?: string }> {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const { data: existing, error: fetchErr } = await auth.admin
        .from("peer_evaluation_assignments")
        .select("id, validated_numeric_answers")
        .in("id", assignmentIds);

    if (fetchErr) return { error: fetchErr.message };

    for (const row of existing ?? []) {
        const current: Record<string, boolean> = (row.validated_numeric_answers as any) ?? {};
        for (const qId of questionIds) {
            if (validated) current[qId] = true;
            else delete current[qId];
        }
        await auth.admin
            .from("peer_evaluation_assignments")
            .update({ validated_numeric_answers: current })
            .eq("id", row.id);
    }

    return {};
}

/**
 * Private helper — inserts intra-group peer eval assignments.
 * Does NOT check for existing assignments (caller is responsible).
 * Uses the supplied admin client — no auth check.
 */
async function _insertIntraGroupAssignments(
    stepId: string,
    moduleId: string,
    sourceStepId: string | null,
    admin: ReturnType<typeof createAdminClient>,
): Promise<{ error?: string; generated?: number }> {
    const { data: groups } = await admin
        .from("module_groups")
        .select("id, name")
        .eq("module_id", moduleId)
        .eq("status", "active");

    if (!groups || groups.length === 0) {
        return { error: "No hay grupos activos en este módulo." };
    }

    // Fetch group submissions (optional reference — used as target_submission_id)
    let subByGroup: Map<string, string> = new Map();
    if (sourceStepId) {
        const { data: subs } = await admin
            .from("activity_submissions")
            .select("id, group_id")
            .eq("step_id", sourceStepId)
            .not("group_id", "is", null);
        subByGroup = new Map((subs ?? []).map((s: any) => [s.group_id, s.id]));
    }

    const rows: {
        step_id: string;
        evaluator_id: string;
        target_submission_id: string | null;
        target_student_id: string;
    }[] = [];

    for (const group of groups) {
        const { data: members } = await admin
            .from("module_group_members")
            .select("student_id")
            .eq("group_id", group.id);

        const memberIds = (members ?? []).map((m: any) => m.student_id as string);
        if (memberIds.length < 2) continue;

        const groupSubId = subByGroup.get(group.id) ?? null;

        for (const evaluatorId of memberIds) {
            for (const targetStudentId of memberIds) {
                if (evaluatorId === targetStudentId) continue;
                rows.push({
                    step_id: stepId,
                    evaluator_id: evaluatorId,
                    target_submission_id: groupSubId as any,
                    target_student_id: targetStudentId,
                });
            }
        }
    }

    if (rows.length === 0) return { error: "No fue posible generar asignaciones intra-grupo." };

    const { error } = await admin.from("peer_evaluation_assignments").insert(rows);
    if (error) return { error: error.message };

    revalidatePath("/dashboard/units/[id]", "layout");
    return { generated: rows.length };
}

export async function generatePeerAssignments(
    stepId: string,
    moduleId: string,
): Promise<{ error?: string; generated?: number }> {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const admin = auth.admin;

    // Check if assignments already exist
    const { count: existing } = await admin
        .from("peer_evaluation_assignments")
        .select("id", { count: "exact", head: true })
        .eq("step_id", stepId);
    if ((existing ?? 0) > 0) {
        return { error: "Las asignaciones ya han sido generadas para este paso." };
    }

    // Fetch step content to get submissionsPerEvaluator and mode
    const { data: step } = await admin
        .from("activity_steps")
        .select("content, parent_step_id")
        .eq("id", stepId)
        .single();
    if (!step) return { error: "Paso no encontrado." };

    const content = step.content as any;
    const mode = content?.mode ?? "individual";
    const submissionsPerEvaluator = content?.submissionsPerEvaluator ?? 2;

    // parent_step_id (structural relationship) takes priority over legacy content.sourceStepId
    const sourceStepId = ((step as any).parent_step_id ?? content?.sourceStepId) as string | undefined;

    // intra_group: evaluate members within each group — no source submission needed
    if (mode === "intra_group") {
        return _insertIntraGroupAssignments(stepId, moduleId, sourceStepId ?? null, admin);
    }

    if (!sourceStepId) return { error: "El paso de coevaluación no tiene un entregable fuente configurado." };

    if (mode === "individual") {
        // Fetch all submissions for the source step (individual + group)
        const { data: submissions } = await admin
            .from("activity_submissions")
            .select("id, student_id, group_id")
            .eq("step_id", sourceStepId)
            .not("status", "eq", "pending");

        if (!submissions || submissions.length < 2) {
            return { error: "Se necesitan al menos 2 entregas para generar asignaciones." };
        }

        // Evaluators are the students who submitted (not all enrolled students).
        // This ensures submitters evaluate each other rather than picking students
        // who never submitted as evaluators.
        const evaluatorIds = (submissions ?? [])
            .map((s: any) => s.student_id as string)
            .filter((id: string, idx: number, arr: string[]) => arr.indexOf(id) === idx); // dedupe (group subs)
        if (evaluatorIds.length === 0) return { error: "No hay entregas para generar asignaciones." };

        // Round-robin balanced assignment: each submission gets ~submissionsPerEvaluator evaluators
        // Use Fisher-Yates shuffle, then distribute
        const shuffledSubs = [...submissions].sort(() => Math.random() - 0.5);
        const rows: {
            step_id: string;
            evaluator_id: string;
            target_submission_id: string;
        }[] = [];

        const subCount = shuffledSubs.length;
        const evalCount = evaluatorIds.length;

        for (let i = 0; i < subCount; i++) {
            const sub = shuffledSubs[i];
            let assigned = 0;
            let offset = 0;

            while (assigned < submissionsPerEvaluator && offset < evalCount) {
                const evalId = evaluatorIds[(i + offset) % evalCount];
                // Don't self-evaluate
                if (evalId !== sub.student_id) {
                    // Avoid duplicate (same evaluator + same submission)
                    const alreadyAdded = rows.some(
                        r => r.evaluator_id === evalId && r.target_submission_id === sub.id
                    );
                    if (!alreadyAdded) {
                        rows.push({ step_id: stepId, evaluator_id: evalId, target_submission_id: sub.id });
                        assigned++;
                    }
                }
                offset++;
            }
        }

        if (rows.length === 0) return { error: "No fue posible generar asignaciones." };

        const { error } = await admin.from("peer_evaluation_assignments").insert(rows);
        if (error) return { error: error.message };

        revalidatePath("/dashboard/units/[id]", "layout");
        return { generated: rows.length };
    }

    // Group mode
    const { data: groups } = await admin
        .from("module_groups")
        .select("id")
        .eq("module_id", moduleId)
        .eq("status", "active");

    if (!groups || groups.length < 2) {
        return { error: "Se necesitan al menos 2 grupos activos." };
    }

    const { data: submissions } = await admin
        .from("activity_submissions")
        .select("id, group_id")
        .eq("step_id", sourceStepId)
        .not("group_id", "is", null);

    const subByGroup = new Map<string, string>(
        (submissions ?? []).map((s: any) => [s.group_id, s.id])
    );

    const evaluateAllGroups = content?.evaluateAllGroups ?? true;
    const rows: { step_id: string; evaluator_group_id: string; target_submission_id: string }[] = [];

    if (evaluateAllGroups) {
        for (const evaluatorGroup of groups) {
            for (const targetGroup of groups) {
                if (evaluatorGroup.id === targetGroup.id) continue;
                const targetSubId = subByGroup.get(targetGroup.id);
                if (!targetSubId) continue;
                rows.push({
                    step_id: stepId,
                    evaluator_group_id: evaluatorGroup.id,
                    target_submission_id: targetSubId,
                });
            }
        }
    } else {
        const requestedGroupsPerGroup = Math.max(1, Number(content?.groupsPerGroup ?? 1));
        const groupsPerGroup = Math.min(requestedGroupsPerGroup, Math.max(groups.length - 1, 1));

        for (let i = 0; i < groups.length; i++) {
            let assigned = 0;
            let offset = 1;

            while (assigned < groupsPerGroup && offset < groups.length) {
                const targetGroup = groups[(i + offset) % groups.length];
                const targetSubId = subByGroup.get(targetGroup.id);
                if (targetSubId) {
                    rows.push({
                        step_id: stepId,
                        evaluator_group_id: groups[i].id,
                        target_submission_id: targetSubId,
                    });
                    assigned++;
                }
                offset++;
            }
        }
    }

    if (rows.length === 0) return { error: "No fue posible generar asignaciones de grupo." };

    const { error } = await admin.from("peer_evaluation_assignments").insert(rows);
    if (error) return { error: error.message };

    revalidatePath("/dashboard/units/[id]", "layout");
    return { generated: rows.length };
}

/**
 * Returns all peer evaluation results for the teacher view.
 */
export async function getPeerEvaluationResults(stepId: string, moduleId?: string): Promise<{
    assignments?: any[];
    peerFeedbackVisibleToStudents?: boolean;
    anonymousEvaluation?: boolean;
    mode?: string;
    livePresentationMode?: boolean;
    evalMode?: string;
    rubric?: any[];
    evalQuestions?: any[];
    groupByStudentId?: Record<string, { id: string; name: string; color?: string | null }>;
    allGroups?: { id: string; name: string; color?: string | null }[];
    evaluateAllGroups?: boolean;
    error?: string;
}> {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const [{ data: step }, { data, error }] = await Promise.all([
        auth.admin
            .from("activity_steps")
            .select("content")
            .eq("id", stepId)
            .single(),
        auth.admin
            .from("peer_evaluation_assignments")
            .select(`
                id, evaluator_id, evaluator_group_id, target_submission_id, target_student_id, eval_submission_id,
                reliability_score, is_outlier, calibration_score, validated_numeric_answers,
                evaluator:profiles!evaluator_id(id, full_name),
                evaluator_group:module_groups!evaluator_group_id(id, name, color),
                target_submission:activity_submissions!target_submission_id(
                    id, student_id, group_id, score, peer_eval_override_score,
                    student:profiles!student_id(full_name),
                    group:module_groups!group_id(name)
                ),
                eval_submission:activity_submissions!eval_submission_id(
                    id, self_eval_rubric_scores, self_eval_justifications, files
                )
            `)
            .eq("step_id", stepId)
            .order("created_at"),
    ]);

    if (error) return { error: error.message };
    const content = step?.content as any;
    const mode = content?.mode ?? "individual";

    let assignments = data ?? [];
    let groupByStudentId: Record<string, { id: string; name: string; color?: string | null }> = {};
    let allGroups: { id: string; name: string; color?: string | null }[] = [];

    if (mode === 'intra_group' && assignments.length > 0) {
        // Resolve target_student names
        const targetStudentIds = [...new Set(
            assignments.map((a: any) => a.target_student_id).filter(Boolean)
        )];
        if (targetStudentIds.length > 0) {
            const { data: profiles } = await auth.admin
                .from("profiles")
                .select("id, full_name")
                .in("id", targetStudentIds);
            const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
            assignments = assignments.map((a: any) => ({
                ...a,
                target_student: a.target_student_id
                    ? { full_name: nameById.get(a.target_student_id) ?? null }
                    : null,
            }));
        }
    }

    if (moduleId && (mode === 'intra_group' || mode === 'group')) {
        const { data: groups } = await auth.admin
            .from("module_groups")
            .select("id")
            .eq("module_id", moduleId)
            .eq("status", "active");
        const groupIds = (groups ?? []).map((g: any) => g.id as string);
        if (groupIds.length > 0) {
            const { data: members } = await auth.admin
                .from("module_group_members")
                .select("student_id, group_id, group:module_groups!group_id(id, name, color)")
                .in("group_id", groupIds);
            for (const m of members ?? []) {
                const grp = (m as any).group;
                if (grp && m.student_id) {
                    groupByStudentId[m.student_id as string] = { id: grp.id, name: grp.name, color: grp.color ?? null };
                }
            }
        }
    }

    if (moduleId && mode === 'group') {
        const { data: moduleGroupsForTable } = await auth.admin
            .from("module_groups")
            .select("id, name, color")
            .eq("module_id", moduleId)
            .eq("status", "active");
        allGroups = (moduleGroupsForTable ?? []) as { id: string; name: string; color?: string | null }[];
    }

    return {
        assignments,
        peerFeedbackVisibleToStudents: content?.peerFeedbackVisibleToStudents ?? false,
        anonymousEvaluation: content?.anonymousEvaluation ?? false,
        mode,
        livePresentationMode: content?.livePresentationMode ?? false,
        evalMode: content?.evalMode ?? "rubric",
        rubric: content?.rubric ?? [],
        evalQuestions: content?.questions ?? [],
        groupByStudentId,
        allGroups,
        evaluateAllGroups: content?.evaluateAllGroups ?? true,
    };
}

/**
 * Ensures intra_group peer eval assignments exist for a step.
 * Idempotent: does nothing if assignments already exist.
 */
export async function ensureIntraGroupAssignments(
    stepId: string,
    moduleId: string,
): Promise<{ error?: string; generated?: number }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };

    const admin = createAdminClient();

    const { data: step } = await admin
        .from("activity_steps")
        .select("content, parent_step_id")
        .eq("id", stepId)
        .single();
    const content = step?.content as any;
    if (content?.mode !== 'intra_group') return {};

    const { count } = await admin
        .from("peer_evaluation_assignments")
        .select("id", { count: 'exact', head: true })
        .eq("step_id", stepId);
    if ((count ?? 0) > 0) return {};

    const sourceStepId = ((step as any)?.parent_step_id ?? content?.sourceStepId) as string | null ?? null;
    return _insertIntraGroupAssignments(stepId, moduleId, sourceStepId, admin);
}

export async function ensureGroupAssignments(
    stepId: string,
    moduleId: string,
): Promise<{ error?: string; generated?: number }> {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const { data: step } = await auth.admin
        .from("activity_steps")
        .select("content")
        .eq("id", stepId)
        .single();
    const content = step?.content as any;
    if (content?.mode !== "group" || !content?.evaluateAllGroups) return {};

    const { count } = await auth.admin
        .from("peer_evaluation_assignments")
        .select("id", { count: "exact", head: true })
        .eq("step_id", stepId);
    if ((count ?? 0) > 0) return {};

    return generatePeerAssignments(stepId, moduleId);
}

/**
 * Computes reliability scores and outlier flags for all evaluators of a step.
 */
export async function computeEvaluatorReliability(stepId: string): Promise<{ error?: string }> {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const admin = auth.admin;

    // Fetch step content for outlier sensitivity
    const { data: step } = await admin
        .from("activity_steps")
        .select("content")
        .eq("id", stepId)
        .single();
    const sensitivityMap: Record<string, number> = { strict: 1.0, normal: 1.5, lenient: 2.0 };
    const sensitivity = sensitivityMap[(step?.content as any)?.outlierSensitivity ?? "normal"];

    // Fetch all assignments with their scores
    const { data: assignments } = await admin
        .from("peer_evaluation_assignments")
        .select("id, evaluator_id, evaluator_group_id, target_submission_id, eval_submission_id")
        .eq("step_id", stepId)
        .not("eval_submission_id", "is", null);

    if (!assignments?.length) return {};

    // Load the actual scores from eval submissions
    const evalSubIds = assignments.map((a: any) => a.eval_submission_id);
    const { data: evalSubs } = await admin
        .from("activity_submissions")
        .select("id, self_eval_rubric_scores")
        .in("id", evalSubIds);

    const scoreMap = new Map<string, number>();
    for (const es of evalSubs ?? []) {
        const scores = (es.self_eval_rubric_scores ?? {}) as Record<string, number>;
        const total = Object.values(scores).reduce((a: number, b: number) => a + b, 0);
        scoreMap.set(es.id, total);
    }

    // Group by target submission to compute median and std dev
    const byTarget = new Map<string, { assignmentId: string; score: number }[]>();
    for (const a of assignments) {
        const score = scoreMap.get(a.eval_submission_id);
        if (score === undefined) continue;
        const list = byTarget.get(a.target_submission_id) ?? [];
        list.push({ assignmentId: a.id, score });
        byTarget.set(a.target_submission_id, list);
    }

    const updates: { id: string; reliability_score: number; is_outlier: boolean }[] = [];

    for (const [, items] of byTarget) {
        if (items.length < 2) continue;
        const scores = items.map(i => i.score);
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const sorted = [...scores].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
        const stdDev = Math.sqrt(variance);

        for (const item of items) {
            const deviation = Math.abs(item.score - median);
            const reliability = 1 / (1 + deviation);
            const isOutlier = stdDev > 0 ? deviation > sensitivity * stdDev : false;
            updates.push({ id: item.assignmentId, reliability_score: reliability, is_outlier: isOutlier });
        }
    }

    for (const u of updates) {
        await admin
            .from("peer_evaluation_assignments")
            .update({ reliability_score: u.reliability_score, is_outlier: u.is_outlier })
            .eq("id", u.id);
    }

    revalidatePath("/dashboard/units/[id]", "layout");
    return {};
}

/**
 * Calculates and publishes final peer evaluation grades for all students.
 */
export async function publishPeerFinalGrades(
    stepId: string,
    excludeOutliers = false,
): Promise<{ error?: string; published?: number }> {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const admin = auth.admin;

    const { data: step } = await admin
        .from("activity_steps")
        .select("content, parent_step_id, phase:activity_phases(activity:activities(unit:units(module_id)))")
        .eq("id", stepId)
        .single();
    if (!step) return { error: "Paso no encontrado." };

    const content = step.content as any;
    const peerWeight = (content?.peerWeight ?? 30) / 100;
    const nonEvaluatorPolicy = content?.nonEvaluatorPolicy ?? "fallback_teacher";
    const penaltyPoints = content?.nonEvaluatorPenaltyPoints ?? 0;
    const sourceStepId = ((step as any).parent_step_id ?? content?.sourceStepId) as string | undefined;
    if (!sourceStepId) return { error: "No hay paso fuente configurado." };

    const moduleId = ((step.phase as any)?.activity?.unit?.module_id) as string | undefined;
    if (!moduleId) return { error: "No se encontró el módulo." };

    // Fetch all assignments
    const { data: assignments } = await admin
        .from("peer_evaluation_assignments")
        .select("id, evaluator_id, target_submission_id, eval_submission_id, reliability_score, is_outlier")
        .eq("step_id", stepId);

    // Fetch all source submissions (the ones being evaluated)
    const { data: sourceSubs } = await admin
        .from("activity_submissions")
        .select("id, student_id, score")
        .eq("step_id", sourceStepId);

    // Fetch eval submission scores
    const evalSubIds = (assignments ?? [])
        .map((a: any) => a.eval_submission_id)
        .filter(Boolean);

    const evalScores = new Map<string, number>();
    if (evalSubIds.length > 0) {
        const { data: evalSubs } = await admin
            .from("activity_submissions")
            .select("id, self_eval_rubric_scores")
            .in("id", evalSubIds);
        for (const es of evalSubs ?? []) {
            const scores = (es.self_eval_rubric_scores ?? {}) as Record<string, number>;
            evalScores.set(es.id, Object.values(scores).reduce((a: number, b: number) => a + b, 0));
        }
    }

    // Who evaluated (to detect non-evaluators)
    const evaluatedBy = new Set<string>(
        (assignments ?? [])
            .filter((a: any) => a.eval_submission_id)
            .map((a: any) => a.evaluator_id)
            .filter(Boolean)
    );

    // Enrolled students
    const { data: enrollments } = await admin
        .from("module_enrollments")
        .select("student_id")
        .eq("module_id", moduleId);
    const enrolledIds = new Set<string>(
        (enrollments ?? []).map((e: any) => e.student_id as string)
    );

    // Group assignments by target_submission_id
    const byTarget = new Map<string, { score: number; reliability: number }[]>();
    for (const a of assignments ?? []) {
        if (!a.eval_submission_id) continue;
        if (excludeOutliers && a.is_outlier) continue;
        const score = evalScores.get(a.eval_submission_id);
        if (score === undefined) continue;
        const reliability = a.reliability_score ?? 1;
        const list = byTarget.get(a.target_submission_id) ?? [];
        list.push({ score, reliability });
        byTarget.set(a.target_submission_id, list);
    }

    // Rubric max for normalization
    const rubric = (content?.rubric ?? []) as any[];
    const rubricMax = rubric.reduce((sum: number, c: any) => {
        const pts = c.levels?.map((l: any) => l.points) ?? [0];
        return sum + Math.max(...pts);
    }, 0) || 10;

    const now = new Date().toISOString();
    let published = 0;

    for (const sub of sourceSubs ?? []) {
        const evaluatorItems = byTarget.get(sub.id) ?? [];
        const isNonEvaluator = sub.student_id ? !evaluatedBy.has(sub.student_id) : false;
        const teacherScore = sub.score ?? 0;

        let finalScore: number;

        if (evaluatorItems.length === 0 || (isNonEvaluator && nonEvaluatorPolicy === "fallback_teacher")) {
            finalScore = teacherScore;
        } else {
            // Weighted peer average
            const totalReliability = evaluatorItems.reduce((a, b) => a + b.reliability, 0);
            const weightedPeerRaw = totalReliability > 0
                ? evaluatorItems.reduce((a, b) => a + b.score * b.reliability, 0) / totalReliability
                : evaluatorItems.reduce((a, b) => a + b.score, 0) / evaluatorItems.length;
            const weightedPeer = Math.round((weightedPeerRaw / rubricMax) * 1000) / 100; // normalize to /10

            finalScore = Math.round(
                (peerWeight * weightedPeer + (1 - peerWeight) * teacherScore) * 100
            ) / 100;

            if (isNonEvaluator && nonEvaluatorPolicy === "grade_penalty") {
                finalScore = Math.max(0, finalScore - penaltyPoints);
            }
        }

        await admin
            .from("activity_submissions")
            .update({
                score: finalScore,
                grading_mode: "score",
                graded_at: now,
                status: "published",
                published_at: now,
            })
            .eq("id", sub.id);

        published++;
    }

    revalidatePath("/dashboard/units/[id]", "layout");
    return { published };
}

/**
 * Teacher override of the final peer-evaluation score for a specific submission.
 */
export async function overridePeerScore(
    submissionId: string,
    score: number,
): Promise<{ error?: string }> {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const { error } = await auth.admin
        .from("activity_submissions")
        .update({ peer_eval_override_score: score })
        .eq("id", submissionId);

    if (error) return { error: error.message };
    return {};
}

/**
 * Returns all self-evaluation submissions for a step, including teacher scores.
 */
export async function getSelfEvaluationResults(stepId: string): Promise<{
    rows?: {
        student_id: string;
        student_name: string | null;
        self_eval_rubric_scores: Record<string, number> | null;
        self_eval_justifications: Record<string, string> | null;
        teacher_score: number | null;
        status: string;
    }[];
    rubric?: import('@/types/activity').RubricCriteria[];
    evalMode?: import('@/types/activity').EvalMode;
    questions?: import('@/types/activity').EvalQuestion[];
    error?: string;
}> {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const { data: step } = await auth.admin
        .from("activity_steps")
        .select("content")
        .eq("id", stepId)
        .single();

    if (!step) return { error: "Paso no encontrado." };
    const stepContent = step.content as any;
    const rubric = stepContent?.rubric ?? [];
    const evalMode: import('@/types/activity').EvalMode = stepContent?.evalMode ?? 'rubric';
    const questions: import('@/types/activity').EvalQuestion[] = stepContent?.questions ?? [];

    const { data, error } = await auth.admin
        .from("activity_submissions")
        .select(`
            student_id, score, status,
            self_eval_rubric_scores, self_eval_justifications,
            student:profiles!student_id(full_name)
        `)
        .eq("step_id", stepId)
        // rubric mode: rubric_scores IS NOT NULL; questions mode: justifications IS NOT NULL
        .or("self_eval_rubric_scores.not.is.null,self_eval_justifications.not.is.null");

    if (error) return { error: error.message };

    const rows = (data ?? []).map((d: any) => ({
        student_id: d.student_id,
        student_name: d.student?.full_name ?? null,
        self_eval_rubric_scores: d.self_eval_rubric_scores,
        self_eval_justifications: d.self_eval_justifications,
        teacher_score: d.score,
        status: d.status,
    }));

    return { rows, rubric, evalMode, questions };
}

/**
 * Toggles whether peer feedback (justifications) are visible to students.
 */
export async function togglePeerFeedbackVisible(stepId: string, visible: boolean): Promise<{ error?: string }> {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const { data: step } = await auth.admin
        .from("activity_steps")
        .select("content")
        .eq("id", stepId)
        .single();

    if (!step) return { error: "Paso no encontrado." };

    const updatedContent = { ...(step.content as any), peerFeedbackVisibleToStudents: visible };

    const { error } = await auth.admin
        .from("activity_steps")
        .update({ content: updatedContent })
        .eq("id", stepId);

    if (error) return { error: error.message };
    revalidatePath("/dashboard/units/[id]", "layout");
    return {};
}

export async function updateUnitResources(unitId: string, resources: any[]) {
    if (!unitId) return { error: "ID de unidad es requerido." };
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    const { error } = await permission.admin
        .from("units")
        .update({ resources })
        .eq("id", unitId);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function reorderUnitMilestones(
    unitId: string,
    milestoneIdOrder: string[]
) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    // Update each milestone's order_index in a loop
    const updates = milestoneIdOrder.map((id, index) =>
        permission.admin
            .from("class_milestones")
            .update({ order_index: index })
            .eq("id", id)
            .eq("unit_id", unitId)
    );

    const results = await Promise.all(updates);
    const firstError = results.find((result: any) => result.error);

    if (firstError?.error) {
        return { error: firstError.error.message };
    }

    revalidatePath("/dashboard/units/[id]", "layout");
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
        step_id?: string | null;
        xp_reward?: number;
    }
) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    const { data: badge, error } = await permission.admin
        .from("class_badges")
        .insert({
            unit_id: unitId,
            activity_id: data.activity_id ?? null,
            step_id: data.step_id ?? null,
            title: data.title,
            description: data.description ?? null,
            icon_url: data.icon_url ?? null,
            is_hidden: data.is_hidden,
            condition_payload: data.condition_payload,
            xp_reward: data.xp_reward ?? 0,
        })
        .select("*")
        .single();

    if (error) return { error: error.message };

    revalidatePath("/dashboard/units/[id]", "layout");
    return badge ? { success: true, badge } : { success: true };
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
        step_id: string | null;
        xp_reward: number;
    }>
) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    const { data: badge, error } = await permission.admin
        .from("class_badges")
        .update(data)
        .eq("id", badgeId)
        .select("*")
        .single();

    if (error) return { error: error.message };

    revalidatePath("/dashboard/units/[id]", "layout");
    return badge ? { success: true, badge } : { success: true };
}

export async function deleteClassBadge(badgeId: string, unitId: string) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    const { error } = await permission.admin
        .from("class_badges")
        .delete()
        .eq("id", badgeId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function getUnitStudentsWithBadges(unitId: string): Promise<{
    students: { id: string; full_name: string | null; avatar_url: string | null }[];
    studentBadges: { badge_id: string; student_id: string; earned_at: string }[];
    error?: string;
}> {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { students: [], studentBadges: [], error: "No autenticado." };

    // Get module_id from unit
    const { data: unit } = await supabase.from("units").select("module_id").eq("id", unitId).single();
    if (!unit?.module_id) return { students: [], studentBadges: [] };

    // Get enrolled student IDs
    const { data: enrollments } = await supabase
        .from("module_enrollments")
        .select("student_id")
        .eq("module_id", unit.module_id);

    const studentIds = enrollments?.map((e: any) => e.student_id) || [];
    if (studentIds.length === 0) return { students: [], studentBadges: [] };

    // Fetch profiles
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", studentIds)
        .order("full_name", { ascending: true });

    // Fetch all badge IDs for this unit
    const { data: unitBadges } = await supabase
        .from("class_badges")
        .select("id")
        .eq("unit_id", unitId);

    const badgeIds = unitBadges?.map((b: any) => b.id) || [];
    let studentBadges: { badge_id: string; student_id: string; earned_at: string }[] = [];

    if (badgeIds.length > 0) {
        const { data: sb } = await admin
            .from("student_badges")
            .select("badge_id, student_id, earned_at")
            .in("badge_id", badgeIds);
        studentBadges = (sb as any[]) || [];
    }

    return { students: (profiles as any[]) || [], studentBadges };
}

export async function awardBadgesManually(badgeId: string, studentIds: string[]): Promise<{ success?: boolean; awarded?: number; error?: string }> {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if ((profile as any)?.role !== "teacher") return { error: "Sin permisos." };

    if (!badgeId || studentIds.length === 0) return { error: "Selecciona una insignia y al menos un alumno." };

    // Insert ignoring duplicates (UNIQUE constraint on student_id + badge_id)
    const rows = studentIds.map(sid => ({ badge_id: badgeId, student_id: sid }));
    const { data, error } = await admin
        .from("student_badges")
        .upsert(rows, { onConflict: "student_id,badge_id", ignoreDuplicates: true })
        .select("id");

    if (error) return { error: error.message };
    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true, awarded: (data as any[])?.length ?? studentIds.length };
}

export async function deleteUnit(unitId: string) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    // Get module_id for revalidation before deletion
    const { data: unit } = await permission.admin
        .from("units")
        .select("module_id")
        .eq("id", unitId)
        .single();

    const { error } = await permission.admin
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

export async function bulkPublishSubmissions(submissionIds: string[]): Promise<{ success?: boolean; error?: string }> {
    if (submissionIds.length === 0) return { error: "No hay entregas seleccionadas." };
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Solo profesores." };

    const admin = createAdminClient();
    const { error } = await admin
        .from("activity_submissions")
        .update({ published_at: new Date().toISOString(), status: "published" })
        .in("id", submissionIds)
        .eq("status", "graded");

    if (error) return { error: error.message };
    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function bulkReopenSubmissions(submissionIds: string[]): Promise<{ success?: boolean; error?: string }> {
    if (submissionIds.length === 0) return { error: "No hay entregas seleccionadas." };
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Solo profesores." };

    const admin = createAdminClient();
    const { error } = await admin
        .from("activity_submissions")
        .update({ status: "submitted", graded_at: null, published_at: null })
        .in("id", submissionIds)
        .in("status", ["graded", "published"]);

    if (error) return { error: error.message };
    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function createDeadlineExtension(
    stepId: string,
    studentId: string,
    extendedUntil: string
): Promise<{ success?: boolean; error?: string }> {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Solo profesores." };

    const admin = createAdminClient();
    const { error } = await admin
        .from("deadline_extensions")
        .upsert(
            { student_id: studentId, step_id: stepId, extended_until: extendedUntil, created_by: user.id },
            { onConflict: "student_id,step_id" }
        );

    if (error) return { error: error.message };
    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function bulkCreateDeadlineExtensions(
    stepId: string,
    studentIds: string[],
    extendedUntil: string
): Promise<{ success?: boolean; error?: string }> {
    if (studentIds.length === 0) return { error: "No hay alumnos seleccionados." };

    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Solo profesores." };

    const admin = createAdminClient();
    const rows = studentIds.map(sid => ({
        student_id: sid,
        step_id: stepId,
        extended_until: extendedUntil,
        created_by: user.id,
    }));

    const { error } = await admin
        .from("deadline_extensions")
        .upsert(rows, { onConflict: "student_id,step_id" });

    if (error) return { error: error.message };
    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function updateStepWeight(stepId: string, weight: number) {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const { error } = await auth.admin
        .from("activity_steps")
        .update({ weight })
        .eq("id", stepId);

    if (error) return { error: "Error al actualizar el peso del paso." };

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function updateActivityWeight(activityId: string, weight: number) {
    const permission = await requireActivityPermission(activityId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    const { error } = await permission.admin
        .from("activities")
        .update({ weight })
        .eq("id", activityId);

    if (error) return { error: "Error al actualizar el peso de la actividad." };

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function duplicateActivity(unitId: string, activityId: string) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    const supabase = permission.admin;

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

    if (activityError || !activity) return { error: "Actividad no encontrada." };

    // 2. Insert new activity
    const { data: newActivity, error: newActivityError } = await supabase
        .from("activities")
        .insert({
            unit_id: unitId,
            title: `${activity.title} (Copia)`,
            description: activity.description,
            type: activity.type,
            xp: activity.xp,
            duration: activity.duration,
            difficulty: activity.difficulty,
            status: 'draft',
            order_index: (activity.order_index ?? 0) + 1,
            position_x: (activity.position_x ?? 0) + 50,
            position_y: (activity.position_y ?? 0) + 50,
            logo_url: activity.logo_url,
            navigation_mode: activity.navigation_mode ?? ACTIVITY_NAVIGATION_MODE.FREE,
        })
        .select()
        .single();

    if (newActivityError) return { error: "Error al duplicar la actividad." };

    // 3. Duplicate phases and steps
    if (activity.activity_phases) {
        for (const phase of activity.activity_phases) {
            const { data: newPhase, error: phaseError } = await supabase
                .from("activity_phases")
                .insert({
                    activity_id: newActivity.id,
                    title: phase.title,
                    description: phase.description,
                    order_index: phase.order_index
                })
                .select()
                .single();

            if (phaseError) continue;

            if (phase.activity_steps) {
                for (const step of phase.activity_steps) {
                    await supabase
                        .from("activity_steps")
                        .insert({
                            phase_id: newPhase.id,
                            title: step.title,
                            content: step.content,
                            type: step.type,
                            order_index: step.order_index,
                            xp: step.xp ?? step.xp_reward ?? 0,
                            completion_mode: step.completion_mode,
                            xp_award_trigger: step.xp_award_trigger ?? null,
                            is_visible: step.is_visible ?? true,
                            is_locked: step.is_locked ?? false,
                            due_date: step.due_date ?? null,
                            is_activity_closed: step.is_activity_closed ?? false,
                            is_lockdown: step.is_lockdown ?? false,
                            parent_step_id: step.parent_step_id ?? null,
                            audience_mode: step.audience_mode ?? null,
                            visible_student_ids: step.visible_student_ids ?? null,
                            visible_group_ids: step.visible_group_ids ?? null,
                            inherit_audience_from_parent: step.inherit_audience_from_parent ?? false,
                            config: step.config
                        });
                }
            }
        }
    }

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function duplicateUnit(moduleId: string, unitId: string) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    const supabase = permission.admin;

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

    if (unitError || !unit) return { error: "Unidad no encontrada." };

    // 2. Insert new unit
    const { data: newUnit, error: newUnitError } = await supabase
        .from("units")
        .insert({
            module_id: moduleId,
            name: `${unit.name} (Copia)`,
            description: unit.description,
            status: 'draft',
            view_type: unit.view_type || 'list',
            activity_navigation_mode: unit.activity_navigation_mode || UNIT_ACTIVITY_NAVIGATION_MODE.FREE,
            activity_unlock_rule: unit.activity_unlock_rule || UNIT_ACTIVITY_UNLOCK_RULE.REQUIRED_STEPS,
            activity_unlock_threshold: unit.activity_unlock_threshold ?? 100,
            order_index: (unit.order_index ?? 0) + 1,
            resources: unit.resources
        })
        .select()
        .single();

    if (newUnitError) return { error: "Error al duplicar la unidad." };

    // 3. Duplicate activities
    if (unit.activities) {
        for (const activity of unit.activities) {
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
                    logo_url: activity.logo_url,
                    navigation_mode: activity.navigation_mode ?? ACTIVITY_NAVIGATION_MODE.FREE,
                })
                .select()
                .single();

            if (newActivityError) continue;

            if (activity.activity_phases) {
                for (const phase of activity.activity_phases) {
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

                    if (phase.activity_steps) {
                        for (const step of phase.activity_steps) {
                            await supabase
                                .from("activity_steps")
                                .insert({
                                    phase_id: newPhase.id,
                                    title: step.title,
                                    content: step.content,
                                    type: step.type,
                                    order_index: step.order_index,
                                    xp: step.xp ?? step.xp_reward ?? 0,
                                    completion_mode: step.completion_mode,
                                    xp_award_trigger: step.xp_award_trigger ?? null,
                                    is_visible: step.is_visible ?? true,
                                    is_locked: step.is_locked ?? false,
                                    due_date: step.due_date ?? null,
                                    is_activity_closed: step.is_activity_closed ?? false,
                                    is_lockdown: step.is_lockdown ?? false,
                                    parent_step_id: step.parent_step_id ?? null,
                                    audience_mode: step.audience_mode ?? null,
                                    visible_student_ids: step.visible_student_ids ?? null,
                                    visible_group_ids: step.visible_group_ids ?? null,
                                    inherit_audience_from_parent: step.inherit_audience_from_parent ?? false,
                                    config: step.config
                                });
                        }
                    }
                }
            }
        }
    }

    // 4. Duplicate milestones
    if (unit.class_milestones) {
        for (const milestone of unit.class_milestones) {
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
    }

    // 5. Duplicate badges
    if (unit.class_badges) {
        for (const badge of unit.class_badges) {
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
    }

    revalidatePath(`/dashboard/modules/${moduleId}`);
    return { success: true };
}
