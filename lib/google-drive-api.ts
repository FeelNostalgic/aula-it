import { google } from "googleapis";
import { extractGoogleFileId } from "@/lib/google-drive-urls";

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
