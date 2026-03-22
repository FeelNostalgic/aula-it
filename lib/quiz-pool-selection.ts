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
 * - Questions without a poolId are always included.
 * - Pool questions: deterministically pick `pool.pickCount` from the pool
 *   using seed = `${userId}:${stepId}:${poolId}:${attemptNumber}`.
 * - Falls back to all questions when no pools are defined (backwards-compat).
 */
export function selectQuestionsForAttempt(
    content: QuizContent,
    userId: string,
    stepId: string,
    attemptNumber: number,
): QuizQuestion[] {
    const pools = content.pools;
    if (!pools || pools.length === 0) return content.questions;

    const alwaysShown = content.questions.filter(q => !q.poolId);
    const poolQuestions: QuizQuestion[] = [];

    for (const pool of pools) {
        const candidates = content.questions.filter(q => q.poolId === pool.id);
        if (candidates.length === 0) continue;
        const seed = `${userId}:${stepId}:${pool.id}:${attemptNumber}`;
        const shuffled = seededShuffle(candidates, seed);
        poolQuestions.push(...shuffled.slice(0, Math.min(pool.pickCount, shuffled.length)));
    }

    return [...alwaysShown, ...poolQuestions];
}
