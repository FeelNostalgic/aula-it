import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { getModuleAccess } from "@/lib/module-access";
import { ModuleDashboardView } from "@/components/dashboard/modules/module-dashboard-view";
import type { Metadata } from "next";

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const admin = createAdminClient();
    const { data: module } = await admin.from("modules").select("name").eq("id", id).single();
    return { title: module?.name || "Módulo" };
}

export default async function ModuleDashboardPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (!profile) redirect("/login");

    let module = null;
    let moduleAccess = null;
    let studentModuleXp = 0;

    if (profile.role === "teacher") {
        moduleAccess = await getModuleAccess(id, user.id);
        if (moduleAccess) {
            const { data } = await admin.from("modules").select("*").eq("id", id).single();
            module = data;
        }
    } else if (profile.role === "student") {
        const { data: enrollment } = await supabase
            .from("module_enrollments")
            .select("module_id, module_xp")
            .eq("module_id", id)
            .eq("student_id", user.id)
            .single();

        studentModuleXp = enrollment?.module_xp || 0;

        if (enrollment) {
            const { data } = await supabase.from("modules").select("*").eq("id", id).single();
            module = data;
        }
    }

    if (!module) notFound();

    if (profile.role === "student" && (module.status === "draft" || module.status === "pending")) {
        redirect("/dashboard?error=module_not_available");
    }

    const moduleDataClient = profile.role === "teacher" ? admin : supabase;

    const { data: unitsData } = await moduleDataClient
        .from("units")
        .select(`
            *,
            activities (
                id,
                title,
                status,
                created_at,
                activity_phases (
                    activity_steps (
                        id,
                        title,
                        completion_mode,
                        due_date
                    )
                )
            )
        `)
        .eq("module_id", id)
        .in("status", profile.role === "student" ? ["published", "blocked", "active"] : ["draft", "published", "blocked", "active", "archived"])
        .order("order_index", { ascending: true });

    const activityCompletionMap: Record<string, Set<string>> = {};
    let viewedStepIds = new Set<string>();

    if (profile.role === "student") {
        const { data: moduleSubmissions } = await supabase
            .from("activity_submissions")
            .select(`step_id, step:activity_steps ( phase:activity_phases ( activity_id ) )`)
            .eq("student_id", user.id);

        moduleSubmissions?.forEach((s: any) => {
            const actId = s.step?.phase?.activity_id;
            if (actId) {
                if (!activityCompletionMap[actId]) activityCompletionMap[actId] = new Set();
                activityCompletionMap[actId].add(s.step_id);
            }
        });

        const { data: stepViews } = await supabase.from("step_views").select("step_id").eq("student_id", user.id);
        viewedStepIds = new Set(stepViews?.map((v) => v.step_id) ?? []);
    }

    const now = new Date();
    const units = unitsData?.map((unit) => {
        const activitiesWithSubmissions = (unit.activities as any[] || []).map((a) => {
            const countableSteps: any[] = [];
            a.activity_phases?.forEach((phase: any) => {
                phase.activity_steps?.forEach((step: any) => {
                    if (step.completion_mode !== "none") countableSteps.push(step);
                });
            });
            const totalSteps = countableSteps.length;
            const completedSteps = countableSteps.filter((step) => {
                if (step.completion_mode === "viewable") return viewedStepIds.has(step.id);
                return activityCompletionMap[a.id]?.has(step.id) ?? false;
            }).length;
            return {
                ...a,
                total_steps: totalSteps,
                completed_steps: completedSteps,
                countable_steps: countableSteps,
                activity_submissions: completedSteps > 0 ? [{ id: "mock-id", status: "submitted" }] : [],
            };
        });

        let nextDueStep: { title: string; due_date: string } | null = null;
        let earliestDue: Date | null = null;
        activitiesWithSubmissions.forEach((activity) => {
            (activity.countable_steps as any[]).forEach((step) => {
                if (step.completion_mode !== "required" || !step.due_date) return;
                const d = new Date(step.due_date);
                if (d > now && (!earliestDue || d < earliestDue)) {
                    earliestDue = d;
                    nextDueStep = { title: `${activity.title} - ${step.title || "Sin nombre"}`, due_date: step.due_date };
                }
            });
        });

        const latestPublished = activitiesWithSubmissions
            ?.filter((a) => a.status === "published" || a.status === "active")
            ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        return { ...unit, activities: activitiesWithSubmissions, latest_activity: latestPublished || null, next_due_step: nextDueStep };
    });

    return (
        <ModuleDashboardView
            module={module}
            initialUnits={units || []}
            userRole={profile.role as "teacher" | "student"}
            moduleRole={moduleAccess?.role ?? null}
            modulePermissions={moduleAccess?.permissions ?? null}
        />
    );
}
