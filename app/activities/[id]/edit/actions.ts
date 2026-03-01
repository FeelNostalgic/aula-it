"use server"

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ActivityPhase, ActivityStep, ActivityStepType } from "@/types/activity";

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

    const { data, error } = await supabase
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
    }

    const { data, error } = await supabase
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

    const { data, error } = await supabase
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

    const { data, error } = await supabase
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

export async function updatePhaseTitle(phaseId: string, title: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
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

export async function deletePhase(phaseId: string) {
    const supabase = await createClient();

    const { error } = await supabase
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

    const { error } = await supabase
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
export async function reorderPhases(updates: { id: string, order_index: number }[]) {
    const supabase = await createClient();

    // Supabase JS doesn't have bulk update out of the box nicely, so we map updates
    const promises = updates.map(update =>
        supabase
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

export async function reorderSteps(updates: { id: string, phase_id: string, order_index: number }[]) {
    const supabase = await createClient();

    const promises = updates.map(update =>
        supabase
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
