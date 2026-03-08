import { createClient } from "@/utils/supabase/server";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch role from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role || "student";

  if (role === "teacher") {
    const { data: modules } = await supabase
      .from("modules")
      .select(`
        *,
        enrolled_students:module_enrollments (
          student:profiles (
            id,
            avatar_url
          )
        )
      `)
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    // Calculate total unique students across all teacher's modules
    const allStudents = modules?.flatMap(m => m.enrolled_students?.map((e: any) => e.student?.id)) || [];
    const uniqueStudents = new Set(allStudents.filter(Boolean));
    const totalStudents = uniqueStudents.size;

    return <TeacherDashboard initialModules={(modules as any) || []} totalStudents={totalStudents} />;
  }

  // 1. Fetch student enrolled modules and unit structure with nested steps for count
  const { data: enrollments } = await supabase
    .from("module_enrollments")
    .select(`
      module_xp,
      modules (
        *,
        units (
          id,
          status,
          activities (
            id,
            activity_phases (
              activity_steps (
                id
              )
            )
          )
        )
      )
    `)
    .eq("student_id", user.id);

  // 1.5 Fetch active class milestone
  const { data: activeMilestone } = await supabase
    .from("class_milestones")
    .select("*")
    .eq("status", "active")
    .maybeSingle();

  // 2. Fetch all student submissions with their activity_id for progress calculation
  const { data: submissions } = await supabase
    .from("activity_submissions")
    .select(`
      step_id,
      step:activity_steps (
        phase:activity_phases (
          activity_id
        )
      )
    `)
    .eq("student_id", user.id);

  // Create a map of activity_id -> Set of completed step_ids
  const activityCompletionMap: Record<string, Set<string>> = {};
  submissions?.forEach((s: any) => {
    const actId = s.step?.phase?.activity_id;
    if (actId) {
      if (!activityCompletionMap[actId]) activityCompletionMap[actId] = new Set();
      activityCompletionMap[actId].add(s.step_id);
    }
  });

  const enrichedModules = enrollments
    ?.filter(e => e.modules && (e.modules as any).status !== "archived")
    .map(e => {
      const m = e.modules as any;
      const validUnits = (m.units || []).filter((u: any) => ["published", "blocked", "active"].includes(u.status || "draft"));

      // Calculate completed units
      let completedUnitsCount = 0;
      validUnits.forEach((unit: any) => {
        const unitActivities = unit.activities || [];
        if (unitActivities.length === 0) return;

        const allActivitiesDone = unitActivities.every((activity: any) => {
          // Flatten phases and steps to get total step count for this activity
          const totalSteps = activity.activity_phases?.reduce((acc: number, phase: any) => {
            return acc + (phase.activity_steps?.length || 0);
          }, 0) || 0;

          if (totalSteps === 0) return false;

          const completedStepsCount = activityCompletionMap[activity.id]?.size || 0;
          return completedStepsCount >= totalSteps;
        });

        if (allActivitiesDone) {
          completedUnitsCount++;
        }
      });

      return {
        ...m,
        module_xp: e.module_xp || 0,
        total_units: validUnits.length,
        completed_units: completedUnitsCount
      };
    })
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];

  return <StudentDashboard initialModules={enrichedModules} activeMilestone={activeMilestone} />;
}

