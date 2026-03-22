"use server"

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { verifyTeacherOwnsActivity, verifyTeacherOwnsPhase, verifyTeacherOwnsStep } from "@/lib/authorization";
import { revalidatePath } from "next/cache";
import { ActivityPhase, ActivityStep, ActivityStepType, CompletionMode } from "@/types/activity";

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
    if (!await verifyTeacherOwnsActivity(activityId, user.id)) return { error: "No autorizado." };

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
    if (!await verifyTeacherOwnsPhase(phaseId, user.id)) return { error: "No autorizado." };

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
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "No autorizado." };

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
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "No autorizado." };

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
    if (!await verifyTeacherOwnsPhase(phaseId, user.id)) return { error: "No autorizado." };

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
    if (!await verifyTeacherOwnsPhase(phaseId, user.id)) return { error: "No autorizado." };

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
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "No autorizado." };

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

// Reorder functionality
export async function reorderPhases(activityId: string, updates: { id: string, order_index: number }[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsActivity(activityId, user.id)) return { error: "No autorizado." };

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
    if (!await verifyTeacherOwnsActivity(activityId, user.id)) return { error: "No autorizado." };

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
    if (!await verifyTeacherOwnsActivity(activityId, user.id)) return { error: "No autorizado." };

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
    if (!await verifyTeacherOwnsActivity(activityId, user.id)) return { error: "No autorizado." };

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
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "No autorizado." };

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
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "No autorizado." };

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
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "No autorizado." };

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

export async function updateStepActivityClosed(stepId: string, isClosed: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "No autorizado." };

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
    return { data };
}

export async function updateStepXp(stepId: string, xp: number | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "No autorizado." };

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
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { profiles: [], error: "No autorizado." };

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
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { imported: 0, error: "No autorizado." };

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
    if (!await verifyTeacherOwnsStep(stepId, user.id)) return { error: "No autorizado." };

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

