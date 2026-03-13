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
    // ── Module query: order_index + deep step structure for progress/due ──────
    const { data: modules } = await supabase
      .from("modules")
      .select(`
        *,
        order_index,
        enrolled_students:module_enrollments (
          student:profiles (
            id,
            avatar_url
          )
        ),
        units (
          id,
          activities (
            id,
            title,
            phases:activity_phases (
              steps:activity_steps (
                id,
                title,
                completion_mode,
                due_date
              )
            )
          )
        )
      `)
      .eq("teacher_id", user.id)
      .order("order_index", { ascending: true });

    // ── Collect all step IDs across all teacher modules ───────────────────────
    const allStepIds: string[] = [];
    for (const mod of modules || []) {
      for (const unit of ((mod as any).units || []) as any[]) {
        for (const activity of (unit.activities || []) as any[]) {
          for (const phase of (activity.phases || []) as any[]) {
            for (const step of (phase.steps || []) as any[]) {
              allStepIds.push(step.id);
            }
          }
        }
      }
    }

    // ── Fetch submissions & step_views for all teacher steps ─────────────────
    const [submissionsResult, stepViewsResult] = await Promise.all([
      allStepIds.length > 0
        ? supabase
            .from("activity_submissions")
            .select("student_id, step_id, status")
            .in("step_id", allStepIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      allStepIds.length > 0
        ? supabase
            .from("step_views")
            .select("student_id, step_id")
            .in("step_id", allStepIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    const allSubmissions: { student_id: string; step_id: string; status: string }[] =
      (submissionsResult.data as any) || [];
    const allViews: { student_id: string; step_id: string }[] =
      (stepViewsResult.data as any) || [];

    // Index for O(1) lookup
    const submittedSet = new Set(allSubmissions.map((s) => `${s.student_id}:${s.step_id}`));
    const viewedSet = new Set(allViews.map((v) => `${v.student_id}:${v.step_id}`));

    // ── Pending submissions count ─────────────────────────────────────────────
    const pendingSubmissions = allSubmissions.filter((s) => s.status === "submitted").length;

    // ── Total unique students ─────────────────────────────────────────────────
    const allStudents =
      modules?.flatMap((m) =>
        ((m as any).enrolled_students as any[])?.map((e: any) => e.student?.id)
      ) || [];
    const uniqueStudents = new Set(allStudents.filter(Boolean));
    const totalStudents = uniqueStudents.size;

    // ── Enrich each module ────────────────────────────────────────────────────
    const now = new Date();
    let globalEarliestDue: string | null = null;

    const enrichedModules = (modules || []).map((mod: any) => {
      const enrolledStudentIds: string[] = (mod.enrolled_students || [])
        .map((e: any) => e.student?.id)
        .filter(Boolean);

      // Flatten all steps for this module
      const moduleSteps: { 
        id: string; 
        completion_mode: string; 
        due_date: string | null; 
        activity_name: string;
        step_title: string;
      }[] = [];
      for (const unit of (mod.units || []) as any[]) {
        for (const activity of (unit.activities || []) as any[]) {
          for (const phase of (activity.phases || []) as any[]) {
            for (const step of (phase.steps || []) as any[]) {
              moduleSteps.push({
                id: step.id,
                completion_mode: step.completion_mode || "none",
                due_date: step.due_date || null,
                activity_name: activity.title || "Sin nombre",
                step_title: step.title || "Sin nombre",
              });
            }
          }
        }
      }

      const requiredSteps = moduleSteps.filter((s) => s.completion_mode === "required");
      const viewableSteps = moduleSteps.filter((s) => s.completion_mode === "viewable");
      const totalTracked = requiredSteps.length + viewableSteps.length;

      // Progress: avg ratio across enrolled students
      let progress = 0;
      if (totalTracked > 0 && enrolledStudentIds.length > 0) {
        let totalRatio = 0;
        for (const studentId of enrolledStudentIds) {
          let completed = 0;
          for (const step of requiredSteps) {
            if (submittedSet.has(`${studentId}:${step.id}`)) completed++;
          }
          for (const step of viewableSteps) {
            if (viewedSet.has(`${studentId}:${step.id}`)) completed++;
          }
          totalRatio += completed / totalTracked;
        }
        progress = Math.round((totalRatio / enrolledStudentIds.length) * 100);
      }

      // next_due_step: earliest future due_date among required steps
      let nextDueStep: { title: string; due_date: string } | null = null;
      let earliestDue: Date | null = null;
      for (const step of requiredSteps) {
        if (!step.due_date) continue;
        const d = new Date(step.due_date);
        if (d > now && (!earliestDue || d < earliestDue)) {
          earliestDue = d;
          nextDueStep = { title: step.step_title, due_date: step.due_date };
        }
      }

      // Track global earliest due date
      if (earliestDue) {
        if (!globalEarliestDue || earliestDue < new Date(globalEarliestDue)) {
          globalEarliestDue = earliestDue.toISOString();
        }
      }

      // Return enriched module — strip deep units nesting from component shape
      const { units: _units, ...modWithoutUnits } = mod;
      return {
        ...modWithoutUnits,
        progress,
        next_due_step: nextDueStep,
      };
    });

    // ── Teacher stats ─────────────────────────────────────────────────────────
    const teacherStats = {
      totalModules: enrichedModules.length,
      activeModules: enrichedModules.filter((m: any) => m.status === "active").length,
      totalStudents,
      pendingSubmissions,
      nextDueDate: globalEarliestDue,
    };

    return (
      <TeacherDashboard
        initialModules={enrichedModules as any}
        totalStudents={totalStudents}
        teacherStats={teacherStats}
      />
    );
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
            title,
            activity_phases (
              activity_steps (
                id,
                title,
                completion_mode,
                due_date
              )
            )
          )
        )
      )
    `)
    .eq("student_id", user.id);

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

  // 3. Fetch step views for viewable steps progress
  const { data: stepViews } = await supabase
    .from('step_views')
    .select('step_id')
    .eq('student_id', user.id)
  const viewedStepIds = new Set(stepViews?.map(v => v.step_id) ?? [])

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
          // Only count steps where completion_mode !== 'none'
          const countableSteps: Array<{ id: string; title: string; completion_mode: string }> = [];
          activity.activity_phases?.forEach((phase: any) => {
            phase.activity_steps?.forEach((step: any) => {
              if (step.completion_mode !== 'none') {
                countableSteps.push(step);
              }
            });
          });

          if (countableSteps.length === 0) return false;

          const allCountableDone = countableSteps.every(step => {
            if (step.completion_mode === 'viewable') {
              return viewedStepIds.has(step.id);
            }
            // 'required': must have a submission entry
            return activityCompletionMap[activity.id]?.has(step.id) ?? false;
          });

          return allCountableDone;
        });

        if (allActivitiesDone) {
          completedUnitsCount++;
        }
      });

      // Find next_due_step for student
      const now = new Date();
      let nextDueStep: { title: string; due_date: string } | null = null;
      let earliestDue: Date | null = null;

      for (const unit of (m.units || [])) {
        for (const activity of (unit.activities || [])) {
          for (const phase of (activity.activity_phases || [])) {
            for (const step of (phase.activity_steps || [])) {
              if (step.completion_mode !== 'required' || !step.due_date) continue;
              const d = new Date(step.due_date);
              if (d > now && (!earliestDue || d < earliestDue)) {
                earliestDue = d;
                nextDueStep = { title: step.title || activity.title || "Sin nombre", due_date: step.due_date };
              }
            }
          }
        }
      }

      return {
        ...m,
        module_xp: e.module_xp || 0,
        total_units: validUnits.length,
        completed_units: completedUnitsCount,
        next_due_step: nextDueStep,
      };
    })
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];

  return <StudentDashboard initialModules={enrichedModules} />;
}

