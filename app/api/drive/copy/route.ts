import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
    getDriveClient,
    extractFileIdFromUrl,
    copyFile,
    shareFile,
} from "@/lib/google-drive-api";

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    if (profile?.role !== "teacher") {
        return NextResponse.json({ error: "Solo profesores" }, { status: 403 });
    }

    const body = await request.json();
    const { stepId, activityId } = body as { stepId: string; activityId: string };

    if (!stepId || !activityId) {
        return NextResponse.json({ error: "stepId y activityId son requeridos" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check teacher Drive token
    const { data: tokenRow } = await admin
        .from("teacher_drive_tokens")
        .select("*")
        .eq("teacher_id", user.id)
        .single();
    if (!tokenRow) {
        return NextResponse.json(
            { error: "Google Drive no conectado. Conéctalo en Configuración primero." },
            { status: 400 }
        );
    }

    // Get step content and title
    const { data: step } = await admin
        .from("activity_steps")
        .select("title, content")
        .eq("id", stepId)
        .single();
    const templateUrl = (step?.content as any)?.templateUrl;
    if (!templateUrl) {
        return NextResponse.json({ error: "Este paso no tiene plantilla URL configurada." }, { status: 400 });
    }

    const fileId = extractFileIdFromUrl(templateUrl);
    if (!fileId) {
        return NextResponse.json(
            { error: "No se pudo extraer el ID del archivo de la URL de plantilla." },
            { status: 400 }
        );
    }

    // Get module_id from activity
    const { data: activity } = await admin
        .from("activities")
        .select("unit:units(module_id)")
        .eq("id", activityId)
        .single();
    const moduleId = (activity?.unit as any)?.module_id;
    if (!moduleId) {
        return NextResponse.json({ error: "No se encontró el módulo de la actividad." }, { status: 400 });
    }

    // Get enrolled students
    const { data: enrollments } = await admin
        .from("module_enrollments")
        .select("student_id, student:profiles(id, full_name, google_email)")
        .eq("module_id", moduleId);

    if (!enrollments || enrollments.length === 0) {
        return NextResponse.json({ copied: 0, skipped: 0, errors: [] });
    }

    const driveClient = getDriveClient(tokenRow.refresh_token);
    const stepTitle = step?.title ?? "Entregable";

    let copied = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const enrollment of enrollments) {
        const student = enrollment.student as any;
        const googleEmail = student?.google_email as string | null;

        if (!googleEmail) {
            skipped++;
            continue;
        }

        try {
            const copyTitle = `[${student.full_name ?? googleEmail}] ${stepTitle}`;
            const { id: newFileId, webViewLink } = await copyFile(driveClient, fileId, copyTitle);
            await shareFile(driveClient, newFileId, googleEmail, "writer");

            await admin
                .from("activity_submissions")
                .upsert(
                    {
                        student_id: enrollment.student_id,
                        step_id: stepId,
                        drive_file_url: webViewLink,
                        drive_file_id: newFileId,
                        status: "submitted",
                        submitted_at: new Date().toISOString(),
                    },
                    { onConflict: "student_id,step_id" }
                );

            copied++;
        } catch (err: any) {
            errors.push(`${googleEmail}: ${err.message}`);
        }
    }

    return NextResponse.json({ copied, skipped, errors });
}
