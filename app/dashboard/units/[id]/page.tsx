import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { UnitDetailView } from "@/components/dashboard/units/unit-detail-view";
import { getUnitAccess } from "@/lib/module-access";
import { Metadata } from "next";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id: unitId } = await params;
    const admin = createAdminClient();
    const { data: unit } = await admin.from("units").select("title").eq("id", unitId).single();
    return {
        title: unit?.title || "Unidad",
    };
}


export default async function UnitPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: unitId } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();

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

    let unitAccess = null;
    if (userRole === "teacher") {
        unitAccess = await getUnitAccess(unitId, user.id);
        if (!unitAccess?.permissions.canViewModule) {
            redirect("/dashboard");
        }
    }

    const dataClient = userRole === "teacher" ? admin : supabase;

    // Fetch Unit
    const { data: unit, error: unitError } = await dataClient
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

        if (unit.view_type === 'map') {
            redirect(`/units/${unit.id}/map`);
        }
    } else {
        // Teacher is redirected to the nested challenges route
        redirect(`/dashboard/units/${unitId}/retos`);
    }

    // Fetch parent Module
    const { data: module } = await dataClient
        .from("modules")
        .select("id, name")
        .eq("id", unit.module_id)
        .single();

    // Fetch Activities with extra fields and phase count
    const { data: activitiesData } = await dataClient
        .from("activities")
        .select(`
            id, unit_id, title, description, type, order_index, status, created_at, duration, difficulty, logo_url, position_x, position_y, grade_weight,
            activity_phases (
                id,
                activity_steps ( xp )
            )
        `)
        .eq("unit_id", unitId)
        .order("order_index", { ascending: true });

    const { data: connections } = await supabase
        .from('activity_connections')
        .select('*')
        .eq('unit_id', unitId);

    // Fetch Submissions for activities in this unit
    const activityIds = activitiesData?.map(a => a.id) || [];
    let submissions: any[] = [];
    if (activityIds.length > 0) {
        const { data: subs } = await dataClient
            .from("submissions")
            .select("*")
            .in("activity_id", activityIds);
        submissions = subs || [];
    }

    // Fetch Badges
    const { data: classBadges } = await dataClient
        .from("class_badges")
        .select("*")
        .eq("unit_id", unitId)
        .order("created_at", { ascending: true });

    let studentBadges: any[] = [];
    if (userRole === "student") {
        const { data: earned } = await supabase
            .from("student_badges")
            .select("*")
            .eq("student_id", user.id);
        studentBadges = earned || [];
    }

    const activities = activitiesData?.map(activity => {
        let totalXp = 0;
        let stepCount = 0;

        const phases = Array.isArray(activity.activity_phases) ? activity.activity_phases : [];

        phases.forEach((phase: any) => {
            const steps = Array.isArray(phase.activity_steps) ? phase.activity_steps : [];
            stepCount += steps.length;
            steps.forEach((step: any) => {
                totalXp += (step.xp || 0);
            });
        });

        // Calculate completed steps based on submissions for this student
        const activitySubmissions = submissions.filter(s => s.activity_id === activity.id && s.student_id === user.id);
        const completedStepIds = new Set(activitySubmissions.map(s => s.step_id));

        return {
            ...activity,
            xp: totalXp,
            phasesCount: stepCount > 0 ? stepCount : phases.length,
            total_steps: stepCount,
            completed_steps: completedStepIds.size,
            badges: classBadges?.filter(b => b.activity_id === activity.id) || []
        };
    });

    // Fetch unit milestones (all of them for sequential management)
    const { data: unitMilestones } = await dataClient
        .from("class_milestones")
        .select("*")
        .eq("unit_id", unitId)
        .order("target_points", { ascending: true });

    // Fetch Students enrolled in the Module
    const { data: enrollments } = await dataClient
        .from("module_enrollments")
        .select("student_id")
        .eq("module_id", unit.module_id);

    const studentIds = enrollments?.map(e => e.student_id) || [];
    let students: any[] = [];
    if (studentIds.length > 0) {
        const { data: profiles } = await dataClient
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", studentIds);
        students = profiles || [];
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
            milestones={unitMilestones || []}
            classBadges={classBadges || []}
            studentBadges={studentBadges || []}
            moduleRole={unitAccess?.role ?? null}
            modulePermissions={unitAccess?.permissions ?? null}
        />
    );
}
