import { createAdminClient } from "@/utils/supabase/admin";

export async function verifyTeacherOwnsActivity(activityId: string, userId: string): Promise<boolean> {
    try {
        const admin = createAdminClient();
        const { data } = await admin
            .from("activities")
            .select("unit:units(module:modules(teacher_id))")
            .eq("id", activityId)
            .single();
        const teacherId = (data?.unit as any)?.module?.teacher_id;
        return teacherId === userId;
    } catch {
        return false;
    }
}

export async function verifyTeacherOwnsPhase(phaseId: string, userId: string): Promise<boolean> {
    try {
        const admin = createAdminClient();
        const { data } = await admin
            .from("activity_phases")
            .select("activity:activities(unit:units(module:modules(teacher_id)))")
            .eq("id", phaseId)
            .single();
        const teacherId = (data?.activity as any)?.unit?.module?.teacher_id;
        return teacherId === userId;
    } catch {
        return false;
    }
}

export async function verifyTeacherOwnsStep(stepId: string, userId: string): Promise<boolean> {
    try {
        const admin = createAdminClient();
        const { data } = await admin
            .from("activity_steps")
            .select("phase:activity_phases(activity:activities(unit:units(module:modules(teacher_id))))")
            .eq("id", stepId)
            .single();
        const teacherId = (data?.phase as any)?.activity?.unit?.module?.teacher_id;
        return teacherId === userId;
    } catch {
        return false;
    }
}
