import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { MilestonePageWrapper } from "./milestone-page-wrapper";
import { getUnitAccess } from "@/lib/module-access";

export default async function HitosPage({
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

    const { data: unitMilestones } = await admin
        .from("class_milestones")
        .select("*")
        .eq("unit_id", unitId)
        .order("target_points", { ascending: true });

    return (
        <div className="px-12 pb-12">
            <MilestonePageWrapper 
                unitId={unitId} 
                milestones={unitMilestones || []} 
                isTeacher={true} 
            />
        </div>
    );
}
