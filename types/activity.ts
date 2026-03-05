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

// Los cinco tipos de pasos soportados + resource
export type ActivityStepType = 'theory' | 'deliverable' | 'animation' | 'quiz' | 'presentation' | 'resource';

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
    created_at: string;
    updated_at: string;
};

// Contenidos específicos para cada tipo de paso
// 1. Text/Theory
export type TheoryContent = {
    markdown: string;
};

// 2. Deliverable (Práctica/Google Docs)
export type DeliverableContent = {
    templateUrl: string;
    instructionsMarkdown: string;
};

// 3. Animation/Interactive
export type AnimationContent = {
    componentUrl: string; // Puede ser un import identifier o URL de codepen/sandbox
    props?: Record<string, any>;
};

// 4. Quiz
export type QuizOption = {
    id: string;
    text: string;
    isCorrect: boolean;
};

export type QuizQuestion = {
    id: string;
    text: string;
    options: QuizOption[];
};

export type QuizContent = {
    questions: QuizQuestion[];
    passingScore?: number;
    googleFormUrl?: string; // e.g. embedded Google Form
};

export type PresentationContent = {
    slidesUrl?: string; // e.g. embedded Google Slides or Pitch
    notes?: string;
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
    | null;

// Tipos para el estado en cliente (inclusiones anidadas para el sidebar)
export type ActivityStepWithClientState = ActivityStep & {
    isExpanded?: boolean;
    isSelected?: boolean;
    content: TheoryContent | DeliverableContent | AnimationContent | QuizContent | PresentationContent | ResourceContent; // tipado fuerte
};

export type ActivityPhaseWithSteps = ActivityPhase & {
    steps: ActivityStepWithClientState[];
    isExpanded?: boolean;
};
