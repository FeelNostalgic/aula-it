"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createModule(prevState: any, formData: FormData) {
    const supabase = await createClient();

    // Get current user and verify role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return { error: "Not authenticated" };
    }

    // Verify role from profiles table
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        return { error: "Unauthorized: only teachers can create modules" };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const icon = formData.get("icon") as string || "BookOpen";
    const icon_style = formData.get("icon_style") as string || "default";
    const custom_icon_url = formData.get("custom_icon_url") as string || null;

    if (!name) {
        return { error: "Module name is required" };
    }

    const { error } = await supabase
        .from("modules")
        .insert({
            name,
            description,
            icon,
            icon_style,
            custom_icon_url,
            teacher_id: user.id
        });

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
}

export async function updateDashboardSettings(gridColumns: number) {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "Not authenticated" };

    const { error } = await supabase
        .from("app_settings")
        .upsert({
            teacher_id: user.id,
            grid_columns: gridColumns,
            updated_at: new Date().toISOString()
        }, { onConflict: 'teacher_id' });

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
}

export async function reorderModules(items: { id: string; order_index: number }[]) {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "Not authenticated" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        return { error: "Unauthorized: only teachers can reorder modules" };
    }

    const admin = createAdminClient();
    const promises = items.map(item =>
        admin
            .from("modules")
            .update({ order_index: item.order_index })
            .eq("id", item.id)
    );

    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);

    revalidatePath("/dashboard");
    return { success: true };
}

export async function reorderUnits(moduleId: string, items: { id: string; order_index: number }[]) {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "Not authenticated" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        return { error: "Unauthorized: only teachers can reorder units" };
    }

    const admin = createAdminClient();
    const promises = items.map(item =>
        admin
            .from("units")
            .update({ order_index: item.order_index })
            .eq("id", item.id)
            .eq("module_id", moduleId)
    );

    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
        console.error("Errors reordering units:", errors);
        return { error: "Failed to reorder units" };
    }

    revalidatePath(`/dashboard/modules/${moduleId}`);
    return { success: true };
}
