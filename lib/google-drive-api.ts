import { google } from "googleapis";
import { DRIVE_CONNECTION_STATUS, type DriveConnectionStatus } from "@/lib/drive-connection-status";
import { extractGoogleFileId } from "@/lib/google-drive-urls";
import { DRIVE_STORAGE_MODE, type DriveStorageSettings } from "@/lib/drive-storage-settings";
import { createGoogleOAuth2Client, requireGoogleRedirectUri } from "@/lib/google-oauth";

export const GOOGLE_DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

const GOOGLE_DRIVE_SHARED_OPTIONS = {
    supportsAllDrives: true,
} as const;

const GOOGLE_DRIVE_LIST_SHARED_OPTIONS = {
    ...GOOGLE_DRIVE_SHARED_OPTIONS,
    includeItemsFromAllDrives: true,
} as const;

type DriveClient = ReturnType<typeof google.drive>;

export interface DriveFolderMetadata {
    id: string;
    name: string;
    url: string | null;
}

export function getAuthorizeUrl(teacherId: string, origin?: string): string {
    requireGoogleRedirectUri(origin);
    const client = createGoogleOAuth2Client(origin);
    return client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/drive"],
        state: teacherId,
        prompt: "consent",
    });
}

export async function exchangeCodeForTokens(code: string, origin?: string) {
    requireGoogleRedirectUri(origin);
    const client = createGoogleOAuth2Client(origin);
    const { tokens } = await client.getToken(code);
    return tokens;
}

export function getDriveClient(refreshToken: string) {
    const auth = createGoogleOAuth2Client();
    auth.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: "v3", auth });
}

export async function getDriveConnectionStatus(refreshToken?: string | null): Promise<DriveConnectionStatus> {
    if (!refreshToken) return DRIVE_CONNECTION_STATUS.DISCONNECTED;

    try {
        const auth = createGoogleOAuth2Client();
        auth.setCredentials({ refresh_token: refreshToken });
        await auth.getAccessToken();
        return DRIVE_CONNECTION_STATUS.CONNECTED;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (message.includes("invalid_grant")) {
            return DRIVE_CONNECTION_STATUS.INVALID;
        }
        console.error("[drive/status] unexpected oauth error", error);
        return DRIVE_CONNECTION_STATUS.INVALID;
    }
}

export { extractGoogleFileId as extractFileIdFromUrl };

export async function copyFile(
    driveClient: DriveClient,
    fileId: string,
    title: string,
    parentId?: string | null
): Promise<{ id: string; webViewLink: string }> {
    const res = await driveClient.files.copy({
        ...GOOGLE_DRIVE_SHARED_OPTIONS,
        fileId,
        requestBody: {
            name: title,
            parents: parentId ? [parentId] : undefined,
        },
        fields: "id,webViewLink",
    });
    if (!res.data.id || !res.data.webViewLink) {
        throw new Error("copyFile: missing id or webViewLink in response");
    }
    return { id: res.data.id, webViewLink: res.data.webViewLink };
}

export async function shareFile(
    driveClient: DriveClient,
    fileId: string,
    googleEmail: string,
    role: "writer" | "reader"
): Promise<string> {
    const res = await driveClient.permissions.create({
        ...GOOGLE_DRIVE_SHARED_OPTIONS,
        fileId,
        requestBody: {
            type: "user",
            role,
            emailAddress: googleEmail,
        },
        fields: "id",
        sendNotificationEmail: false,
    });
    return res.data.id ?? "";
}

export async function listPermissions(driveClient: DriveClient, fileId: string) {
    const res = await driveClient.permissions.list({
        ...GOOGLE_DRIVE_SHARED_OPTIONS,
        fileId,
        fields: "permissions(id,emailAddress,role)",
    });
    return res.data.permissions ?? [];
}

export async function removePermission(
    driveClient: DriveClient,
    fileId: string,
    permissionId: string
) {
    await driveClient.permissions.delete({
        ...GOOGLE_DRIVE_SHARED_OPTIONS,
        fileId,
        permissionId,
    });
}

