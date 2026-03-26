import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { UnitActivitiesTab } from "@/components/dashboard/activities/unit-activities-tab";
import { UnitActivitiesWrapper } from "./activities-wrapper";
import { getUnitAccess } from "@/lib/module-access";

export default async function RetosPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: unitId } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
        
    if (!profile || profile.role !== "teacher") redirect("/dashboard");

    const unitAccess = await getUnitAccess(unitId, user.id);
    if (!unitAccess?.permissions.canViewModule) redirect("/dashboard");

    const dataClient = admin;

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

    const activityIds = activitiesData?.map(a => a.id) || [];
    let submissions: any[] = [];
    if (activityIds.length > 0) {
        const { data: subs } = await dataClient
            .from("submissions")
            .select("*")
            .in("activity_id", activityIds);
        submissions = subs || [];
    }

    const { data: classBadges } = await dataClient
        .from("class_badges")
        .select("*")
        .eq("unit_id", unitId);

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

        const activitySubmissions = submissions.filter(s => s.activity_id === activity.id);
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

    return (
        <div className="px-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <UnitActivitiesWrapper 
                unitId={unitId} 
                activities={activities || []} 
                submissions={submissions} 
            />
        </div>
    );
}
