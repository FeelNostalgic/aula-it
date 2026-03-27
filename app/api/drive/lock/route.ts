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

    const { data: stepOwner } = await admin
        .from("activity_steps")
        .select("phase:activity_phases(activity:activities(unit:units(module:modules(teacher_id))))")
        .eq("id", stepId)
        .single();

    const ownerTeacherId = ((stepOwner?.phase as any)?.activity?.unit?.module?.teacher_id as string | undefined) ?? user.id;

    const { data: tokenRow } = await admin
        .from("teacher_drive_tokens")
        .select("*")
        .eq("teacher_id", ownerTeacherId)
        .single();
    if (!tokenRow) {
        return NextResponse.json({ error: "Google Drive no conectado." }, { status: 400 });
    }

    // Get all submissions for this step (individual + group)
    const { data: submissions } = await admin
        .from("activity_submissions")
        .select("id, student_id, group_id, drive_file_id, student:profiles(google_email)")
        .eq("step_id", stepId);

    // Pre-fetch member emails for all group submissions in one query
    const groupIds = [...new Set(
        (submissions ?? []).map((s: any) => s.group_id).filter(Boolean)
    )];

    const groupMemberEmails = new Map<string, string[]>();
    if (groupIds.length > 0) {
        const { data: members } = await admin
            .from("module_group_members")
            .select("group_id, profile:profiles(google_email)")
            .in("group_id", groupIds);

        for (const m of members ?? []) {
            const email = (m.profile as any)?.google_email as string | null;
            if (email) {
                const list = groupMemberEmails.get(m.group_id) ?? [];
                list.push(email);
                groupMemberEmails.set(m.group_id, list);
            }
        }
    }

    const driveClient = getDriveClient(tokenRow.refresh_token);
    const errors: string[] = [];
    let locked = 0;

    for (const sub of submissions ?? []) {
        if (!sub.drive_file_id) continue;

        // Determine which emails to revoke for this submission
        const emailsToRevoke: string[] = sub.group_id
            ? (groupMemberEmails.get(sub.group_id) ?? [])
            : [(sub.student as any)?.google_email as string | null].filter(Boolean) as string[];

        if (emailsToRevoke.length === 0) continue;

        try {
            const permissions = await listPermissions(driveClient, sub.drive_file_id);
            for (const email of emailsToRevoke) {
                const writerPerm = permissions.find(
                    (p: any) => p.emailAddress === email && p.role === "writer"
                );
                if (writerPerm?.id) {
                    await removePermission(driveClient, sub.drive_file_id, writerPerm.id);
                    await shareFile(driveClient, sub.drive_file_id, email, "reader");
                }
            }
            locked++;
        } catch (err: any) {
            const label = sub.group_id ?? emailsToRevoke[0];
            errors.push(`${label}: ${err.message}`);
        }
    }

    return NextResponse.json({ locked, errors });
}
