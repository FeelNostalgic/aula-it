import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { UnitDetailView } from "@/components/dashboard/unit-detail-view";

export default async function UnitPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: unitId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    // Get user role
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    if (!profile) redirect("/login");
    const userRole = profile.role as "teacher" | "student";

    // Fetch Unit
    const { data: unit, error: unitError } = await supabase
        .from("units")
        .select("*")
        .eq("id", unitId)
        .single();

    if (unitError || !unit) {
        redirect("/dashboard");
    }

    // Access control for students
    if (userRole === "student") {
        const rawStatus = unit.status?.toLowerCase() || 'draft';
        const isDraft = rawStatus === 'draft' || rawStatus === 'borrador';

        if (isDraft) {
            redirect(`/dashboard/modules/${unit.module_id}`);
        }
    }

    // Fetch parent Module
    const { data: module } = await supabase
        .from("modules")
        .select("id, name")
        .eq("id", unit.module_id)
        .single();

    // Fetch Activities with extra fields and phase count
    const { data: activitiesData } = await supabase
        .from("activities")
        .select(`
            id, unit_id, title, description, type, xp, order_index, status, created_at, duration, difficulty, logo_url, position_x, position_y,
            activity_phases (count)
        `)
        .eq("unit_id", unitId)
        .order("order_index", { ascending: true });

    const { data: connections } = await supabase
        .from('activity_connections')
        .select('*')
        .eq('unit_id', unitId);

    const activities = activitiesData?.map(activity => ({
        ...activity,
        phasesCount: (activity.activity_phases as any)?.[0]?.count || 0
    }));

    // Fetch Students enrolled in the Module
    const { data: enrollments } = await supabase
        .from("module_enrollments")
        .select("student_id")
        .eq("module_id", unit.module_id);

    const studentIds = enrollments?.map(e => e.student_id) || [];
    let students: any[] = [];
    if (studentIds.length > 0) {
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", studentIds);
        students = profiles || [];
    }

    // Fetch Submissions for activities in this unit
    const activityIds = activities?.map(a => a.id) || [];
    let submissions: any[] = [];
    if (activityIds.length > 0) {
        const { data: subs } = await supabase
            .from("submissions")
            .select("*")
            .in("activity_id", activityIds);
        submissions = subs || [];
    }

    return (
        <UnitDetailView
            unit={unit}
            module={module}
            activities={activities || []}
            connections={connections || []}
            students={students || []}
            submissions={submissions || []}
            userRole={userRole}
        />
    );
}
