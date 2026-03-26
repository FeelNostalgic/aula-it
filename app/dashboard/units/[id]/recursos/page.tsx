import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { UnitResourcesTab } from "@/components/dashboard/units/unit-resources-tab";

export default async function RecursosPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: unitId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
        
    if (!profile || profile.role !== "teacher") redirect("/dashboard");

    const { data: unit } = await supabase
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
