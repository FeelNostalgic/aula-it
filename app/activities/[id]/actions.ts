"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { ActivitySubmission, QuizContent, QuizStructuredAnswers, SubmissionFile, QuizAttempt } from "@/types/activity";
import { selectQuestionsForAttempt } from "@/lib/quiz-pool-selection";
import { scoreQuizAttempt } from "@/lib/quiz-core";

const DRIVE_URL_REGEX = /^https:\/\/(docs|drive|sheets|slides|forms)\.google\.com\//;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves the group_id for a step submission when the step is configured as
 * is_group_submission. Returns null for individual steps.
 * Uses admin client to avoid RLS recursion on module_group_members.
 */
async function resolveGroupId(
    userId: string,
    stepId: string,
): Promise<{ groupId: string | null; isGroupSubmission: boolean }> {
    const admin = createAdminClient();

    const { data: stepRow } = await admin
        .from("activity_steps")
        .select("content, phase:activity_phases(activity:activities(unit:units(module_id)))")
        .eq("id", stepId)
        .single();

    const isGroupSubmission = (stepRow?.content as any)?.is_group_submission === true;
    if (!isGroupSubmission) return { groupId: null, isGroupSubmission: false };

    const moduleId = (stepRow?.phase as any)?.activity?.unit?.module_id as string | undefined;
    if (!moduleId) return { groupId: null, isGroupSubmission: true };

    const { data: moduleGroups } = await admin
        .from("module_groups")
        .select("id")
        .eq("module_id", moduleId)
        .eq("status", "active");

    const moduleGroupIds = (moduleGroups ?? []).map((g: any) => g.id);
    if (!moduleGroupIds.length) return { groupId: null, isGroupSubmission: true };

    const { data: memberRow } = await admin
        .from("module_group_members")
        .select("group_id")
        .eq("student_id", userId)
        .in("group_id", moduleGroupIds)
        .maybeSingle();

    return { groupId: memberRow?.group_id ?? null, isGroupSubmission: true };
}

/**
 * Manual upsert for activity_submissions that works with partial unique indexes.
 * Partial indexes cannot be referenced by column name in onConflict — we do
 * SELECT + UPDATE or INSERT instead.
 */
async function upsertSubmission(
    payload: Record<string, unknown>,
    groupId: string | null,
    userId: string,
    stepId: string,
): Promise<{ data?: ActivitySubmission; error?: string }> {
    const admin = createAdminClient();

    const query = groupId
        ? admin.from("activity_submissions").select("id").eq("group_id", groupId).eq("step_id", stepId)
        : admin.from("activity_submissions").select("id").eq("student_id", userId).eq("step_id", stepId).is("group_id", null);

    const { data: existing } = await query.maybeSingle();

    const op = existing?.id
        ? admin.from("activity_submissions").update(payload).eq("id", existing.id)
        : admin.from("activity_submissions").insert(payload);

    const { data, error } = await op.select().single();
    if (error) return { error: error.message };
    return { data: data as ActivitySubmission };
}

export async function submitDeliverable(stepId: string, driveFileUrl: string, activityId: string) {
    if (!driveFileUrl || !DRIVE_URL_REGEX.test(driveFileUrl)) {
        return { error: "La URL debe ser un enlace de Google Drive o Google Docs válido." };
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "No autenticado." };

    // Deadline + lock check
    const { data: step } = await supabase
        .from("activity_steps")
        .select("due_date, is_activity_closed")
        .eq("id", stepId)
        .single();
    if (step?.is_activity_closed) return { error: "Las entregas están cerradas para este paso." };
    if (step?.due_date && new Date(step.due_date) < new Date()) {
        const { data: ext } = await supabase
            .from("deadline_extensions")
            .select("extended_until")
            .eq("student_id", user.id).eq("step_id", stepId).single();
        if (!ext || new Date(ext.extended_until) < new Date()) {
            return { error: "El plazo de entrega ha finalizado." };
        }
    }

    const { groupId } = await resolveGroupId(user.id, stepId);

    const result = await upsertSubmission(
        {
            student_id: user.id,
            group_id: groupId ?? null,
            step_id: stepId,
            drive_file_url: driveFileUrl,
            status: "submitted",
            submitted_at: new Date().toISOString(),
        },
        groupId,
        user.id,
        stepId,
    );

    if (result.error) return { error: result.error };
    revalidatePath(`/activities/${activityId}`);
    return { data: result.data };
}

