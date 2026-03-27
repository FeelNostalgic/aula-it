"use server"

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { verifyTeacherOwnsActivity, verifyTeacherOwnsPhase, verifyTeacherOwnsStep } from "@/lib/authorization";
import { revalidatePath } from "next/cache";
import { ActivityPhase, ActivityStep, ActivityStepType, CompletionMode, RubricCriteria, RubricLevel } from "@/types/activity";
import { extractGoogleFileId } from "@/lib/google-drive-urls";
import { setFormAcceptingResponses } from "@/lib/google-forms-api";

type RubricCriterionLibraryVisibility = "private" | "public";

type RubricCriterionLibraryRecord = {
    id: string;
    name: string;
    description: string | null;
    levels: RubricLevel[];
    visibility: RubricCriterionLibraryVisibility;
    version: number;
    created_by: string;
    created_at: string;
    updated_at: string;
};

export async function getActivityPhases(activityId: string) {
    const supabase = await createClient();

    const { data: phases, error } = await supabase
        .from('activity_phases')
        .select(`
            *,
            steps:activity_steps(*)
        `)
        .eq('activity_id', activityId)
        .order('order_index', { ascending: true });

    if (error) {
        console.error("Error fetching activity phases:", error);
        return { error: error.message };
    }

    // Sort steps within each phase
    const sortedPhases = phases?.map(phase => ({
        ...phase,
        steps: (phase.steps || []).sort((a: any, b: any) => a.order_index - b.order_index)
    })) || [];

    return { data: sortedPhases };
}

