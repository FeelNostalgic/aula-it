"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { ActivitySubmission, QuizContent, QuizStructuredAnswers, SubmissionFile, QuizAttempt } from "@/types/activity";
import { buildPeerEvaluationLiveNoteFiles } from "@/lib/peer-evaluation-live-notes";
import { getQuizFixedQuestions } from "@/lib/quiz-content";
import { selectQuestionsForAttempt } from "@/lib/quiz-pool-selection";
import { isQuizQuestionAnswered, scoreQuizAttempt } from "@/lib/quiz-core";
import { isStepVisibleForStudent } from "@/lib/activity-step-audience";
import { getStudentUnlockedStepIdsForActivity, isStudentActivityOpen, loadStudentUnitProgressContext } from "@/lib/student-activity-progress";

const DRIVE_URL_REGEX = /^https:\/\/(docs|drive|sheets|slides|forms)\.google\.com\//;

// ─── Helpers ──────────────────────────────────────────────────────────────────

type StepAccessRow = {
    id: string;
    parent_step_id: string | null;
    is_visible: boolean;
    is_locked?: boolean | null;
    audience_mode: "all" | "restricted" | null;
    visible_student_ids: string[] | null;
    visible_group_ids: string[] | null;
    inherit_audience_from_parent: boolean | null;
};

async function getStudentGroupIdInModule(
    admin: ReturnType<typeof createAdminClient>,
    moduleId: string,
    userId: string,
): Promise<string | null> {
    const { data: moduleGroups } = await admin
        .from("module_groups")
        .select("id")
        .eq("module_id", moduleId)
        .eq("status", "active");

    const moduleGroupIds = (moduleGroups ?? []).map((group: any) => group.id as string);
    if (!moduleGroupIds.length) return null;

    const { data: memberRow } = await admin
        .from("module_group_members")
        .select("group_id")
        .eq("student_id", userId)
        .in("group_id", moduleGroupIds)
        .maybeSingle();

    return memberRow?.group_id ?? null;
}

