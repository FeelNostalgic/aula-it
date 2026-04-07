"use client";

import { useState } from "react";
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getLikertLabel, getLikertRange, getQuestionType, QUIZ_QUESTION_TYPE } from "@/lib/quiz-core";
import type { QuizOrderingItem, QuizQuestion, QuizStructuredAnswers, QuizStructuredQuestionAnswer } from "@/types/activity";
import { CheckCircle2, Circle, GripVertical, X } from "lucide-react";

type QuizQuestionAnswerFieldProps = {
    question: QuizQuestion;
    selectedAnswers: Record<string, string[]>;
    shortAnswers: Record<string, string>;
    structuredAnswers: QuizStructuredAnswers;
    onToggleOption: (questionId: string, optionId: string, singleSelect: boolean) => void;
    onShortAnswerChange: (questionId: string, value: string) => void;
    onStructuredAnswerChange: (questionId: string, value: QuizStructuredQuestionAnswer) => void;
};

type FillBlankAnswer = Extract<QuizStructuredQuestionAnswer, { kind: "fill_in_the_blank_dropdown" }>;
type TableDragAnswer = Extract<QuizStructuredQuestionAnswer, { kind: "table_drag_drop" }>;
type MatchingAnswer = Extract<QuizStructuredQuestionAnswer, { kind: "matching_pairs" }>;
type OrderingAnswer = Extract<QuizStructuredQuestionAnswer, { kind: "ordering_sequence" }>;
type CategorizationAnswerType = Extract<QuizStructuredQuestionAnswer, { kind: "categorization_drag_drop" }>;

function getFillBlankAnswer(questionId: string, structuredAnswers: QuizStructuredAnswers): FillBlankAnswer {
    const answer = structuredAnswers[questionId];
    return answer?.kind === QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN
        ? answer
        : { kind: QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN, blanks: {} };
}

function getTableDragAnswer(questionId: string, structuredAnswers: QuizStructuredAnswers): TableDragAnswer {
    const answer = structuredAnswers[questionId];
    return answer?.kind === QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP
        ? answer
        : { kind: QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP, placements: {} };
}

function getMatchingAnswer(questionId: string, structuredAnswers: QuizStructuredAnswers): MatchingAnswer {
    const answer = structuredAnswers[questionId];
    return answer?.kind === QUIZ_QUESTION_TYPE.MATCHING_PAIRS
        ? answer
        : { kind: QUIZ_QUESTION_TYPE.MATCHING_PAIRS, matches: {} };
}

function getOrderingAnswer(questionId: string, structuredAnswers: QuizStructuredAnswers, orderedItemIds: string[]): OrderingAnswer {
    const answer = structuredAnswers[questionId];
    return answer?.kind === QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE
        ? answer
        : { kind: QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE, orderedItemIds };
}

function getCategorizationAnswer(questionId: string, structuredAnswers: QuizStructuredAnswers): CategorizationAnswerType {
    const answer = structuredAnswers[questionId];
    return answer?.kind === QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP
        ? answer
        : { kind: QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP, assignments: {} };
}

function getAssignedItemLabel(question: QuizQuestion, itemId?: string) {
    if (!itemId) return "Sin respuesta";
    return question.tableItems?.find((item) => item.id === itemId)?.text
        ?? question.matchingOptions?.find((item) => item.id === itemId)?.text
        ?? question.categoryItems?.find((item) => item.id === itemId)?.text
        ?? "Sin texto";
}

function getTableCell(question: QuizQuestion, rowId: string, columnId: string) {
    return question.tableCells?.find((candidate) => candidate.rowId === rowId && candidate.columnId === columnId);
}

function DraggableAnswerChip({
    id,
    label,
    onDragStart,
    onDragEnd,
}: {
    id: string;
    label: string;
    onDragStart: (itemId: string) => void;
    onDragEnd?: () => void;
}) {
    return (
        <button
            type="button"
            draggable
            onDragStart={() => onDragStart(id)}
            onDragEnd={onDragEnd}
            className="rounded-full border border-accent-blue/30 bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent-blue/50 hover:bg-accent-blue/8"
        >
            {label || "Opción sin texto"}
        </button>
    );
}

