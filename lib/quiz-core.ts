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
    color?: string;
    count?: number;
    total?: number;
};

export const QUIZ_STATS_MODE = {
    GRADED: "graded",
    DESCRIPTIVE: "descriptive",
} as const;

export type QuizStatsMode = (typeof QUIZ_STATS_MODE)[keyof typeof QUIZ_STATS_MODE];

export const QUIZ_STATS_VALUE_UNIT = {
    COUNT: "count",
    PERCENT: "percent",
} as const;

export type QuizStatsValueUnit = (typeof QUIZ_STATS_VALUE_UNIT)[keyof typeof QUIZ_STATS_VALUE_UNIT];

export const QUIZ_STATS_VISUALIZATION_KIND = {
    BAR: "bar",
    DONUT: "donut",
    PIE: "pie",
    HISTOGRAM: "histogram",
} as const;

export type QuizStatsVisualizationKind = (typeof QUIZ_STATS_VISUALIZATION_KIND)[keyof typeof QUIZ_STATS_VISUALIZATION_KIND];

export const QUIZ_STATS_METRIC_TONE = {
    DEFAULT: "default",
    SUCCESS: "success",
    WARNING: "warning",
    MUTED: "muted",
} as const;

export type QuizStatsMetricTone = (typeof QUIZ_STATS_METRIC_TONE)[keyof typeof QUIZ_STATS_METRIC_TONE];

export type QuizStatsSummaryMetric = {
    key: string;
    label: string;
    value: string;
    tone?: QuizStatsMetricTone;
};

export type QuizStatsVisualizationDimension = {
    key: string;
    label: string;
    description?: string;
    data: QuizStatsChartPoint[];
    charts?: QuizStatsVisualizationDimension[];
};

export type QuizStatsVisualization = {
    key: string;
    kind: QuizStatsVisualizationKind;
    allowedKinds?: QuizStatsVisualizationKind[];
    defaultKind?: QuizStatsVisualizationKind;
    title: string;
    description?: string;
    contextLabel?: string;
    contextText?: string;
    valueLabel: string;
    valueUnit: QuizStatsValueUnit;
    data: QuizStatsChartPoint[];
    dimensions?: QuizStatsVisualizationDimension[];
};

export type QuizQuestionStatsSnapshot = {
    questionId: string;
    questionText: string;
    questionType: QuizQuestionType;
    mode: QuizStatsMode;
    participants: number;
    fullCorrectCount: number | null;
    fullCorrectRate: number | null;
    chartData: QuizStatsChartPoint[];
    summaryMetrics: QuizStatsSummaryMetric[];
    visualizations: QuizStatsVisualization[];
    studentRows: QuizStatsStudentRow[];
};

type QuizStatsReviewedAttempt = {
    attempt: QuizStatsTeacherAttempt;
    review: QuizQuestionReview;
    studentRow: QuizStatsStudentRow;
};

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

function formatPercent(value: number) {
    return `${round2(value)}%`;
}

function clampPercentage(numerator: number, denominator: number) {
    if (denominator <= 0) return 0;
    return round2((numerator / denominator) * 100);
}

function getStatsQuestionMode(questionType: QuizQuestionType): QuizStatsMode {
    if (
        questionType === QUIZ_QUESTION_TYPE.SHORT_ANSWER ||
        questionType === QUIZ_QUESTION_TYPE.LIKERT ||
        questionType === QUIZ_QUESTION_TYPE.NUMERIC
    ) {
        return QUIZ_STATS_MODE.DESCRIPTIVE;
    }

    return QUIZ_STATS_MODE.GRADED;
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
    const correctOption = createDefaultOption("Respuesta correcta", true);
    const distractorOption = createDefaultOption("Distractor", false);
    return [
        {
            id: blankId,
            correctOptionId: correctOption.id,
            options: [correctOption, distractorOption],
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
                correctItemIds: [fallbackItem.id],
            });
            itemIndex += 1;
        }
    }
    return cells;
}

