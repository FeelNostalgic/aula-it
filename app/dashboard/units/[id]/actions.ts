"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { evaluateStudentBadges } from "@/lib/gamification/rule-engine";
import { getUnitAccess } from "@/lib/module-access";
import { getRestrictedActionMessage, type ModulePermissions } from "@/lib/module-collaborator-defs";

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

    if (!name?.trim()) {
        return { error: "El nombre de la unidad no puede estar vacío" };
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
            view_type: view_type || 'list'
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
    synthetic?: boolean; // true = no real submission, injected for display
    step_is_locked?: boolean;
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

    // Step 2: get deliverable, file_upload, and quiz steps in those phases
    const { data: steps, error: stepsError } = await supabase
        .from("activity_steps")
        .select("id, type, title, phase_id, content, is_locked, is_activity_closed, order_index")
        .in("type", ["deliverable", "file_upload", "quiz"])
        .in("phase_id", phaseIds)
        .order("order_index", { ascending: true });

    if (stepsError) return { error: stepsError.message };
    if (!steps || steps.length === 0) return { data: [] };

    const stepIds = steps.map(s => s.id);

    // Fetch activity titles for the map
    const { data: activities } = await supabase
        .from("activities")
        .select("id, title")
        .in("id", activityIds);
    const activityTitles: Record<string, string> = {};
    activities?.forEach(a => activityTitles[a.id] = a.title);

    const stepMeta: Record<string, { title: string; stepType: string; activityId: string; activityTitle: string; deliveryMode: any; rubric: any; quizContent: any; isLocked: boolean }> = {};
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
            isLocked: (s as any).is_locked ?? false
        };
    }

    // Step 3: get submissions for these steps
    let query = supabase
        .from("activity_submissions")
        .select(`
            *,
            student:profiles!inner(full_name)
        `)
        .in("step_id", stepIds);

    if (students && students.length > 0) {
        query = query.in("student_id", students.map(s => s.student_id));
    }

    const { data: submissions, error: subError } = await query;
    if (subError) return { error: subError.message };

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
            step_is_locked: meta?.isLocked
        };
    });

    // Add virtual rows for students who haven't submitted yet
    if (students && students.length > 0) {
        const submittedKeys = new Set(results.map(r => `${r.student_id}:${r.step_id}`));
        for (const step of steps) {
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
                });
            }
        }
    }

    return { data: results };
}

export async function gradeSubmission(
    submissionId: string,
    data: {
        gradingMode: 'score' | 'rubric' | 'complete';
        score?: number | null;
        feedback?: string | null;
        rubricScores?: Record<string, number>;
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

    // Upsert individual rows for each member
    const rows = members.map((m: { student_id: string }) => ({
        student_id: m.student_id,
        step_id: sub.step_id,
        group_id: sub.group_id,
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
    }));

    const { error } = await admin
        .from("activity_submissions")
        .upsert(rows, { onConflict: "student_id,step_id" });

    if (error) return { error: error.message };

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true, propagated: members.length };
}

// ─── Coevaluación — acciones del profesor ────────────────────────────────────

/**
 * Generates balanced peer evaluation assignments for a step.
 * Each submission is assigned to `submissionsPerEvaluator` different evaluators.
 * Skips re-generation if assignments already exist for this step.
 */
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
        .select("content")
        .eq("id", stepId)
        .single();
    if (!step) return { error: "Paso no encontrado." };

    const content = step.content as any;
    const mode = content?.mode ?? "individual";
    const sourceStepId = content?.sourceStepId as string | undefined;
    if (!sourceStepId) return { error: "El paso de coevaluación no tiene un entregable fuente configurado." };

    const submissionsPerEvaluator = content?.submissionsPerEvaluator ?? 2;

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

        // Fetch evaluators: enrolled students in this module
        const { data: enrollments } = await admin
            .from("module_enrollments")
            .select("student_id")
            .eq("module_id", moduleId);

        const evaluatorIds = (enrollments ?? []).map((e: any) => e.student_id as string);
        if (evaluatorIds.length === 0) return { error: "No hay alumnos matriculados." };

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

    // Group mode: each group evaluates all other groups
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

    const rows: { step_id: string; evaluator_group_id: string; target_submission_id: string }[] = [];
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

    if (rows.length === 0) return { error: "No fue posible generar asignaciones de grupo." };

    const { error } = await admin.from("peer_evaluation_assignments").insert(rows);
    if (error) return { error: error.message };

    revalidatePath("/dashboard/units/[id]", "layout");
    return { generated: rows.length };
}

/**
 * Returns all peer evaluation results for the teacher view.
 */
export async function getPeerEvaluationResults(stepId: string): Promise<{
    assignments?: any[];
    error?: string;
}> {
    const auth = await requireTeacher();
    if ("error" in auth) return { error: auth.error };

    const { data, error } = await auth.admin
        .from("peer_evaluation_assignments")
        .select(`
            id, evaluator_id, evaluator_group_id, target_submission_id, eval_submission_id,
            reliability_score, is_outlier, calibration_score,
            evaluator:profiles!evaluator_id(id, full_name),
            evaluator_group:module_groups!evaluator_group_id(id, name),
            target_submission:activity_submissions!target_submission_id(
                id, student_id, group_id, score,
                student:profiles!student_id(full_name),
                group:module_groups!group_id(name)
            ),
            eval_submission:activity_submissions!eval_submission_id(
                id, self_eval_rubric_scores, self_eval_justifications, files
            )
        `)
        .eq("step_id", stepId)
        .order("created_at");

    if (error) return { error: error.message };
    return { assignments: data ?? [] };
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
        .select("content, phase:activity_phases(activity:activities(unit:units(module_id)))")
        .eq("id", stepId)
        .single();
    if (!step) return { error: "Paso no encontrado." };

    const content = step.content as any;
    const peerWeight = (content?.peerWeight ?? 30) / 100;
    const nonEvaluatorPolicy = content?.nonEvaluatorPolicy ?? "fallback_teacher";
    const penaltyPoints = content?.nonEvaluatorPenaltyPoints ?? 0;
    const sourceStepId = content?.sourceStepId as string | undefined;
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

    const { error } = await permission.admin
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
        });

    if (error) return { error: error.message };

    revalidatePath("/dashboard/units/[id]", "layout");
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
        step_id: string | null;
        xp_reward: number;
    }>
) {
    const permission = await requireUnitPermission(unitId, "canEditModuleContent");
    if ("error" in permission) return { error: permission.error };

    const { error } = await permission.admin
        .from("class_badges")
        .update(data)
        .eq("id", badgeId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
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
            logo_url: activity.logo_url
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
                            xp_reward: step.xp_reward,
                            completion_mode: step.completion_mode,
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
                    logo_url: activity.logo_url
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
                                    xp_reward: step.xp_reward,
                                    completion_mode: step.completion_mode,
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
