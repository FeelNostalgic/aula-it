import { describe, expect, it } from "vitest";
import {
    buildQuestionStatsSnapshot,
    buildQuestionReview,
    doesCategorizationAllowReuse,
    doesMatchingAllowMultiplePerPrompt,
    doesMatchingAllowReuse,
    doesTableDragAllowItemReuse,
    doesTableDragAllowMultipleItemsPerCell,
    getCategorizationAssignedCategoryIds,
    getCategorizationItemsWithMultipleCorrectCategories,
    getCategoryItemCorrectCategoryIds,
    getMatchingAnswerItemIds,
    getMatchingDuplicateCorrectMatchIds,
    getMatchingPromptCorrectMatchIds,
    getTableAnswerItemIds,
    getTableCellCorrectItemIds,
    getTableDragDuplicateCorrectItemIds,
    getTableDragUsedItemIds,
    QUIZ_QUESTION_TYPE,
    QUIZ_STATS_MODE,
    shuffleQuestionResponses,
    supportsResponseRandomization,
} from "@/lib/quiz-core";
import type { QuizQuestion, QuizQuestionType } from "@/types/activity";

function createQuestion(type: QuizQuestionType, overrides: Partial<QuizQuestion> = {}): QuizQuestion {
    return {
        id: "question-1",
        type,
        text: "Question",
        options: [],
        points: 1,
        ...overrides,
    };
}

describe("supportsResponseRandomization", () => {
    it("returns true only for question types with a visual response pool", () => {
        const supportedTypes: QuizQuestionType[] = [
            QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE,
            QUIZ_QUESTION_TYPE.TRUE_FALSE,
            QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN,
            QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP,
            QUIZ_QUESTION_TYPE.MATCHING_PAIRS,
            QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP,
        ];
        const unsupportedTypes: QuizQuestionType[] = [
            QUIZ_QUESTION_TYPE.SHORT_ANSWER,
            QUIZ_QUESTION_TYPE.LIKERT,
            QUIZ_QUESTION_TYPE.NUMERIC,
            QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE,
        ];

        expect(supportedTypes.every((type) => supportsResponseRandomization(type))).toBe(true);
        expect(unsupportedTypes.every((type) => !supportsResponseRandomization(type))).toBe(true);
    });
});