function createDefaultMatchingPrompts(options: QuizMatchingOption[]): QuizMatchingPrompt[] {
    return [
        { id: crypto.randomUUID(), text: "Concepto 1", correctMatchId: options[0].id, correctMatchIds: [options[0].id] },
        { id: crypto.randomUUID(), text: "Concepto 2", correctMatchId: options[1].id, correctMatchIds: [options[1].id] },
        { id: crypto.randomUUID(), text: "Concepto 3", correctMatchId: options[2].id, correctMatchIds: [options[2].id] },
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
        { id: crypto.randomUUID(), text: "Elemento 1", correctCategoryId: categories[0].id, correctCategoryIds: [categories[0].id] },
        { id: crypto.randomUUID(), text: "Elemento 2", correctCategoryId: categories[0].id, correctCategoryIds: [categories[0].id] },
        { id: crypto.randomUUID(), text: "Elemento 3", correctCategoryId: categories[1].id, correctCategoryIds: [categories[1].id] },
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
        if (question.dropdownPoolOptions?.length) {
            return {
                ...question,
                dropdownPoolOptions: seededShuffle(question.dropdownPoolOptions, `${seed}:dropdown-pool`),
            };
        }

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
        return blanks.length > 0 && blanks.some(blank => !!structuredAnswer.blanks[blank.id]);
    }

    if (questionType === QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) {
        if (structuredAnswer.kind !== QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) return false;
        const cells = question.tableCells ?? [];
        return cells.length > 0 && cells.some(cell => getTableAnswerItemIds(structuredAnswer, cell.id).length > 0);
    }

    if (questionType === QUIZ_QUESTION_TYPE.MATCHING_PAIRS) {
        if (structuredAnswer.kind !== QUIZ_QUESTION_TYPE.MATCHING_PAIRS) return false;
        const prompts = question.matchingPrompts ?? [];
        return prompts.length > 0 && prompts.some(prompt => getMatchingAnswerItemIds(structuredAnswer, prompt.id).length > 0);
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
        return items.length > 0 && items.some(item => getCategorizationAssignedCategoryIds(structuredAnswer, item.id).length > 0);
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
        dropdownPoolOptions: undefined,
        dropdownPoolConsumesOptions: undefined,
        tableColumns: undefined,
        tableRows: undefined,
        tableItems: undefined,
        tableCells: undefined,
        tableRowHeaderLabel: undefined,
        tableAllowItemReuse: undefined,
        tableAllowMultipleItemsPerCell: undefined,
        matchingPrompts: undefined,
        matchingOptions: undefined,
        matchingAllowMultiplePerPrompt: undefined,
        matchingAllowReuse: undefined,
        orderingItems: undefined,
        categories: undefined,
        categoryItems: undefined,
        categorizationAllowReuse: undefined,
        maxLength: undefined,
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
            minLength: question.minLength,
            maxLength: question.maxLength,
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
        const dropdownPoolOptions = dropdownBlanks[0].options;
        return {
            ...baseQuestion,
            promptSegments: createDefaultPromptSegments(dropdownBlanks[0].id),
            dropdownBlanks: dropdownBlanks.map((blank) => ({ ...blank, options: [] })),
            dropdownPoolOptions,
            dropdownPoolConsumesOptions: false,
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
            tableAllowMultipleItemsPerCell: false,
        };
    }

    if (type === QUIZ_QUESTION_TYPE.MATCHING_PAIRS) {
        const matchingOptions = createDefaultMatchingOptions();
        return {
            ...baseQuestion,
            matchingOptions,
            matchingPrompts: createDefaultMatchingPrompts(matchingOptions),
            matchingAllowMultiplePerPrompt: false,
            matchingAllowReuse: true,
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
            categorizationAllowReuse: false,
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

function getDropdownOptions(question: QuizQuestion, blank: QuizDropdownBlank) {
    return question.dropdownPoolOptions?.length ? question.dropdownPoolOptions : blank.options;
}

function getDropdownCorrectOptionId(question: QuizQuestion, blank: QuizDropdownBlank) {
    return blank.correctOptionId ?? blank.options.find((option) => option.isCorrect)?.id;
}

function normalizeIdArray(value?: string | string[]) {
    const values = Array.isArray(value)
        ? value
        : typeof value === "string" && value
            ? [value]
            : [];

    return [...new Set(values.filter((candidate): candidate is string => !!candidate))];
}

export function getTableCellCorrectItemIds(cell: QuizTableCell) {
    return normalizeIdArray(cell.correctItemIds?.length ? cell.correctItemIds : cell.correctItemId);
}

export function getMatchingPromptCorrectMatchIds(prompt: QuizMatchingPrompt) {
    return normalizeIdArray(prompt.correctMatchIds?.length ? prompt.correctMatchIds : prompt.correctMatchId);
}

export function getCategoryItemCorrectCategoryIds(item: QuizCategoryItem) {
    return normalizeIdArray(item.correctCategoryIds?.length ? item.correctCategoryIds : item.correctCategoryId);
}

export function getTableAnswerItemIds(
    structuredAnswer: QuizStructuredQuestionAnswer | undefined,
    cellId: string,
) {
    if (structuredAnswer?.kind !== QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) return [];
    return normalizeIdArray(structuredAnswer.placements[cellId]);
}

export function getMatchingAnswerItemIds(
    structuredAnswer: QuizStructuredQuestionAnswer | undefined,
    promptId: string,
) {
    if (structuredAnswer?.kind !== QUIZ_QUESTION_TYPE.MATCHING_PAIRS) return [];
    return normalizeIdArray(structuredAnswer.matches[promptId]);
}

export function getCategorizationAssignedCategoryIds(
    structuredAnswer: QuizStructuredQuestionAnswer | undefined,
    itemId: string,
) {
    if (structuredAnswer?.kind !== QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP) return [];
    return normalizeIdArray(structuredAnswer.assignments[itemId]);
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

export function doesTableDragAllowMultipleItemsPerCell(question: QuizQuestion) {
    return question.tableAllowMultipleItemsPerCell ?? false;
}

export function doesMatchingAllowMultiplePerPrompt(question: QuizQuestion) {
    return question.matchingAllowMultiplePerPrompt ?? false;
}

export function doesMatchingAllowReuse(question: QuizQuestion) {
    return question.matchingAllowReuse ?? true;
}

export function doesCategorizationAllowReuse(question: QuizQuestion) {
    return question.categorizationAllowReuse ?? false;
}

export function getTableDragDuplicateCorrectItemIds(question: QuizQuestion) {
    const counts = new Map<string, number>();

    for (const cell of question.tableCells ?? []) {
        for (const itemId of getTableCellCorrectItemIds(cell)) {
            counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
        }
    }

    return [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([itemId]) => itemId);
}

export function getMatchingDuplicateCorrectMatchIds(question: QuizQuestion) {
    const counts = new Map<string, number>();

    for (const prompt of question.matchingPrompts ?? []) {
        for (const matchId of getMatchingPromptCorrectMatchIds(prompt)) {
            counts.set(matchId, (counts.get(matchId) ?? 0) + 1);
        }
    }

    return [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([matchId]) => matchId);
}

export function getCategorizationItemsWithMultipleCorrectCategories(question: QuizQuestion) {
    return (question.categoryItems ?? [])
        .filter((item) => getCategoryItemCorrectCategoryIds(item).length > 1)
        .map((item) => item.id);
}

export function getTableDragUsedItemIds(structuredAnswer?: QuizStructuredQuestionAnswer) {
    if (structuredAnswer?.kind !== QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) return [];

    return [...new Set(
        Object.keys(structuredAnswer.placements).flatMap((cellId) => getTableAnswerItemIds(structuredAnswer, cellId)),
    )];
}

export function getMatchingUsedItemIds(structuredAnswer?: QuizStructuredQuestionAnswer) {
    if (structuredAnswer?.kind !== QUIZ_QUESTION_TYPE.MATCHING_PAIRS) return [];

    return [...new Set(
        Object.keys(structuredAnswer.matches).flatMap((promptId) => getMatchingAnswerItemIds(structuredAnswer, promptId)),
    )];
}

export function getCategorizationUsedItemIds(structuredAnswer?: QuizStructuredQuestionAnswer) {
    if (structuredAnswer?.kind !== QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP) return [];

    return [...new Set(
        Object.keys(structuredAnswer.assignments).filter((itemId) => getCategorizationAssignedCategoryIds(structuredAnswer, itemId).length > 0),
    )];
}

function sameIdSet(left: string[], right: string[]) {
    if (left.length !== right.length) return false;
    const rightSet = new Set(right);
    return left.every((itemId) => rightSet.has(itemId));
}

function formatLabelList(labels: string[]) {
    if (labels.length === 0) return "Sin respuesta";
    return labels.join(", ");
}

function buildAttemptInput(attempt: Pick<QuizAttempt, "answers" | "short_answers" | "structured_answers">): QuizStructuredAttemptInput {
    return {
        answers: attempt.answers ?? {},
        shortAnswers: attempt.short_answers ?? {},
        structuredAnswers: attempt.structured_answers ?? {},
    };
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
        const correctCount = blanks.filter((blank) => structuredAnswer.blanks[blank.id] === getDropdownCorrectOptionId(question, blank)).length;
        return round2((questionPoints / blanks.length) * correctCount);
    }

    if (questionType === QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) {
        const cells = question.tableCells ?? [];
        if (cells.length === 0 || structuredAnswer?.kind !== QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) return 0;
        const correctCount = cells.filter((cell) => sameIdSet(
            getTableAnswerItemIds(structuredAnswer, cell.id),
            getTableCellCorrectItemIds(cell),
        )).length;
        return round2((questionPoints / cells.length) * correctCount);
    }

    if (questionType === QUIZ_QUESTION_TYPE.MATCHING_PAIRS) {
        const prompts = question.matchingPrompts ?? [];
        if (prompts.length === 0 || structuredAnswer?.kind !== QUIZ_QUESTION_TYPE.MATCHING_PAIRS) return 0;
        const correctCount = prompts.filter((prompt) => sameIdSet(
            getMatchingAnswerItemIds(structuredAnswer, prompt.id),
            getMatchingPromptCorrectMatchIds(prompt),
        )).length;
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
        const correctCount = items.filter((item) => sameIdSet(
            getCategorizationAssignedCategoryIds(structuredAnswer, item.id),
            getCategoryItemCorrectCategoryIds(item),
        )).length;
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
            isAutoGraded: false,
            pointsEarned: null,
            pointsTotal: 0,
            rows,
        };
    }

    if (questionType === QUIZ_QUESTION_TYPE.NUMERIC) {
        return {
            questionId: question.id,
            questionType,
            isAutoGraded: false,
            pointsEarned: null,
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
                expectedValue: option.isCorrect ? "Seleccionada" : "No seleccionada",
                isCorrect: option.isCorrect ? selectedIds.includes(option.id) : !selectedIds.includes(option.id),
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
                const options = getDropdownOptions(question, blank);
                const correctId = getDropdownCorrectOptionId(question, blank);
                return {
                    id: blank.id,
                    label: `Hueco ${index + 1}`,
                    value: getOptionLabel(options, selectedId),
                    expectedValue: getOptionLabel(options, correctId),
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
                const selectedIds = getTableAnswerItemIds(structuredAnswer, cell.id);
                const correctIds = getTableCellCorrectItemIds(cell);
                return {
                    id: cell.id,
                    label: getCellLabel(question, cell),
                    value: formatLabelList(selectedIds.map((itemId) => getTableItemLabel(question.tableItems ?? [], itemId))),
                    expectedValue: formatLabelList(correctIds.map((itemId) => getTableItemLabel(question.tableItems ?? [], itemId))),
                    isCorrect: selectedIds.length > 0 ? sameIdSet(selectedIds, correctIds) : false,
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
                const selectedIds = getMatchingAnswerItemIds(structuredAnswer, prompt.id);
                const correctIds = getMatchingPromptCorrectMatchIds(prompt);
                return {
                    id: prompt.id,
                    label: prompt.text,
                    value: formatLabelList(selectedIds.map((itemId) => getOptionLabel(question.matchingOptions ?? [], itemId))),
                    expectedValue: formatLabelList(correctIds.map((itemId) => getOptionLabel(question.matchingOptions ?? [], itemId))),
                    isCorrect: selectedIds.length > 0 ? sameIdSet(selectedIds, correctIds) : false,
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
            const selectedCategoryIds = getCategorizationAssignedCategoryIds(structuredAnswer, item.id);
            const correctCategoryIds = getCategoryItemCorrectCategoryIds(item);
            return {
                id: item.id,
                label: item.text,
                value: formatLabelList(selectedCategoryIds.map((categoryId) => getCategoryLabel(question.categories ?? [], categoryId))),
                expectedValue: formatLabelList(correctCategoryIds.map((categoryId) => getCategoryLabel(question.categories ?? [], categoryId))),
                isCorrect: selectedCategoryIds.length > 0 ? sameIdSet(selectedCategoryIds, correctCategoryIds) : false,
            };
        }),
    };
}

function buildAnswerLabel(review: QuizQuestionReview) {
    if (
        review.questionType === QUIZ_QUESTION_TYPE.SHORT_ANSWER ||
        review.questionType === QUIZ_QUESTION_TYPE.LIKERT ||
        review.questionType === QUIZ_QUESTION_TYPE.NUMERIC
    ) {
        return review.rows[0]?.value ?? "Sin respuesta";
    }

    if (review.questionType === QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE || review.questionType === QUIZ_QUESTION_TYPE.TRUE_FALSE) {
        return formatLabelList(
            review.rows
                .filter((row) => row.value === "Seleccionada")
                .map((row) => row.label),
        );
    }

    const correctCount = review.rows.filter((row) => row.isCorrect === true).length;
    return `${correctCount}/${review.rows.length} correctas`;
}

function countFullyCorrect(review: QuizQuestionReview) {
    if (getStatsQuestionMode(review.questionType) === QUIZ_STATS_MODE.DESCRIPTIVE || !review.isAutoGraded) return null;
    if (review.rows.length === 0) return false;
    return review.rows.every((row) => row.isCorrect === true);
}

function getAnsweredCount(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]) {
    return reviewedAttempts.filter(({ attempt }) => isQuizQuestionAnswered(question, buildAttemptInput(attempt))).length;
}

function buildPresenceData(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]): QuizStatsChartPoint[] {
    const answeredCount = getAnsweredCount(question, reviewedAttempts);
    const participants = reviewedAttempts.length;

    return [
        {
            key: "answered",
            label: "Respondidas",
            value: answeredCount,
            color: "var(--chart-2)",
            count: answeredCount,
            total: participants,
        },
        {
            key: "empty",
            label: "Sin respuesta",
            value: Math.max(participants - answeredCount, 0),
            color: "var(--chart-5)",
            count: Math.max(participants - answeredCount, 0),
            total: participants,
        },
    ];
}

function getRowAccuracyData(rows: QuizQuestionReviewRow[], reviewedAttempts: QuizStatsReviewedAttempt[]): QuizStatsChartPoint[] {
    return rows.map((row) => {
        const count = reviewedAttempts.filter(({ studentRow }) => studentRow.rows.find((candidate) => candidate.id === row.id)?.isCorrect === true).length;
        return {
            key: row.id,
            label: row.label,
            value: clampPercentage(count, reviewedAttempts.length),
            color: "var(--chart-1)",
            count,
            total: reviewedAttempts.length,
        };
    });
}

function getClassicOptionSelectionData(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]) {
    return (question.options ?? []).map((option, index) => {
        const count = reviewedAttempts.filter(({ review }) => review.rows.some((row) => row.id === option.id && row.value === "Seleccionada")).length;
        return {
            key: option.id,
            label: option.text || "Sin texto",
            value: count,
            correct: option.isCorrect,
            color: option.isCorrect ? "var(--chart-2)" : `var(--chart-${(index % 4) + 1})`,
            count,
            total: reviewedAttempts.length,
        };
    });
}

function getClassicResponseStateData(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]): QuizStatsChartPoint[] {
    const counts = {
        full: 0,
        partial: 0,
        incorrect: 0,
        blank: 0,
    };

    for (const { attempt, review } of reviewedAttempts) {
        const answered = isQuizQuestionAnswered(question, buildAttemptInput(attempt));
        const isFullyCorrect = countFullyCorrect(review);
        if (!answered) {
            counts.blank += 1;
            continue;
        }
        if (isFullyCorrect) {
            counts.full += 1;
            continue;
        }
        if ((review.pointsEarned ?? 0) > 0) {
            counts.partial += 1;
            continue;
        }
        counts.incorrect += 1;
    }

    return [
        {
            key: "full",
            label: "Todo correcto",
            value: counts.full,
            color: "var(--chart-2)",
            count: counts.full,
            total: reviewedAttempts.length,
        },
        {
            key: "partial",
            label: "Parcial",
            value: counts.partial,
            color: "var(--chart-3)",
            count: counts.partial,
            total: reviewedAttempts.length,
        },
        {
            key: "incorrect",
            label: "Incorrecta",
            value: counts.incorrect,
            color: "var(--chart-5)",
            count: counts.incorrect,
            total: reviewedAttempts.length,
        },
        {
            key: "blank",
            label: "En blanco",
            value: counts.blank,
            color: "var(--chart-4)",
            count: counts.blank,
            total: reviewedAttempts.length,
        },
    ].filter((point) => point.value > 0);
}

