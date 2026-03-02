import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { StudentActivityClient } from "./client";

export default async function ActivityPage({
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

    // Fetch Activity and Unit
    const { data: activity, error } = await supabase
        .from("activities")
        .select(`
          *,
          unit:units(
            id,
            name,
            module_id
          )
        `)
        .eq("id", id)
        .single();

    if (error || !activity) {
        console.error("Activity not found:", error);
        notFound();
    }

    // Fetch Activity phases and steps
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
        <StudentActivityClient
            activity={activity as any}
            phases={initialPhases as any}
        />
    );
}
