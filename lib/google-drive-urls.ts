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
 * Build a direct download URL for a Google Drive / Google Docs file.
 * - drive.google.com/file/d/{ID}  → binary download via uc?export=download
 * - docs.google.com/document/d/{ID}  → export as PDF
 * - docs.google.com/spreadsheets/d/{ID}  → export as XLSX
 * - docs.google.com/presentation/d/{ID}  → export as PPTX
 * Returns null if URL doesn't match any known Google pattern.
 */
export function toDriveDownloadUrl(url: string): string | null {
    if (!url) return null;

    // Google Docs
    const docsMatch = url.match(/docs\.google\.com\/document\/d\/(?:e\/)?([a-zA-Z0-9_-]+)/);
    if (docsMatch) return `https://docs.google.com/document/d/${docsMatch[1]}/export?format=pdf`;

    // Google Sheets
    const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/(?:e\/)?([a-zA-Z0-9_-]+)/);
    if (sheetsMatch) return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/export?format=xlsx`;

    // Google Slides
    const slidesMatch = url.match(/docs\.google\.com\/presentation\/d\/(?:e\/)?([a-zA-Z0-9_-]+)/);
    if (slidesMatch) return `https://docs.google.com/presentation/d/${slidesMatch[1]}/export/pptx`;

    // Google Drive binary file: https://drive.google.com/file/d/{ID}/view
    const driveFile = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveFile) return `https://drive.google.com/uc?export=download&id=${driveFile[1]}`;

    // drive.google.com/open?id={ID}
    if (url.includes('drive.google.com')) {
        const idParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idParam) return `https://drive.google.com/uc?export=download&id=${idParam[1]}`;
    }

    return null;
}

/**
 * Convert a raw Drive/Docs URL string to an embeddable preview URL.
 * Used for iframes where only the URL (not a DriveFile object) is available.
 */
export function urlToPreviewUrl(url: string, mimeType?: string | null): string | null {
    if (!url) return null;
    const fileId = extractGoogleFileId(url);
    if (!fileId) return null;

    if (mimeType === GOOGLE_MIME.PRESENTATION || url.includes('docs.google.com/presentation')) {
        return `https://docs.google.com/presentation/d/${fileId}/embed?start=false&loop=false&delayms=3000`;
    }
    if (mimeType === GOOGLE_MIME.DOCUMENT || url.includes('docs.google.com/document')) {
        return `https://docs.google.com/document/d/${fileId}/preview`;
    }
    if (mimeType === GOOGLE_MIME.SPREADSHEET || url.includes('docs.google.com/spreadsheets')) {
        return `https://docs.google.com/spreadsheets/d/${fileId}/preview`;
    }
    // Drive file (PDF, image, etc.)
    return `https://drive.google.com/file/d/${fileId}/preview`;
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
