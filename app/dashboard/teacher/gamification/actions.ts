"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createMilestone(formData: {
    title: string;
    description: string;
    target_points: number;
    reward: string;
    status: 'draft' | 'active' | 'completed' | 'archived';
}) {
    const supabase = await createClient();

    // If setting to active, deactivate others first
    if (formData.status === 'active') {
        await supabase
            .from('class_milestones')
            .update({ status: 'archived' })
            .eq('status', 'active');
    }

    const { error } = await supabase
        .from('class_milestones')
        .insert([formData]);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/teacher/gamification");
    revalidatePath("/dashboard");
    return { success: true };
}

export async function updateMilestone(id: string, formData: Partial<{
    title: string;
    description: string;
    target_points: number;
    reward: string;
    status: 'draft' | 'active' | 'completed' | 'archived';
}>) {
    const supabase = await createClient();

    // If setting to active, deactivate others first
    if (formData.status === 'active') {
        await supabase
            .from('class_milestones')
            .update({ status: 'archived' })
            .eq('status', 'active')
            .neq('id', id);
    }

    const { error } = await supabase
        .from('class_milestones')
        .update(formData)
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/teacher/gamification");
    revalidatePath("/dashboard");
    return { success: true };
}

export async function deleteMilestone(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('class_milestones')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/teacher/gamification");
    revalidatePath("/dashboard");
    return { success: true };
}
