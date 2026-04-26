import { getQuizFixedQuestions } from "@/lib/quiz-content";
import type {
    QuizAttempt,
    QuizCategory,
    QuizCategoryItem,
    QuizContent,
    QuizDropdownBlank,
    QuizMatchingOption,
    QuizMatchingPrompt,
    QuizOption,
    QuizOrderingItem,
    QuizPromptSegment,
    QuizQuestion,
    QuizQuestionType,
    QuizStructuredAnswers,
    QuizStructuredQuestionAnswer,
    QuizTableCell,
    QuizTableColumn,
    QuizTableItem,
    QuizTableRow,
} from "@/types/activity";

export const QUIZ_QUESTION_TYPE = {
    MULTIPLE_CHOICE: "multiple_choice",
    TRUE_FALSE: "true_false",
    SHORT_ANSWER: "short_answer",
    LIKERT: "likert",
    NUMERIC: "numeric",
    FILL_IN_THE_BLANK_DROPDOWN: "fill_in_the_blank_dropdown",
    TABLE_DRAG_DROP: "table_drag_drop",
    MATCHING_PAIRS: "matching_pairs",
    ORDERING_SEQUENCE: "ordering_sequence",
    CATEGORIZATION_DRAG_DROP: "categorization_drag_drop",
} as const;

const RANDOMIZABLE_QUESTION_TYPES = {
    [QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE]: true,
    [QUIZ_QUESTION_TYPE.TRUE_FALSE]: true,
    [QUIZ_QUESTION_TYPE.SHORT_ANSWER]: false,
    [QUIZ_QUESTION_TYPE.LIKERT]: false,
    [QUIZ_QUESTION_TYPE.NUMERIC]: false,
    [QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN]: true,
    [QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP]: true,
    [QUIZ_QUESTION_TYPE.MATCHING_PAIRS]: true,
    [QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE]: false,
    [QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP]: true,
} as const;

export const QUIZ_QUESTION_TYPE_LABELS: Record<QuizQuestionType, string> = {
    [QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE]: "Opción múltiple",
    [QUIZ_QUESTION_TYPE.TRUE_FALSE]: "Verdadero/Falso",
    [QUIZ_QUESTION_TYPE.SHORT_ANSWER]: "Respuesta corta",
    [QUIZ_QUESTION_TYPE.LIKERT]: "Likert",
    [QUIZ_QUESTION_TYPE.NUMERIC]: "Numérica",
    [QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN]: "Texto con huecos",
    [QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP]: "Tabla drag & drop",
    [QUIZ_QUESTION_TYPE.MATCHING_PAIRS]: "Emparejar",
    [QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE]: "Ordenar secuencia",
    [QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP]: "Clasificar",
};

type GroupStatsAvailability = {
    enabled: boolean;
    reason?: string;
};

type QuizQuestionScore = {
    pointsEarned: number;
    pointsTotal: number;
    needsManualReview: boolean;
};

export type QuizStructuredAttemptInput = {
    answers: Record<string, string[]>;
    shortAnswers: Record<string, string>;
    structuredAnswers: QuizStructuredAnswers;
};

export type QuizScoreSummary = {
    pointsEarned: number;
    pointsTotal: number;
    hasShortAnswer: boolean;
    questionScores: Record<string, QuizQuestionScore>;
};

export type QuizQuestionReviewRow = {
    id: string;
    label: string;
    value: string;
    expectedValue?: string;
    isCorrect: boolean | null;
};

export type QuizQuestionReview = {
    questionId: string;
    questionType: QuizQuestionType;
    isAutoGraded: boolean;
    pointsEarned: number | null;
    pointsTotal: number;
    rows: QuizQuestionReviewRow[];
};

export type QuizStatsTeacherAttempt = QuizAttempt & {
    student_name: string | null;
};

export type QuizStatsStudentRow = {
    studentId: string;
    studentName: string;
    answerLabel: string;
    isFullyCorrect: boolean | null;
    rows: QuizQuestionReviewRow[];
};

export type QuizStatsChartPoint = {
    key: string;
    label: string;
    value: number;
    correct?: boolean;
};

export type QuizQuestionStatsSnapshot = {
    questionId: string;
    questionText: string;
    questionType: QuizQuestionType;
    participants: number;
    fullCorrectCount: number;
    fullCorrectRate: number;
    chartData: QuizStatsChartPoint[];
    studentRows: QuizStatsStudentRow[];
};

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

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

