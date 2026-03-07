import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { verifyTeacherOwnsStep } from "@/lib/authorization";
import { getDriveClient, listPermissions, removePermission, shareFile } from "@/lib/google-drive-api";

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
    const { stepId } = body as { stepId: string };
    if (!stepId) {
        return NextResponse.json({ error: "stepId es requerido" }, { status: 400 });
    }

    if (!await verifyTeacherOwnsStep(stepId, user.id)) {
        return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const admin = createAdminClient();

    const { data: tokenRow } = await admin
        .from("teacher_drive_tokens")
        .select("*")
        .eq("teacher_id", user.id)
        .single();
    if (!tokenRow) {
        return NextResponse.json({ error: "Google Drive no conectado." }, { status: 400 });
    }

    // Get all submissions for this step
    const { data: submissions } = await admin
        .from("activity_submissions")
        .select("id, student_id, drive_file_id, student:profiles(google_email)")
        .eq("step_id", stepId);

    const driveClient = getDriveClient(tokenRow.refresh_token);
    const errors: string[] = [];
    let locked = 0;

    for (const sub of submissions ?? []) {
        if (sub.drive_file_id) {
            const studentEmail = (sub.student as any)?.google_email as string | null;
            if (studentEmail) {
                try {
                    const permissions = await listPermissions(driveClient, sub.drive_file_id);
                    const writerPerm = permissions.find(
                        (p: any) => p.emailAddress === studentEmail && p.role === "writer"
                    );
                    if (writerPerm?.id) {
                        await removePermission(driveClient, sub.drive_file_id, writerPerm.id);
                        await shareFile(driveClient, sub.drive_file_id, studentEmail, "reader");
                    }
                    locked++;
                } catch (err: any) {
                    errors.push(`${studentEmail}: ${err.message}`);
                }
            }
        }
    }

    return NextResponse.json({ locked, errors });
}
