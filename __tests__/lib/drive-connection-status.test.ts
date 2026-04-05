import {
    DRIVE_CONNECTION_STATUS,
    getDriveConnectionStatusMeta,
    isDriveConnectionStatus,
} from "@/lib/drive-connection-status";

describe("drive-connection-status", () => {
    it("detecta estados válidos de Drive", () => {
        expect(isDriveConnectionStatus(DRIVE_CONNECTION_STATUS.CONNECTED)).toBe(true);
        expect(isDriveConnectionStatus(DRIVE_CONNECTION_STATUS.INVALID)).toBe(true);
        expect(isDriveConnectionStatus(DRIVE_CONNECTION_STATUS.DISCONNECTED)).toBe(true);
    });

    it("rechaza estados no válidos", () => {
        expect(isDriveConnectionStatus("broken")).toBe(false);
        expect(isDriveConnectionStatus(null)).toBe(false);
        expect(isDriveConnectionStatus(undefined)).toBe(false);
    });

    it("devuelve el copy correcto para estado inválido", () => {
        expect(getDriveConnectionStatusMeta(DRIVE_CONNECTION_STATUS.INVALID)).toEqual({
            title: "Google Drive caducado",
            description: "La conexión ha caducado o fue revocada. Reconcéctala en Configuración para restaurar copias y subidas.",
        });
    });

    it("devuelve el copy correcto para estado desconectado", () => {
        expect(getDriveConnectionStatusMeta(DRIVE_CONNECTION_STATUS.DISCONNECTED)).toEqual({
            title: "Google Drive no conectado",
            description: "No hay ninguna cuenta de Google Drive enlazada. Conéctala en Configuración para habilitar entregas y plantillas.",
        });
    });

    it("devuelve el copy de verificación cuando aún no hay estado", () => {
        expect(getDriveConnectionStatusMeta(null)).toEqual({
            title: "Verificando Google Drive",
            description: "Estamos comprobando el estado real de la conexión del profesor.",
        });
    });
});
