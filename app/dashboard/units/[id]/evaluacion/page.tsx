import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { UnitEvaluationTab } from "@/components/dashboard/units/unit-evaluation-tab";

export default async function EvaluacionPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: unitId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
        
    if (!profile || profile.role !== "teacher") redirect("/dashboard");

    const { data: unit } = await supabase
        .from("units")
        .select("id, module_id")
        .eq("id", unitId)
        .single();

    if (!unit) redirect("/dashboard");

    const { data: activitiesData } = await supabase
        .from("activities")
        .select(`
            id, unit_id, title, description, type, order_index, status, created_at, duration, difficulty, logo_url, position_x, position_y, grade_weight,
            activity_phases (
                id,
                activity_steps ( id, title, type, xp, grade_weight, order_index )
            )
        `)
        .eq("unit_id", unitId)
        .order("order_index", { ascending: true });

    const activityIds = activitiesData?.map(a => a.id) || [];
    let submissions: any[] = [];
    if (activityIds.length > 0) {
        const { data: subs } = await supabase
            .from("submissions")
            .select("*")
            .in("activity_id", activityIds);
        submissions = subs || [];
    }

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

    const EVALUABLE_TYPES = ['deliverable', 'quiz', 'file_upload'];

    const activities = activitiesData?.map(activity => {
        let totalXp = 0;
        const phases = Array.isArray(activity.activity_phases) ? activity.activity_phases : [];
        const evaluableSteps: Array<{ id: string; title: string; type: string; grade_weight: number }> = [];

        phases.forEach((phase: any) => {
            const steps = Array.isArray(phase.activity_steps) ? phase.activity_steps : [];
            steps.forEach((step: any) => {
                totalXp += (step.xp || 0);
                if (EVALUABLE_TYPES.includes(step.type)) {
                    evaluableSteps.push({
                        id: step.id,
                        title: step.title,
                        type: step.type,
                        grade_weight: step.grade_weight ?? 1.0,
                    });
                }
            });
        });

        return {
            ...activity,
            xp: totalXp,
            evaluableSteps,
        };
    });

    return (
        <div className="px-12 pb-12 h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <UnitEvaluationTab
                unitId={unit.id}
                activities={activities || []}
                students={students || []}
                submissions={submissions || []}
            />
        </div>
    );
}