function getCategoricalAllowedKinds(): QuizStatsVisualizationKind[] {
    return [
        QUIZ_STATS_VISUALIZATION_KIND.BAR,
        QUIZ_STATS_VISUALIZATION_KIND.DONUT,
        QUIZ_STATS_VISUALIZATION_KIND.PIE,
    ];
}

function createResponsePoint(
    key: string,
    label: string,
    value: number,
    total: number,
    correct: boolean,
    index: number,
): QuizStatsChartPoint {
    return {
        key,
        label,
        value,
        correct,
        color: correct ? "var(--chart-2)" : `var(--chart-${(index % 5) + 1})`,
        count: value,
        total,
    };
}

function incrementCount(counts: Map<string, number>, key: string) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
}

function getCountedResponsePoints(
    counts: Map<string, number>,
    labels: Map<string, string>,
    correctKeys: string[],
    total: number,
): QuizStatsChartPoint[] {
    const keys = [...new Set([...labels.keys(), ...counts.keys(), ...correctKeys])];

    return keys
        .map((key, index) => createResponsePoint(
            key,
            labels.get(key) ?? "Sin respuesta",
            counts.get(key) ?? 0,
            total,
            correctKeys.includes(key),
            index,
        ))
        .sort((left, right) => {
            if (left.correct && !right.correct) return -1;
            if (!left.correct && right.correct) return 1;
            return right.value - left.value;
        });
}