export function seededShuffle<T>(arr: T[], seed: string): T[] {
    if (arr.length < 2) return [...arr];

    const result = [...arr];
    const rand = seededRng(seed);
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function createDefaultOption(text: string, isCorrect: boolean): QuizOption {
    return {
        id: crypto.randomUUID(),
        text,
        isCorrect,
    };
}

function createDefaultPromptSegments(blankId: string): QuizPromptSegment[] {
    return [
        { id: crypto.randomUUID(), kind: "text", text: "Completa: " },
        { id: crypto.randomUUID(), kind: "blank", blankId },
        { id: crypto.randomUUID(), kind: "text", text: " con la opción correcta." },
    ];
}

function createDefaultDropdownBlanks(): QuizDropdownBlank[] {
    const blankId = crypto.randomUUID();
    return [
        {
            id: blankId,
            options: [
                createDefaultOption("Respuesta correcta", true),
                createDefaultOption("Distractor", false),
            ],
        },
    ];
}

function createDefaultTableColumns(): QuizTableColumn[] {
    return [
        { id: crypto.randomUUID(), label: "Campo 1" },
        { id: crypto.randomUUID(), label: "Campo 2" },
    ];
}

function createDefaultTableRows(): QuizTableRow[] {
    return [
        { id: crypto.randomUUID(), label: "Elemento 1" },
        { id: crypto.randomUUID(), label: "Elemento 2" },
    ];
}

function createDefaultTableRowHeaderLabel() {
    return "Concepto";
}

function createDefaultTableItems(): QuizTableItem[] {
    return [
        { id: crypto.randomUUID(), text: "Elemento A" },
        { id: crypto.randomUUID(), text: "Elemento B" },
        { id: crypto.randomUUID(), text: "Elemento C" },
        { id: crypto.randomUUID(), text: "Elemento D" },
    ];
}

function createDefaultTableCells(rows: QuizTableRow[], columns: QuizTableColumn[], items: QuizTableItem[]): QuizTableCell[] {
    const cells: QuizTableCell[] = [];
    let itemIndex = 0;
    for (const row of rows) {
        for (const column of columns) {
            const fallbackItem = items[itemIndex % items.length];
            cells.push({
                id: crypto.randomUUID(),
                rowId: row.id,
                columnId: column.id,
                correctItemId: fallbackItem.id,
            });
            itemIndex += 1;
        }
    }
    return cells;
}

function createDefaultMatchingPrompts(options: QuizMatchingOption[]): QuizMatchingPrompt[] {
    return [
        { id: crypto.randomUUID(), text: "Concepto 1", correctMatchId: options[0].id },
        { id: crypto.randomUUID(), text: "Concepto 2", correctMatchId: options[1].id },
        { id: crypto.randomUUID(), text: "Concepto 3", correctMatchId: options[2].id },
    ];
}

function createDefaultMatchingOptions(): QuizMatchingOption[] {
    return [
        { id: crypto.randomUUID(), text: "Definición A" },
        { id: crypto.randomUUID(), text: "Definición B" },
        { id: crypto.randomUUID(), text: "Definición C" },
    ];
}

function createDefaultOrderingItems(): QuizOrderingItem[] {
    return [
        { id: crypto.randomUUID(), text: "Paso 1" },
        { id: crypto.randomUUID(), text: "Paso 2" },
        { id: crypto.randomUUID(), text: "Paso 3" },
    ];
}

function createDefaultCategories(): QuizCategory[] {
    return [
        { id: crypto.randomUUID(), label: "Categoría A" },
        { id: crypto.randomUUID(), label: "Categoría B" },
    ];
}

function createDefaultCategoryItems(categories: QuizCategory[]): QuizCategoryItem[] {
    return [
        { id: crypto.randomUUID(), text: "Elemento 1", correctCategoryId: categories[0].id },
        { id: crypto.randomUUID(), text: "Elemento 2", correctCategoryId: categories[0].id },
        { id: crypto.randomUUID(), text: "Elemento 3", correctCategoryId: categories[1].id },
    ];
}

export function getQuestionType(question: QuizQuestion): QuizQuestionType {
    return question.type ?? QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE;
}

export function isShortAnswerQuestion(question: QuizQuestion) {
    return getQuestionType(question) === QUIZ_QUESTION_TYPE.SHORT_ANSWER;
}

export function isStructuredQuestion(question: QuizQuestion) {
    const type = getQuestionType(question);
    return (
        type === QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN ||
        type === QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP ||
        type === QUIZ_QUESTION_TYPE.MATCHING_PAIRS ||
        type === QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE ||
        type === QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP
    );
}

export function supportsClassicOptions(question: QuizQuestion) {
    const type = getQuestionType(question);
    return type === QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE || type === QUIZ_QUESTION_TYPE.TRUE_FALSE;
}

export function supportsResponseRandomization(questionOrType: QuizQuestion | QuizQuestionType) {
    const type = typeof questionOrType === "string"
        ? questionOrType
        : getQuestionType(questionOrType);
    return RANDOMIZABLE_QUESTION_TYPES[type];
}

export function shuffleQuestionResponses(question: QuizQuestion, seed: string): QuizQuestion {
    const questionType = getQuestionType(question);
    if (!supportsResponseRandomization(questionType)) {
        return question;
    }

    if (questionType === QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE || questionType === QUIZ_QUESTION_TYPE.TRUE_FALSE) {
        return {
            ...question,
            options: seededShuffle(question.options ?? [], `${seed}:options`),
        };
    }

    if (questionType === QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN) {
        return {
            ...question,
            dropdownBlanks: (question.dropdownBlanks ?? []).map((blank) => ({
                ...blank,
                options: seededShuffle(blank.options, `${seed}:blank:${blank.id}`),
            })),
        };
    }

    if (questionType === QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) {
        return {
            ...question,
            tableItems: seededShuffle(question.tableItems ?? [], `${seed}:table-items`),
        };
    }

    if (questionType === QUIZ_QUESTION_TYPE.MATCHING_PAIRS) {
        return {
            ...question,
            matchingOptions: seededShuffle(question.matchingOptions ?? [], `${seed}:matching-options`),
        };
    }

    if (questionType === QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP) {
        return {
            ...question,
            categoryItems: seededShuffle(question.categoryItems ?? [], `${seed}:category-items`),
        };
    }

    return question;
}

export function isQuizQuestionAnswered(question: QuizQuestion, input: QuizStructuredAttemptInput) {
    const questionType = getQuestionType(question);

    if (questionType === QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE || questionType === QUIZ_QUESTION_TYPE.TRUE_FALSE) {
        return (input.answers[question.id] ?? []).length > 0;
    }

    if (questionType === QUIZ_QUESTION_TYPE.SHORT_ANSWER || questionType === QUIZ_QUESTION_TYPE.LIKERT) {
        return (input.shortAnswers[question.id] ?? "").trim().length > 0;
    }

    if (questionType === QUIZ_QUESTION_TYPE.NUMERIC) {
        const rawValue = (input.shortAnswers[question.id] ?? "").trim();
        if (!rawValue) return false;
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) return false;
        const min = question.numericMin ?? 0;
        const max = question.numericMax ?? 10;
        return numericValue >= min && numericValue <= max;
    }

    const structuredAnswer = input.structuredAnswers[question.id];
    if (!structuredAnswer) return false;

    if (questionType === QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN) {
        if (structuredAnswer.kind !== QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN) return false;
        const blanks = question.dropdownBlanks ?? [];
        return blanks.length > 0 && blanks.every(blank => !!structuredAnswer.blanks[blank.id]);
    }

    if (questionType === QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) {
        if (structuredAnswer.kind !== QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) return false;
        const cells = question.tableCells ?? [];
        return cells.length > 0 && cells.every(cell => !!structuredAnswer.placements[cell.id]);
    }

    if (questionType === QUIZ_QUESTION_TYPE.MATCHING_PAIRS) {
        if (structuredAnswer.kind !== QUIZ_QUESTION_TYPE.MATCHING_PAIRS) return false;
        const prompts = question.matchingPrompts ?? [];
        return prompts.length > 0 && prompts.every(prompt => !!structuredAnswer.matches[prompt.id]);
    }

    if (questionType === QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE) {
        if (structuredAnswer.kind !== QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE) return false;
        const itemIds = (question.orderingItems ?? []).map(item => item.id);
        return itemIds.length > 0
            && structuredAnswer.orderedItemIds.length === itemIds.length
            && itemIds.every(itemId => structuredAnswer.orderedItemIds.includes(itemId));
    }

    if (questionType === QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP) {
        if (structuredAnswer.kind !== QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP) return false;
        const items = question.categoryItems ?? [];
        return items.length > 0 && items.every(item => !!structuredAnswer.assignments[item.id]);
    }

    return false;
}

