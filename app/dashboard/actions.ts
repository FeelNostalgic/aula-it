"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createModule(prevState: any, formData: FormData) {
    const supabase = await createClient();

    // Get current user and verify role
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return { error: "No autenticado." };
    }

    // Verify role from profiles table
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        return { error: "Solo profesores." };
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const icon = formData.get("icon") as string || "BookOpen";
    const icon_style = formData.get("icon_style") as string || "default";
    const custom_icon_url = formData.get("custom_icon_url") as string || null;

    if (!name) {
        return { error: "El nombre del módulo es obligatorio" };
    }

    const { error } = await supabase
        .from("modules")
        .insert({
            name,
            description,
            icon,
            icon_style,
            custom_icon_url,
            teacher_id: user.id,
            status: 'draft'
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
    if (userError || !user) return { error: "No autenticado." };

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
    if (userError || !user) return { error: "No autenticado." };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        return { error: "Solo profesores." };
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
    if (userError || !user) return { error: "No autenticado." };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        return { error: "Solo profesores." };
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
        return { error: "Error al reordenar unidades" };
    }

    revalidatePath(`/dashboard/modules/${moduleId}`);
    return { success: true };
}

export async function duplicateModule(moduleId: string) {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Solo profesores." };

    const supabase = createAdminClient();

    // 1. Get original module with units and everything nested
    const { data: module, error: moduleError } = await supabase
        .from("modules")
        .select(`
            *,
            units (
                *,
                activities (
                    *,
                    activity_phases (
                        *,
                        activity_steps (*)
                    )
                ),
                class_milestones (*),
                class_badges (*)
            )
        `)
        .eq("id", moduleId)
        .single();

    if (moduleError || !module) return { error: "Módulo no encontrado" };

    // 2. Insert new module
    const { data: newModule, error: newModuleError } = await supabase
        .from("modules")
        .insert({
            teacher_id: user.id,
            name: `${module.name} - copia`,
            description: module.description,
            icon: module.icon,
            icon_style: module.icon_style || 'default',
            custom_icon_url: module.custom_icon_url,
            status: 'draft',
            order_index: (module.order_index ?? 0) + 1
        })
        .select()
        .single();

    if (newModuleError) return { error: newModuleError.message };

    // 3. Duplicate units and their children
    for (const unit of (module.units || [])) {
        const { data: newUnit, error: newUnitError } = await supabase
            .from("units")
            .insert({
                module_id: newModule.id,
                name: unit.name,
                description: unit.description,
                status: 'draft',
                view_type: unit.view_type || 'list',
                order_index: unit.order_index,
                resources: unit.resources
            })
            .select()
            .single();

        if (newUnitError) continue;

        // 4. Duplicate activities
        for (const activity of (unit.activities || [])) {
            const { data: newActivity, error: newActivityError } = await supabase
                .from("activities")
                .insert({
                    unit_id: newUnit.id,
                    title: activity.title,
                    description: activity.description,
                    type: activity.type,
                    xp: activity.xp,
                    duration: activity.duration,
                    difficulty: activity.difficulty,
                    status: 'draft',
                    order_index: activity.order_index,
                    position_x: activity.position_x,
                    position_y: activity.position_y,
                    logo_url: activity.logo_url
                })
                .select()
                .single();

            if (newActivityError) continue;

            for (const phase of (activity.activity_phases || [])) {
                const { data: newPhase, error: newPhaseError } = await supabase
                    .from("activity_phases")
                    .insert({
                        activity_id: newActivity.id,
                        title: phase.title,
                        description: phase.description,
                        order_index: phase.order_index
                    })
                    .select()
                    .single();

                if (newPhaseError) continue;

                for (const step of (phase.activity_steps || [])) {
                    await supabase
                        .from("activity_steps")
                        .insert({
                            phase_id: newPhase.id,
                            title: step.title,
                            content: step.content,
                            type: step.type,
                            order_index: step.order_index,
                            xp_reward: step.xp_reward,
                            completion_mode: step.completion_mode,
                            config: step.config
                        });
                }
            }
        }

        // 5. Duplicate milestones
        for (const milestone of (unit.class_milestones || [])) {
            await supabase
                .from("class_milestones")
                .insert({
                    unit_id: newUnit.id,
                    title: milestone.title,
                    description: milestone.description,
                    target_points: milestone.target_points,
                    reward: milestone.reward,
                    status: 'draft',
                    order_index: milestone.order_index
                });
        }

        // 6. Duplicate badges
        for (const badge of (unit.class_badges || [])) {
            await supabase
                .from("class_badges")
                .insert({
                    unit_id: newUnit.id,
                    title: badge.title,
                    description: badge.description,
                    icon_url: badge.icon_url,
                    is_hidden: badge.is_hidden,
                    condition_payload: badge.condition_payload,
                    xp_reward: badge.xp_reward
                });
        }
    }

    revalidatePath("/dashboard");
    return { success: true };
}

export async function pingActiveDay(): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const admin = createAdminClient();
    const { data: profile } = await admin
        .from("profiles")
        .select("streak_days, last_active_at")
        .eq("id", user.id)
        .single();

    if (!profile) return;

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const lastActive = profile.last_active_at ? new Date(profile.last_active_at).toISOString().slice(0, 10) : null;

    if (lastActive === today) return;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const newStreak = lastActive === yesterdayStr
        ? (profile.streak_days || 0) + 1
        : 1;

    await admin
        .from("profiles")
        .update({ streak_days: newStreak, last_active_at: now.toISOString() })
        .eq("id", user.id);
}