export async function submitFileUpload(
    stepId: string,
    activityId: string,
    driveFileUrl: string,
    driveFileId: string,
    driveFileName: string,
    driveMimeType: string
) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "No autenticado." };

    // Deadline + lock check
    const { data: step } = await supabase
        .from("activity_steps")
        .select("due_date, is_activity_closed")
        .eq("id", stepId)
        .single();
    if (step?.is_activity_closed) return { error: "Las entregas están cerradas para este paso." };
    if (step?.due_date && new Date(step.due_date) < new Date()) {
        const { data: ext } = await supabase
            .from("deadline_extensions")
            .select("extended_until")
            .eq("student_id", user.id).eq("step_id", stepId).single();
        if (!ext || new Date(ext.extended_until) < new Date()) {
            return { error: "El plazo de entrega ha finalizado." };
        }
    }

    const { groupId } = await resolveGroupId(user.id, stepId);

    const result = await upsertSubmission(
        {
            student_id: user.id,
            group_id: groupId ?? null,
            step_id: stepId,
            drive_file_url: driveFileUrl,
            drive_file_id: driveFileId,
            drive_file_name: driveFileName,
            drive_mime_type: driveMimeType,
            status: "submitted",
            submitted_at: new Date().toISOString(),
        },
        groupId,
        user.id,
        stepId,
    );

    if (result.error) return { error: result.error };
    revalidatePath(`/activities/${activityId}`);
    return { data: result.data };
}

export async function submitFileUploadMulti(
    stepId: string,
    activityId: string,
    files: SubmissionFile[]
): Promise<{ data?: ActivitySubmission; error?: string }> {
    if (!files.length) return { error: "Se requiere al menos un archivo." };

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "No autenticado." };

    const { data: step } = await supabase
        .from("activity_steps")
        .select("due_date, is_activity_closed")
        .eq("id", stepId)
        .single();
    if (step?.is_activity_closed) return { error: "Las entregas están cerradas para este paso." };
    if (step?.due_date && new Date(step.due_date) < new Date()) {
        const { data: ext } = await supabase
            .from("deadline_extensions")
            .select("extended_until")
            .eq("student_id", user.id).eq("step_id", stepId).single();
        if (!ext || new Date(ext.extended_until) < new Date()) {
            return { error: "El plazo de entrega ha finalizado." };
        }
    }

    const { groupId } = await resolveGroupId(user.id, stepId);

    const first = files[0];
    const result = await upsertSubmission(
        {
            student_id: user.id,
            group_id: groupId ?? null,
            step_id: stepId,
            drive_file_url: first.driveFileUrl,
            drive_file_id: first.driveFileId,
            drive_file_name: first.driveFileName,
            drive_mime_type: first.driveMimeType,
            files: files,
            status: "submitted",
            submitted_at: new Date().toISOString(),
        },
        groupId,
        user.id,
        stepId,
    );

    if (result.error) return { error: result.error };
    revalidatePath(`/activities/${activityId}`);
    return { data: result.data };
}