function getPromptTextWithBlanks(question: QuizQuestion) {
    if (!question.promptSegments?.length) return question.text;

    return question.promptSegments.map((segment) => {
        if (segment.kind === "text") return segment.text;
        const blankIndex = (question.dropdownBlanks ?? []).findIndex((blank) => blank.id === segment.blankId);
        return `[Hueco ${blankIndex >= 0 ? blankIndex + 1 : "?"}]`;
    }).join("");
}

function buildFillBlankResponseDimensions(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]): QuizStatsVisualizationDimension[] {
    return (question.dropdownBlanks ?? []).map((blank, blankIndex) => {
        const counts = new Map<string, number>();
        const labels = new Map<string, string>();
        const options = getDropdownOptions(question, blank);
        const correctId = getDropdownCorrectOptionId(question, blank);

        for (const option of options) {
            labels.set(option.id, option.text || "Sin texto");
        }

        for (const { attempt } of reviewedAttempts) {
            const structuredAnswer = attempt.structured_answers?.[question.id];
            const selectedId = structuredAnswer?.kind === QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN
                ? structuredAnswer.blanks[blank.id]
                : undefined;
            if (selectedId) incrementCount(counts, selectedId);
        }

        return {
            key: blank.id,
            label: `Hueco ${blankIndex + 1}`,
            data: getCountedResponsePoints(counts, labels, correctId ? [correctId] : [], reviewedAttempts.length),
        };
    });
}

function buildTableRowResponseDimensions(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]): QuizStatsVisualizationDimension[] {
    return (question.tableRows ?? []).map((row) => {
        const rowCells = (question.tableCells ?? []).filter((cell) => cell.rowId === row.id);
        const charts = rowCells.map((cell) => {
            const counts = new Map<string, number>();
            const labels = new Map<string, string>();
            const columnLabel = question.tableColumns?.find((column) => column.id === cell.columnId)?.label ?? "Columna";
            const correctIds = getTableCellCorrectItemIds(cell);
            const correctKey = correctIds.join("|");

            labels.set(correctKey, formatLabelList(correctIds.map((itemId) => getTableItemLabel(question.tableItems ?? [], itemId))));

            for (const { attempt } of reviewedAttempts) {
                const structuredAnswer = attempt.structured_answers?.[question.id];
                const selectedIds = getTableAnswerItemIds(structuredAnswer, cell.id);
                if (selectedIds.length === 0) continue;
                const key = selectedIds.join("|");
                labels.set(key, formatLabelList(selectedIds.map((itemId) => getTableItemLabel(question.tableItems ?? [], itemId))));
                incrementCount(counts, key);
            }

            return {
                key: cell.id,
                label: columnLabel,
                data: getCountedResponsePoints(counts, labels, [correctKey], reviewedAttempts.length),
            };
        });

        const combinedCounts = new Map<string, number>();
        const combinedLabels = new Map<string, string>();
        const combinedCorrectKeys: string[] = [];

        for (const chart of charts) {
            for (const point of chart.data) {
                const key = `${chart.key}:${point.key}`;
                combinedLabels.set(key, `${chart.label}: ${point.label}`);
                if (point.correct) combinedCorrectKeys.push(key);
                if (point.value > 0) combinedCounts.set(key, point.value);
            }
        }

        return {
            key: row.id,
            label: row.label || "Fila",
            data: getCountedResponsePoints(combinedCounts, combinedLabels, combinedCorrectKeys, reviewedAttempts.length),
            charts,
        };
    });
}

function buildMatchingResponseDimensions(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]): QuizStatsVisualizationDimension[] {
    return (question.matchingPrompts ?? []).map((prompt) => {
        const counts = new Map<string, number>();
        const labels = new Map<string, string>();
        const correctIds = getMatchingPromptCorrectMatchIds(prompt);
        const correctKey = correctIds.join("|");

        labels.set(correctKey, formatLabelList(correctIds.map((itemId) => getOptionLabel(question.matchingOptions ?? [], itemId))));

        for (const { attempt } of reviewedAttempts) {
            const structuredAnswer = attempt.structured_answers?.[question.id];
            const selectedIds = getMatchingAnswerItemIds(structuredAnswer, prompt.id);
            if (selectedIds.length === 0) continue;
            const key = selectedIds.join("|");
            labels.set(key, formatLabelList(selectedIds.map((itemId) => getOptionLabel(question.matchingOptions ?? [], itemId))));
            incrementCount(counts, key);
        }

        return {
            key: prompt.id,
            label: prompt.text || "Concepto",
            data: getCountedResponsePoints(counts, labels, [correctKey], reviewedAttempts.length),
        };
    });
}

