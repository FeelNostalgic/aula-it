import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { UnitSettingsTab } from "@/components/dashboard/units/unit-settings-tab";

export default async function ConfiguracionPage({
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
