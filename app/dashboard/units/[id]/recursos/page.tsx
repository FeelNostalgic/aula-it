import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { UnitResourcesTab } from "@/components/dashboard/units/unit-resources-tab";
import { getUnitAccess } from "@/lib/module-access";
import { StudentUnitResourcesPage } from "@/components/dashboard/units/student-unit-resources-page";
import { Metadata } from "next";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const admin = createAdminClient();
    const { data: unit } = await admin
        .from("units")
        .select("name")
        .eq("id", id)
        .single();

    return {
        title: unit ? `Recursos | ${unit.name}` : "Recursos",
    };
}

export default async function RecursosPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: unitId } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
        
    if (!profile) redirect("/dashboard");

    if (profile.role === "teacher") {
        const unitAccess = await getUnitAccess(unitId, user.id);
        if (!unitAccess?.permissions.canEditModuleContent) redirect("/dashboard");

        const { data: unit } = await admin
            .from("units")
            .select("id, resources")
            .eq("id", unitId)
            .single();

        if (!unit) redirect("/dashboard");

        return (
            <div className="h-full overflow-y-auto pb-12">
                <UnitResourcesTab
                    unitId={unit.id}
                    initialResources={unit.resources || []}
                />
            </div>
        );
    }

    const { data: unit } = await supabase
        .from("units")
        .select("id, name, description, status, view_type, module_id, resources")
        .eq("id", unitId)
        .single();

    if (!unit) redirect("/dashboard");

    const { data: module } = await supabase
        .from("modules")
        .select("id, name")
        .eq("id", unit.module_id)
        .single();

    if (!module) redirect("/dashboard");

    return (
        <StudentUnitResourcesPage unit={unit} module={module} />
    );
}
