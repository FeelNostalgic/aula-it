import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import MapClient from "./client";

export default async function UnitMapPage({
    params,
}: {
    params: { id: string };
}) {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // Fetch Unit Data
    const { data: unit } = await supabase
        .from("units")
        .select(`
            *,
            module:modules(id, name),
            activity_connections (
                id,
                source_activity_id,
                target_activity_id,
                source_handle,
                target_handle
            )
        `)
        .eq("id", id)
        .single();

    if (!unit) {
        notFound();
    }

    // Fetch Activities for this unit
    const { data: activitiesData } = await supabase
        .from("activities")
        .select(`
            *,
            activity_phases (
                id,
                activity_steps ( xp )
            )
        `)
        .eq("unit_id", id)
        .order("order_index", { ascending: true });

    const activities = activitiesData?.map(activity => {
        let totalXp = 0;

        const phases = Array.isArray(activity.activity_phases) ? activity.activity_phases : [];
        phases.forEach((phase: any) => {
            const steps = Array.isArray(phase.activity_steps) ? phase.activity_steps : [];
            steps.forEach((step: any) => {
                totalXp += (step.xp || 0);
            });
        });

        // Remove the nested relation to avoid passing unnecessary data to the client
        const { activity_phases, ...rest } = activity;
        return {
            ...rest,
            xp: totalXp
        };
    });

    // Get User Role
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const role = profile?.role || 'student';

    // Map connections format for React Flow
    const mapConnections = (unit.activity_connections || []).map((conn: any) => ({
        id: conn.id,
        source: conn.source_activity_id,
        target: conn.target_activity_id,
        sourceHandle: conn.source_handle,
        targetHandle: conn.target_handle
    }));

    const unitWithConnections = {
        ...unit,
        map_connections: mapConnections
    };

    const activitiesWithPosition = (activities || []).map(a => ({
        ...a,
        position: a.position_x !== null ? { x: a.position_x, y: a.position_y } : null
    }));

    return (
        <MapClient
            unit={unitWithConnections}
            activities={activitiesWithPosition}
            role={role as 'student' | 'teacher'}
            user={user}
            profile={profile}
        />
    );
}