export function getLikertRange(question: QuizQuestion) {
    const min = Number.isFinite(question.likertMin) ? Number(question.likertMin) : 1;
    const legacyMax = question.likertScale ?? 5;
    const max = Number.isFinite(question.likertMax) ? Number(question.likertMax) : legacyMax;
    const normalizedMin = Math.trunc(Math.min(min, max));
    const normalizedMax = Math.trunc(Math.max(min, max));
    return {
        min: normalizedMin,
        max: normalizedMax,
        values: Array.from({ length: normalizedMax - normalizedMin + 1 }, (_, index) => normalizedMin + index),
    };
}

export function getLikertLabel(question: QuizQuestion, value: number | string) {
    const parsedValue = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsedValue)) return "Sin respuesta";
    const { min } = getLikertRange(question);
    const index = Math.trunc(parsedValue) - min;
    return question.likertLabels?.[index] || String(parsedValue);
}

export function getGroupStatsAvailability(content: QuizContent): GroupStatsAvailability {
    if (content.quizMode === "google_form") {
        return { enabled: false, reason: "Las estadísticas grupales solo aplican al quiz built-in." };
    }
    if (content.randomizeQuestions) {
        return { enabled: false, reason: "Desactiva la aleatorización de preguntas para comparar a toda la clase." };
    }
    if ((content.bankSelections?.length ?? 0) > 0) {
        const hasRandomBanks = (content.bankSelections ?? []).some((selection) => (selection.mode ?? "random") === "random");
        if (hasRandomBanks) {
            return { enabled: false, reason: "Los bancos aleatorios hacen que no todos los alumnos vean las mismas preguntas." };
        }
    }
    return { enabled: true };
}

