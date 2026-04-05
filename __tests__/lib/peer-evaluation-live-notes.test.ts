import {
    buildPeerEvaluationLiveNoteFiles,
    extractPeerEvaluationLiveNotes,
} from "@/lib/peer-evaluation-live-notes";

describe("peer-evaluation-live-notes", () => {
    it("serializa qaNotes en files cuando hay contenido", () => {
        expect(buildPeerEvaluationLiveNoteFiles("Pregunta clave")).toEqual([
            { qaNotes: "Pregunta clave" },
        ]);
    });

    it("devuelve null cuando qaNotes está vacío", () => {
        expect(buildPeerEvaluationLiveNoteFiles("   ")).toBeNull();
        expect(buildPeerEvaluationLiveNoteFiles(undefined)).toBeNull();
    });

    it("extrae qaNotes desde files", () => {
        expect(extractPeerEvaluationLiveNotes([{ qaNotes: "Observación final" }])).toBe("Observación final");
    });

    it("ignora payloads inválidos o sin qaNotes", () => {
        expect(extractPeerEvaluationLiveNotes(null)).toBeNull();
        expect(extractPeerEvaluationLiveNotes([{ foo: "bar" }])).toBeNull();
    });
});
