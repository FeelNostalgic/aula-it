import type { DriveFile } from "@/hooks/use-google-drive-picker";

export const GOOGLE_MIME = {
    DOCUMENT: "application/vnd.google-apps.document",
    SPREADSHEET: "application/vnd.google-apps.spreadsheet",
    PRESENTATION: "application/vnd.google-apps.presentation",
    FORM: "application/vnd.google-apps.form",
} as const;

const MIME_TO_PATH: Record<string, string> = {
    [GOOGLE_MIME.DOCUMENT]: "document",
    [GOOGLE_MIME.SPREADSHEET]: "spreadsheets",
    [GOOGLE_MIME.PRESENTATION]: "presentation",
    [GOOGLE_MIME.FORM]: "forms",
};

export function toEditableUrl(file: DriveFile): string {
    const path = MIME_TO_PATH[file.mimeType];
    if (path) {
        return `https://docs.google.com/${path}/d/${file.id}/edit`;
    }
    return file.url;
}

export function toEmbedUrl(file: DriveFile): string {
    if (file.mimeType === GOOGLE_MIME.PRESENTATION) {
        return `https://docs.google.com/presentation/d/${file.id}/embed?start=false&loop=false&delayms=3000`;
    }
    const path = MIME_TO_PATH[file.mimeType];
    if (path) {
        return `https://docs.google.com/${path}/d/${file.id}/preview`;
    }
    return `https://drive.google.com/file/d/${file.id}/preview`;
}

export function toFormEmbedUrl(file: DriveFile): string {
    return `https://docs.google.com/forms/d/${file.id}/viewform?embedded=true`;
}

/**
 * Extract a Google Slides/Docs file ID from an embed or edit URL.
 * Returns null if the URL doesn't match a known Google pattern.
 */
export function extractGoogleFileId(url: string): string | null {
    const match = url.match(/\/d\/(?:e\/)?([a-zA-Z0-9_-]+)/);
    return match?.[1] ?? null;
}

/**
 * Build a download URL for a Google Slides presentation (exports as .pptx).
 * Returns null if the URL is not a Google Slides URL.
 */
export function toSlidesDownloadUrl(embedUrl: string): string | null {
    if (!embedUrl.includes("docs.google.com/presentation")) return null;
    const id = extractGoogleFileId(embedUrl);
    if (!id) return null;
    return `https://docs.google.com/presentation/d/${id}/export/pptx`;
}
