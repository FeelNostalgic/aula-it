import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { BadgesPageWrapper } from "./badges-page-wrapper";
import { getUnitAccess } from "@/lib/module-access";

export default async function InsigniasPage({
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

    const { data: classBadges } = await admin
        .from("class_badges")
        .select("*")
        .eq("unit_id", unitId)
        .order("created_at", { ascending: true });

    return (
        <div className="px-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <BadgesPageWrapper
                unitId={unitId}
                badges={classBadges || []}
                isTeacher={true}
            />
        </div>
    );
}
