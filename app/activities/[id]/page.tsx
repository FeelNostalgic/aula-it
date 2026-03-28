import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { notFound, redirect } from "next/navigation";
import { StudentActivityClient } from "./client";
import { getStudentSubmissionsForActivity } from "./actions";
import { getActivityAccess } from "@/lib/module-access";

export default async function ActivityPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, google_email")
        .eq("id", user.id)
        .single();

    const isTeacher = profile?.role === "teacher";
    const activityAccess = isTeacher ? await getActivityAccess(id, user.id) : null;

    if (isTeacher && !activityAccess?.permissions.canViewModule) {
        redirect("/dashboard");
    }

    const dataClient = isTeacher ? admin : supabase;
    const isReadOnlyTeacher = isTeacher && !(activityAccess?.permissions.canEditModuleContent ?? false);

    const { data: activity, error } = await dataClient
        .from("activities")
        .select(`
          *,
            unit:units(
              id,
              name,
              module_id,
              module:modules(id, name)
            )
        `)
        .eq("id", id)
        .single();

    if (error || !activity) {
        console.error("Activity not found:", error);
        notFound();
    }

    const { data: phases, error: phasesError } = await dataClient
        .from("activity_phases")
        .select(`
            *,
            steps:activity_steps(*)
        `)
        .eq("activity_id", id)
        .order("order_index", { ascending: true });

    let initialPhases = phases || [];
    if (!phasesError) {
        initialPhases = initialPhases.map((phase) => ({
            ...phase,
            steps: (phase.steps || []).sort((a: any, b: any) => a.order_index - b.order_index),
        }));
    }

    const submissionsMap = isTeacher ? {} : await getStudentSubmissionsForActivity(id);

    const { data: classBadges } = await dataClient
        .from("class_badges")
        .select("*")
        .eq("activity_id", id);

    const classBadgeIds = classBadges?.map((badge: any) => badge.id) || [];
    let earnedBadgeIds: string[] = [];

    if (!isTeacher && classBadgeIds.length > 0) {
        const { data: studentBadges } = await supabase
            .from("student_badges")
            .select("badge_id")
            .eq("student_id", user.id)
            .in("badge_id", classBadgeIds);
        earnedBadgeIds = studentBadges?.map((badge: any) => badge.badge_id) || [];
    }

    const allStepIds = initialPhases.flatMap((phase: any) =>
        (phase.steps || []).map((step: any) => step.id),
    );

    if (!isTeacher && allStepIds.length > 0) {
        const { data: extensions } = await supabase
            .from("deadline_extensions")
            .select("step_id, extended_until")
            .eq("student_id", user.id)
            .in("step_id", allStepIds);

        if (extensions && extensions.length > 0) {
            const extMap = Object.fromEntries(extensions.map((extension: any) => [extension.step_id, extension.extended_until]));
            initialPhases = initialPhases.map((phase: any) => ({
                ...phase,
                steps: (phase.steps || []).map((step: any) => {
                    const extension = extMap[step.id];
                    if (!extension) return step;

                    const extDate = new Date(extension);
                    const dueDate = step.due_date ? new Date(step.due_date) : null;
                    if (!dueDate || extDate > dueDate) {
                        return { ...step, due_date: extension };
                    }

                    return step;
                }),
            }));
        }
    }

    // Fetch student's group name + color for this module (used to show group badge in viewers)
    let studentGroupName: string | null = null;
    let studentGroupColor: string | null = null;
    if (!isTeacher && activity.unit?.module_id) {
        const admin = createAdminClient();
        const moduleId = activity.unit.module_id;
        const { data: moduleGroups } = await admin
            .from("module_groups")
            .select("id")
            .eq("module_id", moduleId)
            .eq("status", "active");
        const groupIds = (moduleGroups ?? []).map((g: any) => g.id);
        if (groupIds.length > 0) {
            const { data: memberRow } = await admin
                .from("module_group_members")
                .select("group:module_groups(name, color)")
                .eq("student_id", user.id)
                .in("group_id", groupIds)
                .maybeSingle();
            studentGroupName = (memberRow?.group as any)?.name ?? null;
            studentGroupColor = (memberRow?.group as any)?.color ?? null;
        }
    }

    let viewsMap: Record<string, boolean> = {};
    if (!isTeacher && allStepIds.length > 0) {
        const { data: views } = await supabase
            .from("step_views")
            .select("step_id")
            .eq("student_id", user.id)
            .in("step_id", allStepIds);

        if (views) {
            views.forEach((view: any) => {
                viewsMap[view.step_id] = true;
            });
        }
    }

    return (
        <StudentActivityClient
            activity={activity as any}
            phases={initialPhases as any}
            user={user}
            profile={profile}
            submissionsMap={submissionsMap}
            viewsMap={viewsMap}
            classBadges={classBadges || []}
            earnedBadgeIds={earnedBadgeIds}
            readOnly={isReadOnlyTeacher}
            groupName={studentGroupName}
            groupColor={studentGroupColor}
        />
    );
}
