import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ActivityBuilderClient } from "./client";

export default async function ActivityEditPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch role
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        redirect("/dashboard");
    }

    // Fetch Activity and Unit to know where to return to
    const { data: activity, error } = await supabase
        .from("activities")
        .select(`
          *,
          unit:units(
            id,
            name,
            module:modules(
              id,
              name
            )
          )
        `)
        .eq("id", id)
        .single();

    if (error || !activity) {
        console.error("Activity not found:", error);
        notFound();
    }

    // Activity phases and steps are fetched by client or passed, let's pass them as initial data
    const { data: phases, error: phasesError } = await supabase
        .from('activity_phases')
        .select(`
        *,
        steps:activity_steps(*)
    `)
        .eq('activity_id', id)
        .order('order_index', { ascending: true });

    let initialPhases = phases || [];
    if (!phasesError) {
        initialPhases = initialPhases.map(phase => ({
            ...phase,
            steps: (phase.steps || []).sort((a: any, b: any) => a.order_index - b.order_index)
        }));
    }

    return (
        <ActivityBuilderClient
            activity={activity as any}
            initialPhases={initialPhases as any}
            profile={profile}
            user={user}
        />
    );
}
