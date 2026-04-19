"use server";

import { DRIVE_STORAGE_MODE, normalizeDriveStorageSettings, type DriveStorageMode, type DriveStorageSettings } from "@/lib/drive-storage-settings";
import { getDriveClient, getDriveFolderMetadata } from "@/lib/google-drive-api";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function disconnectDrive(): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Solo profesores." };

    const { error } = await supabase
        .from("teacher_drive_tokens")
        .delete()
        .eq("teacher_id", user.id);

    if (error) return { error: error.message };

    revalidatePath("/settings");
    return { success: true };
}

interface SaveDriveStorageSettingsInput {
    mode: DriveStorageMode;
    folderId?: string | null;
}

export async function saveDriveStorageSettings({
    mode,
    folderId,
}: SaveDriveStorageSettingsInput): Promise<{ success?: boolean; error?: string; settings?: DriveStorageSettings }> {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "teacher") return { error: "Solo profesores." };

    if (mode === DRIVE_STORAGE_MODE.AUTO_ROOT) {
        const { error } = await supabase
            .from("app_settings")
            .upsert({
                teacher_id: user.id,
                drive_storage_mode: DRIVE_STORAGE_MODE.AUTO_ROOT,
                drive_root_folder_id: null,
                drive_root_folder_name: null,
                drive_root_folder_url: null,
                updated_at: new Date().toISOString(),
            }, { onConflict: "teacher_id" });

        if (error) return { error: error.message };

        const settings = normalizeDriveStorageSettings({
            drive_storage_mode: DRIVE_STORAGE_MODE.AUTO_ROOT,
            drive_root_folder_id: null,
            drive_root_folder_name: null,
            drive_root_folder_url: null,
        });

        revalidatePath("/settings");
        return { success: true, settings };
    }

    if (!folderId?.trim()) {
        return { error: "Selecciona una carpeta válida de Google Drive." };
    }

    const { data: tokenRow } = await supabase
        .from("teacher_drive_tokens")
        .select("refresh_token")
        .eq("teacher_id", user.id)
        .single();

    if (!tokenRow?.refresh_token) {
        return { error: "Conecta Google Drive antes de elegir una carpeta personalizada." };
    }

    try {
        const driveClient = getDriveClient(tokenRow.refresh_token);
        const folder = await getDriveFolderMetadata(driveClient, folderId.trim());

        const { error } = await supabase
            .from("app_settings")
            .upsert({
                teacher_id: user.id,
                drive_storage_mode: DRIVE_STORAGE_MODE.CUSTOM_FOLDER,
                drive_root_folder_id: folder.id,
                drive_root_folder_name: folder.name,
                drive_root_folder_url: folder.url,
                updated_at: new Date().toISOString(),
            }, { onConflict: "teacher_id" });

        if (error) return { error: error.message };

        const settings = normalizeDriveStorageSettings({
            drive_storage_mode: DRIVE_STORAGE_MODE.CUSTOM_FOLDER,
            drive_root_folder_id: folder.id,
            drive_root_folder_name: folder.name,
            drive_root_folder_url: folder.url,
        });

        revalidatePath("/settings");
        return { success: true, settings };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "No se pudo validar la carpeta seleccionada.";
        return { error: message };
    }
}

export async function updateProfile({
    fullName,
    googleEmail,
    isPrivate,
}: {
    fullName: string;
    googleEmail: string;
    isPrivate?: boolean;
}) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: "No autenticado." };

    const updates: Record<string, unknown> = {};
    // Los alumnos de clase (@aula.local) no pueden cambiar su identificador
    if (fullName.trim() && !user.email?.endsWith("@aula.local")) {
        updates.full_name = fullName.trim();
    }
    updates.google_email = googleEmail.trim() || null;
    if (isPrivate !== undefined) updates.is_private = isPrivate;

    const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

    if (error) return { error: error.message };

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { success: true };
}