export async function getStudentSubmissionsForActivity(activityId: string): Promise<Record<string, ActivitySubmission>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    // Get all step IDs for this activity + module_id
    const { data: activityRow } = await supabase
        .from("activities")
        .select("unit:units(module_id)")
        .eq("id", activityId)
        .single();
    const moduleId = (activityRow?.unit as any)?.module_id as string | undefined;

    const { data: phases } = await supabase
        .from("activity_phases")
        .select("steps:activity_steps(id, type)")
        .eq("activity_id", activityId);

    if (!phases) return {};

    const allStepIds = phases.flatMap((p: any) =>
        (p.steps || []).map((s: any) => s.id)
    );
    if (allStepIds.length === 0) return {};

    // Individual submissions
    const { data: submissions } = await supabase
        .from("activity_submissions")
        .select("*")
        .eq("student_id", user.id)
        .in("step_id", allStepIds);

    const map: Record<string, ActivitySubmission> = {};
    for (const sub of submissions || []) {
        map[sub.step_id] = sub as ActivitySubmission;
    }

    // Group submissions — only if the student belongs to a group in this module
    if (moduleId) {
        const admin = createAdminClient();
        const { data: moduleGroups } = await admin
            .from("module_groups")
            .select("id")
            .eq("module_id", moduleId)
            .eq("status", "active");
        const moduleGroupIds = (moduleGroups ?? []).map((g: any) => g.id);

        let groupId: string | undefined;
        if (moduleGroupIds.length > 0) {
            const { data: memberRow } = await admin
                .from("module_group_members")
                .select("group_id")
                .eq("student_id", user.id)
                .in("group_id", moduleGroupIds)
                .maybeSingle();
            groupId = memberRow?.group_id ?? undefined;
        }
        if (groupId) {
            const { data: groupSubs } = await supabase
                .from("activity_submissions")
                .select("*")
                .eq("group_id", groupId)
                .in("step_id", allStepIds);

            for (const sub of groupSubs || []) {
                // Only fill in steps not already covered by individual submission
                if (!map[sub.step_id]) {
                    map[sub.step_id] = sub as ActivitySubmission;
                }
            }
        }
    }

    return map;
}

export async function markStepViewed(stepId: string, activityId: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "No autenticado." };

    const { error } = await supabase
        .from("step_views")
        .upsert(
            {
                student_id: user.id,
                step_id: stepId,
                viewed_at: new Date().toISOString(),
            },
            { onConflict: "student_id,step_id", ignoreDuplicates: true }
        );

    if (error) return { error: error.message };

    revalidatePath(`/activities/${activityId}`);
    return { success: true };
}

export async function getQuizAttempts(stepId: string): Promise<QuizAttempt[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("student_id", user.id)
        .eq("step_id", stepId)
        .order("attempt_number", { ascending: true });

    return (data ?? []) as QuizAttempt[];
}

