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

    // Fetch parent Module
    const { data: module } = await supabase
        .from("modules")
        .select("id, name")
        .eq("id", unit.module_id)
        .single();

    // Fetch Activities
    const { data: activities } = await supabase
        .from("activities")
        .select("*")
        .eq("unit_id", unitId)
        .order("order_index", { ascending: true });

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
            module={module || { id: unit.module_id, name: "Módulo" }}
            initialActivities={activities || []}
            students={students}
            submissions={submissions}
            userRole={userRole}
        />
    );
}