function buildOrderingResponseDimensions(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]): QuizStatsVisualizationDimension[] {
    return (question.orderingItems ?? []).map((item, positionIndex) => {
        const counts = new Map<string, number>();
        const labels = new Map<string, string>();

        for (const candidate of question.orderingItems ?? []) {
            labels.set(candidate.id, candidate.text || "Sin texto");
        }

        for (const { attempt } of reviewedAttempts) {
            const structuredAnswer = attempt.structured_answers?.[question.id];
            const selectedId = structuredAnswer?.kind === QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE
                ? structuredAnswer.orderedItemIds[positionIndex]
                : undefined;
            if (selectedId) incrementCount(counts, selectedId);
        }

        return {
            key: `position-${positionIndex + 1}`,
            label: `Posición ${positionIndex + 1}`,
            description: item.text,
            data: getCountedResponsePoints(counts, labels, [item.id], reviewedAttempts.length),
        };
    });
}

function buildCategorizationResponseDimensions(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]): QuizStatsVisualizationDimension[] {
    return (question.categories ?? []).map((category) => {
        const counts = new Map<string, number>();
        const labels = new Map<string, string>();
        const correctKeys = (question.categoryItems ?? [])
            .filter((item) => getCategoryItemCorrectCategoryIds(item).includes(category.id))
            .map((item) => item.id);

        for (const item of question.categoryItems ?? []) {
            labels.set(item.id, item.text || "Sin texto");
        }

        for (const { attempt } of reviewedAttempts) {
            const structuredAnswer = attempt.structured_answers?.[question.id];
            for (const item of question.categoryItems ?? []) {
                const selectedCategoryIds = getCategorizationAssignedCategoryIds(structuredAnswer, item.id);
                if (selectedCategoryIds.includes(category.id)) incrementCount(counts, item.id);
            }
        }

        return {
            key: category.id,
            label: category.label || "Categoría",
            data: getCountedResponsePoints(counts, labels, correctKeys, reviewedAttempts.length),
        };
    });
}

function getTopPoint(points: QuizStatsChartPoint[]) {
    return [...points].sort((left, right) => right.value - left.value)[0];
}

function buildAverageAccuracyMetric(points: QuizStatsChartPoint[]): QuizStatsSummaryMetric | null {
    if (points.length === 0) return null;
    const average = round2(points.reduce((total, point) => total + point.value, 0) / points.length);
    return {
        key: "average-accuracy",
        label: "Precisión media",
        value: formatPercent(average),
        tone: average >= 70 ? QUIZ_STATS_METRIC_TONE.SUCCESS : average >= 40 ? QUIZ_STATS_METRIC_TONE.DEFAULT : QUIZ_STATS_METRIC_TONE.WARNING,
    };
}

function buildWeakestPointMetric(points: QuizStatsChartPoint[], label: string): QuizStatsSummaryMetric | null {
    if (points.length === 0) return null;
    const weakest = [...points].sort((left, right) => left.value - right.value)[0];
    return {
        key: "weakest-point",
        label,
        value: `${weakest.label} (${formatPercent(weakest.value)})`,
        tone: QUIZ_STATS_METRIC_TONE.WARNING,
    };
}

function buildLikertDistributionData(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]) {
    const { values } = getLikertRange(question);
    return values.map((value, index) => {
        const rawValue = String(value);
        const count = reviewedAttempts.filter(({ attempt }) => (attempt.short_answers[question.id] ?? "") === rawValue).length;
        return {
            key: rawValue,
            label: `${value} · ${getLikertLabel(question, value)}`,
            value: count,
            color: `var(--chart-${(index % 5) + 1})`,
            count,
            total: reviewedAttempts.length,
        };
    });
}

function getLikertAnsweredValues(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]) {
    return reviewedAttempts
        .map(({ attempt }) => (attempt.short_answers[question.id] ?? "").trim())
        .filter((value) => value.length > 0)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
}

function buildLikertSummaryMetrics(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]): QuizStatsSummaryMetric[] {
    const values = getLikertAnsweredValues(question, reviewedAttempts);
    const distribution = buildLikertDistributionData(question, reviewedAttempts);
    const topPoint = getTopPoint(distribution.filter((point) => point.value > 0));
    const answeredCount = values.length;
    const blankRate = clampPercentage(reviewedAttempts.length - answeredCount, reviewedAttempts.length);
    const average = answeredCount > 0 ? round2(values.reduce((total, value) => total + value, 0) / answeredCount) : 0;
    const metrics: QuizStatsSummaryMetric[] = [
        {
            key: "likert-average",
            label: "Media",
            value: answeredCount > 0 ? average.toFixed(2) : "Sin datos",
            tone: QUIZ_STATS_METRIC_TONE.DEFAULT,
        },
        {
            key: "likert-mode",
            label: "Moda",
            value: topPoint ? topPoint.label : "Sin datos",
            tone: QUIZ_STATS_METRIC_TONE.DEFAULT,
        },
        {
            key: "likert-blank-rate",
            label: "Sin respuesta",
            value: formatPercent(blankRate),
            tone: blankRate > 30 ? QUIZ_STATS_METRIC_TONE.WARNING : QUIZ_STATS_METRIC_TONE.MUTED,
        },
    ];

    if (question.requireJustification) {
        const justifiedCount = reviewedAttempts.filter(({ attempt }) => (attempt.short_answers[`${question.id}:justification`] ?? "").trim().length > 0).length;
        metrics.push({
            key: "likert-justification-rate",
            label: "Con justificación",
            value: formatPercent(clampPercentage(justifiedCount, reviewedAttempts.length)),
            tone: QUIZ_STATS_METRIC_TONE.DEFAULT,
        });
    }

    return metrics;
}

