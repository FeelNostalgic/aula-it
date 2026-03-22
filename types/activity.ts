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

export type QuizQuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export type QuizQuestion = {
    id: string;
    type: QuizQuestionType;   // default: 'multiple_choice' (backwards-compat: undefined = multiple_choice)
    text: string;
    options: QuizOption[];    // empty if type === 'short_answer'
    points: number;           // default: 1
    explanation?: string;     // shown after submission if showCorrectAnswers
};

export type QuizMode = 'builtin' | 'google_form';

export type QuizContent = {
    questions: QuizQuestion[];
    passingScore?: number;          // % (0–100)
    maxAttempts?: number;           // undefined = unlimited
    showCorrectAnswers?: boolean;
    randomizeQuestions?: boolean;
    randomizeOptions?: boolean;
    penalizeWrongAnswers?: boolean;
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
    short_answer_scores: Record<string, number>;  // questionId → manual points (set by teacher)
    points_earned: number;
    points_total: number;
    completed_at: string;
    short_answer_feedback: Record<string, string>;
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
