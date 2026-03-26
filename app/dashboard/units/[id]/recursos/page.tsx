import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { UnitResourcesTab } from "@/components/dashboard/units/unit-resources-tab";
import { getUnitAccess } from "@/lib/module-access";

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
        
    if (!profile || profile.role !== "teacher") redirect("/dashboard");

    const unitAccess = await getUnitAccess(unitId, user.id);
    if (!unitAccess?.permissions.canEditModuleContent) redirect("/dashboard");

    const { data: unit } = await admin
        .from("units")
        .select("id, resources")
        .eq("id", unitId)
        .single();

    if (!unit) redirect("/dashboard");

    return (
        <div className="px-12 pb-12 h-full overflow-y-auto">
            <UnitResourcesTab
                unitId={unit.id}
                initialResources={unit.resources || []}
            />
        </div>
    );
}
