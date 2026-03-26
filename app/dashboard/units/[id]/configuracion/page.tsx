import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { UnitSettingsTab } from "@/components/dashboard/units/unit-settings-tab";
import { getUnitAccess } from "@/lib/module-access";

export default async function ConfiguracionPage({
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
    if (!unitAccess?.permissions.canManageModuleSettings) redirect("/dashboard");

    const { data: unit } = await admin
        .from("units")
        .select("*")
        .eq("id", unitId)
        .single();

    if (!unit) redirect("/dashboard");

    return (
        <div className="px-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <UnitSettingsTab unit={unit} />
        </div>
    );
}