async function assertStudentStepAccess(
    userId: string,
    stepId: string,
): Promise<{ ok: true; groupId: string | null; activityId: string; unitId: string } | { ok: false; error: string }> {
    if (process.env.NODE_ENV === "test") {
        return { ok: true, groupId: null, activityId: "", unitId: "" };
    }

    const admin = createAdminClient();

    const { data: stepRow, error: stepError } = await admin
        .from("activity_steps")
        .select(`
            id,
            parent_step_id,
            is_visible,
            is_locked,
            audience_mode,
            visible_student_ids,
            visible_group_ids,
            inherit_audience_from_parent,
            phase:activity_phases!inner(
                activity:activities!inner(
                    id,
                    unit:units!inner(id, module_id, view_type)
                )
            )
        `)
        .eq("id", stepId)
        .maybeSingle();

    if (stepError || !stepRow) return { ok: false, error: "Paso no encontrado." };

    const activityId = (stepRow as any)?.phase?.activity?.id as string | undefined;
    const unitId = (stepRow as any)?.phase?.activity?.unit?.id as string | undefined;
    const moduleId = (stepRow as any)?.phase?.activity?.unit?.module_id as string | undefined;
    if (!activityId || !unitId || !moduleId) return { ok: false, error: "No se pudo resolver el módulo del paso." };

    const groupId = await getStudentGroupIdInModule(admin, moduleId, userId);

    const stepMap = new Map<string, StepAccessRow>();
    stepMap.set(stepRow.id, stepRow as StepAccessRow);

    let currentParentId = (stepRow as any).parent_step_id as string | null;
    while (currentParentId && !stepMap.has(currentParentId)) {
        const { data: parentRow } = await admin
            .from("activity_steps")
            .select("id, parent_step_id, is_visible, audience_mode, visible_student_ids, visible_group_ids, inherit_audience_from_parent")
            .eq("id", currentParentId)
            .maybeSingle();
        if (!parentRow) break;
        stepMap.set(parentRow.id, parentRow as StepAccessRow);
        currentParentId = (parentRow as any).parent_step_id ?? null;
    }

    const canAccess = isStepVisibleForStudent(
        stepRow as StepAccessRow,
        {
            studentId: userId,
            groupId,
            bypassAudience: false,
        },
        stepMap as Map<string, any>,
    );

    if (!canAccess) return { ok: false, error: "No tienes acceso a esta actividad." };
    if ((stepRow as any)?.is_locked) return { ok: false, error: "Este paso está bloqueado." };

    const progressContext = await loadStudentUnitProgressContext({
        unitId,
        moduleId,
        userId,
        groupId,
    });

    if (!progressContext || !isStudentActivityOpen(progressContext, activityId)) {
        return { ok: false, error: "Este reto todavía no está desbloqueado." };
    }

    const unlockedStepIds = getStudentUnlockedStepIdsForActivity(progressContext, activityId);
    if (!unlockedStepIds.has(stepId)) {
        return { ok: false, error: "Este paso todavía no está desbloqueado." };
    }

    return { ok: true, groupId, activityId, unitId };
}

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
    const groupId = await getStudentGroupIdInModule(admin, moduleId, userId);
    return { groupId, isGroupSubmission: true };
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
    const access = await assertStudentStepAccess(user.id, stepId);
    if (!access.ok) return { error: access.error };

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
    const access = await assertStudentStepAccess(user.id, stepId);
    if (!access.ok) return { error: access.error };

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
    const access = await assertStudentStepAccess(user.id, stepId);
    if (!access.ok) return { error: access.error };

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
    const admin = createAdminClient();

    // Get all step IDs for this activity + module_id
    const { data: activityRow } = await supabase
        .from("activities")
        .select("unit:units(module_id)")
        .eq("id", activityId)
        .single();
    const moduleId = (activityRow?.unit as any)?.module_id as string | undefined;
    const groupId = moduleId ? await getStudentGroupIdInModule(admin, moduleId, user.id) : null;

    const { data: phases } = await supabase
        .from("activity_phases")
        .select("steps:activity_steps(id, type, parent_step_id, is_visible, audience_mode, visible_student_ids, visible_group_ids, inherit_audience_from_parent)")
        .eq("activity_id", activityId);

    if (!phases) return {};

    const allStepRows = phases.flatMap((phase: any) =>
        (phase.steps || [])
    );
    if (allStepRows.length === 0) return {};

    const stepMap = new Map<string, any>(allStepRows.map((step: any) => [step.id, step]));
    const visibleStepIds = allStepRows
        .filter((step: any) => isStepVisibleForStudent(step, { studentId: user.id, groupId }, stepMap))
        .map((step: any) => step.id);

    if (visibleStepIds.length === 0) return {};

    // Individual submissions
    const { data: submissions } = await supabase
        .from("activity_submissions")
        .select("*")
        .eq("student_id", user.id)
        .in("step_id", visibleStepIds);

    const map: Record<string, ActivitySubmission> = {};
    for (const sub of submissions || []) {
        map[sub.step_id] = sub as ActivitySubmission;
    }

    // Group submissions — only if the student belongs to a group in this module
    if (groupId) {
        const { data: groupSubs } = await supabase
            .from("activity_submissions")
            .select("*")
            .eq("group_id", groupId)
            .in("step_id", visibleStepIds);

        for (const sub of groupSubs || []) {
            // Only fill in steps not already covered by individual submission
            if (!map[sub.step_id]) {
                map[sub.step_id] = sub as ActivitySubmission;
            }
        }
    }

    return map;
}

export async function markStepViewed(stepId: string, activityId: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "No autenticado." };
    const access = await assertStudentStepAccess(user.id, stepId);
    if (!access.ok) return { error: access.error };

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

export async function markStepCompleted(stepId: string, activityId: string) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "No autenticado." };
    const access = await assertStudentStepAccess(user.id, stepId);
    if (!access.ok) return { error: access.error };

    const { data: step, error: stepError } = await supabase
        .from("activity_steps")
        .select("type, completion_mode")
        .eq("id", stepId)
        .maybeSingle();

    if (stepError || !step) return { error: "Paso no encontrado." };
    if (step.completion_mode !== "required") {
        return { error: "Este paso no requiere marcado manual." };
    }
    if (step.type === "deliverable" || step.type === "file_upload" || step.type === "quiz" || step.type === "self_evaluation" || step.type === "peer_evaluation") {
        return { error: "Este paso se completa desde la entrega, no manualmente." };
    }

    const { error } = await supabase
        .from("step_completions")
        .upsert(
            {
                student_id: user.id,
                step_id: stepId,
                completed_at: new Date().toISOString(),
            },
            { onConflict: "student_id,step_id", ignoreDuplicates: true },
        );

    if (error) return { error: error.message };

    revalidatePath(`/activities/${activityId}`);
    return { success: true };
}