describe("table drag/drop helpers", () => {
    it("treats item reuse as enabled by default for backwards compatibility", () => {
        const question = createQuestion(QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP);

        expect(doesTableDragAllowItemReuse(question)).toBe(true);
        expect(doesTableDragAllowItemReuse({ ...question, tableAllowItemReuse: true })).toBe(true);
        expect(doesTableDragAllowItemReuse({ ...question, tableAllowItemReuse: false })).toBe(false);
    });

    it("detects repeated correct items across cells", () => {
        const question = createQuestion(QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP, {
            tableCells: [
                { id: "cell-1", rowId: "row-1", columnId: "col-1", correctItemId: "item-a" },
                { id: "cell-2", rowId: "row-2", columnId: "col-1", correctItemId: "item-a" },
                { id: "cell-3", rowId: "row-3", columnId: "col-1", correctItemId: "item-b" },
            ],
        });

        expect(getTableDragDuplicateCorrectItemIds(question)).toEqual(["item-a"]);
    });

    it("returns unique used item ids from student placements", () => {
        expect(getTableDragUsedItemIds()).toEqual([]);
        expect(getTableDragUsedItemIds({
            kind: QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP,
            placements: {
                "cell-1": ["item-a", "item-b"],
                "cell-2": "item-b",
                "cell-3": "item-a",
            },
        })).toEqual(["item-a", "item-b"]);
    });

    it("normalizes multiple correct targets and multiple student answers across structured question types", () => {
        const tableQuestion = createQuestion(QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP, {
            tableAllowMultipleItemsPerCell: true,
            tableCells: [
                { id: "cell-1", rowId: "row-1", columnId: "col-1", correctItemId: "item-a", correctItemIds: ["item-a", "item-b"] },
            ],
        });
        const matchingQuestion = createQuestion(QUIZ_QUESTION_TYPE.MATCHING_PAIRS, {
            matchingAllowMultiplePerPrompt: true,
            matchingPrompts: [
                { id: "prompt-1", text: "Prompt", correctMatchId: "match-a", correctMatchIds: ["match-a", "match-b"] },
            ],
        });
        const categorizationQuestion = createQuestion(QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP, {
            categorizationAllowReuse: true,
            categoryItems: [
                { id: "item-1", text: "Item", correctCategoryId: "cat-a", correctCategoryIds: ["cat-a", "cat-b"] },
            ],
        });

        expect(doesTableDragAllowMultipleItemsPerCell(tableQuestion)).toBe(true);
        expect(getTableCellCorrectItemIds(tableQuestion.tableCells![0])).toEqual(["item-a", "item-b"]);
        expect(getTableAnswerItemIds({
            kind: QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP,
            placements: { "cell-1": ["item-b", "item-a", "item-a"] },
        }, "cell-1")).toEqual(["item-b", "item-a"]);

        expect(doesMatchingAllowMultiplePerPrompt(matchingQuestion)).toBe(true);
        expect(doesMatchingAllowReuse(matchingQuestion)).toBe(true);
        expect(getMatchingPromptCorrectMatchIds(matchingQuestion.matchingPrompts![0])).toEqual(["match-a", "match-b"]);
        expect(getMatchingAnswerItemIds({
            kind: QUIZ_QUESTION_TYPE.MATCHING_PAIRS,
            matches: { "prompt-1": ["match-b", "match-a"] },
        }, "prompt-1")).toEqual(["match-b", "match-a"]);

        expect(doesCategorizationAllowReuse(categorizationQuestion)).toBe(true);
        expect(getCategoryItemCorrectCategoryIds(categorizationQuestion.categoryItems![0])).toEqual(["cat-a", "cat-b"]);
        expect(getCategorizationAssignedCategoryIds({
            kind: QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP,
            assignments: { "item-1": ["cat-b", "cat-a"] },
        }, "item-1")).toEqual(["cat-b", "cat-a"]);
    });

    it("detects repeated matches and elements with multiple correct categories", () => {
        const matchingQuestion = createQuestion(QUIZ_QUESTION_TYPE.MATCHING_PAIRS, {
            matchingPrompts: [
                { id: "prompt-1", text: "P1", correctMatchId: "match-a", correctMatchIds: ["match-a", "match-b"] },
                { id: "prompt-2", text: "P2", correctMatchId: "match-a", correctMatchIds: ["match-a"] },
            ],
        });
        const categorizationQuestion = createQuestion(QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP, {
            categoryItems: [
                { id: "item-1", text: "Item 1", correctCategoryId: "cat-a", correctCategoryIds: ["cat-a", "cat-b"] },
                { id: "item-2", text: "Item 2", correctCategoryId: "cat-b", correctCategoryIds: ["cat-b"] },
            ],
        });

        expect(getMatchingDuplicateCorrectMatchIds(matchingQuestion)).toEqual(["match-a"]);
        expect(getCategorizationItemsWithMultipleCorrectCategories(categorizationQuestion)).toEqual(["item-1"]);
    });

    it("formats review rows for exact multi-value comparisons", () => {
        const question = createQuestion(QUIZ_QUESTION_TYPE.MATCHING_PAIRS, {
            points: 2,
            matchingAllowMultiplePerPrompt: true,
            matchingPrompts: [
                { id: "prompt-1", text: "HTTP", correctMatchId: "match-a", correctMatchIds: ["match-a", "match-b"] },
            ],
            matchingOptions: [
                { id: "match-a", text: "Aplicación" },
                { id: "match-b", text: "Texto" },
                { id: "match-c", text: "Transporte" },
            ],
        });

        const review = buildQuestionReview(question, {
            answers: {},
            short_answers: {},
            structured_answers: {
                "question-1": {
                    kind: QUIZ_QUESTION_TYPE.MATCHING_PAIRS,
                    matches: { "prompt-1": ["match-b", "match-a"] },
                },
            },
        }, false);

        expect(review.pointsEarned).toBe(2);
        expect(review.rows[0]?.value).toBe("Texto, Aplicación");
        expect(review.rows[0]?.expectedValue).toBe("Aplicación, Texto");
        expect(review.rows[0]?.isCorrect).toBe(true);
    });
});