function buildLikertVisualizations(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]): QuizStatsVisualization[] {
    const visualizations: QuizStatsVisualization[] = [
        {
            key: "likert-distribution",
            kind: QUIZ_STATS_VISUALIZATION_KIND.BAR,
            allowedKinds: getCategoricalAllowedKinds(),
            defaultKind: QUIZ_STATS_VISUALIZATION_KIND.BAR,
            title: "Distribución de respuestas",
            description: "Muestra cuántos alumnos eligieron cada valor de la escala.",
            valueLabel: "Alumnos",
            valueUnit: QUIZ_STATS_VALUE_UNIT.COUNT,
            data: buildLikertDistributionData(question, reviewedAttempts),
        },
    ];

    if (question.requireJustification) {
        visualizations.push({
            key: "likert-justification",
            kind: QUIZ_STATS_VISUALIZATION_KIND.DONUT,
            allowedKinds: getCategoricalAllowedKinds(),
            defaultKind: QUIZ_STATS_VISUALIZATION_KIND.DONUT,
            title: "Justificación entregada",
            description: "Permite ver si la clase argumentó la valoración elegida.",
            valueLabel: "Alumnos",
            valueUnit: QUIZ_STATS_VALUE_UNIT.COUNT,
            data: [
                {
                    key: "with-justification",
                    label: "Con justificación",
                    value: reviewedAttempts.filter(({ attempt }) => (attempt.short_answers[`${question.id}:justification`] ?? "").trim().length > 0).length,
                    color: "var(--chart-2)",
                    count: reviewedAttempts.filter(({ attempt }) => (attempt.short_answers[`${question.id}:justification`] ?? "").trim().length > 0).length,
                    total: reviewedAttempts.length,
                },
                {
                    key: "without-justification",
                    label: "Sin justificación",
                    value: reviewedAttempts.filter(({ attempt }) => (attempt.short_answers[`${question.id}:justification`] ?? "").trim().length === 0).length,
                    color: "var(--chart-5)",
                    count: reviewedAttempts.filter(({ attempt }) => (attempt.short_answers[`${question.id}:justification`] ?? "").trim().length === 0).length,
                    total: reviewedAttempts.length,
                },
            ],
        });
    }

    return visualizations;
}

function getNumericAnsweredValues(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]) {
    return reviewedAttempts
        .map(({ attempt }) => (attempt.short_answers[question.id] ?? "").trim())
        .filter((value) => value.length > 0)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= (question.numericMin ?? 0) && value <= (question.numericMax ?? 10));
}

function formatNumericRangeLabel(start: number, end: number) {
    const formatter = (value: number) => Number.isInteger(value) ? String(value) : round2(value).toFixed(2);
    return `${formatter(start)} - ${formatter(end)}`;
}

function buildNumericHistogramData(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]) {
    const values = getNumericAnsweredValues(question, reviewedAttempts);
    const configuredMin = question.numericMin ?? 0;
    const configuredMax = question.numericMax ?? 10;
    const bucketCount = 5;
    const bucketSize = (configuredMax - configuredMin) / bucketCount || 1;
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
        const start = configuredMin + (bucketSize * index);
        const end = index === bucketCount - 1 ? configuredMax : configuredMin + (bucketSize * (index + 1));
        return {
            key: `bucket-${index + 1}`,
            label: formatNumericRangeLabel(start, end),
            start,
            end,
            count: 0,
        };
    });

    for (const value of values) {
        const bucketIndex = value === configuredMax
            ? buckets.length - 1
            : Math.min(Math.floor((value - configuredMin) / bucketSize), buckets.length - 1);
        if (bucketIndex >= 0 && bucketIndex < buckets.length) {
            buckets[bucketIndex].count += 1;
        }
    }

    return buckets.map((bucket, index) => ({
        key: bucket.key,
        label: bucket.label,
        value: bucket.count,
        color: `var(--chart-${(index % 5) + 1})`,
        count: bucket.count,
        total: reviewedAttempts.length,
    }));
}

function buildNumericSummaryMetrics(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]): QuizStatsSummaryMetric[] {
    const values = getNumericAnsweredValues(question, reviewedAttempts);
    const blankRate = clampPercentage(reviewedAttempts.length - values.length, reviewedAttempts.length);
    if (values.length === 0) {
        return [
            {
                key: "numeric-average",
                label: "Media",
                value: "Sin datos",
                tone: QUIZ_STATS_METRIC_TONE.MUTED,
            },
            {
                key: "numeric-range",
                label: "Rango observado",
                value: "Sin datos",
                tone: QUIZ_STATS_METRIC_TONE.MUTED,
            },
            {
                key: "numeric-blank-rate",
                label: "Sin respuesta",
                value: formatPercent(blankRate),
                tone: QUIZ_STATS_METRIC_TONE.WARNING,
            },
        ];
    }

    const average = round2(values.reduce((total, value) => total + value, 0) / values.length);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return [
        {
            key: "numeric-average",
            label: "Media",
            value: average.toFixed(2),
            tone: QUIZ_STATS_METRIC_TONE.DEFAULT,
        },
        {
            key: "numeric-range",
            label: "Rango observado",
            value: `${round2(min)} - ${round2(max)}`,
            tone: QUIZ_STATS_METRIC_TONE.DEFAULT,
        },
        {
            key: "numeric-blank-rate",
            label: "Sin respuesta",
            value: formatPercent(blankRate),
            tone: blankRate > 30 ? QUIZ_STATS_METRIC_TONE.WARNING : QUIZ_STATS_METRIC_TONE.MUTED,
        },
    ];
}

function buildCategorizationCategoryAccuracyData(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]) {
    return (question.categories ?? []).map((category) => {
        const total = reviewedAttempts.length * (question.categoryItems ?? []).filter((item) =>
            getCategoryItemCorrectCategoryIds(item).includes(category.id),
        ).length;
        const count = reviewedAttempts.reduce((runningTotal, { studentRow }) => runningTotal + (question.categoryItems ?? []).filter((item) => {
            if (!getCategoryItemCorrectCategoryIds(item).includes(category.id)) return false;
            return studentRow.rows.find((row) => row.id === item.id)?.isCorrect === true;
        }).length, 0);

        return {
            key: category.id,
            label: category.label,
            value: clampPercentage(count, total),
            color: "var(--chart-1)",
            count,
            total,
        };
    });
}