export async function submitQuizAttempt(
    stepId: string,
    activityId: string,
    answers: Record<string, string[]>,
    shortAnswers: Record<string, string>,
    structuredAnswers: QuizStructuredAnswers,
    content: QuizContent
): Promise<{ data?: { attempt: QuizAttempt; score: number; pointsEarned: number; pointsTotal: number }; error?: string }> {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "No autenticado." };

    // Check if activity is closed
    const { data: step } = await supabase
        .from("activity_steps")
        .select("is_activity_closed, is_lockdown")
        .eq("id", stepId)
        .single();
    if (step?.is_activity_closed) return { error: "Las entregas de esta actividad están cerradas." };

    // Check max attempts
    const { count } = await supabase
        .from("quiz_attempts")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("step_id", stepId);

    const attemptCount = count ?? 0;
    if (content.maxAttempts && attemptCount >= content.maxAttempts) {
        return { error: `Máximo de intentos alcanzado (${content.maxAttempts}).` };
    }

    // Resolve bank questions server-side for scoring and storage
    let resolvedQuestions = content.questions ?? [];
    if (content.bankSelections?.length) {
        const admin = createAdminClient();
        const bankIds = content.bankSelections.map((s: any) => s.bankId);
        const { data: banks } = await admin
            .from('question_banks')
            .select('id, questions')
            .in('id', bankIds);
        const bankMap: Record<string, any[]> = {};
        for (const bank of banks ?? []) bankMap[bank.id] = bank.questions ?? [];
        resolvedQuestions = selectQuestionsForAttempt(content, bankMap, user.id, stepId, attemptCount + 1);
    }

    const scoreSummary = scoreQuizAttempt(
        resolvedQuestions,
        {
            answers,
            shortAnswers,
            structuredAnswers,
        },
        !!content.penalizeWrongAnswers,
    );
    const pointsEarned = scoreSummary.pointsEarned;
    const pointsTotal = scoreSummary.pointsTotal;

    const attemptNumber = attemptCount + 1;

    const { data: attempt, error: insertError } = await supabase
        .from("quiz_attempts")
        .insert({
            student_id: user.id,
            step_id: stepId,
            attempt_number: attemptNumber,
            answers,
            short_answers: shortAnswers,
            structured_answers: structuredAnswers,
            points_earned: pointsEarned,
            points_total: pointsTotal,
            resolved_questions: resolvedQuestions,
        })
        .select()
        .single();

    if (insertError) return { error: insertError.message };

    // Upsert activity_submissions — only update if this score >= current best
    const scoreOutOf10 = pointsTotal > 0 ? Math.round((pointsEarned / pointsTotal) * 1000) / 100 : 0;

    // Needs review if: has short-answer questions OR teacher explicitly hides grades from students
    const needsReview = scoreSummary.hasShortAnswer || content.showCorrectAnswers === false || step?.is_lockdown === true;

    const { data: existing } = await supabase
        .from("activity_submissions")
        .select("id, score")
        .eq("student_id", user.id)
        .eq("step_id", stepId)
        .maybeSingle();

    const shouldUpdateScore = !existing || existing.score === null || scoreOutOf10 >= (existing.score ?? 0);

    if (shouldUpdateScore) {
        const quizPayload = {
            student_id: user.id,
            step_id: stepId,
            status: needsReview ? "submitted" : "graded",
            submitted_at: new Date().toISOString(),
            ...(needsReview ? {} : {
                score: scoreOutOf10,
                grading_mode: "score",
                graded_at: new Date().toISOString(),
            }),
        };
        if (existing?.id) {
            await supabase.from("activity_submissions").update(quizPayload).eq("id", existing.id);
        } else {
            await supabase.from("activity_submissions").insert(quizPayload);
        }
    } else if (!existing) {
        await supabase
            .from("activity_submissions")
            .insert({
                student_id: user.id,
                step_id: stepId,
                status: needsReview ? "submitted" : "graded",
                submitted_at: new Date().toISOString(),
            });
    }

    revalidatePath(`/activities/${activityId}`);
    return { data: { attempt: attempt as QuizAttempt, score: scoreOutOf10, pointsEarned, pointsTotal } };
}

export async function getStepSubmissions(stepId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };

    const { data, error } = await supabase
        .from("activity_submissions")
        .select(`
            *,
            student:profiles(id, full_name, avatar_url)
        `)
        .eq("step_id", stepId)
        .order("submitted_at", { ascending: false });

    if (error) return { error: error.message };
    return { data };
}

