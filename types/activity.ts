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

// Tipos de pasos soportados
export type ActivityStepType =
    | 'theory'
    | 'deliverable'
    | 'animation'
    | 'quiz'
    | 'presentation'
    | 'resource'
    | 'file_upload'
    | 'self_evaluation'
    | 'peer_evaluation';

export type CompletionMode = 'none' | 'required' | 'viewable';

export const STEP_AUDIENCE_MODE = {
    ALL: "all",
    RESTRICTED: "restricted",
} as const;

export type StepAudienceMode = (typeof STEP_AUDIENCE_MODE)[keyof typeof STEP_AUDIENCE_MODE];

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
    audience_mode?: StepAudienceMode;
    visible_student_ids?: string[];
    visible_group_ids?: string[];
    inherit_audience_from_parent?: boolean;
    parent_step_id?: string | null;   // si set, este paso es hijo del paso padre indicado
    children?: ActivityStep[];        // populated client-side; sólo self_evaluation y peer_evaluation
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

export type GradeComposition = {
    selfEvalWeight: number;       // % de nota de la self_evaluation hijo (0–100)
    peerEvalWeight: number;       // % de nota del peer_evaluation hijo individual/group (0–100)
    intraGroupWeight: number;     // % de nota del peer_evaluation hijo intra_group (0–100)
    quizWeight?: number;          // % de nota del quiz hijo built-in (0–100)
    // teacherWeight = 100 - selfEvalWeight - peerEvalWeight - intraGroupWeight - quizWeight (implícito)
};

export type DeliverableContent = {
    templateUrl: string;
    instructionsMarkdown: string;
    deliveryMode?: DeliveryMode; // undefined = 'manual' (backwards-compat)
    rubric?: RubricCriteria[];
    is_group_submission?: boolean; // si true, la entrega es grupal
    gradeComposition?: GradeComposition; // ponderación 360º; si undefined, 100% profesor
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
    | 'short_answer' | 'likert' | 'numeric'
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
    correctItemIds?: string[];
};

export type QuizMatchingPrompt = {
    id: string;
    text: string;
    correctMatchId: string;
    correctMatchIds?: string[];
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
    correctCategoryIds?: string[];
};

export type QuizStructuredQuestionAnswer =
    | {
        kind: 'fill_in_the_blank_dropdown';
        blanks: Record<string, string>;
    }
    | {
        kind: 'table_drag_drop';
        placements: Record<string, string | string[]>;
    }
    | {
        kind: 'matching_pairs';
        matches: Record<string, string | string[]>;
    }
    | {
        kind: 'ordering_sequence';
        orderedItemIds: string[];
    }
    | {
        kind: 'categorization_drag_drop';
        assignments: Record<string, string | string[]>;
    };

export type QuizStructuredAnswers = Record<string, QuizStructuredQuestionAnswer>;

export type QuizQuestion = {
    id: string;
    sourceQuestionId?: string; // original question id when copied from a quiz into a bank
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
    tableAllowItemReuse?: boolean;
    tableAllowMultipleItemsPerCell?: boolean;
    matchingPrompts?: QuizMatchingPrompt[];
    matchingOptions?: QuizMatchingOption[];
    matchingAllowMultiplePerPrompt?: boolean;
    matchingAllowReuse?: boolean;
    orderingItems?: QuizOrderingItem[];
    categories?: QuizCategory[];
    categoryItems?: QuizCategoryItem[];
    categorizationAllowReuse?: boolean;
    points: number;           // default: 1; for 'numeric' in peer_eval: grade weight (0 = no grade)
    explanation?: string;     // shown after submission if showCorrectAnswers
    poolId?: string;          // if set, question belongs to a pool; undefined = always shown
    isRequired?: boolean;     // if true, the student must answer before submitting the quiz
    // short_answer / likert specific
    minLength?: number;           // minimum character count for valid answer
    requireJustification?: boolean; // likert: requires a text justification alongside scale selection
    // likert specific
    likertScale?: number;         // @deprecated — usa likertMin/likertMax
    likertMin?: number;           // minimum integer value shown to the student (default 1)
    likertMax?: number;           // maximum integer value shown to the student (default likertScale ?? 5)
    likertLabels?: string[];      // labels per value from likertMin to likertMax
    // numeric specific
    numericMin?: number;          // minimum value (default 0)
    numericMax?: number;          // maximum value (default 10)
};

export type QuizMode = 'builtin' | 'google_form';

