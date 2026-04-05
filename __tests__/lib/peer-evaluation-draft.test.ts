import { buildPeerEvaluationDraft } from "@/lib/peer-evaluation-draft";

describe("peer-evaluation-draft", () => {
    it("hydrates scores, answers and live notes from an existing submission", () => {
        expect(buildPeerEvaluationDraft({
            self_eval_rubric_scores: { criterion_1: 4 },
            self_eval_justifications: { criterion_1: "Bien argumentado" },
            files: [{ qaNotes: "Preguntó por la arquitectura" }],
        })).toEqual({
            scores: { criterion_1: 4 },
            answers: { criterion_1: "Bien argumentado" },
            qaNotes: "Preguntó por la arquitectura",
        });
    });

    it("returns empty draft when there is no previous submission", () => {
        expect(buildPeerEvaluationDraft(null)).toEqual({
            scores: {},
            answers: {},
            qaNotes: "",
        });
    });

    it("clones the hydrated objects so drafts do not share references", () => {
        const source = {
            self_eval_rubric_scores: { criterion_1: 4 },
            self_eval_justifications: { criterion_1: "Texto original" },
            files: [{ qaNotes: "Nota inicial" }],
        };

        const draft = buildPeerEvaluationDraft(source);
        draft.scores.criterion_1 = 1;
        draft.answers.criterion_1 = "Texto mutado";

        expect(source.self_eval_rubric_scores.criterion_1).toBe(4);
        expect(source.self_eval_justifications.criterion_1).toBe("Texto original");
    });
});
