import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { verifyTeacherOwnsActivity } from "@/lib/authorization";
import {
    getDriveClient,
    extractFileIdFromUrl,
    copyFile,
    shareFile,
    getOrCreateFolder,
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

    if (!await verifyTeacherOwnsActivity(activityId, user.id)) {
        return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const admin = createAdminClient();

    // Get full hierarchy for folder structure + teacher_id
    const { data: stepData } = await admin
        .from("activity_steps")
        .select(`
            title, content,
            phase:activity_phases(
                activity:activities(
                    title,
                    unit:units(
                        name,
                        module:modules(name, teacher_id)
                    )
                )
            )
        `)
        .eq("id", stepId)
        .single();

    if (!stepData) {
        return NextResponse.json({ error: "Paso no encontrado." }, { status: 404 });
    }

    const templateUrl = (stepData.content as any)?.templateUrl;
    if (!templateUrl) {
        return NextResponse.json({ error: "Este paso no tiene plantilla URL configurada." }, { status: 400 });
    }

    const fileId = extractFileIdFromUrl(templateUrl);
    if (!fileId) {
        return NextResponse.json({ error: "No se pudo extraer el ID del archivo de la URL de plantilla." }, { status: 400 });
    }

    const activity = (stepData.phase as any)?.activity;
    const unit = activity?.unit;
    const module = unit?.module;
    const ownerTeacherId: string = module?.teacher_id ?? user.id;
    const moduleName: string = module?.name ?? "Módulo";
    const unitName: string = unit?.name ?? "Unidad";
    const activityTitle: string = activity?.title ?? "Reto";
    const stepTitle: string = stepData.title ?? "Entregable";

    const { data: tokenRow } = await admin
        .from("teacher_drive_tokens")
        .select("refresh_token")
        .eq("teacher_id", ownerTeacherId)
        .single();

    if (!tokenRow) {
        return NextResponse.json(
            { error: "Google Drive no conectado. Conéctalo en Configuración primero." },
            { status: 400 }
        );
    }

    // Get enrolled students
    const { data: activity2 } = await admin
        .from("activities")
        .select("unit:units(module_id)")
        .eq("id", activityId)
        .single();
    const moduleId = (activity2?.unit as any)?.module_id;
    if (!moduleId) {
        return NextResponse.json({ error: "No se encontró el módulo de la actividad." }, { status: 400 });
    }

    const { data: enrollments } = await admin
        .from("module_enrollments")
        .select("student_id, student:profiles(id, full_name, google_email)")
        .eq("module_id", moduleId);

    if (!enrollments || enrollments.length === 0) {
        return NextResponse.json({ copied: 0, skipped: 0, errors: [] });
    }

    // Students who already have a copy — skip them
    const { data: existingSubs } = await admin
        .from("activity_submissions")
        .select("student_id")
        .eq("step_id", stepId)
        .not("drive_file_id", "is", null);
    const studentsWithCopy = new Set(existingSubs?.map(s => s.student_id) ?? []);

    const driveClient = getDriveClient(tokenRow.refresh_token);

    // Build folder structure: Aula-it Entregas / {module} / {unit} / {reto} / {activity} / {step}
    const rootFolderId    = await getOrCreateFolder(driveClient, null,           "Aula-it Entregas");
    const moduleFolderId  = await getOrCreateFolder(driveClient, rootFolderId,   moduleName);
    const unitFolderId    = await getOrCreateFolder(driveClient, moduleFolderId, unitName);
    const retoFolderId    = await getOrCreateFolder(driveClient, unitFolderId,   activityTitle);
    const stepFolderId    = await getOrCreateFolder(driveClient, retoFolderId,   stepTitle);

    let copied = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const enrollment of enrollments) {
        const student = enrollment.student as any;
        const googleEmail = student?.google_email as string | null;

        // Only @gmail.com accounts work reliably with Drive sharing
        if (!googleEmail || !googleEmail.toLowerCase().endsWith("@gmail.com")) {
            skipped++;
            continue;
        }

        // Already has a copy — skip
        if (studentsWithCopy.has(enrollment.student_id)) {
            skipped++;
            continue;
        }

        try {
            const copyTitle = `[${student.full_name ?? googleEmail}] ${stepTitle}`;
            const { id: newFileId, webViewLink } = await copyFile(driveClient, fileId, copyTitle);

            // Move copy into the step folder
            await driveClient.files.update({
                fileId: newFileId,
                addParents: stepFolderId,
                removeParents: "root",
                fields: "id",
            });

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
