import { getQuizFixedQuestions } from "@/lib/quiz-content";
import { seededShuffle } from "@/lib/quiz-core";
import { QuizContent, QuizQuestion } from "@/types/activity";

/**
 * Returns the set of questions a student should see for a given attempt.
 *
 * - Fixed questions defined directly in the quiz are always shown.
 * - `bankQuestions`: map of bankId → QuizQuestion[] fetched from global question banks.
 * - For each `bankSelection`, deterministically picks `pickCount` questions from the bank
 *   using seed = `${userId}:${stepId}:${bankId}:${attemptNumber}`.
 * - Falls back to fixed quiz questions only when no bankSelections are defined.
 */
export function selectQuestionsForAttempt(
    content: QuizContent,
    bankQuestions: Record<string, QuizQuestion[]>,
    userId: string,
    stepId: string,
    attemptNumber: number,
): QuizQuestion[] {
    const selections = content.bankSelections;
    const fixedQuestions = getQuizFixedQuestions(content);
    if (!selections || selections.length === 0) return fixedQuestions;

    const selectedFromBanks: QuizQuestion[] = [];

    for (const selection of selections) {
        const candidates = bankQuestions[selection.bankId] ?? [];
        if (candidates.length === 0) continue;
        const mode = selection.mode ?? "random";
        if (mode === "ordered_all") {
            selectedFromBanks.push(...candidates);
            continue;
        }
        const seed = `${userId}:${stepId}:${selection.bankId}:${attemptNumber}`;
        const shuffled = seededShuffle(candidates, seed);
        const pickCount = Math.max(1, selection.pickCount || 1);
        selectedFromBanks.push(...shuffled.slice(0, Math.min(pickCount, shuffled.length)));
    }

    // Fixed quiz questions + selected bank questions (deduplicated by id)
    const merged = [...fixedQuestions, ...selectedFromBanks];
    const seen = new Set<string>();
    return merged.filter((question) => {
        if (seen.has(question.id)) return false;
        seen.add(question.id);
        return true;
    });
}