export async function createPhase(activityId: string, title: string, orderIndex: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsActivity(activityId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('activity_phases')
        .insert({
            activity_id: activityId,
            title,
            order_index: orderIndex
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating phase:", error);
        return { error: error.message };
    }

    revalidatePath(`/activities/${activityId}/edit`);
    return { data };
}

export async function createStep(phaseId: string, title: string, type: ActivityStepType, orderIndex: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsPhase(phaseId, user.id)) return { error: "Sin permisos." };

    // Default content based on type
    let defaultContent = {};
    if (type === 'theory') {
        defaultContent = { markdown: '' };
    } else if (type === 'deliverable') {
        defaultContent = { templateUrl: '', instructionsMarkdown: '' };
    } else if (type === 'animation') {
        defaultContent = { componentUrl: '' };
    } else if (type === 'quiz') {
        defaultContent = { questions: [] };
    } else if (type === 'presentation') {
        defaultContent = { slidesUrl: '', notes: '' };
    } else if (type === 'resource') {
        defaultContent = { items: [], markdownHeader: '' };
    } else if (type === 'file_upload') {
        defaultContent = { instructionsMarkdown: '', allowedTypes: ['pdf', 'image', 'word'], maxFileSizeMb: 10, maxFiles: 1 };
    }

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('activity_steps')
        .insert({
            phase_id: phaseId,
            title,
            type,
            content: defaultContent,
            order_index: orderIndex
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating step:", error);
        return { error: error.message };
    }

    return { data };
}

export async function updateStepContent(stepId: string, content: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('activity_steps')
        .update({ content })
        .eq('id', stepId)
        .select()
        .single();

    if (error) {
        console.error("Error updating step:", error);
        return { error: error.message };
    }

    return { data };
}

export async function updateStepTitle(stepId: string, title: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('activity_steps')
        .update({ title })
        .eq('id', stepId)
        .select()
        .single();

    if (error) {
        console.error("Error updating step title:", error);
        return { error: error.message };
    }

    return { data };
}

export async function updatePhaseTitle(phaseId: string, activityId: string, title: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsPhase(phaseId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('activity_phases')
        .update({ title })
        .eq('id', phaseId)
        .select()
        .single();

    if (error) {
        console.error("Error updating phase title:", error);
        return { error: error.message };
    }

    return { data };
}

export async function deletePhase(phaseId: string, activityId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsPhase(phaseId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { error } = await admin
        .from('activity_phases')
        .delete()
        .eq('id', phaseId);

    if (error) {
        console.error("Error deleting phase:", error);
        return { error: error.message };
    }

    return { success: true };
}

export async function deleteStep(stepId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { error } = await admin
        .from('activity_steps')
        .delete()
        .eq('id', stepId);

    if (error) {
        console.error("Error deleting step:", error);
        return { error: error.message };
    }

    return { success: true };
}

export async function duplicateStep(stepId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { data: originalStep, error: stepError } = await admin
        .from("activity_steps")
        .select("*, activity_phases!inner(id, activity_id)")
        .eq("id", stepId)
        .single();

    if (stepError || !originalStep) {
        console.error("Error duplicating step: could not load source step", stepError);
        return { error: stepError?.message ?? "No se pudo cargar la actividad original." };
    }

    const phaseId = (originalStep as any).phase_id as string;
    const activityId = (originalStep as any).activity_phases?.activity_id as string | undefined;

    const { data: phaseSteps, error: phaseStepsError } = await admin
        .from("activity_steps")
        .select("id, order_index")
        .eq("phase_id", phaseId)
        .order("order_index", { ascending: true });

    if (phaseStepsError || !phaseSteps) {
        console.error("Error duplicating step: could not load phase steps", phaseStepsError);
        return { error: phaseStepsError?.message ?? "No se pudo reordenar la fase." };
    }

    const sourceIndex = phaseSteps.findIndex((step) => step.id === stepId);
    if (sourceIndex === -1) return { error: "No se encontró la actividad original en su fase." };

    const duplicateTitle = `${originalStep.title} - copia`;
    const duplicatedPayload: Record<string, unknown> = {
        phase_id: phaseId,
        title: duplicateTitle,
        type: originalStep.type,
        content: originalStep.content,
        order_index: phaseSteps[sourceIndex].order_index + 1,
        is_visible: originalStep.is_visible,
        is_locked: originalStep.is_locked,
        is_activity_closed: (originalStep as any).is_activity_closed ?? false,
        is_lockdown: (originalStep as any).is_lockdown ?? false,
        due_date: (originalStep as any).due_date ?? null,
        completion_mode: (originalStep as any).completion_mode ?? null,
        xp: (originalStep as any).xp ?? null,
    };

    const { data: insertedStep, error: insertError } = await admin
        .from("activity_steps")
        .insert(duplicatedPayload)
        .select()
        .single();

    if (insertError || !insertedStep) {
        console.error("Error duplicating step: insert failed", insertError);
        return { error: insertError?.message ?? "No se pudo duplicar la actividad." };
    }

    const reorderedSteps = [
        ...phaseSteps.slice(0, sourceIndex + 1),
        { id: insertedStep.id, order_index: 0 },
        ...phaseSteps.slice(sourceIndex + 1),
    ].map((step, index) => ({
        id: step.id,
        order_index: index,
    }));

    const reorderResults = await Promise.all(
        reorderedSteps.map((step) =>
            admin
                .from("activity_steps")
                .update({ order_index: step.order_index })
                .eq("id", step.id)
        )
    );

    const reorderError = reorderResults.find((result) => result.error);
    if (reorderError?.error) {
        console.error("Error duplicating step: reindex failed", reorderError.error);
        return { error: "La actividad se duplicó pero no se pudo reordenar correctamente." };
    }

    if (activityId) revalidatePath(`/activities/${activityId}/edit`);
    return { data: { ...insertedStep, order_index: sourceIndex + 1 } };
}

// Reorder functionality
export async function reorderPhases(activityId: string, updates: { id: string, order_index: number }[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsActivity(activityId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    // Supabase JS doesn't have bulk update out of the box nicely, so we map updates
    const promises = updates.map(update =>
        admin
            .from('activity_phases')
            .update({ order_index: update.order_index })
            .eq('id', update.id)
    );

    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
        console.error("Errors reordering phases:", errors);
        return { error: "Failed to reorder phases" };
    }

    return { success: true };
}

export async function reorderSteps(activityId: string, updates: { id: string, phase_id: string, order_index: number }[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsActivity(activityId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const promises = updates.map(update =>
        admin
            .from('activity_steps')
            .update({ order_index: update.order_index, phase_id: update.phase_id })
            .eq('id', update.id)
    );

    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
        console.error("Errors reordering steps:", errors);
        return { error: "Failed to reorder steps" };
    }

    return { success: true };
}

export async function updateActivitySettings(activityId: string, updates: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsActivity(activityId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('activities')
        .update(updates)
        .eq('id', activityId)
        .select()
        .single();

    if (error) {
        console.error("Error updating activity settings:", error);
        return { error: error.message };
    }

    revalidatePath(`/activities/${activityId}/edit`);
    return { data };
}

export async function updateActivityStatus(activityId: string, status: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsActivity(activityId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('activities')
        .update({ status })
        .eq('id', activityId)
        .select()
        .single();

    if (error) {
        console.error("Error updating activity status:", error);
        return { error: error.message };
    }

    revalidatePath(`/activities/${activityId}/edit`);
    return { data };
}

export async function updateStepVisibility(stepId: string, isVisible: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('activity_steps')
        .update({ is_visible: isVisible })
        .eq('id', stepId)
        .select()
        .single();
    if (error) {
        console.error("Error updating step visibility:", error);
        return { error: error.message };
    }
    return { data };
}

export async function updateStepDueDate(stepId: string, dueDate: string | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('activity_steps')
        .update({ due_date: dueDate })
        .eq('id', stepId)
        .select()
        .single();
    if (error) {
        console.error("Error updating step due date:", error);
        return { error: error.message };
    }
    return { data };
}

export async function updateStepLock(stepId: string, isLocked: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('activity_steps')
        .update({ is_locked: isLocked })
        .eq('id', stepId)
        .select()
        .single();
    if (error) {
        console.error("Error updating step lock:", error);
        return { error: error.message };
    }
    return { data };
}

export async function updateStepLockdown(stepId: string, isLockdown: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('activity_steps')
        .update({ is_lockdown: isLockdown })
        .eq('id', stepId)
        .select()
        .single();
    if (error) {
        console.error("Error updating step lockdown:", error);
        return { error: error.message };
    }
    return { data };
}

export async function updatePhaseStepsVisibility(phaseId: string, isVisible: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsPhase(phaseId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { error } = await admin
        .from('activity_steps')
        .update({ is_visible: isVisible })
        .eq('phase_id', phaseId);
    if (error) return { error: error.message };
    return { data: true };
}

export async function updatePhaseStepsActivityClosed(phaseId: string, isClosed: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsPhase(phaseId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { error } = await admin
        .from('activity_steps')
        .update({ is_activity_closed: isClosed })
        .eq('phase_id', phaseId);
    if (error) return { error: error.message };

    // Sync any google_form quiz steps in this phase
    const { data: steps } = await admin
        .from('activity_steps')
        .select('id, content')
        .eq('phase_id', phaseId)
        .eq('type', 'quiz');

    const googleFormSteps = (steps ?? []).filter(
        s => (s.content as any)?.quizMode === 'google_form' && (s.content as any)?.googleFormUrl
    );

    if (googleFormSteps.length > 0) {
        const { data: tokenRow } = await admin
            .from('teacher_drive_tokens')
            .select('refresh_token')
            .eq('teacher_id', user.id)
            .single();

        if (tokenRow?.refresh_token) {
            for (const step of googleFormSteps) {
                const formId = extractGoogleFileId((step.content as any).googleFormUrl);
                if (formId) {
                    try {
                        await setFormAcceptingResponses(tokenRow.refresh_token, formId, !isClosed);
                    } catch (formErr: any) {
                        console.warn(`Forms API warning (step ${step.id}):`, formErr?.message);
                    }
                }
            }
        }
    }

    return { data: true };
}

export async function updatePhaseStepsLock(phaseId: string, isLocked: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsPhase(phaseId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { error } = await admin
        .from('activity_steps')
        .update({ is_locked: isLocked })
        .eq('phase_id', phaseId);
    if (error) return { error: error.message };
    return { data: true };
}

export async function updateStepActivityClosed(stepId: string, isClosed: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('activity_steps')
        .update({ is_activity_closed: isClosed })
        .eq('id', stepId)
        .select()
        .single();
    if (error) {
        console.error("Error updating step activity closed:", error);
        return { error: error.message };
    }

    // If it's a google_form quiz, also sync the form's accepting state
    const content = data?.content as any;
    if (data?.type === 'quiz' && content?.quizMode === 'google_form' && content?.googleFormUrl) {
        const formId = extractGoogleFileId(content.googleFormUrl);
        if (formId) {
            const { data: tokenRow } = await admin
                .from('teacher_drive_tokens')
                .select('refresh_token')
                .eq('teacher_id', user.id)
                .single();
            if (tokenRow?.refresh_token) {
                try {
                    await setFormAcceptingResponses(tokenRow.refresh_token, formId, !isClosed);
                    return { data, formssynced: true };
                } catch (formErr: any) {
                    return { data, formserror: (formErr?.message as string) };
                }
            }
        }
    }

    return { data };
}

export async function updateStepXp(stepId: string, xp: number | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('activity_steps')
        .update({ xp })
        .eq('id', stepId)
        .select()
        .single();
    if (error) {
        console.error("Error updating step xp:", error);
        return { error: error.message };
    }
    return { data };
}

export async function getStudentProfilesForImport(stepId: string): Promise<{
    profiles: Array<{ id: string; full_name: string }>;
    error?: string;
}> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { profiles: [], error: "No autenticado." };
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { profiles: [], error: "Sin permisos." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'student')
        .not('full_name', 'is', null);

    if (error) return { profiles: [], error: error.message };
    return { profiles: (data ?? []).filter(p => p.full_name) as Array<{ id: string; full_name: string }> };
}

export async function importGoogleFormResults(
    stepId: string,
    rows: Array<{ studentId: string; pointsEarned: number; pointsTotal: number }>,
): Promise<{ imported: number; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { imported: 0, error: "No autenticado." };
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { imported: 0, error: "Sin permisos." };

    // Get activity_id from step
    const admin = createAdminClient();
    const { data: step } = await admin
        .from('activity_steps')
        .select('phase_id, activity_phases!inner(activity_id)')
        .eq('id', stepId)
        .single() as any;

    const activityId = step?.activity_phases?.activity_id;
    if (!activityId) return { imported: 0, error: "No se pudo obtener el activity_id del paso." };

    let imported = 0;
    for (const row of rows) {
        // Get current attempt count for this student+step
        const { count } = await admin
            .from('quiz_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', row.studentId)
            .eq('step_id', stepId);

        const attemptNumber = (count ?? 0) + 1;

        const { error: insertError } = await admin
            .from('quiz_attempts')
            .insert({
                student_id: row.studentId,
                step_id: stepId,
                attempt_number: attemptNumber,
                answers: {},
                short_answers: {},
                short_answer_scores: {},
                short_answer_feedback: {},
                points_earned: row.pointsEarned,
                points_total: row.pointsTotal,
            });

        if (insertError) continue;

        // Upsert activity_submission with the normalized score (0–10)
        const scoreOutOf10 = row.pointsTotal > 0
            ? Math.round((row.pointsEarned / row.pointsTotal) * 1000) / 100
            : 0;

        await admin.from('activity_submissions').upsert({
            student_id: row.studentId,
            step_id: stepId,
            activity_id: activityId,
            status: 'graded',
            score: scoreOutOf10,
            submitted_at: new Date().toISOString(),
        }, { onConflict: 'student_id,step_id' });

        imported++;
    }

    revalidatePath(`/activities/${activityId}`);
    return { imported };
}

export async function updateStepCompletionMode(stepId: string, mode: CompletionMode) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('activity_steps')
        .update({ completion_mode: mode })
        .eq('id', stepId)
        .select()
        .single();
    if (error) {
        console.error("Error updating step completion mode:", error);
        return { error: error.message };
    }
    return { data };
}

// ---------------------------------------------------------------------------
// Question Banks — CRUD
// ---------------------------------------------------------------------------

export async function getQuestionBanks() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado.", banks: [] };

    const { data, error } = await supabase
        .from('question_banks')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

    if (error) return { error: error.message, banks: [] };
    return { banks: data ?? [] };
}

function normalizeRubricLevels(levels: RubricLevel[]) {
    return levels.map((level) => ({
        id: level.id,
        label: level.label,
        points: level.points,
        description: level.description ?? "",
    }));
}

export async function getRubricCriteriaLibrary() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado.", criteria: [] as Array<RubricCriterionLibraryRecord & { is_owner: boolean }> };

    const { data, error } = await supabase
        .from("rubric_criteria_library")
        .select("*")
        .or(`created_by.eq.${user.id},visibility.eq.public`)
        .order("updated_at", { ascending: false });

    if (error) return { error: error.message, criteria: [] as Array<RubricCriterionLibraryRecord & { is_owner: boolean }> };

    const criteria = (data ?? []).map((criterion: any) => ({
        ...criterion,
        levels: normalizeRubricLevels((criterion.levels ?? []) as RubricLevel[]),
        is_owner: criterion.created_by === user.id,
    }));

    return { criteria };
}

export async function createRubricCriterionLibraryEntry(
    criterion: Pick<RubricCriteria, "name" | "description" | "levels">,
    visibility: RubricCriterionLibraryVisibility
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("rubric_criteria_library")
        .insert({
            name: criterion.name.trim(),
            description: criterion.description?.trim() || null,
            levels: normalizeRubricLevels(criterion.levels ?? []),
            visibility,
            created_by: user.id,
        })
        .select("*")
        .single();

    if (error) return { error: error.message };
    return {
        criterion: {
            ...data,
            levels: normalizeRubricLevels((data.levels ?? []) as RubricLevel[]),
            is_owner: true,
        },
    };
}

export async function updateRubricCriterionLibraryEntry(
    criterionId: string,
    criterion: Pick<RubricCriteria, "name" | "description" | "levels">,
    visibility: RubricCriterionLibraryVisibility
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };

    const { data: existing, error: existingError } = await supabase
        .from("rubric_criteria_library")
        .select("id, created_by, version")
        .eq("id", criterionId)
        .single();

    if (existingError || !existing) return { error: existingError?.message ?? "No se encontró el criterio guardado." };
    if (existing.created_by !== user.id) return { error: "Sin permisos." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from("rubric_criteria_library")
        .update({
            name: criterion.name.trim(),
            description: criterion.description?.trim() || null,
            levels: normalizeRubricLevels(criterion.levels ?? []),
            visibility,
            version: (existing.version ?? 1) + 1,
        })
        .eq("id", criterionId)
        .select("*")
        .single();

    if (error) return { error: error.message };
    return {
        criterion: {
            ...data,
            levels: normalizeRubricLevels((data.levels ?? []) as RubricLevel[]),
            is_owner: true,
        },
    };
}

export async function createQuestionBank(name: string, description?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('question_banks')
        .insert({ name, description: description ?? null, created_by: user.id, questions: [] })
        .select()
        .single();

    if (error) return { error: error.message };
    return { bank: data };
}

export async function updateQuestionBank(bankId: string, updates: { name?: string; description?: string | null; questions?: any[] }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };

    const { data: bank } = await supabase.from('question_banks').select('created_by').eq('id', bankId).single();
    if (bank?.created_by !== user.id) return { error: "No autorizado." };

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('question_banks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', bankId)
        .select()
        .single();

    if (error) return { error: error.message };
    return { bank: data };
}

export async function deleteQuestionBank(bankId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };

    const { data: bank } = await supabase.from('question_banks').select('created_by').eq('id', bankId).single();
    if (bank?.created_by !== user.id) return { error: "No autorizado." };

    const admin = createAdminClient();
    const { error } = await admin.from('question_banks').delete().eq('id', bankId);
    if (error) return { error: error.message };
    return { success: true };
}

export async function getBankQuestionsForStep(stepId: string): Promise<Record<string, any[]>> {
    const supabase = await createClient();

    const { data: step } = await supabase
        .from('activity_steps')
        .select('content')
        .eq('id', stepId)
        .single();

    if (!step?.content) return {};
    const bankSelections = (step.content as any).bankSelections as { bankId: string; pickCount: number }[] | undefined;
    if (!bankSelections?.length) return {};

    const bankIds = bankSelections.map((s: any) => s.bankId);
    // Must use admin client — students are not the bank owner so RLS blocks regular reads
    const admin = createAdminClient();
    const { data: banks } = await admin
        .from('question_banks')
        .select('id, questions')
        .in('id', bankIds);

    const result: Record<string, any[]> = {};
    for (const bank of banks ?? []) {
        result[bank.id] = bank.questions ?? [];
    }
    return result;
}
