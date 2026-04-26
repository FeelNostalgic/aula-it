import { describe, expect, it } from "vitest";
import {
    doesTableDragAllowItemReuse,
    getTableDragDuplicateCorrectItemIds,
    getTableDragUsedItemIds,
    QUIZ_QUESTION_TYPE,
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
                "cell-1": "item-a",
                "cell-2": "item-b",
                "cell-3": "item-a",
            },
        })).toEqual(["item-a", "item-b"]);
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