export function createDefaultQuizQuestion(type: QuizQuestionType = QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE): QuizQuestion {
    const baseQuestion: QuizQuestion = {
        id: crypto.randomUUID(),
        type,
        text: "",
        options: [],
        points: 1,
    };

    return convertQuestionToType(baseQuestion, type);
}

export function convertQuestionToType(question: QuizQuestion, type: QuizQuestionType): QuizQuestion {
    const baseQuestion: QuizQuestion = {
        ...question,
        type,
        options: [],
        promptSegments: undefined,
        dropdownBlanks: undefined,
        tableColumns: undefined,
        tableRows: undefined,
        tableItems: undefined,
        tableCells: undefined,
        tableRowHeaderLabel: undefined,
        tableAllowItemReuse: undefined,
        matchingPrompts: undefined,
        matchingOptions: undefined,
        orderingItems: undefined,
        categories: undefined,
        categoryItems: undefined,
    };

    if (type === QUIZ_QUESTION_TYPE.TRUE_FALSE) {
        return {
            ...baseQuestion,
            options: [
                createDefaultOption("Verdadero", true),
                createDefaultOption("Falso", false),
            ],
        };
    }

    if (type === QUIZ_QUESTION_TYPE.SHORT_ANSWER) {
        return {
            ...baseQuestion,
            options: [],
        };
    }

    if (type === QUIZ_QUESTION_TYPE.LIKERT) {
        return {
            ...baseQuestion,
            options: [],
            points: 0,
            likertMin: question.likertMin ?? 1,
            likertMax: question.likertMax ?? question.likertScale ?? 5,
            likertScale: undefined,
            likertLabels: question.likertLabels,
        };
    }

    if (type === QUIZ_QUESTION_TYPE.NUMERIC) {
        return {
            ...baseQuestion,
            options: [],
            points: 0,
            numericMin: question.numericMin ?? 0,
            numericMax: question.numericMax ?? 10,
        };
    }

    if (type === QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN) {
        const dropdownBlanks = createDefaultDropdownBlanks();
        return {
            ...baseQuestion,
            promptSegments: createDefaultPromptSegments(dropdownBlanks[0].id),
            dropdownBlanks,
        };
    }

    if (type === QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) {
        const tableColumns = createDefaultTableColumns();
        const tableRows = createDefaultTableRows();
        const tableItems = createDefaultTableItems();
        return {
            ...baseQuestion,
            tableRowHeaderLabel: createDefaultTableRowHeaderLabel(),
            tableColumns,
            tableRows,
            tableItems,
            tableCells: createDefaultTableCells(tableRows, tableColumns, tableItems),
            tableAllowItemReuse: true,
        };
    }

    if (type === QUIZ_QUESTION_TYPE.MATCHING_PAIRS) {
        const matchingOptions = createDefaultMatchingOptions();
        return {
            ...baseQuestion,
            matchingOptions,
            matchingPrompts: createDefaultMatchingPrompts(matchingOptions),
        };
    }

    if (type === QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE) {
        return {
            ...baseQuestion,
            orderingItems: createDefaultOrderingItems(),
        };
    }

    if (type === QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP) {
        const categories = createDefaultCategories();
        return {
            ...baseQuestion,
            categories,
            categoryItems: createDefaultCategoryItems(categories),
        };
    }

    return {
        ...baseQuestion,
        options: question.options.length >= 2
            ? question.options
            : [
                createDefaultOption("", true),
                createDefaultOption("", false),
            ],
    };
}

