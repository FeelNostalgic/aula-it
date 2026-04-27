import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { notFound, redirect } from "next/navigation";
import { StudentActivityClient } from "./client";
import { getActivityAccess } from "@/lib/module-access";
import { normalizeNestedActivityPhases } from "@/lib/activity-step-tree";
import { isStudentActivityOpen, getStudentUnlockedStepIdsForActivity, getStudentVisiblePhasesForActivity, loadStudentUnitProgressContext } from "@/lib/student-activity-progress";
import { Metadata } from "next";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const admin = createAdminClient();
    const { data: activity } = await admin.from("activities").select("title").eq("id", id).single();
    return {
        title: activity?.title || "Actividad",
    };
}


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
              view_type,
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

    let initialPhases = phasesError ? (phases || []) : normalizeNestedActivityPhases((phases || []) as any);

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

    // Fetch student's group name + color for this module (used to show group badge in viewers)
    let studentGroupId: string | null = null;
    let studentGroupName: string | null = null;
    let studentGroupColor: string | null = null;
    if (!isTeacher && activity.unit?.module_id) {
        const admin = createAdminClient();
        const moduleId = activity.unit.module_id;
        const progressContext = await loadStudentUnitProgressContext({
            unitId: activity.unit.id,
            moduleId,
            userId: user.id,
        });

        if (!progressContext || !isStudentActivityOpen(progressContext, id)) {
            redirect(activity.unit.view_type === "map" ? `/units/${activity.unit.id}/map` : `/dashboard/units/${activity.unit.id}`);
        }

        studentGroupId = progressContext.groupId;
        const visiblePhases = getStudentVisiblePhasesForActivity(progressContext, id);
        const unlockedStepIds = getStudentUnlockedStepIdsForActivity(progressContext, id);
        initialPhases = visiblePhases.map((phase: any) => ({
            ...phase,
            steps: (phase.steps ?? []).map((step: any) => ({
                ...step,
                is_locked: Boolean(step.is_locked) || !unlockedStepIds.has(step.id),
                children: (step.children ?? []).map((child: any) => ({
                    ...child,
                    is_locked: Boolean(child.is_locked) || !unlockedStepIds.has(child.id),
                })),
            })),
        }));

        const { data: groupRow } = studentGroupId
            ? await admin
                .from("module_groups")
                .select("name, color")
                .eq("id", studentGroupId)
                .maybeSingle()
            : { data: null };
        studentGroupName = groupRow?.name ?? null;
        studentGroupColor = groupRow?.color ?? null;

        const submissionsMap = progressContext.submissionsMap;
        const viewsMap = Object.fromEntries(progressContext.stepViews.map((view) => [view.step_id, true]));
        const completionsMap = Object.fromEntries(progressContext.stepCompletions.map((completion) => [completion.step_id, true]));

        const allStepIds = initialPhases.flatMap((phase: any) =>
            (phase.steps || []).flatMap((step: any) => [step.id, ...((step.children ?? []).map((child: any) => child.id))]),
        );

        if (allStepIds.length > 0) {
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
                        const applyExtension = (targetStep: any) => {
                            const extension = extMap[targetStep.id];
                            if (!extension) return targetStep;

                            const extDate = new Date(extension);
                            const dueDate = targetStep.due_date ? new Date(targetStep.due_date) : null;
                            if (!dueDate || extDate > dueDate) {
                                return { ...targetStep, due_date: extension };
                            }

                            return targetStep;
                        };

                        return {
                            ...applyExtension(step),
                            children: (step.children ?? []).map(applyExtension),
                        };
                    }),
                }));
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
                completionsMap={completionsMap}
                classBadges={classBadges || []}
                earnedBadgeIds={earnedBadgeIds}
                readOnly={isReadOnlyTeacher}
                groupId={studentGroupId}
                groupName={studentGroupName}
                groupColor={studentGroupColor}
            />
        );
    }

    return (
        <StudentActivityClient
            activity={activity as any}
            phases={initialPhases as any}
            user={user}
            profile={profile}
            submissionsMap={{}}
            viewsMap={{}}
            completionsMap={{}}
            classBadges={classBadges || []}
            earnedBadgeIds={earnedBadgeIds}
            readOnly={isReadOnlyTeacher}
            groupId={studentGroupId}
            groupName={studentGroupName}
            groupColor={studentGroupColor}
        />
    );
}
