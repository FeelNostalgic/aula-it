import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { getModuleAccess } from "@/lib/module-access";
import { ModuleDashboardView } from "@/components/dashboard/modules/module-dashboard-view";
import { loadStudentUnitProgressContext } from "@/lib/student-activity-progress";
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

    const unitProgressById = new Map<string, Awaited<ReturnType<typeof loadStudentUnitProgressContext>>>();

    if (profile.role === "student") {
        for (const unit of unitsData ?? []) {
            unitProgressById.set(unit.id, await loadStudentUnitProgressContext({
                unitId: unit.id,
                moduleId: id,
                userId: user.id,
            }));
        }
    }

    const now = new Date();
    const units = unitsData?.map((unit) => {
        const unitProgress = unitProgressById.get(unit.id) ?? null;
        const activitiesWithSubmissions = (unit.activities as any[] || []).map((a) => {
            const summary = unitProgress?.summariesByActivityId.get(a.id);
            const isPublished = a.status === "published" || a.status === "active";
            const isUnlocked = unitProgress?.unlockedActivityIds.has(a.id) ?? true;
            const countableSteps: any[] = [];
            a.activity_phases?.forEach((phase: any) => {
                phase.activity_steps?.forEach((step: any) => {
                    if (step.completion_mode !== "none") countableSteps.push(step);
                });
            });
            return {
                ...a,
                status: isPublished && !isUnlocked ? "blocked" : a.status,
                total_steps: summary?.trackedSteps ?? countableSteps.length,
                completed_steps: summary?.completedTrackedSteps ?? 0,
                countable_steps: countableSteps,
                activity_submissions: (summary?.completedTrackedSteps ?? 0) > 0 ? [{ id: "mock-id", status: "submitted" }] : [],
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
