// Tipos base para el constructor de actividades (Activity Builder)

// Definición de una Fase (la carpeta contenedora)
export type ActivityPhase = {
    id: string;
    activity_id: string;
    title: string;
    order_index: number;
    created_at: string;
    updated_at: string;
};

// Los cinco tipos de pasos soportados + resource + file_upload
export type ActivityStepType = 'theory' | 'deliverable' | 'animation' | 'quiz' | 'presentation' | 'resource' | 'file_upload';

export type CompletionMode = 'none' | 'required' | 'viewable';

// Definición de un Paso, que pertenece a una Fase
export type ActivityStep = {
    id: string;
    phase_id: string;
    title: string;
    type: ActivityStepType;
    content: ActivityStepContent; // Estructura variable dependiendo del 'type'
    order_index: number;
    is_visible: boolean;
    is_locked: boolean;
    is_lockdown?: boolean;
    is_activity_closed?: boolean;
    due_date?: string | null;
    xp?: number;
    completion_mode?: CompletionMode;
    created_at: string;
    updated_at: string;
};

// Contenidos específicos para cada tipo de paso
// 1. Text/Theory
export type TheoryContent = {
    markdown: string;
};

// 2. Deliverable (Práctica/Google Docs)
export type DeliveryMode = 'manual' | 'teacher_copy';

export type RubricLevel = {
    id: string;
    label: string;
    points: number;
    description?: string;
};

export type RubricCriteria = {
    id: string;
    name: string;
    description?: string;
    levels: RubricLevel[];
    source_criterion_id?: string;
    source_version?: number;
    source_visibility?: "private" | "public";
    source_rubric_id?: string;
    source_rubric_version?: number;
    source_rubric_visibility?: "private" | "public";
};

export function criteriaMaxPoints(c: RubricCriteria): number {
    if (!c.levels?.length) return 0;
    return Math.max(...c.levels.map(l => l.points));
}

export type DeliverableContent = {
    templateUrl: string;
    instructionsMarkdown: string;
    deliveryMode?: DeliveryMode; // undefined = 'manual' (backwards-compat)
    rubric?: RubricCriteria[];
};

// 3. Animation/Interactive
export type AnimationContent = {
    componentUrl: string;       // URL para iFrame externo (legacy/externo)
    animationSlug?: string;     // Slug de animación local del registry (tiene prioridad)
    props?: Record<string, any>;
};

// 4. Quiz
export type QuizOption = {
    id: string;
    text: string;
    isCorrect: boolean;
};

export type QuizQuestionType =
    | 'multiple_choice'
    | 'true_false'
    | 'short_answer'
    | 'fill_in_the_blank_dropdown'
    | 'table_drag_drop'
    | 'matching_pairs'
    | 'ordering_sequence'
    | 'categorization_drag_drop';

export type QuizPromptSegment =
    | {
        id: string;
        kind: 'text';
        text: string;
    }
    | {
        id: string;
        kind: 'blank';
        blankId: string;
    };

export type QuizDropdownBlank = {
    id: string;
    options: QuizOption[];
};

export type QuizTableColumn = {
    id: string;
    label: string;
};

export type QuizTableRow = {
    id: string;
    label: string;
};

export type QuizTableItem = {
    id: string;
    text: string;
};

export type QuizTableCell = {
    id: string;
    rowId: string;
    columnId: string;
    correctItemId: string;
};

export type QuizMatchingPrompt = {
    id: string;
    text: string;
    correctMatchId: string;
};

export type QuizMatchingOption = {
    id: string;
    text: string;
};

export type QuizOrderingItem = {
    id: string;
    text: string;
};

export type QuizCategory = {
    id: string;
    label: string;
};

export type QuizCategoryItem = {
    id: string;
    text: string;
    correctCategoryId: string;
};

export type QuizStructuredQuestionAnswer =
    | {
        kind: 'fill_in_the_blank_dropdown';
        blanks: Record<string, string>;
    }
    | {
        kind: 'table_drag_drop';
        placements: Record<string, string>;
    }
    | {
        kind: 'matching_pairs';
        matches: Record<string, string>;
    }
    | {
        kind: 'ordering_sequence';
        orderedItemIds: string[];
    }
    | {
        kind: 'categorization_drag_drop';
        assignments: Record<string, string>;
    };

export type QuizStructuredAnswers = Record<string, QuizStructuredQuestionAnswer>;