/**
 * Changes a specific user's permission role on a file.
 * Used to downgrade a student from "writer" to "reader" (close) and back (open).
 * More robust than contentRestrictions — students cannot change their own permissions.
 */
export async function updateFilePermissionRole(
    driveClient: DriveClient,
    fileId: string,
    email: string,
    role: "writer" | "reader"
): Promise<void> {
    const list = await driveClient.permissions.list({
        ...GOOGLE_DRIVE_SHARED_OPTIONS,
        fileId,
        fields: "permissions(id,emailAddress,role)",
    });
    const perm = list.data.permissions?.find(
        p => p.emailAddress?.toLowerCase() === email.toLowerCase()
    );
    if (!perm?.id) return;

    await driveClient.permissions.update({
        ...GOOGLE_DRIVE_SHARED_OPTIONS,
        fileId,
        permissionId: perm.id,
        requestBody: { role },
    });
}

export function sanitizeDriveFolderName(name: string): string {
    return (
        name
            .replace(/\//g, "-")
            .replace(/\\/g, "-")
            .replace(/:/g, "-")
            .replace(/\*/g, "_")
            .replace(/\?/g, "_")
            .replace(/"/g, "'")
            .replace(/[<>|]/g, "-")
            .trim()
    ) || "Sin nombre";
}

export async function getOrCreateFolder(
    driveClient: DriveClient,
    parentId: string | null,
    name: string
): Promise<string> {
    const safeName = sanitizeDriveFolderName(name);
    const query = [
        `name = '${safeName.replace(/'/g, "\\'")}'`,
        `mimeType = '${GOOGLE_DRIVE_FOLDER_MIME_TYPE}'`,
        "trashed = false",
        parentId ? `'${parentId}' in parents` : "'root' in parents",
    ].join(" and ");

    const list = await driveClient.files.list({
        ...GOOGLE_DRIVE_LIST_SHARED_OPTIONS,
        q: query,
        fields: "files(id)",
        spaces: "drive",
    });

    if (list.data.files && list.data.files.length > 0) {
        return list.data.files[0].id!;
    }

    const created = await driveClient.files.create({
        ...GOOGLE_DRIVE_SHARED_OPTIONS,
        requestBody: {
            name: safeName,
            mimeType: GOOGLE_DRIVE_FOLDER_MIME_TYPE,
            parents: parentId ? [parentId] : undefined,
        },
        fields: "id",
    });
    return created.data.id!;
}

export async function getDriveFolderMetadata(
    driveClient: DriveClient,
    folderId: string
): Promise<DriveFolderMetadata> {
    const res = await driveClient.files.get({
        ...GOOGLE_DRIVE_SHARED_OPTIONS,
        fileId: folderId,
        fields: "id,name,mimeType,webViewLink",
    });

    if (!res.data.id || res.data.mimeType !== GOOGLE_DRIVE_FOLDER_MIME_TYPE) {
        throw new Error("La selección no es una carpeta válida de Google Drive.");
    }

    return {
        id: res.data.id,
        name: res.data.name ?? "Carpeta sin nombre",
        url: res.data.webViewLink ?? null,
    };
}

export async function resolveDriveStorageRootFolderId(
    driveClient: DriveClient,
    settings: DriveStorageSettings
): Promise<string> {
    if (settings.mode === DRIVE_STORAGE_MODE.CUSTOM_FOLDER && settings.folderId) {
        return settings.folderId;
    }

    return getOrCreateFolder(driveClient, null, "Aula-it Entregas");
}

export async function resolveDriveStorageRootFolderMetadata(
    driveClient: DriveClient,
    settings: DriveStorageSettings
): Promise<DriveFolderMetadata> {
    const folderId = await resolveDriveStorageRootFolderId(driveClient, settings);
    return getDriveFolderMetadata(driveClient, folderId);
}
