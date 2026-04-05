export const DRIVE_CONNECTION_STATUS = {
    CONNECTED: "connected",
    INVALID: "invalid",
    DISCONNECTED: "disconnected",
} as const;

export type DriveConnectionStatus = (typeof DRIVE_CONNECTION_STATUS)[keyof typeof DRIVE_CONNECTION_STATUS];

interface DriveConnectionStatusMeta {
    title: string;
    description: string;
}

const DRIVE_CONNECTION_STATUS_SET = new Set<DriveConnectionStatus>(Object.values(DRIVE_CONNECTION_STATUS));

export function isDriveConnectionStatus(value: unknown): value is DriveConnectionStatus {
    return typeof value === "string" && DRIVE_CONNECTION_STATUS_SET.has(value as DriveConnectionStatus);
}

export function getDriveConnectionStatusMeta(status: DriveConnectionStatus | null): DriveConnectionStatusMeta {
    if (status === DRIVE_CONNECTION_STATUS.CONNECTED) {
        return {
            title: "Google Drive operativo",
            description: "La cuenta del profesor está conectada y el token sigue siendo válido.",
        };
    }

    if (status === DRIVE_CONNECTION_STATUS.INVALID) {
        return {
            title: "Google Drive caducado",
            description: "La conexión ha caducado o fue revocada. Reconcéctala en Configuración para restaurar copias y subidas.",
        };
    }

    if (status === DRIVE_CONNECTION_STATUS.DISCONNECTED) {
        return {
            title: "Google Drive no conectado",
            description: "No hay ninguna cuenta de Google Drive enlazada. Conéctala en Configuración para habilitar entregas y plantillas.",
        };
    }

    return {
        title: "Verificando Google Drive",
        description: "Estamos comprobando el estado real de la conexión del profesor.",
    };
}
