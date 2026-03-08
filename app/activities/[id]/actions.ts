"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { ActivitySubmission, SubmissionFile } from "@/types/activity";

const DRIVE_URL_REGEX = /^https:\/\/(docs|drive|sheets|slides|forms)\.google\.com\//;

export async function submitDeliverable(stepId: string, driveFileUrl: string, activityId: string) {
    if (!driveFileUrl || !DRIVE_URL_REGEX.test(driveFileUrl)) {
        return { error: "La URL debe ser un enlace de Google Drive o Google Docs válido." };
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "No autenticado." };

    // Deadline check
    const { data: step } = await supabase
        .from("activity_steps")
        .select("due_date")
        .eq("id", stepId)
        .single();
    if (step?.due_date && new Date(step.due_date) < new Date()) {
        return { error: "El plazo de entrega ha finalizado." };
    }

    const { data, error } = await supabase
        .from("activity_submissions")
        .upsert(
            {
                student_id: user.id,
                step_id: stepId,
                drive_file_url: driveFileUrl,
                status: "submitted",
                submitted_at: new Date().toISOString(),
            },
            { onConflict: "student_id,step_id" }
        )
        .select()
        .single();

    if (error) return { error: error.message };

    revalidatePath(`/activities/${activityId}`);
    return { data: data as ActivitySubmission };
}

export async function submitFileUpload(
    stepId: string,
    activityId: string,
    driveFileUrl: string,
    driveFileId: string,
    driveFileName: string,
    driveMimeType: string
) {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "No autenticado." };

    // Deadline check
    const { data: step } = await supabase
        .from("activity_steps")
        .select("due_date")
        .eq("id", stepId)
        .single();
    if (step?.due_date && new Date(step.due_date) < new Date()) {
        return { error: "El plazo de entrega ha finalizado." };
    }

    const { data, error } = await supabase
        .from("activity_submissions")
        .upsert(
            {
                student_id: user.id,
                step_id: stepId,
                drive_file_url: driveFileUrl,
                drive_file_id: driveFileId,
                drive_file_name: driveFileName,
                drive_mime_type: driveMimeType,
                status: "submitted",
                submitted_at: new Date().toISOString(),
            },
            { onConflict: "student_id,step_id" }
        )
        .select()
        .single();

    if (error) return { error: error.message };

    revalidatePath(`/activities/${activityId}`);
    return { data: data as ActivitySubmission };
}

export async function submitFileUploadMulti(
    stepId: string,
    activityId: string,
    files: SubmissionFile[]
): Promise<{ data?: ActivitySubmission; error?: string }> {
    if (!files.length) return { error: "Se requiere al menos un archivo." };

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return { error: "No autenticado." };

    const { data: step } = await supabase
        .from("activity_steps")
        .select("due_date")
        .eq("id", stepId)
        .single();
    if (step?.due_date && new Date(step.due_date) < new Date()) {
        return { error: "El plazo de entrega ha finalizado." };
    }

    const first = files[0];
    const { data, error } = await supabase
        .from("activity_submissions")
        .upsert(
            {
                student_id: user.id,
                step_id: stepId,
                drive_file_url: first.driveFileUrl,
                drive_file_id: first.driveFileId,
                drive_file_name: first.driveFileName,
                drive_mime_type: first.driveMimeType,
                files: files,
                status: "submitted",
                submitted_at: new Date().toISOString(),
            },
            { onConflict: "student_id,step_id" }
        )
        .select()
        .single();

    if (error) return { error: error.message };

    revalidatePath(`/activities/${activityId}`);
    return { data: data as ActivitySubmission };
}

export async function getStudentSubmissionsForActivity(activityId: string): Promise<Record<string, ActivitySubmission>> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    // Get all step IDs for this activity
    const { data: phases } = await supabase
        .from("activity_phases")
        .select("steps:activity_steps(id, type)")
        .eq("activity_id", activityId);

    if (!phases) return {};

    const allStepIds = phases.flatMap((p: any) =>
        (p.steps || []).map((s: any) => s.id)
    );
    if (allStepIds.length === 0) return {};

    const { data: submissions } = await supabase
        .from("activity_submissions")
        .select("*")
        .eq("student_id", user.id)
        .in("step_id", allStepIds);

    const map: Record<string, ActivitySubmission> = {};
    for (const sub of submissions || []) {
        map[sub.step_id] = sub as ActivitySubmission;
    }
    return map;
}

export async function getStepSubmissions(stepId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado." };

    const { data, error } = await supabase
        .from("activity_submissions")
        .select(`
            *,
            student:profiles(id, full_name, avatar_url)
        `)
        .eq("step_id", stepId)
        .order("submitted_at", { ascending: false });

    if (error) return { error: error.message };
    return { data };
}
