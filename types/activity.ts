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

// Los cuatro tipos de pasos soportados
export type ActivityStepType = 'theory' | 'animation' | 'deliverable' | 'quiz';

// Definición de un Paso, que pertenece a una Fase
export type ActivityStep = {
    id: string;
    phase_id: string;
    title: string;
    type: ActivityStepType;
    content: Record<string, any>; // Estructura variable dependiendo del 'type'
    order_index: number;
    created_at: string;
    updated_at: string;
};

// Contenidos específicos para cada tipo de paso
// 1. Text/Theory
export type TheoryStepContent = {
    markdown: string;
};

// 2. Deliverable (Práctica/Google Docs)
export type DeliverableStepContent = {
    templateUrl: string;
    instructionsMarkdown: string;
};

// 3. Animation/Interactive
export type AnimationStepContent = {
    componentUrl: string; // Puede ser un import identifier o URL de codepen/sandbox
    props?: Record<string, any>;
};

// 4. Quiz
export type QuizQuestion = {
    id: string;
    text: string;
    options: { id: string; text: string; isCorrect: boolean }[];
};

export type QuizStepContent = {
    questions: QuizQuestion[];
};

// Tipos para el estado en cliente (inclusiones anidadas para el sidebar)
export type ActivityStepWithClientState = ActivityStep & {
    isExpanded?: boolean;
    isSelected?: boolean;
    content: TheoryStepContent | DeliverableStepContent | AnimationStepContent | QuizStepContent; // tipado fuerte
};

export type ActivityPhaseWithSteps = ActivityPhase & {
    steps: ActivityStepWithClientState[];
    isExpanded?: boolean;
};