function getCorrectOptionIds(question: QuizQuestion) {
    return (question.options ?? []).filter((option) => option.isCorrect).map((option) => option.id);
}

function getDropdownCorrectOptionId(blank: QuizDropdownBlank) {
    return blank.options.find((option) => option.isCorrect)?.id;
}

function getOptionLabel(options: QuizOption[] | QuizMatchingOption[], optionId?: string) {
    if (!optionId) return "Sin respuesta";
    return options.find((option) => option.id === optionId)?.text ?? "Sin respuesta";
}

function getTableItemLabel(items: QuizTableItem[], itemId?: string) {
    if (!itemId) return "Sin respuesta";
    return items.find((item) => item.id === itemId)?.text ?? "Sin respuesta";
}

export function doesTableDragAllowItemReuse(question: QuizQuestion) {
    return question.tableAllowItemReuse ?? true;
}

export function getTableDragDuplicateCorrectItemIds(question: QuizQuestion) {
    const counts = new Map<string, number>();

    for (const cell of question.tableCells ?? []) {
        if (!cell.correctItemId) continue;
        counts.set(cell.correctItemId, (counts.get(cell.correctItemId) ?? 0) + 1);
    }

    return [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([itemId]) => itemId);
}

export function getTableDragUsedItemIds(structuredAnswer?: QuizStructuredQuestionAnswer) {
    if (structuredAnswer?.kind !== QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) return [];

    return [...new Set(
        Object.values(structuredAnswer.placements).filter((itemId): itemId is string => !!itemId),
    )];
}

function getCategoryLabel(categories: QuizCategory[], categoryId?: string) {
    if (!categoryId) return "Sin respuesta";
    return categories.find((category) => category.id === categoryId)?.label ?? "Sin respuesta";
}

function getCellLabel(question: QuizQuestion, cell: QuizTableCell) {
    const rowLabel = question.tableRows?.find((row) => row.id === cell.rowId)?.label ?? "Fila";
    const columnLabel = question.tableColumns?.find((column) => column.id === cell.columnId)?.label ?? "Columna";
    return `${rowLabel} / ${columnLabel}`;
}

function scoreClassicQuestion(question: QuizQuestion, selectedIds: string[], penalizeWrongAnswers: boolean): number {
    const correctIds = getCorrectOptionIds(question);
    const questionPoints = question.points ?? 1;
    if (correctIds.length === 0) return 0;

    if (!penalizeWrongAnswers) {
        const correctSelected = selectedIds.filter((id) => correctIds.includes(id)).length;
        const incorrectSelected = selectedIds.filter((id) => !correctIds.includes(id)).length;
        const ratio = (correctSelected - incorrectSelected) / correctIds.length;
        return Math.max(0, round2(questionPoints * ratio));
    }

    if (correctIds.length === 1) {
        if (selectedIds.length === 0) return 0;
        return selectedIds[0] === correctIds[0] ? questionPoints : round2(-questionPoints / 3);
    }

    const correctSelected = selectedIds.filter((id) => correctIds.includes(id)).length;
    const incorrectSelected = selectedIds.filter((id) => !correctIds.includes(id)).length;
    return round2((questionPoints / correctIds.length) * (correctSelected - incorrectSelected));
}

function scoreStructuredQuestion(question: QuizQuestion, structuredAnswer?: QuizStructuredQuestionAnswer): number {
    const questionPoints = question.points ?? 1;
    const questionType = getQuestionType(question);

    if (questionType === QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN) {
        const blanks = question.dropdownBlanks ?? [];
        if (blanks.length === 0 || structuredAnswer?.kind !== QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN) return 0;
        const correctCount = blanks.filter((blank) => structuredAnswer.blanks[blank.id] === getDropdownCorrectOptionId(blank)).length;
        return round2((questionPoints / blanks.length) * correctCount);
    }

    if (questionType === QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) {
        const cells = question.tableCells ?? [];
        if (cells.length === 0 || structuredAnswer?.kind !== QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) return 0;
        const correctCount = cells.filter((cell) => structuredAnswer.placements[cell.id] === cell.correctItemId).length;
        return round2((questionPoints / cells.length) * correctCount);
    }

    if (questionType === QUIZ_QUESTION_TYPE.MATCHING_PAIRS) {
        const prompts = question.matchingPrompts ?? [];
        if (prompts.length === 0 || structuredAnswer?.kind !== QUIZ_QUESTION_TYPE.MATCHING_PAIRS) return 0;
        const correctCount = prompts.filter((prompt) => structuredAnswer.matches[prompt.id] === prompt.correctMatchId).length;
        return round2((questionPoints / prompts.length) * correctCount);
    }

    if (questionType === QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE) {
        const items = question.orderingItems ?? [];
        if (items.length === 0 || structuredAnswer?.kind !== QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE) return 0;
        const correctCount = items.filter((item, index) => structuredAnswer.orderedItemIds[index] === item.id).length;
        return round2((questionPoints / items.length) * correctCount);
    }

    if (questionType === QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP) {
        const items = question.categoryItems ?? [];
        if (items.length === 0 || structuredAnswer?.kind !== QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP) return 0;
        const correctCount = items.filter((item) => structuredAnswer.assignments[item.id] === item.correctCategoryId).length;
        return round2((questionPoints / items.length) * correctCount);
    }

    return 0;
}

