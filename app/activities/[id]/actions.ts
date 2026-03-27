"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { ActivitySubmission, QuizContent, QuizStructuredAnswers, SubmissionFile, QuizAttempt } from "@/types/activity";
import { selectQuestionsForAttempt } from "@/lib/quiz-pool-selection";
import { scoreQuizAttempt } from "@/lib/quiz-core";

const DRIVE_URL_REGEX = /^https:\/\/(docs|drive|sheets|slides|forms)\.google\.com\//;

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

    const { data, error } = await supabase
        .from("activity_submissions")
        .upsert(
            {
                student_id: user.id,
                step_id: stepId,
                drive_file_url: driveFileUrl,
                status: "submitted",
                submitted_at: new Date().toISOString(),
            },
            { onConflict: "student_id,step_id" }
        )
        .select()
        .single();

    if (error) return { error: error.message };

    revalidatePath(`/activities/${activityId}`);
    return { data: data as ActivitySubmission };
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

    const { data, error } = await supabase
        .from("activity_submissions")
        .upsert(
            {
                student_id: user.id,
                step_id: stepId,
                drive_file_url: driveFileUrl,
                drive_file_id: driveFileId,
                drive_file_name: driveFileName,
                drive_mime_type: driveMimeType,
                status: "submitted",
                submitted_at: new Date().toISOString(),
            },
            { onConflict: "student_id,step_id" }
        )
        .select()
        .single();

    if (error) return { error: error.message };

    revalidatePath(`/activities/${activityId}`);
    return { data: data as ActivitySubmission };
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

    const first = files[0];
    const { data, error } = await supabase
        .from("activity_submissions")
        .upsert(
            {
                student_id: user.id,
                step_id: stepId,
                drive_file_url: first.driveFileUrl,
                drive_file_id: first.driveFileId,
                drive_file_name: first.driveFileName,
                drive_mime_type: first.driveMimeType,
                files: files,
                status: "submitted",
                submitted_at: new Date().toISOString(),
            },
            { onConflict: "student_id,step_id" }
        )
        .select()
        .single();

    if (error) return { error: error.message };

    revalidatePath(`/activities/${activityId}`);
    return { data: data as ActivitySubmission };
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
        const { data: memberRow } = await supabase
            .from("module_group_members")
            .select("group_id, group:module_groups(module_id)")
            .eq("student_id", user.id)
            .filter("group.module_id", "eq", moduleId)
            .maybeSingle();

        const groupId = memberRow?.group_id as string | undefined;
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
        await supabase
            .from("activity_submissions")
            .upsert(
                {
                    student_id: user.id,
                    step_id: stepId,
                    status: needsReview ? "submitted" : "graded",
                    submitted_at: new Date().toISOString(),
                    ...(needsReview ? {} : {
                        score: scoreOutOf10,
                        grading_mode: "score",
                        graded_at: new Date().toISOString(),
                    }),
                },
                { onConflict: "student_id,step_id" }
            );
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
