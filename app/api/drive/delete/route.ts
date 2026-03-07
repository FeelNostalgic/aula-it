import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getDriveClient } from "@/lib/google-drive-api";

export async function DELETE(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    let body: { driveFileId?: string; stepId?: string; activityId?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
    }

    const { driveFileId, stepId } = body;
    if (!driveFileId || !stepId) {
        return NextResponse.json({ error: "driveFileId y stepId son requeridos" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Navigate step → phase → activity → unit → module → teacher_id
    const { data: phaseRow } = await admin
        .from("activity_steps")
        .select("phase:activity_phases(activity:activities(unit:units(module:modules(teacher_id))))")
        .eq("id", stepId)
        .single();

    const teacherId = (phaseRow?.phase as any)?.activity?.unit?.module?.teacher_id as string | undefined;
    if (!teacherId) {
        return NextResponse.json({ error: "No se encontró el profesor de la actividad." }, { status: 400 });
    }

    const { data: tokenRow } = await admin
        .from("teacher_drive_tokens")
        .select("refresh_token")
        .eq("teacher_id", teacherId)
        .single();

    if (!tokenRow) {
        return NextResponse.json({ error: "El profesor no tiene Google Drive conectado." }, { status: 400 });
    }

    // Delete from Drive (404 = already gone, treat as success)
    const driveClient = getDriveClient(tokenRow.refresh_token);
    try {
        await driveClient.files.delete({ fileId: driveFileId });
    } catch (err: any) {
        if (err?.code !== 404 && err?.status !== 404) {
            console.error("Error borrando de Drive:", err?.message);
            return NextResponse.json({ error: "Error al borrar el archivo de Drive." }, { status: 500 });
        }
    }

    // Delete submission from DB (RLS ensures student only deletes their own)
    const { error: dbError } = await supabase
        .from("activity_submissions")
        .delete()
        .eq("step_id", stepId)
        .eq("student_id", user.id);

    if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