function buildQuestionSummaryMetrics(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[], fullCorrectRate: number | null): QuizStatsSummaryMetric[] {
    const questionType = getQuestionType(question);
    const answeredCount = getAnsweredCount(question, reviewedAttempts);
    const blankRate = clampPercentage(reviewedAttempts.length - answeredCount, reviewedAttempts.length);

    if (questionType === QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE || questionType === QUIZ_QUESTION_TYPE.TRUE_FALSE) {
        const optionData = getClassicOptionSelectionData(question, reviewedAttempts);
        const mostChosen = getTopPoint(optionData.filter((point) => point.value > 0));
        const distractor = getTopPoint(optionData.filter((point) => !point.correct && point.value > 0));
        return [
            {
                key: "most-chosen",
                label: "Respuesta más elegida",
                value: mostChosen ? `${mostChosen.label} (${formatPercent(clampPercentage(mostChosen.value, reviewedAttempts.length))})` : "Sin datos",
                tone: mostChosen?.correct ? QUIZ_STATS_METRIC_TONE.SUCCESS : QUIZ_STATS_METRIC_TONE.WARNING,
            },
            {
                key: "top-distractor",
                label: "Distractor líder",
                value: distractor ? `${distractor.label} (${formatPercent(clampPercentage(distractor.value, reviewedAttempts.length))})` : "Sin distractor claro",
                tone: distractor ? QUIZ_STATS_METRIC_TONE.WARNING : QUIZ_STATS_METRIC_TONE.MUTED,
            },
            {
                key: "blank-rate",
                label: "En blanco",
                value: formatPercent(blankRate),
                tone: blankRate > 30 ? QUIZ_STATS_METRIC_TONE.WARNING : QUIZ_STATS_METRIC_TONE.MUTED,
            },
        ];
    }

    if (questionType === QUIZ_QUESTION_TYPE.SHORT_ANSWER) {
        const filledValues = reviewedAttempts
            .map(({ review }) => review.rows[0]?.value ?? "")
            .filter((value) => value !== "Sin respuesta");
        const averageLength = filledValues.length > 0
            ? Math.round(filledValues.reduce((total, value) => total + value.length, 0) / filledValues.length)
            : 0;
        return [
            {
                key: "answered-rate",
                label: "Participación",
                value: formatPercent(clampPercentage(answeredCount, reviewedAttempts.length)),
                tone: QUIZ_STATS_METRIC_TONE.DEFAULT,
            },
            {
                key: "unique-answers",
                label: "Respuestas únicas",
                value: String(new Set(filledValues).size),
                tone: QUIZ_STATS_METRIC_TONE.DEFAULT,
            },
            {
                key: "average-length",
                label: "Longitud media",
                value: filledValues.length > 0 ? `${averageLength} car.` : "Sin datos",
                tone: QUIZ_STATS_METRIC_TONE.MUTED,
            },
        ];
    }

    if (questionType === QUIZ_QUESTION_TYPE.LIKERT) {
        return buildLikertSummaryMetrics(question, reviewedAttempts);
    }

    if (questionType === QUIZ_QUESTION_TYPE.NUMERIC) {
        return buildNumericSummaryMetrics(question, reviewedAttempts);
    }

    if (questionType === QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP) {
        const points = buildCategorizationCategoryAccuracyData(question, reviewedAttempts);
        return [
            buildAverageAccuracyMetric(points),
            buildWeakestPointMetric(points, "Categoría más conflictiva"),
            {
                key: "full-correct-rate",
                label: "Respuestas completas",
                value: fullCorrectRate !== null ? formatPercent(fullCorrectRate) : "n/d",
                tone: fullCorrectRate !== null && fullCorrectRate >= 70 ? QUIZ_STATS_METRIC_TONE.SUCCESS : QUIZ_STATS_METRIC_TONE.DEFAULT,
            },
        ].filter((metric): metric is QuizStatsSummaryMetric => metric !== null);
    }

    const referenceRows = reviewedAttempts[0]?.studentRow.rows ?? [];
    const points = getRowAccuracyData(referenceRows, reviewedAttempts);
    return [
        buildAverageAccuracyMetric(points),
        buildWeakestPointMetric(points, "Elemento más fallado"),
        {
            key: "blank-rate",
            label: "En blanco",
            value: formatPercent(blankRate),
            tone: blankRate > 30 ? QUIZ_STATS_METRIC_TONE.WARNING : QUIZ_STATS_METRIC_TONE.MUTED,
        },
    ].filter((metric): metric is QuizStatsSummaryMetric => metric !== null);
}

