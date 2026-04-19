import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { getModuleAccess } from "@/lib/module-access";
import { ModuleGroupsTab } from "@/components/dashboard/modules/module-groups-tab";
import { GroupSelfEnrollmentCard } from "@/components/dashboard/modules/group-self-enrollment-card";
import type { Metadata } from "next";

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const admin = createAdminClient();
    const { data: module } = await admin.from("modules").select("name").eq("id", id).single();
    return { title: `Grupos | ${module?.name || "Módulo"}` };
}

export default async function ModuleGruposPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile) redirect("/login");

    const isTeacher = profile.role === "teacher";

    if (!isTeacher) {
        return <GroupSelfEnrollmentCard moduleId={id} />;
    }

    const moduleAccess = await getModuleAccess(id, user.id);
    if (!moduleAccess) redirect("/dashboard");

    const admin = createAdminClient();

    // Fetch enrolled students for the groups tab
    const { data: enrollmentsRaw } = await admin
        .from("module_enrollments")
        .select(`student_id, profiles ( id, full_name, avatar_url )`)
        .eq("module_id", id);

    const { data: usersData } = await admin.auth.admin.listUsers();
    const authMap = new Map(usersData?.users?.map((u) => [u.id, { email: u.email }]) || []);

    const enrolledStudents = (enrollmentsRaw || []).map((e: any) => ({
        id: e.profiles?.id,
        full_name: e.profiles?.full_name,
        avatar_url: e.profiles?.avatar_url,
        email: authMap.get(e.student_id)?.email ?? null,
    })).filter((s: any) => s.id);

    const canManageStudents = moduleAccess.permissions?.canManageStudents ?? true;

    return (
        <ModuleGroupsTab
            moduleId={id}
            enrolledStudents={enrolledStudents as any[]}
            canManageStudents={canManageStudents}
        />
    );
}
