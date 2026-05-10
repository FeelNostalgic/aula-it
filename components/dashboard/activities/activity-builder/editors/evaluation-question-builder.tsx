"use client";

import { useMemo } from "react";
import { DndContext, closestCenter, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createQuizQuestionBlock, createQuizSectionBlock, getQuizFixedBlocks, isQuizQuestionBlock, isQuizSectionBlock, syncQuizContent } from "@/lib/quiz-content";
import { LikertQuestionConfig } from "../quiz/likert-question-config";
import type { QuizFixedBlock, QuizQuestion, QuizQuestionBlock, QuizSectionBlock } from "@/types/activity";
import { CheckCircle2, Copy, GripVertical, Hash, Layers, MoreVertical, Plus, Trash2 } from "lucide-react";

type EvaluationQuestionContent = {
    blocks?: QuizFixedBlock[];
    questions?: QuizQuestion[];
};

type EvaluationQuestionBuilderProps<TContent extends EvaluationQuestionContent> = {
    content: TContent;
    onChange: (nextContent: TContent) => void;
    emptyTitle: string;
    emptyDescription: string;
    heading: string;
    description: string;
};

const QUESTION_TYPES: { value: "short_answer" | "likert" | "numeric"; label: string }[] = [
    { value: "short_answer", label: "Respuesta libre" },
    { value: "likert", label: "Escala Likert" },
    { value: "numeric", label: "Numérico" },
];

function createDefaultEvaluationQuestion(): QuizQuestion {
    return {
        id: crypto.randomUUID(),
        type: "short_answer",
        text: "",
        options: [],
        points: 0,
    };
}

function duplicateEvaluationQuestion(question: QuizQuestion): QuizQuestion {
    return {
        ...structuredClone(question),
        id: crypto.randomUUID(),
    };
}

function syncEvaluationContent<TContent extends EvaluationQuestionContent>(content: TContent): TContent {
    return syncQuizContent(content) as TContent;
}

