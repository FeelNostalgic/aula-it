export const DRIVE_STORAGE_MODE = {
    AUTO_ROOT: "auto_root",
    CUSTOM_FOLDER: "custom_folder",
} as const;

export type DriveStorageMode = (typeof DRIVE_STORAGE_MODE)[keyof typeof DRIVE_STORAGE_MODE];

export interface DriveStorageSettingsRow {
    drive_storage_mode?: string | null;
    drive_root_folder_id?: string | null;
    drive_root_folder_name?: string | null;
    drive_root_folder_url?: string | null;
}

export interface DriveStorageSettings {
    mode: DriveStorageMode;
    folderId: string | null;
    folderName: string | null;
    folderUrl: string | null;
}

const DRIVE_STORAGE_MODE_SET = new Set<DriveStorageMode>(Object.values(DRIVE_STORAGE_MODE));

export function isDriveStorageMode(value: unknown): value is DriveStorageMode {
    return typeof value === "string" && DRIVE_STORAGE_MODE_SET.has(value as DriveStorageMode);
}

export function normalizeDriveStorageSettings(input?: DriveStorageSettingsRow | null): DriveStorageSettings {
    const mode = isDriveStorageMode(input?.drive_storage_mode)
        ? input.drive_storage_mode
        : DRIVE_STORAGE_MODE.AUTO_ROOT;

    if (mode === DRIVE_STORAGE_MODE.CUSTOM_FOLDER && input?.drive_root_folder_id) {
        return {
            mode,
            folderId: input.drive_root_folder_id,
            folderName: input.drive_root_folder_name ?? null,
            folderUrl: input.drive_root_folder_url ?? null,
        };
    }

    return {
        mode: DRIVE_STORAGE_MODE.AUTO_ROOT,
        folderId: null,
        folderName: null,
        folderUrl: null,
    };
}