export function scoreQuizQuestion(
    question: QuizQuestion,
    input: QuizStructuredAttemptInput,
    penalizeWrongAnswers: boolean,
): QuizQuestionScore {
    const questionType = getQuestionType(question);
    const questionPoints = question.points ?? 1;

    if (questionType === QUIZ_QUESTION_TYPE.SHORT_ANSWER) {
        return {
            pointsEarned: 0,
            pointsTotal: questionPoints,
            needsManualReview: true,
        };
    }

    if (questionType === QUIZ_QUESTION_TYPE.LIKERT || questionType === QUIZ_QUESTION_TYPE.NUMERIC) {
        return {
            pointsEarned: 0,
            pointsTotal: 0,
            needsManualReview: false,
        };
    }

    if (questionType === QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE || questionType === QUIZ_QUESTION_TYPE.TRUE_FALSE) {
        const selectedIds = input.answers[question.id] ?? [];
        return {
            pointsEarned: scoreClassicQuestion(question, selectedIds, penalizeWrongAnswers),
            pointsTotal: questionPoints,
            needsManualReview: false,
        };
    }

    return {
        pointsEarned: scoreStructuredQuestion(question, input.structuredAnswers[question.id]),
        pointsTotal: questionPoints,
        needsManualReview: false,
    };
}

export function scoreQuizAttempt(
    questions: QuizQuestion[],
    input: QuizStructuredAttemptInput,
    penalizeWrongAnswers: boolean,
): QuizScoreSummary {
    let pointsEarned = 0;
    let pointsTotal = 0;
    let hasShortAnswer = false;
    const questionScores: Record<string, QuizQuestionScore> = {};

    for (const question of questions) {
        const score = scoreQuizQuestion(question, input, penalizeWrongAnswers);
        questionScores[question.id] = score;
        pointsTotal += score.pointsTotal;
        if (score.needsManualReview) {
            hasShortAnswer = true;
            continue;
        }
        pointsEarned += score.pointsEarned;
    }

    return {
        pointsEarned: Math.max(0, round2(pointsEarned)),
        pointsTotal: round2(pointsTotal),
        hasShortAnswer,
        questionScores,
    };
}

export function getQuizAttemptQuestions(content: QuizContent, attempt?: QuizAttempt | null) {
    return attempt?.resolved_questions?.length ? attempt.resolved_questions : getQuizFixedQuestions(content);
}

