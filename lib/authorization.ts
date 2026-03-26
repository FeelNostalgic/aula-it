import { getActivityAccess, getPhaseAccess, getStepAccess } from "@/lib/module-access";

export async function verifyTeacherOwnsActivity(activityId: string, userId: string): Promise<boolean> {
    const access = await getActivityAccess(activityId, userId);
    return access?.permissions.canEditModuleContent ?? false;
}

export async function verifyTeacherOwnsPhase(phaseId: string, userId: string): Promise<boolean> {
    const access = await getPhaseAccess(phaseId, userId);
    return access?.permissions.canEditModuleContent ?? false;
}

export async function verifyTeacherOwnsStep(stepId: string, userId: string): Promise<boolean> {
    const access = await getStepAccess(stepId, userId);
    return access?.permissions.canEditModuleContent ?? false;
}
