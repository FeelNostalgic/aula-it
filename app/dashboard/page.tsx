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
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    // Fetch total unique students across all teacher's modules
    const moduleIds = modules?.map(m => m.id) || [];
    let totalStudents = 0;

    if (moduleIds.length > 0) {
      const { data: enrollments } = await supabase
        .from("module_enrollments")
        .select("student_id")
        .in("module_id", moduleIds);

      const uniqueStudents = new Set(enrollments?.map(e => e.student_id));
      totalStudents = uniqueStudents.size;
    }

    return <TeacherDashboard initialModules={modules || []} totalStudents={totalStudents} />;
  }

  // Fetch student enrolled modules
  const { data: enrollments } = await supabase
    .from("module_enrollments")
    .select("modules(*)")
    .eq("student_id", user.id);

  const enrolledModules = enrollments
    ?.map(e => e.modules)
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];

  return <StudentDashboard initialModules={enrolledModules as any[]} />;
}