export function buildQuestionReview(
    question: QuizQuestion,
    attempt: Pick<QuizAttempt, "answers" | "short_answers" | "structured_answers">,
    penalizeWrongAnswers: boolean,
): QuizQuestionReview {
    const questionType = getQuestionType(question);
    const questionPoints = question.points ?? 1;
    const structuredAnswers = attempt.structured_answers ?? {};

    if (questionType === QUIZ_QUESTION_TYPE.SHORT_ANSWER) {
        return {
            questionId: question.id,
            questionType,
            isAutoGraded: false,
            pointsEarned: null,
            pointsTotal: questionPoints,
            rows: [
                {
                    id: question.id,
                    label: "Respuesta",
                    value: attempt.short_answers[question.id] || "Sin respuesta",
                    isCorrect: null,
                },
            ],
        };
    }

    if (questionType === QUIZ_QUESTION_TYPE.LIKERT) {
        const rawAnswer = attempt.short_answers[question.id] ?? "";
        const justification = attempt.short_answers[`${question.id}:justification`] ?? "";
        const answerLabel = rawAnswer ? getLikertLabel(question, rawAnswer) : "Sin respuesta";
        const rows: QuizQuestionReviewRow[] = [
            {
                id: question.id,
                label: "Respuesta",
                value: rawAnswer ? `${rawAnswer} - ${answerLabel}` : "Sin respuesta",
                isCorrect: null,
            },
        ];
        if (justification.trim()) {
            rows.push({
                id: `${question.id}:justification`,
                label: "Justificación",
                value: justification,
                isCorrect: null,
            });
        }
        return {
            questionId: question.id,
            questionType,
            isAutoGraded: true,
            pointsEarned: 0,
            pointsTotal: 0,
            rows,
        };
    }

    if (questionType === QUIZ_QUESTION_TYPE.NUMERIC) {
        return {
            questionId: question.id,
            questionType,
            isAutoGraded: true,
            pointsEarned: 0,
            pointsTotal: 0,
            rows: [
                {
                    id: question.id,
                    label: "Respuesta",
                    value: attempt.short_answers[question.id] || "Sin respuesta",
                    isCorrect: null,
                },
            ],
        };
    }

    if (questionType === QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE || questionType === QUIZ_QUESTION_TYPE.TRUE_FALSE) {
        const selectedIds = attempt.answers[question.id] ?? [];
        const score = scoreClassicQuestion(question, selectedIds, penalizeWrongAnswers);
        return {
            questionId: question.id,
            questionType,
            isAutoGraded: true,
            pointsEarned: score,
            pointsTotal: questionPoints,
            rows: (question.options ?? []).map((option) => ({
                id: option.id,
                label: option.text,
                value: selectedIds.includes(option.id) ? "Seleccionada" : "No seleccionada",
                expectedValue: option.isCorrect ? "Correcta" : undefined,
                isCorrect: option.isCorrect ? true : selectedIds.includes(option.id) ? false : null,
            })),
        };
    }

    const structuredAnswer = structuredAnswers[question.id];
    const score = scoreStructuredQuestion(question, structuredAnswer);

    if (questionType === QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN) {
        return {
            questionId: question.id,
            questionType,
            isAutoGraded: true,
            pointsEarned: score,
            pointsTotal: questionPoints,
            rows: (question.dropdownBlanks ?? []).map((blank, index) => {
                const selectedId = structuredAnswer?.kind === QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN
                    ? structuredAnswer.blanks[blank.id]
                    : undefined;
                const correctId = getDropdownCorrectOptionId(blank);
                return {
                    id: blank.id,
                    label: `Hueco ${index + 1}`,
                    value: getOptionLabel(blank.options, selectedId),
                    expectedValue: getOptionLabel(blank.options, correctId),
                    isCorrect: selectedId ? selectedId === correctId : false,
                };
            }),
        };
    }

    if (questionType === QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) {
        return {
            questionId: question.id,
            questionType,
            isAutoGraded: true,
            pointsEarned: score,
            pointsTotal: questionPoints,
            rows: (question.tableCells ?? []).map((cell) => {
                const selectedId = structuredAnswer?.kind === QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP
                    ? structuredAnswer.placements[cell.id]
                    : undefined;
                return {
                    id: cell.id,
                    label: getCellLabel(question, cell),
                    value: getTableItemLabel(question.tableItems ?? [], selectedId),
                    expectedValue: getTableItemLabel(question.tableItems ?? [], cell.correctItemId),
                    isCorrect: selectedId ? selectedId === cell.correctItemId : false,
                };
            }),
        };
    }

    if (questionType === QUIZ_QUESTION_TYPE.MATCHING_PAIRS) {
        return {
            questionId: question.id,
            questionType,
            isAutoGraded: true,
            pointsEarned: score,
            pointsTotal: questionPoints,
            rows: (question.matchingPrompts ?? []).map((prompt) => {
                const selectedId = structuredAnswer?.kind === QUIZ_QUESTION_TYPE.MATCHING_PAIRS
                    ? structuredAnswer.matches[prompt.id]
                    : undefined;
                return {
                    id: prompt.id,
                    label: prompt.text,
                    value: getOptionLabel(question.matchingOptions ?? [], selectedId),
                    expectedValue: getOptionLabel(question.matchingOptions ?? [], prompt.correctMatchId),
                    isCorrect: selectedId ? selectedId === prompt.correctMatchId : false,
                };
            }),
        };
    }

    if (questionType === QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE) {
        const orderedIds = structuredAnswer?.kind === QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE
            ? structuredAnswer.orderedItemIds
            : [];
        return {
            questionId: question.id,
            questionType,
            isAutoGraded: true,
            pointsEarned: score,
            pointsTotal: questionPoints,
            rows: (question.orderingItems ?? []).map((item, index) => {
                const selectedId = orderedIds[index];
                return {
                    id: item.id,
                    label: `Posición ${index + 1}`,
                    value: getTableItemLabel(
                        (question.orderingItems ?? []).map((orderingItem) => ({ id: orderingItem.id, text: orderingItem.text })),
                        selectedId,
                    ),
                    expectedValue: item.text,
                    isCorrect: selectedId ? selectedId === item.id : false,
                };
            }),
        };
    }

    return {
        questionId: question.id,
        questionType,
        isAutoGraded: true,
        pointsEarned: score,
        pointsTotal: questionPoints,
        rows: (question.categoryItems ?? []).map((item) => {
            const selectedCategoryId = structuredAnswer?.kind === QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP
                ? structuredAnswer.assignments[item.id]
                : undefined;
            return {
                id: item.id,
                label: item.text,
                value: getCategoryLabel(question.categories ?? [], selectedCategoryId),
                expectedValue: getCategoryLabel(question.categories ?? [], item.correctCategoryId),
                isCorrect: selectedCategoryId ? selectedCategoryId === item.correctCategoryId : false,
            };
        }),
    };
}

