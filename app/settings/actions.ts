"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile({
    fullName,
    googleEmail,
}: {
    fullName: string;
    googleEmail: string;
}) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const updates: Record<string, string> = {};
    if (fullName.trim()) updates.full_name = fullName.trim();
    updates.google_email = googleEmail.trim() || null as any;

    const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

    if (error) return { error: error.message };

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
}
