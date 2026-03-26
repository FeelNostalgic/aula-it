import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { UnitLayoutShell } from "@/components/dashboard/units/unit-layout-shell";

export default async function UnitLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}) {
    const { id: unitId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
        
    if (!profile) redirect("/login");
    const userRole = profile.role as "teacher" | "student";

    // Students only need the children (which will be the page.tsx rendering UnitDetailView)
    if (userRole === "student") {
        return <>{children}</>;
    }

    // Teacher specific layout fetching
    const { data: unit, error: unitError } = await supabase
        .from("units")
        .select("*")
        .eq("id", unitId)
        .single();

    if (unitError || !unit) {
        redirect("/dashboard");
    }

    const { data: module } = await supabase
        .from("modules")
        .select("id, name")
        .eq("id", unit.module_id)
        .single();

    return (
        <UnitLayoutShell unit={unit} module={module}>
            {children}
        </UnitLayoutShell>
    );
}
