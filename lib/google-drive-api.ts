import { google } from "googleapis";
import { extractGoogleFileId } from "@/lib/google-drive-urls";
import { DRIVE_CONNECTION_STATUS, type DriveConnectionStatus } from "@/lib/drive-connection-status";

function createOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!,
        process.env.GOOGLE_REDIRECT_URI!
    );
}

export function getAuthorizeUrl(teacherId: string): string {
    const client = createOAuth2Client();
    return client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/drive"],
        state: teacherId,
        prompt: "consent",
    });
}

export async function exchangeCodeForTokens(code: string) {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);
    return tokens;
}

export function getDriveClient(refreshToken: string) {
    const auth = createOAuth2Client();
    auth.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: "v3", auth });
}

export async function getDriveConnectionStatus(refreshToken?: string | null): Promise<DriveConnectionStatus> {
    if (!refreshToken) return DRIVE_CONNECTION_STATUS.DISCONNECTED;

    try {
        const auth = createOAuth2Client();
        auth.setCredentials({ refresh_token: refreshToken });
        await auth.getAccessToken();
        return DRIVE_CONNECTION_STATUS.CONNECTED;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (message.includes("invalid_grant")) {
            return DRIVE_CONNECTION_STATUS.INVALID;
        }
        return DRIVE_CONNECTION_STATUS.INVALID;
    }
}

export { extractGoogleFileId as extractFileIdFromUrl };

type DriveClient = ReturnType<typeof google.drive>;

export async function copyFile(
    driveClient: DriveClient,
    fileId: string,
    title: string
): Promise<{ id: string; webViewLink: string }> {
    const res = await driveClient.files.copy({
        fileId,
        requestBody: { name: title },
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
    await driveClient.permissions.delete({ fileId, permissionId });
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
        fileId,
        fields: "permissions(id,emailAddress,role)",
    });
    const perm = list.data.permissions?.find(
        p => p.emailAddress?.toLowerCase() === email.toLowerCase()
    );
    if (!perm?.id) return; // student has no permission on this file
    await driveClient.permissions.update({
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
            name: safeName,
            mimeType: "application/vnd.google-apps.folder",
            parents: parentId ? [parentId] : undefined,
        },
        fields: "id",
    });
    return created.data.id!;
}
