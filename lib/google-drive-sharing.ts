const GOOGLE_DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

export interface DriveShareCandidate {
    mimeType?: string | null;
}

export function shouldAutoShareDriveFile(
    file: DriveShareCandidate,
    autoShareAll = false,
): boolean {
    const mimeType = file.mimeType ?? "";

    if (mimeType === GOOGLE_DRIVE_FOLDER_MIME_TYPE) {
        return false;
    }

    return autoShareAll || mimeType.startsWith("image/");
}

export function getDriveFilesToAutoShare<T extends DriveShareCandidate>(
    files: T[],
    autoShareAll = false,
): T[] {
    return files.filter((file) => shouldAutoShareDriveFile(file, autoShareAll));
}
