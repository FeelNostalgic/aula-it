import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { getModuleAccess } from "@/lib/module-access";
import { ModuleCollaboratorsTab } from "@/components/dashboard/modules/module-collaborators-dialog";
import type { Metadata } from "next";

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const admin = createAdminClient();
    const { data: module } = await admin.from("modules").select("name").eq("id", id).single();
    return { title: `Profesores | ${module?.name || "Módulo"}` };
}

export default async function ModuleProfesoresPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "teacher") redirect("/dashboard");

    const moduleAccess = await getModuleAccess(id, user.id);
    if (!moduleAccess) redirect("/dashboard");

    const canManageCollaborators = moduleAccess.permissions?.canManageCollaborators ?? false;
    const effectiveRole = moduleAccess.role;

    return (
        <ModuleCollaboratorsTab
            moduleId={id}
            canManageCollaborators={canManageCollaborators}
            moduleRole={effectiveRole}
        />
    );
}
