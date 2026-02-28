import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ModuleDetailView } from "@/components/dashboard/module-detail-view";

interface ModulePageProps {
    params: Promise<{ id: string }>;
}

export default async function ModulePage({ params }: ModulePageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Verify role
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "teacher") {
        redirect("/dashboard");
    }

    // Fetch module (only if owned by this teacher)
    const { data: module } = await supabase
        .from("modules")
        .select("*")
        .eq("id", id)
        .eq("teacher_id", user.id)
        .single();

    if (!module) {
        notFound();
    }

    // Fetch units for this module
    const { data: units } = await supabase
        .from("units")
        .select("*")
        .eq("module_id", id)
        .order("order_index", { ascending: true });

    return (
        <ModuleDetailView
            module={module}
            initialUnits={units || []}
        />
    );
}
