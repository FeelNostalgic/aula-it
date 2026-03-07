import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getDriveClient } from "@/lib/google-drive-api";
import { AllowedFileType } from "@/types/activity";
import { Readable } from "stream";

const ALLOWED_MIME_MAP: Record<AllowedFileType, string[]> = {
    pdf: ["application/pdf"],
    image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
    word: [
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    any: [],
};

function getMimeAccepted(allowedTypes: AllowedFileType[]): string[] | null {
    if (!allowedTypes?.length) return null;
    if (allowedTypes.includes("any")) return null;
    return allowedTypes.flatMap(t => ALLOWED_MIME_MAP[t]);
}

async function getOrCreateFolder(
    driveClient: ReturnType<typeof getDriveClient>,
    parentId: string | null,
    name: string
): Promise<string> {
    const query = [
        `name = '${name.replace(/'/g, "\\'")}'`,
        "mimeType = 'application/vnd.google-apps.folder'",
        "trashed = false",
        parentId ? `'${parentId}' in parents` : "'root' in parents",
    ].join(" and ");

    const list = await driveClient.files.list({
        q: query,
        fields: "files(id)",
        spaces: "drive",
    });

    if (list.data.files && list.data.files.length > 0) {
        return list.data.files[0].id!;
    }

    const created = await driveClient.files.create({
        requestBody: {
            name,
            mimeType: "application/vnd.google-apps.folder",
            parents: parentId ? [parentId] : undefined,
        },
        fields: "id",
    });
    return created.data.id!;
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const stepId = formData.get("stepId") as string | null;
    const existingDriveFileId = formData.get("existingDriveFileId") as string | null;

    if (!file || !stepId) {
        return NextResponse.json({ error: "file y stepId son requeridos" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Get step config
    const { data: step } = await admin
        .from("activity_steps")
        .select("title, content, due_date")
        .eq("id", stepId)
        .single();

    if (!step) {
        return NextResponse.json({ error: "Paso no encontrado" }, { status: 404 });
    }

    // Deadline check
    if (step.due_date && new Date(step.due_date) < new Date()) {
        return NextResponse.json({ error: "El plazo de entrega ha finalizado." }, { status: 400 });
    }

    const stepContent = step.content as any;
    const allowedTypes: AllowedFileType[] = stepContent?.allowedTypes ?? [];
    const maxFileSizeMb: number = stepContent?.maxFileSizeMb ?? 10;

    // File size check
    const maxBytes = maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
        return NextResponse.json(
            { error: `El archivo supera el tamaño máximo permitido (${maxFileSizeMb} MB).` },
            { status: 400 }
        );
    }

    // File type check
    const accepted = getMimeAccepted(allowedTypes);
    if (accepted && !accepted.includes(file.type)) {
        return NextResponse.json(
            { error: "Tipo de archivo no permitido para este paso." },
            { status: 400 }
        );
    }

    // Get student name
    const { data: profile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
    const studentName = profile?.full_name ?? user.id.slice(-8);

    // Get teacher_drive_tokens — navigate: step -> phase -> activity -> unit -> module -> teacher_id
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
        return NextResponse.json(
            { error: "El profesor no tiene Google Drive conectado." },
            { status: 400 }
        );
    }

    const driveClient = getDriveClient(tokenRow.refresh_token);

    // Delete previous file if re-submitting
    if (existingDriveFileId) {
        try {
            await driveClient.files.delete({ fileId: existingDriveFileId });
        } catch (err: any) {
            if (err?.code !== 404 && err?.status !== 404) {
                console.warn("Drive delete warning:", err?.message);
            }
        }
    }

    // Ensure folder structure: Aula-it Entregas / {stepTitle} / {studentName}
    const rootFolderId = await getOrCreateFolder(driveClient, null, "Aula-it Entregas");
    const stepFolderId = await getOrCreateFolder(driveClient, rootFolderId, step.title ?? "Paso");
    const studentFolderId = await getOrCreateFolder(driveClient, stepFolderId, studentName);

    // Upload to Drive preserving original filename
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    const uploaded = await driveClient.files.create({
        requestBody: {
            name: file.name,
            parents: [studentFolderId],
        },
        media: {
            mimeType: file.type || "application/octet-stream",
            body: stream,
        },
        fields: "id,webViewLink,name,mimeType",
    });

    const driveFileId = uploaded.data.id!;
    const driveFileUrl = uploaded.data.webViewLink!;
    const driveFileName = uploaded.data.name!;
    const driveMimeType = uploaded.data.mimeType!;

    return NextResponse.json({ driveFileUrl, driveFileId, driveFileName, driveMimeType });
}
