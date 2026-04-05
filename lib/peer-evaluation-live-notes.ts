export interface PeerEvaluationLiveNoteFile {
    qaNotes?: string | null;
    [key: string]: unknown;
}

export function buildPeerEvaluationLiveNoteFiles(
    qaNotes?: string | null,
): PeerEvaluationLiveNoteFile[] | null {
    if (typeof qaNotes !== "string" || qaNotes.trim().length === 0) {
        return null;
    }

    return [{ qaNotes }];
}

export function extractPeerEvaluationLiveNotes(files: unknown): string | null {
    if (!Array.isArray(files)) {
        return null;
    }

    for (const item of files) {
        if (!item || typeof item !== "object") continue;
        const qaNotes = (item as PeerEvaluationLiveNoteFile).qaNotes;
        if (typeof qaNotes === "string" && qaNotes.trim().length > 0) {
            return qaNotes;
        }
    }

    return null;
}
