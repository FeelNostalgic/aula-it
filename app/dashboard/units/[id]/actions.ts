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
    revalidatePath("/dashboard/units/[id]", "layout");
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

    revalidatePath("/dashboard/units/[id]", "layout");
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

    revalidatePath("/dashboard/units/[id]", "layout");
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

    revalidatePath("/dashboard/units/[id]", "layout");
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

    revalidatePath("/dashboard/units/[id]", "layout");
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

    revalidatePath("/dashboard/units/[id]", "layout");
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

    revalidatePath("/dashboard/units/[id]", "layout");
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

    revalidatePath("/dashboard/units/[id]", "layout");
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

    revalidatePath("/dashboard/units/[id]", "layout");
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
        short_answer_scores: Record<string, number>;
        short_answer_feedback: Record<string, string>;
        points_earned: number;
        points_total: number;
    } | null;
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
        .select("id, type, title, phase_id, content, is_locked, order_index")
        .in("type", ["deliverable", "file_upload", "quiz"])
        .in("phase_id", phaseIds)
        .order("order_index", { ascending: true });

    if (stepsError) return { error: stepsError.message };
    if (!steps || steps.length === 0) return { data: [] };

    const stepIds = steps.map(s => s.id);
    const stepMeta: Record<string, { title: string; stepType: import('@/types/activity').ActivityStepType; activityId: string; deliveryMode: 'manual' | 'teacher_copy' | undefined; rubric: import('@/types/activity').RubricCriteria[]; quizContent: import('@/types/activity').QuizContent | null; isLocked: boolean; orderIndex: number }> = {};
    for (const s of steps) {
        const stepType = (s as any).type as import('@/types/activity').ActivityStepType;
        stepMeta[s.id] = {
            title: s.title,
            stepType,
            activityId: phaseActivityMap[s.phase_id] ?? "",
            deliveryMode: (s.content as any)?.deliveryMode,
            rubric: (s.content as any)?.rubric ?? [],
            quizContent: stepType === 'quiz' ? ((s.content as any) as import('@/types/activity').QuizContent) : null,
            isLocked: (s as any).is_locked ?? false,
            orderIndex: (s as any).order_index ?? 0,
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
        .select("id, step_id, student_id, drive_file_url, drive_file_id, files, status, submitted_at, score, feedback, graded_at, published_at, rubric_scores, grading_mode, student:profiles(id, full_name)")
        .in("step_id", stepIds)
        .order("submitted_at", { ascending: false });

    if (subsError) return { error: subsError.message };

    // Step 5: get best quiz attempt per (student, step) for quiz steps
    const quizStepIds = stepIds.filter(id => stepMeta[id]?.stepType === 'quiz');
    const quizAttemptMap: Record<string, Record<string, any>> = {}; // stepId → studentId → attempt
    if (quizStepIds.length > 0) {
        const { data: attempts } = await supabase
            .from("quiz_attempts")
            .select("*")
            .in("step_id", quizStepIds)
            .order("points_earned", { ascending: false });

        for (const att of attempts ?? []) {
            if (!quizAttemptMap[att.step_id]) quizAttemptMap[att.step_id] = {};
            // Keep only best attempt per student (already ordered by points_earned DESC)
            if (!quizAttemptMap[att.step_id][att.student_id]) {
                quizAttemptMap[att.step_id][att.student_id] = att;
            }
        }
    }

    const rows: StepSubmissionRow[] = (subs || []).map((row: any) => {
        const meta = stepMeta[row.step_id];
        const bestAttempt = quizAttemptMap[row.step_id]?.[row.student_id] ?? null;
        return {
            id: row.id,
            step_id: row.step_id,
            step_title: meta?.title ?? "—",
            step_type: meta?.stepType ?? "deliverable",
            activity_id: meta?.activityId ?? "",
            activity_title: activityTitles[meta?.activityId ?? ""] ?? "—",
            student_id: row.student_id,
            student_name: row.student?.full_name ?? null,
            student_email: row.student_id,
            drive_file_url: row.drive_file_url,
            drive_file_id: row.drive_file_id ?? null,
            files: row.files ?? null,
            status: row.status,
            submitted_at: row.submitted_at,
            delivery_mode: meta?.deliveryMode,
            score: row.score ?? null,
            feedback: row.feedback ?? null,
            graded_at: row.graded_at ?? null,
            published_at: row.published_at ?? null,
            rubric_scores: row.rubric_scores ?? null,
            grading_mode: row.grading_mode ?? null,
            step_rubric: meta?.rubric ?? [],
            quiz_content: meta?.quizContent ?? null,
            step_is_locked: meta?.isLocked ?? false,
            quiz_attempt: bestAttempt ? {
                id: bestAttempt.id,
                attempt_number: bestAttempt.attempt_number,
                answers: bestAttempt.answers,
                short_answers: bestAttempt.short_answers,
                short_answer_scores: bestAttempt.short_answer_scores ?? {},
                short_answer_feedback: bestAttempt.short_answer_feedback ?? {},
                points_earned: bestAttempt.points_earned,
                points_total: bestAttempt.points_total,
            } : null,
        };
    });

    // Inject synthetic rows for enrolled students without a real submission
    if (students && students.length > 0) {
        for (const step of steps) {
            const meta = stepMeta[step.id];
            for (const student of students) {
                const hasRow = rows.some(r => r.step_id === step.id && r.student_id === student.student_id);
                if (!hasRow) {
                    rows.push({
                        id: `synthetic-${step.id}-${student.student_id}`,
                        step_id: step.id,
                        step_title: meta?.title ?? "—",
                        step_type: meta?.stepType ?? "deliverable",
                        activity_id: meta?.activityId ?? "",
                        activity_title: activityTitles[meta?.activityId ?? ""] ?? "—",
                        student_id: student.student_id,
                        student_name: student.name,
                        student_email: student.student_id,
                        drive_file_url: null,
                        drive_file_id: null,
                        files: null,
                        status: "pending",
                        submitted_at: null,
                        delivery_mode: meta?.deliveryMode,
                        score: null,
                        feedback: null,
                        graded_at: null,
                        published_at: null,
                        rubric_scores: null,
                        grading_mode: null,
                        step_rubric: meta?.rubric ?? [],
                        quiz_content: meta?.quizContent ?? null,
                        step_is_locked: meta?.isLocked ?? false,
                        quiz_attempt: null,
                        synthetic: true,
                    });
                }
            }
        }
    }

    return { data: rows };
}

export async function saveQuizShortAnswerScores(
    attemptId: string,
    shortAnswerScores: Record<string, number>, // questionId → manual points
    shortAnswerFeedback: Record<string, string>, // questionId → teacher feedback
    autoPointsEarned: number,
): Promise<{ success?: boolean; error?: string }> {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Solo profesores." };

    const manualPoints = Object.values(shortAnswerScores).reduce((a, b) => a + b, 0);
    const totalEarned = autoPointsEarned + manualPoints;

    const admin = createAdminClient();
    const { error } = await admin
        .from("quiz_attempts")
        .update({ points_earned: totalEarned, short_answer_scores: shortAnswerScores, short_answer_feedback: shortAnswerFeedback })
        .eq("id", attemptId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function reopenSubmission(submissionId: string): Promise<{ success?: boolean; error?: string; warning?: 'deadline_passed' | 'step_locked' | null }> {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Solo profesores." };

    const admin = createAdminClient();

    // Get submission's step to check deadline + lock status
    const { data: submission } = await admin
        .from("activity_submissions")
        .select("step_id")
        .eq("id", submissionId)
        .single();

    let warning: 'deadline_passed' | 'step_locked' | null = null;
    if (submission?.step_id) {
        const { data: step } = await admin
            .from("activity_steps")
            .select("due_date, is_activity_closed")
            .eq("id", submission.step_id)
            .single();
        if (step?.is_activity_closed) warning = 'step_locked';
        else if (step?.due_date && new Date(step.due_date) < new Date()) warning = 'deadline_passed';
    }

    const { error } = await admin
        .from("activity_submissions")
        .update({ status: "submitted", graded_at: null, published_at: null })
        .eq("id", submissionId);

    if (error) return { error: error.message };
    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true, warning };
}

export async function publishSubmissionGrade(submissionId: string): Promise<{ success?: boolean; error?: string }> {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Solo profesores." };

    const admin = createAdminClient();
    const { error } = await admin
        .from("activity_submissions")
        .update({ published_at: new Date().toISOString(), status: "published" })
        .eq("id", submissionId);

    if (error) return { error: error.message };
    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function publishAllGradesForStep(stepId: string): Promise<{ success?: boolean; count?: number; error?: string }> {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Solo profesores." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("activity_submissions")
        .update({ published_at: new Date().toISOString(), status: "published" })
        .eq("step_id", stepId)
        .eq("status", "graded")
        .select("id");

    if (error) return { error: error.message };
    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true, count: data?.length ?? 0 };
}

export async function updateStepWeight(stepId: string, weight: number): Promise<{ success?: boolean; error?: string }> {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Solo profesores." };

    const { error } = await userClient
        .from("activity_steps")
        .update({ grade_weight: weight })
        .eq("id", stepId);

    if (error) return { error: error.message };
    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
}

export async function updateActivityWeight(activityId: string, weight: number): Promise<{ success?: boolean; error?: string }> {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Solo profesores." };

    const { error } = await userClient
        .from("activities")
        .update({ grade_weight: weight })
        .eq("id", activityId);

    if (error) return { error: error.message };
    revalidatePath("/dashboard/units/[id]", "layout");
    return { success: true };
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
            
            revalidatePath("/dashboard/units/[id]", "layout");
        }
    }

    revalidatePath("/dashboard/units/[id]", "layout");
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

    revalidatePath("/dashboard/units/[id]", "layout");
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

    revalidatePath("/dashboard/units/[id]", "layout");
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

    revalidatePath("/dashboard/units/[id]", "layout");
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

    revalidatePath("/dashboard/units/[id]", "layout");
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

    revalidatePath("/dashboard/units/[id]", "layout");
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