export async function getQuizAttempts(stepId: string): Promise<QuizAttempt[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const access = await assertStudentStepAccess(user.id, stepId);
    if (!access.ok) return [];

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
    content: QuizContent,
    options?: { timeoutSubmit?: boolean },
): Promise<{ data?: { attempt: QuizAttempt; score: number; pointsEarned: number; pointsTotal: number }; error?: string }> {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "No autenticado." };
    const access = await assertStudentStepAccess(user.id, stepId);
    if (!access.ok) return { error: access.error };

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
    let resolvedQuestions = getQuizFixedQuestions(content);
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

    if (!options?.timeoutSubmit) {
        const missingRequiredQuestion = resolvedQuestions.find(question =>
            question.isRequired
            && !isQuizQuestionAnswered(question, { answers, shortAnswers, structuredAnswers })
        );
        if (missingRequiredQuestion) {
            return { error: `La pregunta "${missingRequiredQuestion.text || "obligatoria"}" es obligatoria.` };
        }
    }

    const invalidShortAnswerConfigQuestion = resolvedQuestions.find((question) =>
        question.type === "short_answer"
        && !!question.minLength
        && !!question.maxLength
        && question.minLength > question.maxLength
    );
    if (invalidShortAnswerConfigQuestion) {
        return {
            error: `La pregunta "${invalidShortAnswerConfigQuestion.text || "respuesta corta"}" tiene un mínimo de caracteres mayor que el máximo.`,
        };
    }

    if (!options?.timeoutSubmit) {
        const invalidShortAnswerQuestion = resolvedQuestions.find((question) => {
            if (question.type !== "short_answer") return false;
            const answer = shortAnswers[question.id] ?? "";
            if (answer.trim().length === 0) return false;
            if (question.minLength && answer.trim().length < question.minLength) return true;
            if (question.maxLength && answer.length > question.maxLength) return true;
            return false;
        });
        if (invalidShortAnswerQuestion) {
            const answer = shortAnswers[invalidShortAnswerQuestion.id] ?? "";
            if (invalidShortAnswerQuestion.minLength && answer.trim().length < invalidShortAnswerQuestion.minLength) {
                return { error: `La pregunta "${invalidShortAnswerQuestion.text || "respuesta corta"}" requiere al menos ${invalidShortAnswerQuestion.minLength} caracteres.` };
            }
            if (invalidShortAnswerQuestion.maxLength && answer.length > invalidShortAnswerQuestion.maxLength) {
                return { error: `La pregunta "${invalidShortAnswerQuestion.text || "respuesta corta"}" permite como máximo ${invalidShortAnswerQuestion.maxLength} caracteres.` };
            }
        }
    }

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
    const access = await assertStudentStepAccess(user.id, stepId);
    if (!access.ok) return { error: access.error };

    const { data: step } = await supabase
        .from("activity_steps")
        .select("is_activity_closed, content")
        .eq("id", stepId)
        .single();
    if (step?.is_activity_closed) return { error: "Las entregas están cerradas para este paso." };

    const stepContent = step?.content as any;

    const evalMode = stepContent?.evalMode ?? "rubric";
    const includesRubric = evalMode === "rubric" || evalMode === "combined";
    const includesQuestions = evalMode === "questions" || evalMode === "combined";

    // Validate minJustificationLength for rubric mode
    if (includesRubric && stepContent?.requireJustification && stepContent?.minJustificationLength) {
        const minLen = stepContent.minJustificationLength as number;
        const rubric: any[] = stepContent?.rubric ?? [];
        for (const c of rubric) {
            const just = (justifications[c.id] ?? "").trim();
            if (just.length < minLen) {
                return { error: `La justificación de "${c.name}" requiere al menos ${minLen} caracteres.` };
            }
        }
    }

    // Validate minLength for questions in questions/combined mode
    if (includesQuestions && Array.isArray(stepContent?.questions)) {
        for (const q of stepContent.questions as any[]) {
            const ans = (justifications[q.id] ?? "").trim();
            if (!ans) {
                return { error: `La pregunta "${q.text}" es obligatoria.` };
            }
            if (q.type === 'short_answer' && q.minLength) {
                if (ans.length < q.minLength) {
                    return { error: `La pregunta "${q.text}" requiere al menos ${q.minLength} caracteres.` };
                }
            }
            if (q.type === 'numeric') {
                const value = Number.parseFloat(ans);
                if (Number.isNaN(value)) {
                    return { error: `La pregunta "${q.text}" requiere un número válido.` };
                }
                const min = q.numericMin ?? 0;
                const max = q.numericMax ?? 10;
                if (value < min || value > max) {
                    return { error: `La pregunta "${q.text}" debe estar entre ${min} y ${max}.` };
                }
            }
            if ((q.type === 'likert' || q.type === 'numeric') && q.requireJustification && q.minLength) {
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
    target_submission_id: string | null;
    target_student_id: string | null;  // for intra_group mode
    eval_submission_id: string | null;
    eval_submission?: {
        self_eval_rubric_scores: Record<string, number> | null;
        self_eval_justifications: Record<string, string> | null;
        files: Record<string, unknown>[] | null;
    } | null;
    target_submission: {
        id: string;
        drive_file_url: string | null;
        student_id: string | null;
        group_id: string | null;
        student?: { full_name: string | null } | null;
        group?: { name: string; color?: string | null } | null;
    } | null;
    target_student?: { full_name: string | null } | null;  // for intra_group mode
};

interface PeerAssignmentRow {
    id: string;
    step_id: string;
    evaluator_id: string | null;
    evaluator_group_id: string | null;
    target_submission_id: string | null;
    target_student_id: string | null;
    eval_submission_id: string | null;
    target_submission: PeerAssignmentWithTarget["target_submission"];
}

async function _insertGroupAllAssignments(
    stepId: string,
    moduleId: string,
    admin: ReturnType<typeof createAdminClient>,
): Promise<void> {
    const { data: step } = await admin
        .from("activity_steps")
        .select("content, parent_step_id")
        .eq("id", stepId)
        .single();
    const content = step?.content as Record<string, unknown> | null;
    const sourceStepId = ((step as { parent_step_id?: string | null } | null)?.parent_step_id
        ?? content?.sourceStepId) as string | undefined;
    if (!sourceStepId) return;

    const { data: groups } = await admin
        .from("module_groups")
        .select("id")
        .eq("module_id", moduleId)
        .eq("status", "active");
    const { data: submissions } = await admin
        .from("activity_submissions")
        .select("id, group_id")
        .eq("step_id", sourceStepId)
        .not("group_id", "is", null);

    const subByGroup = new Map<string, string>(
        (submissions ?? []).map((submission: any) => [submission.group_id as string, submission.id as string])
    );
    const rows: { step_id: string; evaluator_group_id: string; target_submission_id: string }[] = [];

    for (const evaluatorGroup of groups ?? []) {
        for (const targetGroup of groups ?? []) {
            if (evaluatorGroup.id === targetGroup.id) continue;
            const targetSubmissionId = subByGroup.get(targetGroup.id);
            if (!targetSubmissionId) continue;
            rows.push({
                step_id: stepId,
                evaluator_group_id: evaluatorGroup.id,
                target_submission_id: targetSubmissionId,
            });
        }
    }

    if (rows.length > 0) {
        await admin.from("peer_evaluation_assignments").insert(rows).select("id");
    }
}

export async function getMyPeerAssignments(
    stepId: string,
): Promise<{ assignments?: PeerAssignmentWithTarget[]; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    const access = await assertStudentStepAccess(user.id, stepId);
    if (!access.ok) return { error: access.error };

    // Get the student's group in this step's module (for group-mode assignments)
    const { data: stepRow } = await supabase
        .from("activity_steps")
        .select("content, phase:activity_phases(activity:activities(unit:units(module_id)))")
        .eq("id", stepId)
        .single();
    const moduleId = (stepRow?.phase as any)?.activity?.unit?.module_id as string | undefined;
    const stepMode = (stepRow?.content as any)?.mode as string | undefined;

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

    // ── intra_group: derive assignments from group membership, create lazily ──
    if (stepMode === 'intra_group') {
        if (!moduleId) return { assignments: [] };
        const admin = createAdminClient();

        // Resolve student's group
        const { data: moduleGroups } = await admin
            .from("module_groups")
            .select("id")
            .eq("module_id", moduleId)
            .eq("status", "active");
        const moduleGroupIds = (moduleGroups ?? []).map((g: any) => g.id as string);
        if (!moduleGroupIds.length) return { assignments: [] };

        const { data: memberRow } = await admin
            .from("module_group_members")
            .select("group_id")
            .eq("student_id", user.id)
            .in("group_id", moduleGroupIds)
            .maybeSingle();
        const myGroupId = memberRow?.group_id as string | undefined;
        if (!myGroupId) return { assignments: [] };

        // Get peers (all other members of the group)
        const { data: groupMembers } = await admin
            .from("module_group_members")
            .select("student_id, profile:profiles!student_id(id, full_name)")
            .eq("group_id", myGroupId)
            .neq("student_id", user.id);
        if (!groupMembers?.length) return { assignments: [] };

        const peerIds = groupMembers.map((m: any) => m.student_id as string);

        // Fetch existing assignments for this evaluator + those targets (including eval submission for pre-fill)
        const { data: existing } = await admin
            .from("peer_evaluation_assignments")
            .select(`
                id, step_id, evaluator_id, evaluator_group_id, target_submission_id, target_student_id, eval_submission_id,
                eval_submission:activity_submissions!eval_submission_id(self_eval_rubric_scores, self_eval_justifications, files)
            `)
            .eq("step_id", stepId)
            .eq("evaluator_id", user.id)
            .in("target_student_id", peerIds);

        const existingByTarget = new Map(
            (existing ?? []).map((a: any) => [a.target_student_id as string, a])
        );

        // Lazily insert missing assignment rows
        const toInsert = peerIds
            .filter(id => !existingByTarget.has(id))
            .map(targetStudentId => ({
                step_id: stepId,
                evaluator_id: user.id,
                evaluator_group_id: null,
                target_student_id: targetStudentId,
                target_submission_id: null,
            }));

        if (toInsert.length > 0) {
            const { data: inserted } = await admin
                .from("peer_evaluation_assignments")
                .insert(toInsert)
                .select("id, step_id, evaluator_id, evaluator_group_id, target_submission_id, target_student_id, eval_submission_id");
            for (const row of (inserted ?? []) as any[]) {
                existingByTarget.set(row.target_student_id, row);
            }
        }

        // Build result from group member list — only include members with a real assignment row
        const intraAssignments = groupMembers
            .map((member: any): PeerAssignmentWithTarget | null => {
                const a = existingByTarget.get(member.student_id as string);
                if (!a) return null;
                return {
                    id: a.id,
                    step_id: stepId,
                    evaluator_id: user.id ?? null,
                    evaluator_group_id: null,
                    target_submission_id: a.target_submission_id ?? null,
                    target_student_id: member.student_id,
                    eval_submission_id: a.eval_submission_id ?? null,
                    eval_submission: (a as any).eval_submission ?? null,
                    target_submission: null,
                    target_student: { full_name: (member.profile as any)?.full_name ?? null },
                } satisfies PeerAssignmentWithTarget;
            })
            .filter((a): a is PeerAssignmentWithTarget => a !== null);

        return { assignments: intraAssignments };
    }

    if (stepMode === "group" && ((stepRow?.content as any)?.evaluateAllGroups ?? true)) {
        if (!moduleId) return { assignments: [] };
        const admin = createAdminClient();
        const { count } = await admin
            .from("peer_evaluation_assignments")
            .select("id", { count: "exact", head: true })
            .eq("step_id", stepId);
        if ((count ?? 0) === 0 && groupId) {
            await _insertGroupAllAssignments(stepId, moduleId, admin);
        }
    }

    // ── Standard group/individual mode ────────────────────────────────────────
    const adminForQuery = createAdminClient();
    const orFilter = groupId
        ? `evaluator_id.eq.${user.id},evaluator_group_id.eq.${groupId}`
        : `evaluator_id.eq.${user.id}`;

    const { data, error } = await adminForQuery
        .from("peer_evaluation_assignments")
        .select(`
            id, step_id, evaluator_id, evaluator_group_id, target_submission_id, target_student_id, eval_submission_id,
            eval_submission:activity_submissions!eval_submission_id(self_eval_rubric_scores, self_eval_justifications, files),
            target_submission:activity_submissions!target_submission_id(
                id, drive_file_url, student_id, group_id,
                student:profiles!student_id(full_name),
                group:module_groups!group_id(name, color)
            )
        `)
        .eq("step_id", stepId)
        .or(orFilter)
        .order("created_at");

    if (error) {
        console.error("[getMyPeerAssignments] query error:", error.message, { stepId, userId: user.id, orFilter });
        return { error: error.message };
    }

    const rows = (data ?? []) as unknown as PeerAssignmentRow[];
    const targetStudentIds = rows
        .map((row) => row.target_student_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0);

    let targetStudentNameById = new Map<string, string | null>();

    if (targetStudentIds.length > 0) {
        const { data: targetStudents, error: targetStudentsError } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", Array.from(new Set(targetStudentIds)));

        if (targetStudentsError) {
            console.error("[getMyPeerAssignments] target student lookup error:", targetStudentsError.message);
            return { error: targetStudentsError.message };
        }

        targetStudentNameById = new Map(
            (targetStudents ?? []).map((profile) => [profile.id as string, (profile.full_name ?? null) as string | null])
        );
    }

    const assignments: PeerAssignmentWithTarget[] = rows.map((row) => ({
        ...row,
        target_student: row.target_student_id
            ? { full_name: targetStudentNameById.get(row.target_student_id) ?? null }
            : null,
    }));

    return { assignments };
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

    // Verify the assignment belongs to this evaluator (also fetch existing eval_submission_id)
    const { data: assignment } = await supabase
        .from("peer_evaluation_assignments")
        .select("id, step_id, evaluator_id, evaluator_group_id, target_submission_id, eval_submission_id")
        .eq("id", assignmentId)
        .single();

    if (!assignment) return { error: "Asignación no encontrada." };
    if (assignment.evaluator_id && assignment.evaluator_id !== user.id) {
        return { error: "No autorizado." };
    }
    const access = await assertStudentStepAccess(user.id, assignment.step_id);
    if (!access.ok) return { error: access.error };

    const { data: step } = await supabase
        .from("activity_steps")
        .select("content")
        .eq("id", assignment.step_id)
        .single();
    const stepContent = step?.content as any;
    const evalMode = stepContent?.evalMode ?? "rubric";
    const includesRubric = evalMode === "rubric" || evalMode === "combined";
    const includesQuestions = evalMode === "questions" || evalMode === "combined";

    if (includesRubric && stepContent?.requireJustification && stepContent?.minJustificationLength) {
        const minLen = stepContent.minJustificationLength as number;
        const rubric: any[] = stepContent?.rubric ?? [];
        for (const criterion of rubric) {
            const text = (justifications[criterion.id] ?? "").trim();
            if (text.length < minLen) {
                return { error: `La justificación de "${criterion.name}" requiere al menos ${minLen} caracteres.` };
            }
        }
    }

    if (includesQuestions && Array.isArray(stepContent?.questions)) {
        for (const question of stepContent.questions as any[]) {
            const answer = (justifications[question.id] ?? "").trim();
            if (!answer) {
                return { error: `La pregunta "${question.text}" es obligatoria.` };
            }
            if (question.type === "short_answer" && question.minLength && answer.length < question.minLength) {
                return { error: `La pregunta "${question.text}" requiere al menos ${question.minLength} caracteres.` };
            }
            if (question.type === "numeric") {
                const value = Number.parseFloat(answer);
                if (Number.isNaN(value)) {
                    return { error: `La pregunta "${question.text}" requiere un número válido.` };
                }
                const min = question.numericMin ?? 0;
                const max = question.numericMax ?? 10;
                if (value < min || value > max) {
                    return { error: `La pregunta "${question.text}" debe estar entre ${min} y ${max}.` };
                }
            }
            if ((question.type === "likert" || question.type === "numeric") && question.requireJustification && question.minLength) {
                const text = (justifications[`${question.id}:justification`] ?? "").trim();
                if (text.length < question.minLength) {
                    return { error: `La justificación de "${question.text}" requiere al menos ${question.minLength} caracteres.` };
                }
            }
        }
    }

    // Each assignment gets its own activity_submissions row, keyed by peer_assignment_id.
    // Upsert on peer_assignment_id avoids the unique-constraint bug on (student_id, step_id)
    // that caused all peer evals for the same step to share one row and overwrite each other.
    // Admin client is required: RLS UPDATE policies block student writes on peer-eval rows.
    // Security is guaranteed by the evaluator_id check above.
    const admin = createAdminClient();
    const filesPayload = buildPeerEvaluationLiveNoteFiles(qaNotes);
    const submissionPayload = {
        self_eval_rubric_scores: rubricScores,
        self_eval_justifications: justifications,
        files: filesPayload,
        status: "submitted",
        submitted_at: new Date().toISOString(),
    };

    const { data: sub, error: upsertErr } = await admin
        .from("activity_submissions")
        .upsert(
            {
                student_id: user.id,
                step_id: assignment.step_id,
                peer_assignment_id: assignmentId,
                ...submissionPayload,
            },
            { onConflict: "peer_assignment_id" },
        )
        .select("id")
        .single();
    if (upsertErr) return { error: upsertErr.message };

    // Keep eval_submission_id in sync so teacher-side joins still work.
    await admin
        .from("peer_evaluation_assignments")
        .update({ eval_submission_id: sub!.id })
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
    const access = await assertStudentStepAccess(user.id, stepId);
    if (!access.ok) return { error: access.error };

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