export type QuizQuestion = {
    id: string;
    type: QuizQuestionType;   // default: 'multiple_choice' (backwards-compat: undefined = multiple_choice)
    text: string;
    options: QuizOption[];    // empty if type === 'short_answer'
    promptSegments?: QuizPromptSegment[];
    dropdownBlanks?: QuizDropdownBlank[];
    tableRowHeaderLabel?: string;
    tableColumns?: QuizTableColumn[];
    tableRows?: QuizTableRow[];
    tableItems?: QuizTableItem[];
    tableCells?: QuizTableCell[];
    matchingPrompts?: QuizMatchingPrompt[];
    matchingOptions?: QuizMatchingOption[];
    orderingItems?: QuizOrderingItem[];
    categories?: QuizCategory[];
    categoryItems?: QuizCategoryItem[];
    points: number;           // default: 1
    explanation?: string;     // shown after submission if showCorrectAnswers
    poolId?: string;          // if set, question belongs to a pool; undefined = always shown
};

export type QuizMode = 'builtin' | 'google_form';

export type QuizBankSelection = {
    bankId: string;
    pickCount: number;  // how many questions to pick from this bank per attempt
};

export type QuestionBank = {
    id: string;
    name: string;
    description?: string | null;
    created_by: string;
    questions: QuizQuestion[];
    created_at: string;
    updated_at: string;
};

export type QuizContent = {
    questions: QuizQuestion[];
    bankSelections?: QuizBankSelection[];  // global bank references (replaces per-quiz pools)
    passingScore?: number;          // % (0–100)
    maxAttempts?: number;           // undefined = unlimited
    showCorrectAnswers?: boolean;
    randomizeQuestions?: boolean;
    randomizeOptions?: boolean;
    penalizeWrongAnswers?: boolean;
    questionsPerPage?: number;   // undefined = all on one page
    saveQuestionStats?: boolean;
    googleFormUrl?: string;
    quizMode?: QuizMode;
};

export type QuizAttempt = {
    id: string;
    student_id: string;
    step_id: string;
    attempt_number: number;
    answers: Record<string, string[]>;            // questionId → selectedOptionIds
    short_answers: Record<string, string>;        // questionId → free text
    structured_answers: QuizStructuredAnswers;    // questionId → structured answer payload
    short_answer_scores: Record<string, number>;  // questionId → manual points (set by teacher)
    points_earned: number;
    points_total: number;
    completed_at: string;
    short_answer_feedback: Record<string, string>;
    resolved_questions?: QuizQuestion[];
};

export type PresentationContent = {
    slidesUrl?: string; // e.g. embedded Google Slides or Pitch
    notes?: string;
};

// 7. FileUpload (subida directa de archivos)
export type AllowedFileType = 'pdf' | 'image' | 'word' | 'zip' | 'pka' | 'any';

export type SubmissionFile = {
    driveFileId: string;
    driveFileUrl: string;
    driveFileName: string;
    driveMimeType: string;
};

export type FileUploadContent = {
    instructionsMarkdown: string;
    allowedTypes: AllowedFileType[];
    maxFileSizeMb: number;
    maxFiles: number;
    rubric?: RubricCriteria[];
};

// 6. Resource (Files/Links)
export type ResourceItem = {
    id: string;
    title: string;
    description?: string;
    url?: string;
    type: 'file' | 'link' | 'folder';
    mimeType?: string;
    parentId?: string | null;
    isVisible?: boolean;
};

export type ResourceContent = {
    items: ResourceItem[];
    markdownHeader?: string;
};

export type ActivityStepContent =
    | TheoryContent
    | DeliverableContent
    | AnimationContent
    | QuizContent
    | PresentationContent
    | ResourceContent
    | FileUploadContent
    | null;

// Tipos para el estado en cliente (inclusiones anidadas para el sidebar)
export type ActivityStepWithClientState = ActivityStep & {
    isExpanded?: boolean;
    isSelected?: boolean;
    content: TheoryContent | DeliverableContent | AnimationContent | QuizContent | PresentationContent | ResourceContent | FileUploadContent; // tipado fuerte
};

export type ActivityPhaseWithSteps = ActivityPhase & {
    steps: ActivityStepWithClientState[];
    isExpanded?: boolean;
};

// Submissions (Phase 2: student deliverable submissions)
export type SubmissionStatus = 'pending' | 'submitted' | 'graded' | 'published';

export type ActivitySubmission = {
    id: string;
    student_id: string;
    step_id: string;
    drive_file_url: string | null;
    drive_file_id: string | null;
    drive_file_name: string | null;
    drive_mime_type: string | null;
    status: SubmissionStatus;
    submitted_at: string | null;
    created_at: string;
    updated_at: string;
    score: number | null;
    feedback: string | null;
    graded_at: string | null;
    rubric_scores: Record<string, number> | null;
    grading_mode: 'score' | 'rubric' | 'complete' | null;
    files: SubmissionFile[] | null;
    published_at: string | null;
};

// Step views (tracking de visualización de pasos por estudiante)
export type StepView = {
    id: string;
    student_id: string;
    step_id: string;
    viewed_at: string;
};