function buildQuestionVisualizations(question: QuizQuestion, reviewedAttempts: QuizStatsReviewedAttempt[]): QuizStatsVisualization[] {
    const questionType = getQuestionType(question);
    const isSingleSelect = getCorrectOptionIds(question).length <= 1;

    if (questionType === QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE || questionType === QUIZ_QUESTION_TYPE.TRUE_FALSE) {
        const optionData = getClassicOptionSelectionData(question, reviewedAttempts);
        if (isSingleSelect) {
            const blankCount = reviewedAttempts.length - getAnsweredCount(question, reviewedAttempts);
            const donutData = blankCount > 0
                ? [...optionData, {
                    key: "blank",
                    label: "En blanco",
                    value: blankCount,
                    color: "var(--chart-4)",
                    count: blankCount,
                    total: reviewedAttempts.length,
                }]
                : optionData;
            return [
                {
                    key: "classic-distribution",
                    kind: QUIZ_STATS_VISUALIZATION_KIND.DONUT,
                    allowedKinds: getCategoricalAllowedKinds(),
                    defaultKind: QUIZ_STATS_VISUALIZATION_KIND.DONUT,
                    title: "Reparto de respuestas",
                    description: "¿Qué opción concentró más votos de la clase?",
                    valueLabel: "Alumnos",
                    valueUnit: QUIZ_STATS_VALUE_UNIT.COUNT,
                    data: donutData,
                },
            ];
        }

        return [
            {
                key: "classic-option-selection",
                kind: QUIZ_STATS_VISUALIZATION_KIND.BAR,
                allowedKinds: getCategoricalAllowedKinds(),
                defaultKind: QUIZ_STATS_VISUALIZATION_KIND.BAR,
                title: "Selección por opción",
                description: "Cada barra indica cuántos alumnos marcaron esa opción.",
                valueLabel: "Alumnos",
                valueUnit: QUIZ_STATS_VALUE_UNIT.COUNT,
                data: optionData,
            },
            {
                key: "classic-outcomes",
                kind: QUIZ_STATS_VISUALIZATION_KIND.DONUT,
                allowedKinds: getCategoricalAllowedKinds(),
                defaultKind: QUIZ_STATS_VISUALIZATION_KIND.DONUT,
                title: "Resultado global",
                description: "Separa respuestas totalmente correctas, parciales, incorrectas y en blanco.",
                valueLabel: "Alumnos",
                valueUnit: QUIZ_STATS_VALUE_UNIT.COUNT,
                data: getClassicResponseStateData(question, reviewedAttempts),
            },
        ];
    }

    if (questionType === QUIZ_QUESTION_TYPE.SHORT_ANSWER) {
        return [
            {
                key: "short-answer-presence",
                kind: QUIZ_STATS_VISUALIZATION_KIND.DONUT,
                allowedKinds: getCategoricalAllowedKinds(),
                defaultKind: QUIZ_STATS_VISUALIZATION_KIND.DONUT,
                title: "Participación",
                description: "Cuántos alumnos contestaron frente a cuántos dejaron la pregunta en blanco.",
                valueLabel: "Alumnos",
                valueUnit: QUIZ_STATS_VALUE_UNIT.COUNT,
                data: buildPresenceData(question, reviewedAttempts),
            },
        ];
    }

    if (questionType === QUIZ_QUESTION_TYPE.LIKERT) {
        return buildLikertVisualizations(question, reviewedAttempts);
    }

    if (questionType === QUIZ_QUESTION_TYPE.NUMERIC) {
        return [
            {
                key: "numeric-histogram",
                kind: QUIZ_STATS_VISUALIZATION_KIND.HISTOGRAM,
                title: "Distribución por rangos",
                description: "Agrupa las respuestas numéricas para ver dónde se concentra la clase.",
                valueLabel: "Alumnos",
                valueUnit: QUIZ_STATS_VALUE_UNIT.COUNT,
                data: buildNumericHistogramData(question, reviewedAttempts),
            },
            {
                key: "numeric-presence",
                kind: QUIZ_STATS_VISUALIZATION_KIND.DONUT,
                allowedKinds: getCategoricalAllowedKinds(),
                defaultKind: QUIZ_STATS_VISUALIZATION_KIND.DONUT,
                title: "Participación",
                description: "Distingue respuestas válidas de preguntas sin responder.",
                valueLabel: "Alumnos",
                valueUnit: QUIZ_STATS_VALUE_UNIT.COUNT,
                data: buildPresenceData(question, reviewedAttempts),
            },
        ];
    }

    if (questionType === QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN) {
        const dimensions = buildFillBlankResponseDimensions(question, reviewedAttempts);
        return [
            {
                key: "fill-blank-responses",
                kind: QUIZ_STATS_VISUALIZATION_KIND.BAR,
                allowedKinds: getCategoricalAllowedKinds(),
                defaultKind: QUIZ_STATS_VISUALIZATION_KIND.BAR,
                title: "Respuestas por hueco",
                description: "Selecciona un hueco para ver qué opción eligió la clase.",
                contextLabel: "Texto completo",
                contextText: getPromptTextWithBlanks(question),
                valueLabel: "Alumnos",
                valueUnit: QUIZ_STATS_VALUE_UNIT.COUNT,
                data: dimensions[0]?.data ?? [],
                dimensions,
            },
        ];
    }

    if (questionType === QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) {
        const dimensions = buildTableRowResponseDimensions(question, reviewedAttempts);
        return [
            {
                key: "table-row-responses",
                kind: QUIZ_STATS_VISUALIZATION_KIND.BAR,
                allowedKinds: getCategoricalAllowedKinds(),
                defaultKind: QUIZ_STATS_VISUALIZATION_KIND.BAR,
                title: "Respuestas por fila",
                description: "Selecciona una fila para ver qué respuestas se colocaron en sus columnas.",
                valueLabel: "Alumnos",
                valueUnit: QUIZ_STATS_VALUE_UNIT.COUNT,
                data: dimensions[0]?.data ?? [],
                dimensions,
            },
        ];
    }

    if (questionType === QUIZ_QUESTION_TYPE.MATCHING_PAIRS) {
        const dimensions = buildMatchingResponseDimensions(question, reviewedAttempts);
        return [
            {
                key: "matching-prompt-responses",
                kind: QUIZ_STATS_VISUALIZATION_KIND.BAR,
                allowedKinds: getCategoricalAllowedKinds(),
                defaultKind: QUIZ_STATS_VISUALIZATION_KIND.BAR,
                title: "Respuestas por concepto",
                description: "Selecciona un concepto para ver con qué opción lo emparejó la clase.",
                valueLabel: "Alumnos",
                valueUnit: QUIZ_STATS_VALUE_UNIT.COUNT,
                data: dimensions[0]?.data ?? [],
                dimensions,
            },
        ];
    }

    if (questionType === QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE) {
        const dimensions = buildOrderingResponseDimensions(question, reviewedAttempts);
        return [
            {
                key: "ordering-position-responses",
                kind: QUIZ_STATS_VISUALIZATION_KIND.BAR,
                allowedKinds: getCategoricalAllowedKinds(),
                defaultKind: QUIZ_STATS_VISUALIZATION_KIND.BAR,
                title: "Respuestas por posición",
                description: "Selecciona una posición para ver qué elemento colocó ahí la clase.",
                valueLabel: "Alumnos",
                valueUnit: QUIZ_STATS_VALUE_UNIT.COUNT,
                data: dimensions[0]?.data ?? [],
                dimensions,
            },
        ];
    }

    const dimensions = buildCategorizationResponseDimensions(question, reviewedAttempts);
    return [
        {
            key: "categorization-category-responses",
            kind: QUIZ_STATS_VISUALIZATION_KIND.BAR,
            allowedKinds: getCategoricalAllowedKinds(),
            defaultKind: QUIZ_STATS_VISUALIZATION_KIND.BAR,
            title: "Respuestas por categoría",
            description: "Selecciona una categoría para ver qué elementos le asignó la clase.",
            valueLabel: "Alumnos",
            valueUnit: QUIZ_STATS_VALUE_UNIT.COUNT,
            data: dimensions[0]?.data ?? [],
            dimensions,
        },
    ];
}

export function buildQuestionStatsSnapshot(
    question: QuizQuestion,
    attempts: QuizStatsTeacherAttempt[],
    penalizeWrongAnswers: boolean,
): QuizQuestionStatsSnapshot {
    const reviewedAttempts = attempts.map((attempt) => {
        const review = buildQuestionReview(question, attempt, penalizeWrongAnswers);
        const studentRow = {
            studentId: attempt.student_id,
            studentName: attempt.student_name ?? "Alumno sin nombre",
            answerLabel: buildAnswerLabel(review),
            isFullyCorrect: countFullyCorrect(review),
            rows: review.rows,
        };
        return {
            attempt,
            review,
            studentRow,
        };
    });

    const mode = getStatsQuestionMode(getQuestionType(question));
    const studentRows = reviewedAttempts.map((entry) => entry.studentRow);
    const fullCorrectCount = mode === QUIZ_STATS_MODE.GRADED
        ? studentRows.filter((studentRow) => studentRow.isFullyCorrect === true).length
        : null;
    const fullCorrectRate = mode === QUIZ_STATS_MODE.GRADED
        ? (attempts.length > 0 && fullCorrectCount !== null ? round2((fullCorrectCount / attempts.length) * 100) : 0)
        : null;
    const visualizations = buildQuestionVisualizations(question, reviewedAttempts);
    const chartData = visualizations[0]?.data ?? [];

    return {
        questionId: question.id,
        questionText: question.text,
        questionType: getQuestionType(question),
        mode,
        participants: attempts.length,
        fullCorrectCount,
        fullCorrectRate,
        chartData,
        summaryMetrics: buildQuestionSummaryMetrics(question, reviewedAttempts, fullCorrectRate),
        visualizations,
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