describe("shuffleQuestionResponses", () => {
    it("shuffles classic options deterministically without losing IDs", () => {
        const question = createQuestion(QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE, {
            options: [
                { id: "opt-1", text: "A", isCorrect: false },
                { id: "opt-2", text: "B", isCorrect: true },
                { id: "opt-3", text: "C", isCorrect: false },
                { id: "opt-4", text: "D", isCorrect: false },
            ],
        });

        const first = shuffleQuestionResponses(question, "seed-a");
        const second = shuffleQuestionResponses(question, "seed-a");
        const third = shuffleQuestionResponses(question, "seed-b");

        expect(first.options.map((option) => option.id)).toEqual(second.options.map((option) => option.id));
        expect([...first.options].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
            [...question.options].sort((a, b) => a.id.localeCompare(b.id)),
        );
        expect(first.options.map((option) => option.id)).not.toEqual(third.options.map((option) => option.id));
    });

    it("shuffles each dropdown blank independently without moving prompt segments", () => {
        const question = createQuestion(QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN, {
            promptSegments: [
                { id: "seg-1", kind: "text", text: "A " },
                { id: "seg-2", kind: "blank", blankId: "blank-1" },
                { id: "seg-3", kind: "text", text: " B " },
                { id: "seg-4", kind: "blank", blankId: "blank-2" },
            ],
            dropdownBlanks: [
                {
                    id: "blank-1",
                    options: [
                        { id: "blank-1-a", text: "uno", isCorrect: true },
                        { id: "blank-1-b", text: "dos", isCorrect: false },
                        { id: "blank-1-c", text: "tres", isCorrect: false },
                    ],
                },
                {
                    id: "blank-2",
                    options: [
                        { id: "blank-2-a", text: "alpha", isCorrect: false },
                        { id: "blank-2-b", text: "beta", isCorrect: true },
                        { id: "blank-2-c", text: "gamma", isCorrect: false },
                    ],
                },
            ],
        });

        const shuffled = shuffleQuestionResponses(question, "fill-seed");

        expect(shuffled.promptSegments).toEqual(question.promptSegments);
        expect(shuffled.dropdownBlanks?.[0].options.map((option) => option.id)).toEqual(
            shuffleQuestionResponses(question, "fill-seed").dropdownBlanks?.[0].options.map((option) => option.id),
        );
        expect(shuffled.dropdownBlanks?.[0].options.map((option) => option.id)).not.toEqual(
            shuffled.dropdownBlanks?.[1].options.map((option) => option.id),
        );
    });

    it("shuffles drag/drop pools deterministically while leaving authored structure intact", () => {
        const matchingQuestion = createQuestion(QUIZ_QUESTION_TYPE.MATCHING_PAIRS, {
            matchingPrompts: [
                { id: "prompt-1", text: "Prompt 1", correctMatchId: "match-1" },
                { id: "prompt-2", text: "Prompt 2", correctMatchId: "match-2" },
            ],
            matchingOptions: [
                { id: "match-1", text: "Match 1" },
                { id: "match-2", text: "Match 2" },
                { id: "match-3", text: "Match 3" },
            ],
        });
        const categorizationQuestion = createQuestion(QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP, {
            categories: [
                { id: "cat-1", label: "Category 1" },
                { id: "cat-2", label: "Category 2" },
            ],
            categoryItems: [
                { id: "item-1", text: "Item 1", correctCategoryId: "cat-1" },
                { id: "item-2", text: "Item 2", correctCategoryId: "cat-2" },
                { id: "item-3", text: "Item 3", correctCategoryId: "cat-1" },
            ],
        });
        const tableQuestion = createQuestion(QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP, {
            tableColumns: [
                { id: "column-1", label: "Column 1" },
                { id: "column-2", label: "Column 2" },
            ],
            tableRows: [
                { id: "row-1", label: "Row 1" },
            ],
            tableCells: [
                { id: "cell-1", rowId: "row-1", columnId: "column-1", correctItemId: "table-1" },
                { id: "cell-2", rowId: "row-1", columnId: "column-2", correctItemId: "table-2" },
            ],
            tableItems: [
                { id: "table-1", text: "Item 1" },
                { id: "table-2", text: "Item 2" },
                { id: "table-3", text: "Item 3" },
            ],
        });

        const shuffledMatching = shuffleQuestionResponses(matchingQuestion, "matching-seed");
        const shuffledMatchingAgain = shuffleQuestionResponses(matchingQuestion, "matching-seed");
        const shuffledCategorization = shuffleQuestionResponses(categorizationQuestion, "categorization-seed");
        const shuffledCategorizationAgain = shuffleQuestionResponses(categorizationQuestion, "categorization-seed");
        const shuffledTable = shuffleQuestionResponses(tableQuestion, "table-seed");
        const shuffledTableAgain = shuffleQuestionResponses(tableQuestion, "table-seed");

        expect(shuffledMatching.matchingPrompts).toEqual(matchingQuestion.matchingPrompts);
        expect(shuffledMatching.matchingOptions?.map((option) => option.id)).toEqual(
            shuffledMatchingAgain.matchingOptions?.map((option) => option.id),
        );
        expect(shuffledCategorization.categories).toEqual(categorizationQuestion.categories);
        expect(shuffledCategorization.categoryItems?.map((item) => item.id)).toEqual(
            shuffledCategorizationAgain.categoryItems?.map((item) => item.id),
        );
        expect(shuffledTable.tableColumns).toEqual(tableQuestion.tableColumns);
        expect(shuffledTable.tableRows).toEqual(tableQuestion.tableRows);
        expect(shuffledTable.tableCells).toEqual(tableQuestion.tableCells);
        expect(shuffledTable.tableItems?.map((item) => item.id)).toEqual(
            shuffledTableAgain.tableItems?.map((item) => item.id),
        );
    });

    it("does not shuffle ordering sequence", () => {
        const question = createQuestion(QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE, {
            orderingItems: [
                { id: "step-1", text: "First" },
                { id: "step-2", text: "Second" },
                { id: "step-3", text: "Third" },
            ],
        });

        expect(shuffleQuestionResponses(question, "ordering-seed")).toEqual(question);
    });
});