function SortableOrderingAnswerItem({
    item,
    index,
}: {
    item: QuizOrderingItem;
    index: number;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? "none" : transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-3 rounded-xl border border-border/40 bg-background/50 p-3",
                isDragging && "border-accent-blue/40 bg-accent-blue/10 shadow-lg",
            )}
        >
            <button
                type="button"
                aria-label={`Reordenar paso ${index + 1}`}
                className="cursor-grab rounded-md p-1 text-text-muted transition-colors hover:bg-surface hover:text-foreground active:cursor-grabbing"
                {...attributes}
                {...listeners}
            >
                <GripVertical className="size-4" />
            </button>
            <div className="w-8 shrink-0 rounded-md border border-border/30 bg-surface px-2 py-1 text-center text-xs font-black text-text-muted">
                {index + 1}
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">{item.text}</span>
        </div>
    );
}

function FillInTheBlankAnswer({
    question,
    structuredAnswers,
    onStructuredAnswerChange,
}: Pick<QuizQuestionAnswerFieldProps, "question" | "structuredAnswers" | "onStructuredAnswerChange">) {
    const currentAnswer = getFillBlankAnswer(question.id, structuredAnswers);

    return (
        <div className="space-y-3 pl-12">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-background/50 p-4 leading-relaxed">
                {(question.promptSegments ?? []).map((segment) => {
                    if (segment.kind === "text") {
                        return <span key={segment.id} className="text-sm text-foreground">{segment.text}</span>;
                    }

                    const blank = question.dropdownBlanks?.find((candidate) => candidate.id === segment.blankId);
                    if (!blank) return null;

                    return (
                        <Select
                            key={segment.id}
                            value={currentAnswer.blanks[blank.id] || "__empty__"}
                            onValueChange={(value) => onStructuredAnswerChange(question.id, {
                                kind: QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN,
                                blanks: {
                                    ...currentAnswer.blanks,
                                    [blank.id]: value === "__empty__" ? "" : value,
                                },
                            })}
                        >
                            <SelectTrigger className="h-9 w-[220px] border-border/50 bg-surface">
                                <SelectValue placeholder="Selecciona..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__empty__">Sin responder</SelectItem>
                                {blank.options.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>{option.text || "Opción sin texto"}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    );
                })}
            </div>
        </div>
    );
}

function TableDragDropAnswer({
    question,
    structuredAnswers,
    onStructuredAnswerChange,
}: Pick<QuizQuestionAnswerFieldProps, "question" | "structuredAnswers" | "onStructuredAnswerChange">) {
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const currentAnswer = getTableDragAnswer(question.id, structuredAnswers);
    const rowHeaderLabel = question.tableRowHeaderLabel ?? "Concepto";
    const rows = question.tableRows ?? [];
    const columns = question.tableColumns ?? [];
    const assignedItemIds = Object.values(currentAnswer.placements).filter(Boolean);
    const availableItems = (question.tableItems ?? []).filter((item) => !assignedItemIds.includes(item.id));

    const assignItem = (cellId: string, itemId: string) => {
        const nextPlacements = Object.fromEntries(
            Object.entries(currentAnswer.placements).filter(([, placedItemId]) => placedItemId !== itemId),
        );
        nextPlacements[cellId] = itemId;
        onStructuredAnswerChange(question.id, {
            kind: QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP,
            placements: nextPlacements,
        });
    };

    const clearItem = (cellId: string) => {
        const nextPlacements = { ...currentAnswer.placements };
        delete nextPlacements[cellId];
        onStructuredAnswerChange(question.id, {
            kind: QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP,
            placements: nextPlacements,
        });
    };

    if (rows.length === 0 || columns.length === 0) {
        return (
            <div className="pl-12">
                <div className="rounded-xl border border-dashed border-border/40 px-4 py-5 text-sm text-text-muted">
                    Esta tabla todavía no está configurada.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 pl-12">
            <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-accent-blue/20 bg-accent-blue/5 p-3">
                {availableItems.map((item) => (
                    <DraggableAnswerChip
                        key={item.id}
                        id={item.id}
                        label={item.text}
                        onDragStart={(itemId) => setDraggedItemId(itemId)}
                        onDragEnd={() => setDraggedItemId(null)}
                    />
                ))}
                {availableItems.length === 0 && (
                    <span className="text-xs text-text-muted">Todas las opciones están asignadas.</span>
                )}
            </div>

            <div className="overflow-x-auto">
                <div
                    className="grid min-w-[760px] gap-px rounded-2xl border border-border/30 bg-border/30"
                    style={{ gridTemplateColumns: `minmax(180px, 1.1fr) repeat(${columns.length}, minmax(220px, 1fr))` }}
                >
                    <div className="bg-surface px-4 py-3 text-xs font-bold uppercase tracking-widest text-text-muted">
                        {rowHeaderLabel || "Columna fija"}
                    </div>
                    {columns.map((column) => (
                        <div key={column.id} className="bg-surface px-4 py-3 text-xs font-bold uppercase tracking-widest text-text-muted">
                            {column.label || "Columna sin texto"}
                        </div>
                    ))}

                    {rows.map((row) => (
                        <div key={row.id} className="contents">
                            <div className="bg-background px-4 py-4 text-sm font-semibold text-foreground">
                                {row.label || "Fila sin texto"}
                            </div>
                            {columns.map((column) => {
                                const cell = getTableCell(question, row.id, column.id);
                                if (!cell) {
                                    return <div key={`${row.id}-${column.id}`} className="bg-background/70" />;
                                }

                                const assignedItemId = currentAnswer.placements[cell.id];
                                return (
                                    <div key={cell.id} className="bg-background/70 p-3">
                                        <div
                                            onDragOver={(event) => event.preventDefault()}
                                            onDrop={(event) => {
                                                event.preventDefault();
                                                if (!draggedItemId) return;
                                                assignItem(cell.id, draggedItemId);
                                                setDraggedItemId(null);
                                            }}
                                            className={cn(
                                                "flex min-h-[112px] flex-col rounded-xl border border-dashed p-3 transition-colors",
                                                assignedItemId
                                                    ? "border-accent-blue/30 bg-accent-blue/8"
                                                    : "border-border/40 bg-background/60",
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={cn(
                                                    "text-sm",
                                                    assignedItemId ? "font-medium text-foreground" : "text-text-muted",
                                                )}>
                                                    {assignedItemId
                                                        ? getAssignedItemLabel(question, assignedItemId)
                                                        : "Suelta aquí la opción correcta"}
                                                </p>
                                                {assignedItemId && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label="Quitar opción de la celda"
                                                        className="size-7 shrink-0 text-text-muted hover:text-red-400"
                                                        onClick={() => clearItem(cell.id)}
                                                    >
                                                        <X className="size-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function MatchingPairsAnswer({
    question,
    structuredAnswers,
    onStructuredAnswerChange,
}: Pick<QuizQuestionAnswerFieldProps, "question" | "structuredAnswers" | "onStructuredAnswerChange">) {
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const currentAnswer = getMatchingAnswer(question.id, structuredAnswers);
    const assignedOptionIds = Object.values(currentAnswer.matches).filter(Boolean);
    const availableOptions = (question.matchingOptions ?? []).filter((option) => !assignedOptionIds.includes(option.id));

    const assignMatch = (promptId: string, optionId: string) => {
        const nextMatches = Object.fromEntries(
            Object.entries(currentAnswer.matches).filter(([, assignedId]) => assignedId !== optionId),
        );
        nextMatches[promptId] = optionId;
        onStructuredAnswerChange(question.id, {
            kind: QUIZ_QUESTION_TYPE.MATCHING_PAIRS,
            matches: nextMatches,
        });
    };

    const clearMatch = (promptId: string) => {
        const nextMatches = { ...currentAnswer.matches };
        delete nextMatches[promptId];
        onStructuredAnswerChange(question.id, {
            kind: QUIZ_QUESTION_TYPE.MATCHING_PAIRS,
            matches: nextMatches,
        });
    };

    return (
        <div className="space-y-4 pl-12">
            <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-accent-blue/20 bg-accent-blue/5 p-3">
                {availableOptions.map((option) => (
                    <DraggableAnswerChip
                        key={option.id}
                        id={option.id}
                        label={option.text}
                        onDragStart={(itemId) => setDraggedItemId(itemId)}
                        onDragEnd={() => setDraggedItemId(null)}
                    />
                ))}
                {availableOptions.length === 0 && (
                    <span className="text-xs text-text-muted">Todos los emparejamientos están asignados.</span>
                )}
            </div>

            <div className="space-y-3">
                {(question.matchingPrompts ?? []).map((prompt) => {
                    const assignedOptionId = currentAnswer.matches[prompt.id];
                    return (
                        <div
                            key={prompt.id}
                            className="grid gap-3 rounded-xl border border-border/40 bg-background/50 p-4 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.9fr)] md:items-center"
                        >
                            <p className="text-sm font-semibold text-foreground">{prompt.text}</p>
                            <div
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    if (!draggedItemId) return;
                                    assignMatch(prompt.id, draggedItemId);
                                    setDraggedItemId(null);
                                }}
                                className={cn(
                                    "flex min-h-[72px] items-start justify-between gap-2 rounded-xl border border-dashed p-3 transition-colors",
                                    assignedOptionId
                                        ? "border-accent-blue/30 bg-accent-blue/8"
                                        : "border-border/40 bg-background/60",
                                )}
                            >
                                <p className={cn(
                                    "text-sm",
                                    assignedOptionId ? "font-medium text-foreground" : "text-text-muted",
                                )}>
                                    {assignedOptionId
                                        ? getAssignedItemLabel(question, assignedOptionId)
                                        : "Suelta aquí la opción correspondiente"}
                                </p>
                                {assignedOptionId && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Quitar emparejamiento"
                                        className="size-7 shrink-0 text-text-muted hover:text-red-400"
                                        onClick={() => clearMatch(prompt.id)}
                                    >
                                        <X className="size-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function OrderingSequenceAnswer({
    question,
    structuredAnswers,
    onStructuredAnswerChange,
}: Pick<QuizQuestionAnswerFieldProps, "question" | "structuredAnswers" | "onStructuredAnswerChange">) {
    const baseItems = question.orderingItems ?? [];
    const baseItemIds = baseItems.map((item) => item.id);
    const currentAnswer = getOrderingAnswer(question.id, structuredAnswers, baseItemIds);
    const normalizedOrderedItemIds = currentAnswer.orderedItemIds.length > 0
        ? [
            ...currentAnswer.orderedItemIds.filter((itemId) => baseItemIds.includes(itemId)),
            ...baseItemIds.filter((itemId) => !currentAnswer.orderedItemIds.includes(itemId)),
        ]
        : baseItemIds;
    const orderedItems = normalizedOrderedItemIds
        .map((itemId) => baseItems.find((item) => item.id === itemId))
        .filter(Boolean) as QuizOrderingItem[];

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = normalizedOrderedItemIds.findIndex((itemId) => itemId === active.id);
        const newIndex = normalizedOrderedItemIds.findIndex((itemId) => itemId === over.id);
        if (oldIndex < 0 || newIndex < 0) return;

        onStructuredAnswerChange(question.id, {
            kind: QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE,
            orderedItemIds: arrayMove(normalizedOrderedItemIds, oldIndex, newIndex),
        });
    };

    return (
        <div className="pl-12">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={normalizedOrderedItemIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {orderedItems.map((item, index) => (
                            <SortableOrderingAnswerItem key={item.id} item={item} index={index} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}

function CategorizationAnswer({
    question,
    structuredAnswers,
    onStructuredAnswerChange,
}: Pick<QuizQuestionAnswerFieldProps, "question" | "structuredAnswers" | "onStructuredAnswerChange">) {
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const currentAnswer = getCategorizationAnswer(question.id, structuredAnswers);
    const unassignedItems = (question.categoryItems ?? []).filter((item) => !currentAnswer.assignments[item.id]);

    return (
        <div className="space-y-4 pl-12">
            <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-accent-blue/20 bg-accent-blue/5 p-3">
                {unassignedItems.map((item) => (
                    <DraggableAnswerChip
                        key={item.id}
                        id={item.id}
                        label={item.text}
                        onDragStart={(itemId) => setDraggedItemId(itemId)}
                        onDragEnd={() => setDraggedItemId(null)}
                    />
                ))}
                {unassignedItems.length === 0 && (
                    <span className="text-xs text-text-muted">Todos los elementos están asignados.</span>
                )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {(question.categories ?? []).map((category) => {
                    const categoryItems = (question.categoryItems ?? []).filter((item) => currentAnswer.assignments[item.id] === category.id);
                    return (
                        <div
                            key={category.id}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                                event.preventDefault();
                                if (!draggedItemId) return;
                                onStructuredAnswerChange(question.id, {
                                    kind: QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP,
                                    assignments: {
                                        ...currentAnswer.assignments,
                                        [draggedItemId]: category.id,
                                    },
                                });
                                setDraggedItemId(null);
                            }}
                            className="space-y-2 rounded-xl border border-border/40 bg-background/50 p-4"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">{category.label}</p>
                                <span className="text-xs text-text-muted">{categoryItems.length} items</span>
                            </div>
                            <div className="space-y-2">
                                {categoryItems.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2 rounded-lg border border-accent-blue/20 bg-accent-blue/8 px-3 py-2 text-sm text-foreground">
                                        <Circle className="size-3 text-accent-blue" />
                                        <span className="flex-1">{item.text}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            aria-label="Quitar de la categoría"
                                            className="size-7 text-text-muted hover:text-red-400"
                                            onClick={() => {
                                                const nextAssignments = { ...currentAnswer.assignments };
                                                delete nextAssignments[item.id];
                                                onStructuredAnswerChange(question.id, {
                                                    kind: QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP,
                                                    assignments: nextAssignments,
                                                });
                                            }}
                                        >
                                            <X className="size-3.5" />
                                        </Button>
                                    </div>
                                ))}
                                {categoryItems.length === 0 && (
                                    <div className="rounded-lg border border-dashed border-border/40 px-3 py-4 text-xs text-text-muted">
                                        Suelta aquí los elementos de esta categoría.
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function LikertAnswer({
    question,
    shortAnswers,
    onShortAnswerChange,
}: Pick<QuizQuestionAnswerFieldProps, "question" | "shortAnswers" | "onShortAnswerChange">) {
    const { values } = getLikertRange(question);
    const selectedValue = shortAnswers[question.id] ?? "";
    const justificationKey = `${question.id}:justification`;
    const justification = shortAnswers[justificationKey] ?? "";
    const columnsClass = values.length <= 5 ? "grid-cols-5" : values.length <= 7 ? "grid-cols-7" : "grid-cols-4 sm:grid-cols-6 lg:grid-cols-8";

    return (
        <div className="space-y-3 pl-12">
            <div className={cn("grid gap-2", columnsClass)}>
                {values.map((value) => {
                    const rawValue = String(value);
                    const isSelected = selectedValue === rawValue;
                    const label = getLikertLabel(question, value);
                    return (
                        <button
                            key={rawValue}
                            type="button"
                            onClick={() => onShortAnswerChange(question.id, isSelected ? "" : rawValue)}
                            className={cn(
                                "flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition-colors",
                                isSelected
                                    ? "border-accent-blue/50 bg-accent-blue/10 text-accent-blue ring-1 ring-accent-blue/40"
                                    : "border-border/50 bg-background text-foreground hover:border-accent-blue/30 hover:bg-surface-light",
                            )}
                        >
                            <span className="text-sm font-black">{value}</span>
                            {label !== rawValue && (
                                <span className={cn("text-[11px] font-semibold leading-snug", isSelected ? "text-white" : "text-foreground/85")}>{label}</span>
                            )}
                            {isSelected && <CheckCircle2 className="size-3.5 shrink-0" />}
                        </button>
                    );
                })}
            </div>
            {question.requireJustification && (
                <Textarea
                    value={justification}
                    onChange={(event) => onShortAnswerChange(justificationKey, event.target.value)}
                    placeholder="Justifica tu respuesta..."
                    rows={3}
                    className="resize-none border-border/50 bg-background/50 text-sm"
                />
            )}
        </div>
    );
}

function NumericAnswer({
    question,
    shortAnswers,
    onShortAnswerChange,
}: Pick<QuizQuestionAnswerFieldProps, "question" | "shortAnswers" | "onShortAnswerChange">) {
    return (
        <div className="pl-12 flex items-center gap-3">
            <input
                type="number"
                min={question.numericMin ?? 0}
                max={question.numericMax ?? 10}
                step="0.01"
                value={shortAnswers[question.id] ?? ""}
                onChange={(event) => onShortAnswerChange(question.id, event.target.value)}
                placeholder={`${question.numericMin ?? 0} - ${question.numericMax ?? 10}`}
                className="h-10 w-32 rounded-xl border border-border/50 bg-background/50 px-3 text-center text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent-blue"
            />
            <span className="text-xs text-text-muted">
                Rango: {question.numericMin ?? 0} - {question.numericMax ?? 10}
            </span>
        </div>
    );
}

export function QuizQuestionAnswerField(props: QuizQuestionAnswerFieldProps) {
    const questionType = getQuestionType(props.question);
    const correctCount = props.question.options.filter((option) => option.isCorrect).length;
    const isSingleSelect = correctCount <= 1;

    if (questionType === QUIZ_QUESTION_TYPE.SHORT_ANSWER) {
        return (
            <div className="pl-12">
                <Textarea
                    value={props.shortAnswers[props.question.id] ?? ""}
                    onChange={(event) => props.onShortAnswerChange(props.question.id, event.target.value)}
                    placeholder="Escribe tu respuesta..."
                    rows={3}
                    className="resize-none border-border/50 bg-background/50 text-sm"
                />
            </div>
        );
    }

    if (questionType === QUIZ_QUESTION_TYPE.LIKERT) {
        return <LikertAnswer question={props.question} shortAnswers={props.shortAnswers} onShortAnswerChange={props.onShortAnswerChange} />;
    }

    if (questionType === QUIZ_QUESTION_TYPE.NUMERIC) {
        return <NumericAnswer question={props.question} shortAnswers={props.shortAnswers} onShortAnswerChange={props.onShortAnswerChange} />;
    }

    if (questionType === QUIZ_QUESTION_TYPE.MULTIPLE_CHOICE || questionType === QUIZ_QUESTION_TYPE.TRUE_FALSE) {
        return (
            <div className="space-y-3 pl-12">
                {!isSingleSelect && (
                    <p className="-mt-3 text-xs text-text-muted">Selecciona todas las correctas</p>
                )}
                {props.question.options.map((option) => {
                    const isSelected = (props.selectedAnswers[props.question.id] ?? []).includes(option.id);
                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => props.onToggleOption(props.question.id, option.id, isSingleSelect)}
                            className={cn(
                                "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all",
                                isSelected
                                    ? "border-accent-blue/50 bg-accent-blue/10 text-foreground"
                                    : "border-border/50 bg-background text-foreground hover:border-accent-blue/30 hover:bg-surface-light",
                            )}
                        >
                            <Circle className={cn("size-5 shrink-0", isSelected ? "fill-accent-blue/20 text-accent-blue" : "text-text-muted/40")} />
                            <span className="font-medium">{option.text}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    if (questionType === QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN) {
        return <FillInTheBlankAnswer question={props.question} structuredAnswers={props.structuredAnswers} onStructuredAnswerChange={props.onStructuredAnswerChange} />;
    }

    if (questionType === QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) {
        return <TableDragDropAnswer question={props.question} structuredAnswers={props.structuredAnswers} onStructuredAnswerChange={props.onStructuredAnswerChange} />;
    }

    if (questionType === QUIZ_QUESTION_TYPE.MATCHING_PAIRS) {
        return <MatchingPairsAnswer question={props.question} structuredAnswers={props.structuredAnswers} onStructuredAnswerChange={props.onStructuredAnswerChange} />;
    }

    if (questionType === QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE) {
        return <OrderingSequenceAnswer question={props.question} structuredAnswers={props.structuredAnswers} onStructuredAnswerChange={props.onStructuredAnswerChange} />;
    }

    return <CategorizationAnswer question={props.question} structuredAnswers={props.structuredAnswers} onStructuredAnswerChange={props.onStructuredAnswerChange} />;
}
