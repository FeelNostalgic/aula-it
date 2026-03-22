import { QuizContent, QuizQuestion } from "@/types/activity";

/**
 * Deterministic PRNG (LCG) seeded with a string.
 * Same seed → same sequence every time.
 */
function seededRng(seed: string) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) {
        s = Math.imul(31, s) + seed.charCodeAt(i) | 0;
    }
    s = Math.abs(s) || 1;
    return () => {
        s = Math.imul(1664525, s) + 1013904223 | 0;
        return (s >>> 0) / 0x100000000;
    };
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
    const result = [...arr];
    const rand = seededRng(seed);
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Returns the set of questions a student should see for a given attempt.
 *
 * - `content.questions` are always shown (fixed questions defined in the quiz).
 * - `bankQuestions`: map of bankId → QuizQuestion[] fetched from global question banks.
 * - For each `bankSelection`, deterministically picks `pickCount` questions from the bank
 *   using seed = `${userId}:${stepId}:${bankId}:${attemptNumber}`.
 * - Falls back to content.questions only when no bankSelections are defined.
 */
export function selectQuestionsForAttempt(
    content: QuizContent,
    bankQuestions: Record<string, QuizQuestion[]>,
    userId: string,
    stepId: string,
    attemptNumber: number,
): QuizQuestion[] {
    const selections = content.bankSelections;
    if (!selections || selections.length === 0) return content.questions;

    const selectedFromBanks: QuizQuestion[] = [];

    for (const selection of selections) {
        const candidates = bankQuestions[selection.bankId] ?? [];
        if (candidates.length === 0) continue;
        const seed = `${userId}:${stepId}:${selection.bankId}:${attemptNumber}`;
        const shuffled = seededShuffle(candidates, seed);
        selectedFromBanks.push(...shuffled.slice(0, Math.min(selection.pickCount, shuffled.length)));
    }

    // Fixed quiz questions + randomly selected bank questions
    return [...content.questions, ...selectedFromBanks];
}
