"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createUnit(prevState: any, formData: FormData) {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return { error: "Not authenticated" };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        return { error: "Unauthorized: only teachers can create units" };
    }

    const moduleId = formData.get("module_id") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!moduleId || !name) {
        return { error: "Module ID and unit name are required" };
    }

    // Verify the teacher owns this module
    const { data: module } = await supabase
        .from("modules")
        .select("id")
        .eq("id", moduleId)
        .eq("teacher_id", user.id)
        .single();

    if (!module) {
        return { error: "Module not found or unauthorized" };
    }

    // Get the next order_index
    const { data: lastUnit } = await supabase
        .from("units")
        .select("order_index")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: false })
        .limit(1)
        .single();

    const nextOrder = (lastUnit?.order_index ?? -1) + 1;

    const { error } = await supabase
        .from("units")
        .insert({
            module_id: moduleId,
            name,
            description: description || null,
            order_index: nextOrder,
        });

    if (error) {
        return { error: error.message };
    }

    revalidatePath(`/dashboard/modules/${moduleId}`);
    return { success: true };
}
