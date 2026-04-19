import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ModuleLeaderboard } from "@/components/dashboard/modules/module-leaderboard";
import type { Metadata } from "next";
import { createAdminClient } from "@/utils/supabase/admin";

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const admin = createAdminClient();
    const { data: module } = await admin.from("modules").select("name").eq("id", id).single();
    return { title: `Ranking | ${module?.name || "Módulo"}` };
}

export default async function ModuleRankingPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile) redirect("/login");

    return <ModuleLeaderboard moduleId={id} userRole={profile.role as "teacher" | "student"} />;
}