function buildAnswerLabel(review: QuizQuestionReview) {
    if (review.questionType === QUIZ_QUESTION_TYPE.SHORT_ANSWER) {
        return review.rows[0]?.value ?? "Sin respuesta";
    }
    const correctCount = review.rows.filter((row) => row.isCorrect === true).length;
    return `${correctCount}/${review.rows.length} correctas`;
}

function countFullyCorrect(review: QuizQuestionReview) {
    if (!review.isAutoGraded) return null;
    if (review.rows.length === 0) return false;
    return review.rows.every((row) => row.isCorrect === true);
}

function buildChartData(question: QuizQuestion, studentRows: QuizStatsStudentRow[]): QuizStatsChartPoint[] {
    const questionType = getQuestionType(question);

    if (questionType === QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE || questionType === QUIZ_QUESTION_TYPE.TRUE_FALSE) {
        return (question.options ?? []).map((option) => ({
            key: option.id,
            label: option.text || "Sin texto",
            value: studentRows.filter((studentRow) => studentRow.rows.some((row) => row.id === option.id && row.value === "Seleccionada")).length,
            correct: option.isCorrect,
        }));
    }

    if (questionType === QUIZ_QUESTION_TYPE.SHORT_ANSWER) {
        return [
            {
                key: "answered",
                label: "Respondidas",
                value: studentRows.filter((studentRow) => studentRow.rows[0]?.value !== "Sin respuesta").length,
            },
            {
                key: "empty",
                label: "Sin respuesta",
                value: studentRows.filter((studentRow) => studentRow.rows[0]?.value === "Sin respuesta").length,
            },
        ];
    }

    if (questionType === QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP) {
        return (question.categories ?? []).map((category) => ({
            key: category.id,
            label: category.label,
            value: studentRows.reduce((total, studentRow) => total + studentRow.rows.filter((row) => row.expectedValue === category.label && row.isCorrect === true).length, 0),
        }));
    }

    return studentRows[0]?.rows.map((row) => ({
        key: row.id,
        label: row.label,
        value: studentRows.filter((studentRow) => studentRow.rows.find((candidate) => candidate.id === row.id)?.isCorrect === true).length,
    })) ?? [];
}

export function buildQuestionStatsSnapshot(
    question: QuizQuestion,
    attempts: QuizStatsTeacherAttempt[],
    penalizeWrongAnswers: boolean,
): QuizQuestionStatsSnapshot {
    const studentRows = attempts.map((attempt) => {
        const review = buildQuestionReview(question, attempt, penalizeWrongAnswers);
        return {
            studentId: attempt.student_id,
            studentName: attempt.student_name ?? "Alumno sin nombre",
            answerLabel: buildAnswerLabel(review),
            isFullyCorrect: countFullyCorrect(review),
            rows: review.rows,
        };
    });

    const fullCorrectCount = studentRows.filter((studentRow) => studentRow.isFullyCorrect === true).length;

    return {
        questionId: question.id,
        questionText: question.text,
        questionType: getQuestionType(question),
        participants: attempts.length,
        fullCorrectCount,
        fullCorrectRate: attempts.length > 0 ? round2((fullCorrectCount / attempts.length) * 100) : 0,
        chartData: buildChartData(question, studentRows),
        studentRows,
    };
}

export function buildQuizStatsForAttempt(
    questions: QuizQuestion[],
    attempts: QuizStatsTeacherAttempt[],
    penalizeWrongAnswers: boolean,
): QuizQuestionStatsSnapshot[] {
    return questions.map((question) => buildQuestionStatsSnapshot(question, attempts, penalizeWrongAnswers));
}
