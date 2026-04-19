import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { getModuleAccess } from "@/lib/module-access";
import { ModuleLayoutShell } from "@/components/dashboard/modules/module-layout-shell";

export default async function ModuleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id: moduleId } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile) redirect("/login");

    const isTeacher = profile.role === "teacher";

    // Fetch module for breadcrumbs and access checks
    // Students: verify enrollment instead of moduleAccess
    let module: { id: string; name: string } | null = null;
    let moduleRole = null;
    let modulePermissions = null;

    if (isTeacher) {
        const moduleAccess = await getModuleAccess(moduleId, user.id);
        if (!moduleAccess) redirect("/dashboard");

        const { data } = await admin
            .from("modules")
            .select("id, name")
            .eq("id", moduleId)
            .single();

        if (!data) redirect("/dashboard");
        module = data;
        moduleRole = moduleAccess.role;
        modulePermissions = moduleAccess.permissions;
    } else {
        // Student: verify enrollment
        const { data: enrollment } = await supabase
            .from("module_enrollments")
            .select("module_id")
            .eq("module_id", moduleId)
            .eq("student_id", user.id)
            .single();

        if (!enrollment) redirect("/dashboard");

        const { data } = await supabase
            .from("modules")
            .select("id, name")
            .eq("id", moduleId)
            .single();

        if (!data) redirect("/dashboard");
        module = data;
    }

    return (
        <ModuleLayoutShell
            module={module}
            moduleRole={moduleRole}
            modulePermissions={modulePermissions}
            isTeacher={isTeacher}
        >
            {children}
        </ModuleLayoutShell>
    );
}
