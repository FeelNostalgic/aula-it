"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function disconnectDrive(): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Solo profesores." };

    const { error } = await supabase
        .from("teacher_drive_tokens")
        .delete()
        .eq("teacher_id", user.id);

    if (error) return { error: error.message };

    revalidatePath("/settings");
    return { success: true };
}

export async function updateProfile({
    fullName,
    googleEmail,
    isPrivate,
}: {
    fullName: string;
    googleEmail: string;
    isPrivate?: boolean;
}) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const updates: Record<string, any> = {};
    if (fullName.trim()) updates.full_name = fullName.trim();
    updates.google_email = googleEmail.trim() || null as any;
    if (isPrivate !== undefined) updates.is_private = isPrivate;

    const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

    if (error) return { error: error.message };

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
}
