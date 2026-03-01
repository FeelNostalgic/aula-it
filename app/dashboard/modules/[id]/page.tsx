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

    // Verify role and access
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    let module = null;

    if (profile?.role === "teacher") {
        // Fetch module (owned by this teacher)
        const { data: ownedModule } = await supabase
            .from("modules")
            .select("*")
            .eq("id", id)
            .eq("teacher_id", user.id)
            .single();
        module = ownedModule;
    } else if (profile?.role === "student") {
        // Check enrollment
        const { data: enrollment } = await supabase
            .from("module_enrollments")
            .select("module_id")
            .eq("module_id", id)
            .eq("student_id", user.id)
            .single();

        if (enrollment) {
            // Fetch module info
            const { data: enrolledModule } = await supabase
                .from("modules")
                .select("*")
                .eq("id", id)
                .single();
            module = enrolledModule;
        }
    }

    if (!module) {
        notFound();
    }

    // Fetch units for this module with their activities to find the latest published one
    const { data: unitsData } = await supabase
        .from("units")
        .select(`
            *,
            activities (
                id,
                title,
                status,
                created_at
            )
        `)
        .eq("module_id", id)
        .order("order_index", { ascending: true });

    // Transform units to include the latest published activity
    const units = unitsData?.map(unit => {
        const latestPublished = (unit.activities as any[])
            ?.filter(a => a.status === "active")
            ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        return {
            ...unit,
            latest_activity: latestPublished || null
        };
    });

    // Fetch enrolled students
    const { data: enrollments } = await supabase
        .from("module_enrollments")
        .select(`
            student_id,
            profiles (
                id,
                full_name,
                avatar_url
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
            const authMap = new Map(usersData.users.map(u => [u.id, { email: u.email, avatar_url: u.user_metadata?.avatar_url }]));
            enrolledStudents = enrolledStudents.map((s: any) => {
                const authData = authMap.get(s.id);
                return {
                    ...s,
                    email: authData?.email || "sin_email@aula.it",
                    avatar_url: s.avatar_url || authData?.avatar_url || null,
                };
            });
        }
    }

    return (
        <ModuleDetailView
            module={module}
            initialUnits={units || []}
            initialStudents={enrolledStudents as any[]}
            userRole={profile?.role as "teacher" | "student"}
        />
    );
}