describe("quiz stats snapshots", () => {
    it("counts fully correct classic answers correctly in stats", () => {
        const question = createQuestion(QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE, {
            text: "¿Qué protocolo se usa para web segura?",
            options: [
                { id: "opt-a", text: "HTTP", isCorrect: false },
                { id: "opt-b", text: "HTTPS", isCorrect: true },
                { id: "opt-c", text: "FTP", isCorrect: false },
            ],
        });

        const snapshot = buildQuestionStatsSnapshot(question, [
            {
                id: "attempt-1",
                student_id: "student-1",
                student_name: "Ana",
                step_id: "step-1",
                attempt_number: 1,
                answers: { "question-1": ["opt-b"] },
                short_answers: {},
                structured_answers: {},
                short_answer_scores: {},
                points_earned: 1,
                points_total: 1,
                completed_at: "2026-04-26T10:00:00.000Z",
                short_answer_feedback: {},
            },
            {
                id: "attempt-2",
                student_id: "student-2",
                student_name: "Luis",
                step_id: "step-1",
                attempt_number: 1,
                answers: { "question-1": ["opt-a"] },
                short_answers: {},
                structured_answers: {},
                short_answer_scores: {},
                points_earned: 0,
                points_total: 1,
                completed_at: "2026-04-26T10:01:00.000Z",
                short_answer_feedback: {},
            },
        ], false);

        expect(snapshot.mode).toBe(QUIZ_STATS_MODE.GRADED);
        expect(snapshot.fullCorrectCount).toBe(1);
        expect(snapshot.fullCorrectRate).toBe(50);
        expect(snapshot.studentRows[0]?.isFullyCorrect).toBe(true);
        expect(snapshot.studentRows[0]?.answerLabel).toBe("HTTPS");
        expect(snapshot.studentRows[1]?.isFullyCorrect).toBe(false);
        expect(snapshot.visualizations[0]?.kind).toBe("donut");
    });

    it("treats likert questions as descriptive and builds a real distribution", () => {
        const question = createQuestion(QUIZ_QUESTION_TYPE.LIKERT, {
            text: "Valora tu confianza",
            likertMin: 1,
            likertMax: 5,
            likertLabels: ["Muy baja", "Baja", "Media", "Alta", "Muy alta"],
            requireJustification: true,
        });

        const snapshot = buildQuestionStatsSnapshot(question, [
            {
                id: "attempt-1",
                student_id: "student-1",
                student_name: "Ana",
                step_id: "step-1",
                attempt_number: 1,
                answers: {},
                short_answers: { "question-1": "4", "question-1:justification": "He practicado." },
                structured_answers: {},
                short_answer_scores: {},
                points_earned: 0,
                points_total: 0,
                completed_at: "2026-04-26T10:00:00.000Z",
                short_answer_feedback: {},
            },
            {
                id: "attempt-2",
                student_id: "student-2",
                student_name: "Luis",
                step_id: "step-1",
                attempt_number: 1,
                answers: {},
                short_answers: { "question-1": "2" },
                structured_answers: {},
                short_answer_scores: {},
                points_earned: 0,
                points_total: 0,
                completed_at: "2026-04-26T10:01:00.000Z",
                short_answer_feedback: {},
            },
        ], false);

        expect(snapshot.mode).toBe(QUIZ_STATS_MODE.DESCRIPTIVE);
        expect(snapshot.fullCorrectCount).toBeNull();
        expect(snapshot.fullCorrectRate).toBeNull();
        expect(snapshot.studentRows.every((row) => row.isFullyCorrect === null)).toBe(true);
        expect(snapshot.visualizations[0]?.data.find((point) => point.key === "4")?.value).toBe(1);
        expect(snapshot.visualizations[1]?.data.find((point) => point.key === "with-justification")?.value).toBe(1);
    });

    it("builds a histogram for numeric questions instead of empty bars", () => {
        const question = createQuestion(QUIZ_QUESTION_TYPE.NUMERIC, {
            text: "¿Cuántos equipos hay?",
            numericMin: 0,
            numericMax: 10,
        });

        const snapshot = buildQuestionStatsSnapshot(question, [
            {
                id: "attempt-1",
                student_id: "student-1",
                student_name: "Ana",
                step_id: "step-1",
                attempt_number: 1,
                answers: {},
                short_answers: { "question-1": "2" },
                structured_answers: {},
                short_answer_scores: {},
                points_earned: 0,
                points_total: 0,
                completed_at: "2026-04-26T10:00:00.000Z",
                short_answer_feedback: {},
            },
            {
                id: "attempt-2",
                student_id: "student-2",
                student_name: "Luis",
                step_id: "step-1",
                attempt_number: 1,
                answers: {},
                short_answers: { "question-1": "7" },
                structured_answers: {},
                short_answer_scores: {},
                points_earned: 0,
                points_total: 0,
                completed_at: "2026-04-26T10:01:00.000Z",
                short_answer_feedback: {},
            },
            {
                id: "attempt-3",
                student_id: "student-3",
                student_name: "Marta",
                step_id: "step-1",
                attempt_number: 1,
                answers: {},
                short_answers: {},
                structured_answers: {},
                short_answer_scores: {},
                points_earned: 0,
                points_total: 0,
                completed_at: "2026-04-26T10:02:00.000Z",
                short_answer_feedback: {},
            },
        ], false);

        expect(snapshot.mode).toBe(QUIZ_STATS_MODE.DESCRIPTIVE);
        expect(snapshot.visualizations[0]?.kind).toBe("histogram");
        expect(snapshot.visualizations[0]?.data.some((point) => point.value > 0)).toBe(true);
        expect(snapshot.visualizations[1]?.kind).toBe("donut");
        expect(snapshot.summaryMetrics.find((metric) => metric.key === "numeric-average")?.value).toBe("4.50");
    });
});