export type QuizBankSelection = {
    bankId: string;
    pickCount: number;  // how many questions to pick from this bank per attempt
    mode?: "random" | "ordered_all";
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

export type QuizSectionBlock = {
    id: string;
    kind: "section";
    title: string;
};

export type QuizQuestionBlock = {
    id: string;
    kind: "question";
    question: QuizQuestion;
};

export type QuizFixedBlock = QuizSectionBlock | QuizQuestionBlock;

export type QuizContent = {
    questions: QuizQuestion[];
    blocks?: QuizFixedBlock[];
    bankSelections?: QuizBankSelection[];  // global bank references (replaces per-quiz pools)
    passingScore?: number;          // % (0–100)
    maxAttempts?: number;           // undefined = unlimited
    showCorrectAnswers?: boolean;
    randomizeQuestions?: boolean;
    randomizeOptions?: boolean;
    penalizeWrongAnswers?: boolean;
    questionsPerPage?: number;   // undefined = all on one page
    saveQuestionStats?: boolean;
    instructionsMarkdown?: string;
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
    is_group_submission?: boolean; // si true, todos los miembros del grupo comparten los archivos
    gradeComposition?: GradeComposition; // ponderación 360º; si undefined, 100% profesor
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

// Pregunta abierta para evalMode = 'questions'
export type EvalQuestion = {
    id: string;
    text: string;           // enunciado de la pregunta
    description?: string;   // contexto/pista opcional
};

export type EvalMode = 'rubric' | 'questions';

// 8. Self-Evaluation (autoevaluación del alumno mediante rúbrica o preguntas abiertas)
export type SelfEvaluationContent = {
    evalMode?: EvalMode;            // 'rubric' (default) | 'questions'
    rubric: RubricCriteria[];       // usado cuando evalMode = 'rubric'
    questions?: QuizQuestion[];     // usado cuando evalMode = 'questions' (tipos: short_answer | likert)
    bankSelections?: QuizBankSelection[]; // cargar preguntas desde bancos (sólo short_answer)
    referenceStepId?: string;       // ID del deliverable vinculado (para countsTowardGrade + badge UI)
    requireJustification: boolean;  // en modo rúbrica: exige texto de justificación por criterio
    minJustificationLength?: number; // mínimo de caracteres por justificación (modo rúbrica)
    countsTowardGrade: boolean;     // sólo relevante en modo rúbrica
    selfEvalWeight?: number;        // % de la nota final (0–100), sólo si countsTowardGrade
    instructionsMarkdown?: string;
};

// 9. Peer Evaluation (coevaluación entre alumnos o grupos)
export type PeerEvaluationMode = 'individual' | 'group' | 'intra_group';
export type OutlierSensitivity = 'strict' | 'normal' | 'lenient';
export type NonEvaluatorPolicy = 'none' | 'fallback_teacher' | 'grade_penalty';

export type PeerEvaluationContent = {
    evalMode?: EvalMode;            // 'rubric' (default) | 'questions'
    questions?: QuizQuestion[];     // usado cuando evalMode = 'questions' (tipos: short_answer | likert)
    mode: PeerEvaluationMode;
    sourceStepId?: string;              // @deprecated — usa parent_step_id en su lugar; mantenido para BC
    rubric: RubricCriteria[];
    requireJustification: boolean;
    // Modo A — Individual
    submissionsPerEvaluator?: number;   // cuántos trabajos evalúa cada alumno
    peerWeight?: number;                // @deprecated — usa gradeComposition en el padre
    anonymousEvaluation?: boolean;      // oculta el evaluador al alumno evaluado
    peerFeedbackVisibleToStudents?: boolean; // el profesor revela justificaciones recibidas al publicar
    // Anti-gaming
    calibrationSubmissionId?: string;   // submission modelo para calibración previa obligatoria
    minJustificationLength?: number;    // mínimo de caracteres por justificación
    outlierSensitivity?: OutlierSensitivity; // strict=1σ | normal=1.5σ | lenient=2σ (default: 'normal')
    nonEvaluatorPolicy?: NonEvaluatorPolicy; // qué pasa si un alumno no evalúa (default: 'fallback_teacher')
    nonEvaluatorPenaltyPoints?: number; // descuento si policy = 'grade_penalty'
    // Modo B — Grupos
    evaluateAllGroups?: boolean;        // cada grupo evalúa a todos los demás
    groupsPerGroup?: number;            // cuántos grupos evalúa cada grupo cuando evaluateAllGroups=false
    individualEvaluatorMode?: boolean;  // false=grupo envía 1 eval; true=cada miembro individualmente
    livePresentationMode?: boolean;     // añade sección Q&A al final de la rúbrica
    // Modo C — Intra-grupo (miembros del grupo se evalúan entre sí)
    intraGroupWeight?: number;          // @deprecated — usa gradeComposition.intraGroupWeight en el padre
    instructionsMarkdown?: string;
};

export type ActivityStepContent =
    | TheoryContent
    | DeliverableContent
    | AnimationContent
    | QuizContent
    | PresentationContent
    | ResourceContent
    | FileUploadContent
    | SelfEvaluationContent
    | PeerEvaluationContent
    | null;

// Tipos para el estado en cliente (inclusiones anidadas para el sidebar)
export type ActivityStepWithClientState = ActivityStep & {
    isExpanded?: boolean;
    isSelected?: boolean;
    content: TheoryContent | DeliverableContent | AnimationContent | QuizContent | PresentationContent | ResourceContent | FileUploadContent | SelfEvaluationContent | PeerEvaluationContent;
    children?: ActivityStepWithClientState[];  // hijos self_eval / peer_eval
};

export type ActivityPhaseWithSteps = ActivityPhase & {
    steps: ActivityStepWithClientState[];
    isExpanded?: boolean;
};

// Submissions (Phase 2: student deliverable submissions)
export type SubmissionStatus = 'pending' | 'submitted' | 'graded' | 'published';

export type ActivitySubmission = {
    id: string;
    student_id: string | null;      // null para entregas grupales
    step_id: string;
    group_id: string | null;        // set para entregas grupales
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
    // Autoevaluación (self_evaluation steps)
    self_eval_rubric_scores: Record<string, number> | null;
    self_eval_justifications: Record<string, string> | null;
    // Coevaluación (peer_evaluation steps)
    peer_eval_override_score: number | null;
};

// Step views (tracking de visualización de pasos por estudiante)
export type StepView = {
    id: string;
    student_id: string;
    step_id: string;
    viewed_at: string;
};
