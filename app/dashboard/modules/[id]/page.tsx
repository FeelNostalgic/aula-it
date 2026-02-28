import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ModuleDetailView } from "@/components/dashboard/module-detail-view";

interface ModulePageProps {
    params: Promise<{ id: string }>;
}

export default async function ModulePage({ params }: ModulePageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Verify role
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        redirect("/dashboard");
    }

    // Fetch module (only if owned by this teacher)
    const { data: module } = await supabase
        .from("modules")
        .select("*")
        .eq("id", id)
        .eq("teacher_id", user.id)
        .single();

    if (!module) {
        notFound();
    }

    // Fetch units for this module
    const { data: units } = await supabase
        .from("units")
        .select("*")
        .eq("module_id", id)
        .order("order_index", { ascending: true });

    // Fetch enrolled students
    const { data: enrollments } = await supabase
        .from("module_enrollments")
        .select(`
            student_id,
            profiles (
                id,
                full_name
            )
        `)
        .eq("module_id", id);

    // Clean up the nested response
    let enrolledStudents = enrollments?.map(e => e.profiles) || [];

    if (enrolledStudents.length > 0) {
        const { createAdminClient } = await import("@/utils/supabase/admin");
        const adminSupabase = createAdminClient();
        const { data: usersData } = await adminSupabase.auth.admin.listUsers();
        if (usersData?.users) {
            const emailMap = new Map(usersData.users.map(u => [u.id, u.email]));
            enrolledStudents = enrolledStudents.map((s: any) => ({
                ...s,
                email: emailMap.get(s.id) || "sin_email@aula.it"
            }));
        }
    }

    return (
        <ModuleDetailView
            module={module}
            initialUnits={units || []}
            initialStudents={enrolledStudents as any[]}
        />
    );
}
