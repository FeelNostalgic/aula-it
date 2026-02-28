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

    return <TeacherDashboard initialModules={modules || []} />;
  }

  return <StudentDashboard />;
}

