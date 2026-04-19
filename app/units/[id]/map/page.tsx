import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { notFound, redirect } from "next/navigation";
import MapClient from "./client";
import { getUnitAccess } from "@/lib/module-access";
import { MAP_ROUTE_TYPE, toActivityNodeId, toFlowNodeId } from "@/types/unit-map";
import { Metadata } from "next";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const admin = createAdminClient();
    const { data: unit } = await admin
        .from("units")
        .select("name")
        .eq("id", id)
        .single();

    return {
        title: unit ? `Mapa | ${unit.name}` : "Mapa",
    };
}

interface UnitMapPageProps {
    params: Promise<{ id: string }>;
}

export default async function UnitMapPage({
    params,
}: UnitMapPageProps) {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { id } = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const role = profile?.role || 'student';
    const unitAccess = role === "teacher" ? await getUnitAccess(id, user.id) : null;

    if (role === "teacher") {
        if (!unitAccess?.permissions.canViewModule) {
            redirect("/dashboard");
        }
    }

    const dataClient = role === "teacher" ? admin : supabase;

    // Fetch Unit Data
    const { data: unit, error: unitError } = await dataClient
        .from("units")
        .select(`
            *,
            module:modules(id, name)
        `)
        .eq("id", id)
        .single();

    if (unitError || !unit) {
        console.error("Error loading unit map page:", unitError);
        notFound();
    }

    const { data: connectionRows, error: connectionError } = await dataClient
        .from("activity_connections")
        .select(`
            id,
            source_activity_id,
            target_activity_id,
            source_map_node_id,
            target_map_node_id,
            source_handle,
            target_handle,
            route_label,
            route_type
        `)
        .eq("unit_id", id);

    const { data: legacyConnectionRows, error: legacyConnectionError } = connectionError
        ? await dataClient
            .from("activity_connections")
            .select(`
                id,
                source_activity_id,
                target_activity_id,
                source_handle,
                target_handle
            `)
            .eq("unit_id", id)
        : { data: null, error: null };

    if (connectionError && legacyConnectionError) {
        console.error("Error loading map connections:", connectionError, legacyConnectionError);
    }

    const { data: flowNodeRows, error: flowNodeError } = await dataClient
        .from("unit_map_nodes")
        .select("id, unit_id, type, label, description, position_x, position_y")
        .eq("unit_id", id);

    if (flowNodeError) {
        console.warn("Map flow nodes could not be loaded. Has the latest migration been applied?", flowNodeError);
    }

    // Fetch Activities for this unit
    const { data: activitiesData } = await dataClient
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
        let stepsCount = 0;

        const phases = Array.isArray(activity.activity_phases) ? activity.activity_phases : [];
        phases.forEach((phase: any) => {
            const steps = Array.isArray(phase.activity_steps) ? phase.activity_steps : [];
            stepsCount += steps.length;
            steps.forEach((step: any) => {
                totalXp += (step.xp || 0);
            });
        });

        // Remove the nested relation to avoid passing unnecessary data to the client
        const { activity_phases, ...rest } = activity;
        return {
            ...rest,
            xp: totalXp,
            stepsCount
        };
    });

    // Guard: if teacher changed view_type, redirect student back to unit detail
    if (role === 'student' && unit.view_type !== 'map') {
        redirect(`/dashboard/units/${id}`);
    }

    // Fetch milestones and badges for student map view
    const { data: milestonesData } = await dataClient
        .from("class_milestones")
        .select("*")
        .eq("unit_id", id)
        .in("status", ["active", "completed"])
        .order("order_index", { ascending: true });

    const { data: classBadgesData } = await dataClient
        .from("class_badges")
        .select("*")
        .eq("unit_id", id);

    const { data: studentBadgesData } = role === 'student'
        ? await supabase.from("student_badges").select("*").eq("student_id", user.id)
        : { data: [] };

    // Map connections format for React Flow
    const rawConnectionRows = connectionError ? (legacyConnectionRows || []) : (connectionRows || []);
    const mapConnections = rawConnectionRows
        .flatMap((conn: any) => {
            const source = conn.source_map_node_id ? toFlowNodeId(conn.source_map_node_id) : conn.source_activity_id ? toActivityNodeId(conn.source_activity_id) : null;
            const target = conn.target_map_node_id ? toFlowNodeId(conn.target_map_node_id) : conn.target_activity_id ? toActivityNodeId(conn.target_activity_id) : null;
            if (!source || !target) return [];
            return [{
                id: conn.id,
                source,
                target,
                sourceHandle: conn.source_handle,
                targetHandle: conn.target_handle,
                label: conn.route_label ?? null,
                routeType: conn.route_type ?? MAP_ROUTE_TYPE.REQUIRED,
            }];
        });

    const unitWithConnections = {
        ...unit,
        map_connections: mapConnections,
        map_nodes: flowNodeError ? [] : flowNodeRows || [],
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
            milestones={milestonesData || []}
            classBadges={classBadgesData || []}
            studentBadges={studentBadgesData || []}
            moduleRole={unitAccess?.role ?? null}
            modulePermissions={unitAccess?.permissions ?? null}
        />
    );
}