export async function submitSelfEvaluation(
    stepId: string,
    activityId: string,
    rubricScores: Record<string, number>,
    justifications: Record<string, string>,
): Promise<{ error?: string }> {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "No autenticado." };

    const { data: step } = await supabase
        .from("activity_steps")
        .select("is_activity_closed, content")
        .eq("id", stepId)
        .single();
    if (step?.is_activity_closed) return { error: "Las entregas están cerradas para este paso." };

    const stepContent = step?.content as any;

    // Validate minJustificationLength for rubric mode
    if ((!stepContent?.evalMode || stepContent?.evalMode === 'rubric') && stepContent?.requireJustification && stepContent?.minJustificationLength) {
        const minLen = stepContent.minJustificationLength as number;
        const rubric: any[] = stepContent?.rubric ?? [];
        for (const c of rubric) {
            const just = (justifications[c.id] ?? "").trim();
            if (just.length < minLen) {
                return { error: `La justificación de "${c.name}" requiere al menos ${minLen} caracteres.` };
            }
        }
    }

    // Validate minLength for questions in questions mode
    if (stepContent?.evalMode === 'questions' && Array.isArray(stepContent?.questions)) {
        for (const q of stepContent.questions as any[]) {
            if (q.type === 'short_answer' && q.minLength) {
                const ans = (justifications[q.id] ?? "").trim();
                if (ans.length < q.minLength) {
                    return { error: `La pregunta "${q.text}" requiere al menos ${q.minLength} caracteres.` };
                }
            }
            if (q.type === 'likert' && q.requireJustification && q.minLength) {
                const just = (justifications[`${q.id}:justification`] ?? "").trim();
                if (just.length < q.minLength) {
                    return { error: `La justificación de "${q.text}" requiere al menos ${q.minLength} caracteres.` };
                }
            }
        }
    }

    const admin = createAdminClient();
    const { data: existingSelf } = await admin
        .from("activity_submissions")
        .select("id")
        .eq("student_id", user.id)
        .eq("step_id", stepId)
        .is("group_id", null)
        .maybeSingle();

    const selfPayload = {
        student_id: user.id,
        step_id: stepId,
        self_eval_rubric_scores: rubricScores,
        self_eval_justifications: justifications,
        status: "submitted",
        submitted_at: new Date().toISOString(),
    };

    const selfOp = existingSelf?.id
        ? admin.from("activity_submissions").update(selfPayload).eq("id", existingSelf.id)
        : admin.from("activity_submissions").insert(selfPayload);

    const { error } = await selfOp.select().single();

    if (error) return { error: error.message };
    revalidatePath(`/activities/${activityId}`);
    return {};
}

// ─── Coevaluación — acciones del alumno ──────────────────────────────────────

export type PeerAssignmentWithTarget = {
    id: string;
    step_id: string;
    evaluator_id: string | null;
    evaluator_group_id: string | null;
    target_submission_id: string;
    target_student_id: string | null;  // for intra_group mode
    eval_submission_id: string | null;
    target_submission: {
        id: string;
        drive_file_url: string | null;
        student_id: string | null;
        group_id: string | null;
        student?: { full_name: string | null } | null;
        group?: { name: string } | null;
    };
    target_student?: { full_name: string | null } | null;  // for intra_group mode
};

export async function getMyPeerAssignments(
    stepId: string,
): Promise<{ assignments?: PeerAssignmentWithTarget[]; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };

    // Get the student's group in this step's module (for group-mode assignments)
    const { data: stepRow } = await supabase
        .from("activity_steps")
        .select("phase:activity_phases(activity:activities(unit:units(module_id)))")
        .eq("id", stepId)
        .single();
    const moduleId = (stepRow?.phase as any)?.activity?.unit?.module_id as string | undefined;

    let groupId: string | null = null;
    if (moduleId) {
        const admin = createAdminClient();
        const { data: moduleGroups } = await admin
            .from("module_groups")
            .select("id")
            .eq("module_id", moduleId)
            .eq("status", "active");
        const moduleGroupIds = (moduleGroups ?? []).map((g: any) => g.id);
        if (moduleGroupIds.length > 0) {
            const { data: memberRow } = await admin
                .from("module_group_members")
                .select("group_id")
                .eq("student_id", user.id)
                .in("group_id", moduleGroupIds)
                .maybeSingle();
            groupId = memberRow?.group_id ?? null;
        }
    }

    // Fetch individual + group assignments
    const orFilter = groupId
        ? `evaluator_id.eq.${user.id},evaluator_group_id.eq.${groupId}`
        : `evaluator_id.eq.${user.id}`;

    const { data, error } = await supabase
        .from("peer_evaluation_assignments")
        .select(`
            id, step_id, evaluator_id, evaluator_group_id, target_submission_id, target_student_id, eval_submission_id,
            target_submission:activity_submissions!target_submission_id(
                id, drive_file_url, student_id, group_id,
                student:profiles!student_id(full_name),
                group:module_groups!group_id(name)
            ),
            target_student:profiles!target_student_id(full_name)
        `)
        .eq("step_id", stepId)
        .or(orFilter)
        .order("created_at");

    if (error) return { error: error.message };
    return { assignments: (data ?? []) as unknown as PeerAssignmentWithTarget[] };
}

