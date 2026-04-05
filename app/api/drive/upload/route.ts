import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getDriveClient, getOrCreateFolder } from "@/lib/google-drive-api";
import { AllowedFileType } from "@/types/activity";
import { Readable } from "stream";

const ALLOWED_MIME_MAP: Record<AllowedFileType, string[]> = {
    pdf: ["application/pdf"],
    image: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
    word: [
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    zip: [
        "application/zip",
        "application/x-zip-compressed",
        "application/x-zip",
        "application/octet-stream",
    ],
    pka: [
        "application/octet-stream",
    ],
    any: [],
};

function isPkaFile(file: File): boolean {
    return file.name.toLowerCase().endsWith(".pka");
}

function getMimeAccepted(allowedTypes: AllowedFileType[]): string[] | null {
    if (!allowedTypes?.length) return null;
    if (allowedTypes.includes("any")) return null;
    return allowedTypes.flatMap(t => ALLOWED_MIME_MAP[t]);
}

interface GoogleOAuthErrorShape {
    response?: {
        data?: {
            error?: string;
            error_description?: string;
        };
    };
    message?: string;
}

function resolveUploadErrorMessage(error: unknown): string {
    if (typeof error === "object" && error !== null) {
        const oauthError = error as GoogleOAuthErrorShape;
        const providerError = oauthError.response?.data?.error?.toLowerCase();
        const providerDescription = oauthError.response?.data?.error_description?.toLowerCase();
        const message = oauthError.message?.toLowerCase();

        if (providerError === "invalid_grant" || providerDescription?.includes("invalid_grant") || message?.includes("invalid_grant")) {
            return "La conexión de Google Drive del profesor ha caducado o fue revocada. Debe reconectarla en Configuración.";
        }

        if (typeof oauthError.message === "string" && oauthError.message.trim()) {
            return oauthError.message;
        }
    }

    return "Error interno al subir el archivo.";
}


export async function POST(request: NextRequest) {
    try {
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

        // Single query: get step config + full hierarchy (module → unit → activity → phase → step)
        const { data: step } = await admin
            .from("activity_steps")
            .select(`
                title, content, due_date,
                phase:activity_phases(
                    activity:activities(
                        title,
                        unit:units(
                            name,
                            module:modules(id, name, teacher_id)
                        )
                    )
                )
            `)
            .eq("id", stepId)
            .single();

        if (!step) {
            return NextResponse.json({ error: "Paso no encontrado" }, { status: 404 });
        }

        // Deadline check
        if (step.due_date && new Date(step.due_date) < new Date()) {
            return NextResponse.json(
                { error: "El plazo de entrega ha finalizado." },
                { status: 400 }
            );
        }

        const stepContent = step.content as Record<string, unknown> | null;
        const allowedTypes: AllowedFileType[] = (stepContent?.allowedTypes as AllowedFileType[] | undefined) ?? [];
        const maxFileSizeMb = Number(stepContent?.maxFileSizeMb ?? 10);

        // File size check
        const maxBytes = maxFileSizeMb * 1024 * 1024;
        if (file.size > maxBytes) {
            return NextResponse.json(
                { error: `El archivo supera el tamaño máximo permitido (${maxFileSizeMb} MB).` },
                { status: 400 }
            );
        }

        // File type check — with special handling for .pka (octet-stream + extension)
        const accepted = getMimeAccepted(allowedTypes);
        if (accepted !== null) {
            const mimeOk = accepted.includes(file.type);
            const pkaAllowed = allowedTypes.includes("pka") && isPkaFile(file) && file.type === "application/octet-stream";
            if (!mimeOk && !pkaAllowed) {
                return NextResponse.json(
                    { error: "Tipo de archivo no permitido para este paso." },
                    { status: 400 }
                );
            }
        }

        // Extract hierarchy names
        const activity = (step.phase as any)?.activity;
        const unit = activity?.unit;
        const module = unit?.module;
        const teacherId = module?.teacher_id as string | undefined;
        const moduleName: string = module?.name ?? "Módulo";
        const unitName: string = unit?.name ?? "Unidad";
        const activityTitle: string = activity?.title ?? "Reto";

        if (!teacherId) {
            return NextResponse.json({ error: "No se encontró el profesor de la actividad." }, { status: 400 });
        }

        // Get student name
        const { data: profile } = await admin
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();
        const studentName = profile?.full_name ?? user.id.slice(-8);

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

        // Folder structure:
        // Aula-it Entregas / {módulo} / {unidad} / {reto} / {actividad} / {alumno}
        const rootFolderId     = await getOrCreateFolder(driveClient, null,            "Aula-it Entregas");
        const moduleFolderId   = await getOrCreateFolder(driveClient, rootFolderId,    moduleName);
        const unitFolderId     = await getOrCreateFolder(driveClient, moduleFolderId,  unitName);
        const activityFolderId = await getOrCreateFolder(driveClient, unitFolderId,    activityTitle);
        const stepFolderId     = await getOrCreateFolder(driveClient, activityFolderId, step.title ?? "Paso");
        const studentFolderId  = await getOrCreateFolder(driveClient, stepFolderId,    studentName);

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

        const driveFileId = uploaded.data.id;
        const driveFileUrl = uploaded.data.webViewLink;
        const driveFileName = uploaded.data.name;
        const driveMimeType = uploaded.data.mimeType;

        if (!driveFileId || !driveFileUrl || !driveFileName || !driveMimeType) {
            throw new Error("Google Drive no devolvió los metadatos esperados del archivo.");
        }

        // Make file accessible to anyone with the link (student can open via URL)
        try {
            await driveClient.permissions.create({
                fileId: driveFileId,
                requestBody: { type: "anyone", role: "reader" },
                fields: "id",
                sendNotificationEmail: false,
            });
        } catch (err) {
            console.warn("Could not set public permission on uploaded file:", err);
        }

        // For group submissions: also share with each group member's google_email
        const isGroupSubmission = stepContent?.is_group_submission === true;
        const moduleId = module?.id as string | undefined;
        if (isGroupSubmission && moduleId) {
            try {
                const { data: moduleGroups } = await admin
                    .from("module_groups")
                    .select("id")
                    .eq("module_id", moduleId)
                    .eq("status", "active");
                const groupIds = (moduleGroups ?? []).map((group: any) => group.id);
                if (groupIds.length > 0) {
                    const { data: memberRow } = await admin
                        .from("module_group_members")
                        .select("group_id")
                        .eq("student_id", user.id)
                        .in("group_id", groupIds)
                        .maybeSingle();
                    if (memberRow?.group_id) {
                        const { data: members } = await admin
                            .from("module_group_members")
                            .select("student:profiles!student_id(google_email)")
                            .eq("group_id", memberRow.group_id);
                        for (const member of members ?? []) {
                            const email = (member.student as { google_email?: string | null } | null)?.google_email;
                            if (!email) continue;
                            try {
                                await driveClient.permissions.create({
                                    fileId: driveFileId,
                                    requestBody: { type: "user", role: "reader", emailAddress: email },
                                    fields: "id",
                                    sendNotificationEmail: false,
                                });
                            } catch {
                                // ignore per-member errors (e.g. invalid email)
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn("Could not share file with group members:", err);
            }
        }

        return NextResponse.json({ driveFileUrl, driveFileId, driveFileName, driveMimeType });
    } catch (error: unknown) {
        console.error("[POST /api/drive/upload] unhandled error", error);
        const message = resolveUploadErrorMessage(error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