export function EvaluationQuestionBuilder<TContent extends EvaluationQuestionContent>({
    content,
    onChange,
    emptyTitle,
    emptyDescription,
    heading,
    description,
}: EvaluationQuestionBuilderProps<TContent>) {
    const syncedContent = useMemo(() => syncEvaluationContent(content), [content]);
    const fixedBlocks = useMemo(() => getQuizFixedBlocks(syncedContent), [syncedContent]);
    const questionNumberById = useMemo(() => (
        fixedBlocks.reduce((acc, block) => {
            if (!isQuizQuestionBlock(block)) return acc;
            acc.set(block.id, acc.size + 1);
            return acc;
        }, new Map<string, number>())
    ), [fixedBlocks]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleChange = (nextBlocks: QuizFixedBlock[]) => {
        onChange(syncEvaluationContent({
            ...syncedContent,
            blocks: nextBlocks,
        }));
    };

    const addQuestion = () => {
        handleChange([...fixedBlocks, createQuizQuestionBlock(createDefaultEvaluationQuestion())]);
    };

    const addSection = () => {
        handleChange([...fixedBlocks, createQuizSectionBlock()]);
    };

    const insertQuestionBelow = (questionId: string) => {
        const targetIndex = fixedBlocks.findIndex((block) => isQuizQuestionBlock(block) && block.question.id === questionId);
        if (targetIndex < 0) return;
        const nextBlocks = [...fixedBlocks];
        nextBlocks.splice(targetIndex + 1, 0, createQuizQuestionBlock(createDefaultEvaluationQuestion()));
        handleChange(nextBlocks);
    };

    const insertSectionAbove = (questionId: string) => {
        const targetIndex = fixedBlocks.findIndex((block) => isQuizQuestionBlock(block) && block.question.id === questionId);
        if (targetIndex < 0) return;
        const nextBlocks = [...fixedBlocks];
        nextBlocks.splice(targetIndex, 0, createQuizSectionBlock());
        handleChange(nextBlocks);
    };

    const updateQuestion = (questionId: string, updates: Partial<QuizQuestion>) => {
        handleChange(fixedBlocks.map((block) => (
            isQuizQuestionBlock(block) && block.question.id === questionId
                ? { ...block, question: { ...block.question, ...updates } }
                : block
        )));
    };

    const removeQuestion = (questionId: string) => {
        handleChange(fixedBlocks.filter((block) => !isQuizQuestionBlock(block) || block.question.id !== questionId));
    };

    const duplicateQuestion = (questionId: string) => {
        const sourceIndex = fixedBlocks.findIndex((block) => isQuizQuestionBlock(block) && block.question.id === questionId);
        if (sourceIndex < 0) return;
        const sourceBlock = fixedBlocks[sourceIndex];
        if (!isQuizQuestionBlock(sourceBlock)) return;
        const nextBlocks = [...fixedBlocks];
        nextBlocks.splice(sourceIndex + 1, 0, createQuizQuestionBlock(duplicateEvaluationQuestion(sourceBlock.question)));
        handleChange(nextBlocks);
    };

    const updateSection = (sectionId: string, title: string) => {
        handleChange(fixedBlocks.map((block) => (
            isQuizSectionBlock(block) && block.id === sectionId
                ? { ...block, title }
                : block
        )));
    };

    const removeSection = (sectionId: string) => {
        handleChange(fixedBlocks.filter((block) => !isQuizSectionBlock(block) || block.id !== sectionId));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = fixedBlocks.findIndex((block) => block.id === active.id);
        const newIndex = fixedBlocks.findIndex((block) => block.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return;
        handleChange(arrayMove(fixedBlocks, oldIndex, newIndex));
    };

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-4 pb-32">
            <div className="mb-2">
                <h3 className="text-lg font-bold text-foreground">{heading}</h3>
                <p className="text-sm text-text-muted mt-1">{description}</p>
            </div>

            {fixedBlocks.length === 0 ? (
                <div className="text-center p-12 border border-dashed border-border/50 rounded-xl bg-surface/20">
                    <p className="text-text-muted mb-2">{emptyTitle}</p>
                    <p className="text-sm text-text-muted/70 mb-4">{emptyDescription}</p>
                    <div className="flex items-center justify-center gap-2">
                        <Button onClick={addQuestion} variant="outline" className="text-accent-blue border-accent-blue/30 hover:bg-accent-blue/10">
                            <Plus className="size-4 mr-2" /> Añadir pregunta
                        </Button>
                        <Button onClick={addSection} variant="outline" className="border-border/50 hover:bg-surface-dark">
                            <Layers className="size-4 mr-2" /> Añadir sección
                        </Button>
                    </div>
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={fixedBlocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-4">
                            {fixedBlocks.map((block) => (
                                isQuizQuestionBlock(block) ? (
                                    <SortableEvaluationQuestion
                                        key={block.id}
                                        blockId={block.id}
                                        question={block.question}
                                        displayNumber={questionNumberById.get(block.id) ?? 1}
                                        onUpdate={updateQuestion}
                                        onRemove={removeQuestion}
                                        onDuplicate={duplicateQuestion}
                                        onInsertQuestionBelow={insertQuestionBelow}
                                        onInsertSectionAbove={insertSectionAbove}
                                    />
                                ) : (
                                    <SortableEvaluationSection
                                        key={block.id}
                                        blockId={block.id}
                                        title={block.title}
                                        onUpdate={updateSection}
                                        onRemove={removeSection}
                                    />
                                )
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {fixedBlocks.length > 0 && (
                <div className="flex justify-center pt-4">
                    <div className="flex items-center gap-2">
                        <Button onClick={addQuestion} className="bg-surface hover:bg-surface-dark text-foreground border border-border/50">
                            <Plus className="size-4 mr-2" /> Nueva pregunta
                        </Button>
                        <Button onClick={addSection} variant="outline" className="border-border/50 hover:bg-surface-dark">
                            <Plus className="size-4 mr-2" /> Nueva sección
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function SortableEvaluationSection({
    blockId,
    title,
    onUpdate,
    onRemove,
}: {
    blockId: string;
    title: string;
    onUpdate: (sectionId: string, title: string) => void;
    onRemove: (sectionId: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: blockId });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

    return (
        <div ref={setNodeRef} style={style} className="rounded-xl border border-accent-blue/20 bg-accent-blue/5 p-4 space-y-3">
            <div className="flex items-center gap-3">
                <button
                    {...attributes}
                    {...listeners}
                    className="text-text-muted/40 hover:text-text-muted transition-colors cursor-grab active:cursor-grabbing shrink-0"
                    aria-label="Reordenar sección"
                >
                    <GripVertical className="size-4" />
                </button>
                <span className="inline-flex items-center gap-1 rounded-md bg-accent-blue/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-accent-blue">
                    <Layers className="size-3" />
                    Sección
                </span>
                <Input
                    value={title}
                    onChange={(event) => onUpdate(blockId, event.target.value)}
                    placeholder="Título de la sección"
                    className="flex-1 bg-background/70 border-accent-blue/20 text-sm font-semibold"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(blockId)}
                    className="size-8 text-text-muted hover:text-red-400 hover:bg-red-400/10 shrink-0"
                    aria-label="Eliminar sección"
                >
                    <Trash2 className="size-4" />
                </Button>
            </div>
            <p className="pl-9 text-xs text-text-muted">
                Encabezado visual para organizar preguntas. No puntúa ni se muestra como respuesta independiente.
            </p>
        </div>
    );
}

function SortableEvaluationQuestion({
    blockId,
    question,
    displayNumber,
    onUpdate,
    onRemove,
    onDuplicate,
    onInsertQuestionBelow,
    onInsertSectionAbove,
}: {
    blockId: string;
    question: QuizQuestion;
    displayNumber: number;
    onUpdate: (questionId: string, updates: Partial<QuizQuestion>) => void;
    onRemove: (questionId: string) => void;
    onDuplicate: (questionId: string) => void;
    onInsertQuestionBelow: (questionId: string) => void;
    onInsertSectionAbove: (questionId: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: blockId });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

    return (
        <div ref={setNodeRef} style={style} className="p-6 bg-surface-dark border border-white/5 rounded-xl space-y-4 shadow-sm relative group">
            <div className="flex items-start gap-2">
                <button
                    {...attributes}
                    {...listeners}
                    className="mt-2 text-text-muted/30 hover:text-text-muted cursor-grab active:cursor-grabbing shrink-0 touch-none"
                    aria-label="Reordenar pregunta"
                >
                    <GripVertical className="size-4" />
                </button>
                <span className="bg-surface text-text-muted font-bold px-3 py-1 rounded-md text-sm mt-1 shrink-0">
                    Q{displayNumber}
                </span>
                <Input
                    value={question.text}
                    onChange={(event) => onUpdate(question.id, { text: event.target.value })}
                    placeholder="Escribe la pregunta aquí..."
                    className="flex-1 bg-surface border-border text-sm font-medium"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-text-muted hover:text-foreground hover:bg-surface shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Acciones de la pregunta"
                        >
                            <MoreVertical className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem onClick={() => onInsertQuestionBelow(question.id)} className="cursor-pointer">
                            <Plus className="size-3.5 mr-2" />
                            Añadir pregunta
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onInsertSectionAbove(question.id)} className="cursor-pointer">
                            <Layers className="size-3.5 mr-2" />
                            Añadir sección
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDuplicate(question.id)} className="cursor-pointer">
                            <Copy className="size-3.5 mr-2" />
                            Duplicar pregunta
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRemove(question.id)} className="cursor-pointer text-red-400 focus:text-red-400">
                            <Trash2 className="size-3.5 mr-2" />
                            Eliminar pregunta
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="pl-14 space-y-4">
                <div className="flex gap-1 p-0.5 bg-surface rounded-lg border border-border/30 w-fit">
                    {QUESTION_TYPES.map((type) => (
                        <button
                            key={type.value}
                            onClick={() => onUpdate(question.id, { type: type.value })}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                                question.type === type.value
                                    ? "bg-accent-blue/15 text-accent-blue"
                                    : "text-text-muted hover:text-foreground"
                            )}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>

                {question.type === "short_answer" && (
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm text-foreground font-medium">Mínimo de caracteres</p>
                            <p className="text-xs text-text-muted mt-0.5">0 = sin mínimo.</p>
                        </div>
                        <input
                            type="number"
                            min={0}
                            max={2000}
                            value={question.minLength ?? 0}
                            onChange={(event) => onUpdate(question.id, { minLength: Number(event.target.value) || undefined })}
                            className="h-9 w-20 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-accent-blue"
                        />
                    </div>
                )}

                {question.type === "numeric" && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 flex-1">
                                <Hash className="size-3.5 text-text-muted shrink-0" />
                                <span className="text-sm text-foreground font-medium">Rango</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-text-muted">Mín</span>
                                <input
                                    type="number"
                                    value={question.numericMin ?? 0}
                                    onChange={(event) => onUpdate(question.id, { numericMin: Number(event.target.value) })}
                                    className="h-9 w-20 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                />
                                <span className="text-xs text-text-muted">Máx</span>
                                <input
                                    type="number"
                                    value={question.numericMax ?? 10}
                                    onChange={(event) => onUpdate(question.id, { numericMax: Number(event.target.value) })}
                                    className="h-9 w-20 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm text-foreground font-medium">% en la nota</p>
                                <p className="text-xs text-text-muted mt-0.5">0 = descriptivo; en modo combinado NO aporta nota.</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={question.points ?? 0}
                                    onChange={(event) => onUpdate(question.id, { points: Number(event.target.value) })}
                                    className="h-9 w-16 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                />
                                <span className="text-xs text-text-muted">%</span>
                            </div>
                        </div>
                    </div>
                )}

                {question.type === "likert" && (
                    <div className="space-y-3">
                        <LikertQuestionConfig
                            question={question}
                            onUpdate={(updates) => onUpdate(question.id, updates)}
                            className="pl-0"
                        />
                    </div>
                )}

                {(question.type === "likert" || question.type === "numeric") && (
                    <>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm text-foreground font-medium">Justificación obligatoria</p>
                                <p className="text-xs text-text-muted mt-0.5">El alumno debe explicar su respuesta.</p>
                            </div>
                            <Toggle
                                value={question.requireJustification ?? false}
                                onChange={(value) => onUpdate(question.id, { requireJustification: value })}
                            />
                        </div>
                        {question.requireJustification && (
                            <div className="flex items-center justify-between gap-4 pl-4 border-l-2 border-border/30">
                                <div>
                                    <p className="text-sm text-foreground font-medium">Mínimo de caracteres</p>
                                    <p className="text-xs text-text-muted mt-0.5">Por justificación.</p>
                                </div>
                                <input
                                    type="number"
                                    min={0}
                                    max={2000}
                                    value={question.minLength ?? 0}
                                    onChange={(event) => onUpdate(question.id, { minLength: Number(event.target.value) || undefined })}
                                    className="h-9 w-20 rounded-md border border-border/50 bg-surface px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                />
                            </div>
                        )}
                    </>
                )}

                {question.type === "likert" && (
                    <div className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                        <CheckCircle2 className="size-3.5" />
                        Sin puntuación directa
                    </div>
                )}
            </div>
        </div>
    );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
    return (
        <button
            role="switch"
            aria-checked={value}
            onClick={() => onChange(!value)}
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                value ? "bg-accent-blue" : "bg-surface-dark border border-border/50"
            )}
        >
            <span
                className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
                    value ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    );
}
