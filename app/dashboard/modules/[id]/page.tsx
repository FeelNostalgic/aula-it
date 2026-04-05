import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { ModuleDetailView } from "@/components/dashboard/modules/module-detail-view";
import { getModuleAccess } from "@/lib/module-access";

interface ModulePageProps {
    params: Promise<{ id: string }>;
}

// Force dynamic to ensure data is always fresh after revalidations
export const dynamic = "force-dynamic";

export default async function ModulePage({ params }: ModulePageProps) {
    const { id } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Verify role and access
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    let studentModuleXp = 0;

    let module = null;
    let moduleAccess = null;

    if (profile?.role === "teacher") {
        moduleAccess = await getModuleAccess(id, user.id);
        if (moduleAccess) {
            const { data: accessibleModule } = await admin
                .from("modules")
                .select("*")
                .eq("id", id)
                .single();
            module = accessibleModule;
        }
    } else if (profile?.role === "student") {
        // Check enrollment
        const { data: enrollment } = await supabase
            .from("module_enrollments")
            .select("module_id, module_xp")
            .eq("module_id", id)
            .eq("student_id", user.id)
            .single();

        studentModuleXp = enrollment?.module_xp || 0;

        if (enrollment) {
            // Fetch module info
            const { data: enrolledModule } = await supabase
                .from("modules")
                .select("*")
                .eq("id", id)
                .single();
            module = enrolledModule;
        }
    }

    if (!module) {
        notFound();
    }

    // Access Control: Block students if module is draft or pending
    if (profile?.role === "student" && (module.status === "draft" || module.status === "pending")) {
        redirect("/dashboard?error=module_not_available");
    }

    const moduleDataClient = profile?.role === "teacher" ? admin : supabase;

    // Fetch units for this module with their activities and nested steps
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
        .in("status", profile?.role === "student" ? ["published", "blocked", "active"] : ["draft", "published", "blocked", "active", "archived"])
        .order("order_index", { ascending: true });

    // Fetch submissions for this module's activities (if student)
    const activityCompletionMap: Record<string, Set<string>> = {};
    let viewedStepIds = new Set<string>();
    if (profile?.role === "student") {
        const { data: moduleSubmissions } = await supabase
            .from("activity_submissions")
            .select(`
                step_id,
                step:activity_steps (
                    phase:activity_phases (
                        activity_id
                    )
                )
            `)
            .eq("student_id", user.id);

        moduleSubmissions?.forEach((s: any) => {
            const actId = s.step?.phase?.activity_id;
            if (actId) {
                if (!activityCompletionMap[actId]) activityCompletionMap[actId] = new Set();
                activityCompletionMap[actId].add(s.step_id);
            }
        });

        const { data: stepViews } = await supabase
            .from('step_views')
            .select('step_id')
            .eq('student_id', user.id);
        viewedStepIds = new Set(stepViews?.map(v => v.step_id) ?? []);
    }

    // Transform units to include submission data and latest activity
    const now = new Date();
    const units = unitsData?.map(unit => {
        const activitiesWithSubmissions = (unit.activities as any[] || []).map(a => {
            // Only count steps where completion_mode !== 'none'
            const countableSteps: Array<{ id: string; title: string; completion_mode: string; due_date: string | null }> = [];
            a.activity_phases?.forEach((phase: any) => {
                phase.activity_steps?.forEach((step: any) => {
                    if (step.completion_mode !== 'none') {
                        countableSteps.push(step);
                    }
                });
            });
            const totalSteps = countableSteps.length;
            const completedSteps = countableSteps.filter(step => {
                if (step.completion_mode === 'viewable') {
                    return viewedStepIds.has(step.id);
                }
                // 'required': must have a submission entry
                return activityCompletionMap[a.id]?.has(step.id) ?? false;
            }).length;

            return {
                ...a,
                total_steps: totalSteps,
                completed_steps: completedSteps,
                countable_steps: countableSteps, // Keep reference for next_due_step
                // Legacy compatibility for any child components still using activity_submissions
                activity_submissions: completedSteps > 0 ? [{ id: 'mock-id', status: 'submitted' }] : []
            }
        });

        // Find next_due_step for the unit
        let nextDueStep: { title: string; due_date: string } | null = null;
        let earliestDue: Date | null = null;

        activitiesWithSubmissions.forEach(activity => {
            (activity.countable_steps as any[]).forEach(step => {
                if (step.completion_mode !== 'required' || !step.due_date) return;
                const d = new Date(step.due_date);
                if (d > now && (!earliestDue || d < earliestDue)) {
                    earliestDue = d;
                    // Format as "{Challenge} - {Activity}"
                    nextDueStep = { 
                        title: `${activity.title} - ${step.title || "Sin nombre"}`, 
                        due_date: step.due_date 
                    };
                }
            });
        });

        const latestPublished = activitiesWithSubmissions
            ?.filter(a => a.status === "published" || a.status === "active")
            ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        return {
            ...unit,
            activities: activitiesWithSubmissions,
            latest_activity: latestPublished || null,
            next_due_step: nextDueStep
        };
    });

    // Countable steps for the entire module
    const allCountableSteps: Array<{ id: string; completion_mode: string }> = [];
    units?.forEach(u => {
        u.activities?.forEach((a: any) => {
            a.countable_steps?.forEach((s: any) => {
                allCountableSteps.push({ id: s.id, completion_mode: s.completion_mode });
            });
        });
    });
    const totalCountableSteps = allCountableSteps.length;

    // Fetch enrolled students
    const { data: enrollments } = await moduleDataClient
        .from("module_enrollments")
        .select(`
            student_id,
            profiles (
                id,
                full_name,
                avatar_url
            )
        `)
        .eq("module_id", id);

    // Clean up the nested response
    let enrolledStudents = enrollments?.map(e => e.profiles) || [];

    if (enrolledStudents.length > 0) {
        const { createAdminClient } = await import("@/utils/supabase/admin");
        const adminSupabase = createAdminClient();
        const { data: usersData } = await adminSupabase.auth.admin.listUsers();
        
        const authMap = new Map(usersData?.users?.map(u => [u.id, { email: u.email, avatar_url: u.user_metadata?.avatar_url }]) || []);
        
        // Enrichment for Teacher: fetch all submissions/views for enrolled students
        let allSubmissions: any[] = [];
        let allViews: any[] = [];

        if (profile?.role === "teacher") {
            const studentIds = enrolledStudents.map((s: any) => s.id);
            const requiredStepIds = allCountableSteps.filter(s => s.completion_mode === 'required').map(s => s.id);
            const viewableStepIds = allCountableSteps.filter(s => s.completion_mode === 'viewable').map(s => s.id);

            if (requiredStepIds.length > 0) {
                const { data } = await moduleDataClient
                    .from("activity_submissions")
                    .select("student_id, step_id, submitted_at")
                    .in("student_id", studentIds)
                    .in("step_id", requiredStepIds);
                allSubmissions = data || [];
            }

            if (viewableStepIds.length > 0) {
                const { data } = await moduleDataClient
                    .from("step_views")
                    .select("student_id, step_id, created_at")
                    .in("student_id", studentIds)
                    .in("step_id", viewableStepIds);
                allViews = data || [];
            }
        }

        enrolledStudents = enrolledStudents.map((s: any) => {
            const authData = authMap.get(s.id);
            
            let enrichedData = {};
            if (profile?.role === "teacher") {
                const studentSubmissions = allSubmissions.filter(sub => sub.student_id === s.id);
                const studentViews = allViews.filter(v => v.student_id === s.id);
                
                const completedCount = studentSubmissions.length + studentViews.length;
                
                const lastSub = [...studentSubmissions].sort((a, b) => new Date(b.submitted_at!).getTime() - new Date(a.submitted_at!).getTime())[0];
                const lastView = [...studentViews].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                
                let lastActivity = null;
                if (lastSub && lastView) {
                    lastActivity = new Date(lastSub.submitted_at!) > new Date(lastView.created_at) ? lastSub.submitted_at : lastView.created_at;
                } else {
                    lastActivity = lastSub?.submitted_at || lastView?.created_at || null;
                }

                enrichedData = {
                    total_steps: totalCountableSteps,
                    completed_steps: completedCount,
                    last_activity: lastActivity
                };
            }

            return {
                ...s,
                email: authData?.email || "sin_email@aula.it",
                avatar_url: s.avatar_url || authData?.avatar_url || null,
                ...enrichedData
            };
        });
    }

    return (
        <ModuleDetailView
            module={module}
            initialUnits={units || []}
            initialStudents={enrolledStudents as any[]}
            userRole={profile?.role as "teacher" | "student"}
            moduleRole={moduleAccess?.role ?? null}
            modulePermissions={moduleAccess?.permissions ?? null}
            moduleXp={studentModuleXp}
        />
    );
}
