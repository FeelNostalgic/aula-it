import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { RubricCriteria } from "@/types/activity";
import { StudentUnitGradesPage } from "@/components/dashboard/units/student-unit-grades-page";

const EVALUABLE_STEP_TYPES = {
    DELIVERABLE: "deliverable",
    QUIZ: "quiz",
    FILE_UPLOAD: "file_upload",
    SELF_EVALUATION: "self_evaluation",
    PEER_EVALUATION: "peer_evaluation",
} as const;

const EVALUABLE_STEP_TYPE_SET = new Set<string>(Object.values(EVALUABLE_STEP_TYPES));

export default async function NotasPage({
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
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle();

    if (profile?.role === "teacher") redirect(`/dashboard/units/${unitId}/evaluacion`);

    const { data: unit } = await supabase
        .from("units")
        .select("id, name, description, status, view_type, module_id")
        .eq("id", unitId)
        .single();

    if (!unit) redirect("/dashboard");

    const { data: moduleData } = await supabase
        .from("modules")
        .select("id, name")
        .eq("id", unit.module_id)
        .maybeSingle();
    const module = moduleData ?? { id: unit.module_id, name: "Módulo" };

    const { data: activitiesData } = await supabase
        .from("activities")
        .select(`
            id,
            title,
            order_index,
            grade_weight,
            activity_phases (
                id,
                activity_steps (
                    id,
                    title,
                    type,
                    grade_weight,
                    parent_step_id,
                    content
                )
            )
        `)
        .eq("unit_id", unitId)
        .order("order_index", { ascending: true });

    const activities = (activitiesData ?? []).map((activity: any) => {
        const evaluableSteps: Array<{
            id: string;
            title: string;
            grade_weight: number;
            rubric: RubricCriteria[];
        }> = [];

        const phases = Array.isArray(activity.activity_phases) ? activity.activity_phases : [];
        phases.forEach((phase: any) => {
            const steps = Array.isArray(phase.activity_steps) ? phase.activity_steps : [];
            steps.forEach((step: any) => {
                if (!EVALUABLE_STEP_TYPE_SET.has(step.type) || step.parent_step_id) return;
                const stepContent = (step.content ?? {}) as { rubric?: RubricCriteria[] };
                evaluableSteps.push({
                    id: step.id,
                    title: step.title,
                    grade_weight: step.grade_weight ?? 1.0,
                    rubric: stepContent.rubric ?? [],
                });
            });
        });

        return {
            id: activity.id,
            title: activity.title,
            order_index: activity.order_index ?? 0,
            grade_weight: activity.grade_weight ?? 1.0,
            evaluableSteps,
        };
    });

    const stepIds = activities.flatMap((activity) => activity.evaluableSteps.map((step) => step.id));
    let submissions: Array<{
        step_id: string;
        status: string;
        score: number | null;
        grading_mode: "score" | "rubric" | "complete" | null;
        rubric_scores: Record<string, number> | null;
    }> = [];

    if (stepIds.length > 0) {
        const { data: submissionRows } = await supabase
            .from("activity_submissions")
            .select("step_id, status, score, grading_mode, rubric_scores")
            .eq("student_id", user.id)
            .in("step_id", stepIds);

        submissions = (submissionRows ?? []).map((row: any) => ({
            step_id: row.step_id,
            status: row.status,
            score: row.score,
            grading_mode: row.grading_mode,
            rubric_scores: row.rubric_scores,
        }));
    }

    const studentName = profile?.full_name ?? user.email ?? "Alumno";

    return (
        <StudentUnitGradesPage
            unit={unit}
            module={module}
            studentName={studentName}
            activities={activities}
            submissions={submissions}
        />
    );
}
