import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { getModuleAccess } from "@/lib/module-access";
import ModuleStudentsTab from "@/components/dashboard/modules/module-students-tab";
import {
    getRestrictedActionMessage,
} from "@/lib/module-collaborator-defs";
import type { Metadata } from "next";

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const admin = createAdminClient();
    const { data: module } = await admin.from("modules").select("name").eq("id", id).single();
    return { title: `Alumnos | ${module?.name || "Módulo"}` };
}

export default async function ModuleAlumnosPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "teacher") redirect("/dashboard");

    const moduleAccess = await getModuleAccess(id, user.id);
    if (!moduleAccess) redirect("/dashboard");

    const admin = createAdminClient();

    // Fetch enrolled students with completion data
    const { data: enrollmentsRaw } = await admin
        .from("module_enrollments")
        .select(`student_id, profiles ( id, full_name, avatar_url )`)
        .eq("module_id", id);

    const { data: usersData } = await admin.auth.admin.listUsers();
    const authMap = new Map(usersData?.users?.map((u) => [u.id, { email: u.email, avatar_url: u.user_metadata?.avatar_url }]) || []);

    const enrolledStudents = (enrollmentsRaw || []).map((e: any) => {
        const authData = authMap.get(e.student_id);
        return {
            id: e.profiles?.id,
            full_name: e.profiles?.full_name,
            avatar_url: e.profiles?.avatar_url || authData?.avatar_url || null,
            email: authData?.email ?? "sin_email@aula.it",
        };
    }).filter((s: any) => s.id);

    const canManageStudents = moduleAccess.permissions?.canManageStudents ?? true;
    const effectiveRole = moduleAccess.role;
    const restrictionMessage = effectiveRole
        ? getRestrictedActionMessage("canManageStudents", effectiveRole)
        : null;

    return (
        <ModuleStudentsTab
            moduleId={id}
            initialStudents={enrolledStudents as any[]}
            canManageStudents={canManageStudents}
            restrictionMessage={restrictionMessage}
        />
    );
}
