import { extractPeerEvaluationLiveNotes } from "@/lib/peer-evaluation-live-notes";

export interface PeerEvaluationDraftSource {
    self_eval_rubric_scores?: Record<string, number> | null;
    self_eval_justifications?: Record<string, string> | null;
    files?: unknown;
}

export interface PeerEvaluationDraft {
    scores: Record<string, number>;
    answers: Record<string, string>;
    qaNotes: string;
}

export function buildPeerEvaluationDraft(
    source?: PeerEvaluationDraftSource | null,
): PeerEvaluationDraft {
    return {
        scores: { ...(source?.self_eval_rubric_scores ?? {}) },
        answers: { ...(source?.self_eval_justifications ?? {}) },
        qaNotes: extractPeerEvaluationLiveNotes(source?.files) ?? "",
    };
}