export async function submitPeerEvaluation(
    assignmentId: string,
    activityId: string,
    rubricScores: Record<string, number>,
    justifications: Record<string, string>,
    qaNotes?: string,
): Promise<{ error?: string }> {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "No autenticado." };

    // Verify the assignment belongs to this evaluator
    const { data: assignment } = await supabase
        .from("peer_evaluation_assignments")
        .select("id, step_id, evaluator_id, evaluator_group_id, target_submission_id")
        .eq("id", assignmentId)
        .single();

    if (!assignment) return { error: "Asignación no encontrada." };
    if (assignment.evaluator_id && assignment.evaluator_id !== user.id) {
        return { error: "No autorizado." };
    }

    // Create/update the peer eval submission
    const { data: existing } = await supabase
        .from("activity_submissions")
        .select("id")
        .eq("student_id", user.id)
        .eq("step_id", assignment.step_id)
        .maybeSingle();

    let evalSubmissionId: string;

    const filesPayload = qaNotes ? [{ qaNotes }] : null;

    if (existing) {
        await supabase
            .from("activity_submissions")
            .update({
                self_eval_rubric_scores: rubricScores,
                self_eval_justifications: justifications,
                files: filesPayload,
                status: "submitted",
                submitted_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        evalSubmissionId = existing.id;
    } else {
        const { data: newSub } = await supabase
            .from("activity_submissions")
            .insert({
                student_id: user.id,
                step_id: assignment.step_id,
                self_eval_rubric_scores: rubricScores,
                self_eval_justifications: justifications,
                files: filesPayload,
                status: "submitted",
                submitted_at: new Date().toISOString(),
            })
            .select("id")
            .single();
        evalSubmissionId = newSub!.id;
    }

    // Link back to the assignment
    await supabase
        .from("peer_evaluation_assignments")
        .update({ eval_submission_id: evalSubmissionId })
        .eq("id", assignmentId);

    revalidatePath(`/activities/${activityId}`);
    return {};
}

/**
 * Returns peer feedback received by the current student for a given step.
 * Only returns data when peerFeedbackVisibleToStudents is true in step content.
 * Evaluator identity is never exposed.
 */
export async function getMyReceivedPeerFeedback(stepId: string): Promise<{
    items?: {
        rubricScores: Record<string, number>;
        justifications: Record<string, string>;
    }[];
    visible?: boolean;
    error?: string;
}> {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    // Check step content visibility flag
    const { data: step } = await supabase
        .from("activity_steps")
        .select("content, parent_step_id")
        .eq("id", stepId)
        .single();

    const content = step?.content as any;
    if (!content?.peerFeedbackVisibleToStudents) return { visible: false, items: [] };

    const sourceStepId = ((step as any)?.parent_step_id ?? content?.sourceStepId) as string | undefined;
    if (!sourceStepId) return { visible: false, items: [] };

    // Find student's submission on the source step
    const { data: sourceSub } = await supabase
        .from("activity_submissions")
        .select("id")
        .eq("step_id", sourceStepId)
        .eq("student_id", user.id)
        .maybeSingle();

    if (!sourceSub) return { visible: true, items: [] };

    // Fetch assignments where this student's submission is the target — no evaluator_id exposed
    const { data: assignments } = await supabase
        .from("peer_evaluation_assignments")
        .select(`
            eval_submission:activity_submissions!eval_submission_id(
                self_eval_rubric_scores, self_eval_justifications
            )
        `)
        .eq("step_id", stepId)
        .eq("target_submission_id", sourceSub.id)
        .not("eval_submission_id", "is", null);

    const items = (assignments ?? [])
        .map((a: any) => a.eval_submission)
        .filter(Boolean)
        .map((es: any) => ({
            rubricScores: (es.self_eval_rubric_scores ?? {}) as Record<string, number>,
            justifications: (es.self_eval_justifications ?? {}) as Record<string, string>,
        }));

    return { visible: true, items };
}
