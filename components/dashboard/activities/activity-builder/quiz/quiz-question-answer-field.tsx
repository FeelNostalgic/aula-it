"use client";

import { useState, type ReactNode } from "react";
import {
    closestCenter,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
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
import {
    doesCategorizationAllowReuse,
    doesMatchingAllowMultiplePerPrompt,
    doesMatchingAllowReuse,
    doesTableDragAllowItemReuse,
    doesTableDragAllowMultipleItemsPerCell,
    getCategorizationAssignedCategoryIds,
    getCategoryItemCorrectCategoryIds,
    getLikertLabel,
    getLikertRange,
    getMatchingAnswerItemIds,
    getQuestionType,
    getTableAnswerItemIds,
    getTableDragUsedItemIds,
    QUIZ_QUESTION_TYPE,
} from "@/lib/quiz-core";
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
type ActiveStructuredDrag = {
    itemId: string;
    label: string;
};

const QUESTION_CONTENT_OFFSET_CLASS = "pl-0 sm:pl-6 lg:pl-8";

function writeStructuredValue(
    record: Record<string, string | string[]>,
    key: string,
    nextIds: string[],
    allowMultiple: boolean,
) {
    if (nextIds.length === 0) {
        const nextRecord = { ...record };
        delete nextRecord[key];
        return nextRecord;
    }

    return {
        ...record,
        [key]: allowMultiple ? nextIds : nextIds[0],
    };
}

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

type DndDraggableAnswerChipProps = {
    dragId: string;
    itemId: string;
    label: string;
};

type NativeDraggableAnswerChipProps = {
    id: string;
    label: string;
    onDragStart: (itemId: string) => void;
    onDragEnd: () => void;
};

function DndDraggableAnswerChip({
    dragId,
    itemId,
    label,
}: DndDraggableAnswerChipProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: dragId,
        data: {
            itemId,
            label,
        },
    });
    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
        : undefined;

    return (
        <button
            type="button"
            ref={setNodeRef}
            style={style}
            className={cn(
                "rounded-full border border-accent-blue/30 bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent-blue/50 hover:bg-accent-blue/8 touch-none",
                isDragging && "opacity-50",
            )}
            {...attributes}
            {...listeners}
        >
            {label || "Opción sin texto"}
        </button>
    );
}

function NativeDraggableAnswerChip({
    id,
    label,
    onDragStart,
    onDragEnd,
}: NativeDraggableAnswerChipProps) {
    return (
        <button
            type="button"
            draggable
            onDragStart={() => onDragStart(id)}
            onDragEnd={onDragEnd}
            className="rounded-full border border-accent-blue/30 bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent-blue/50 hover:bg-accent-blue/8"
        >
            {label || "OpciÃ³n sin texto"}
        </button>
    );
}

function DraggableAnswerChip(props: DndDraggableAnswerChipProps | NativeDraggableAnswerChipProps) {
    if ("dragId" in props) {
        return <DndDraggableAnswerChip {...props} />;
    }

    return <NativeDraggableAnswerChip {...props} />;
}

function DragOverlayChip({ label }: { label: string }) {
    return (
        <div className="rounded-full border border-accent-blue/40 bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-lg shadow-accent-blue/10">
            {label || "Opción sin texto"}
        </div>
    );
}

function DroppableAnswerSlot({
    id,
    className,
    children,
}: {
    id: string;
    className: string;
    children: ReactNode;
}) {
    const { isOver, setNodeRef } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                className,
                isOver && "border-accent-blue/50 bg-accent-blue/10 ring-1 ring-accent-blue/30",
            )}
        >
            {children}
        </div>
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
        <div className={cn("space-y-3", QUESTION_CONTENT_OFFSET_CLASS)}>
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
    const [activeDrag, setActiveDrag] = useState<ActiveStructuredDrag | null>(null);
    const currentAnswer = getTableDragAnswer(question.id, structuredAnswers);
    const rowHeaderLabel = question.tableRowHeaderLabel ?? "Concepto";
    const rows = question.tableRows ?? [];
    const columns = question.tableColumns ?? [];
    const tableItems = question.tableItems ?? [];
    const allowItemReuse = doesTableDragAllowItemReuse(question);
    const allowMultipleItemsPerCell = doesTableDragAllowMultipleItemsPerCell(question);
    const usedItemIds = new Set(getTableDragUsedItemIds(currentAnswer));
    const visibleTableItems = allowItemReuse
        ? tableItems
        : tableItems.filter((item) => !usedItemIds.has(item.id));
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const assignItem = (cellId: string, itemId: string) => {
        const currentIds = getTableAnswerItemIds(currentAnswer, cellId);
        const nextIds = allowMultipleItemsPerCell
            ? [...new Set([...currentIds, itemId])]
            : [itemId];
        onStructuredAnswerChange(question.id, {
            kind: QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP,
            placements: writeStructuredValue(currentAnswer.placements, cellId, nextIds, allowMultipleItemsPerCell),
        });
    };

    const clearItem = (cellId: string, itemId?: string) => {
        const currentIds = getTableAnswerItemIds(currentAnswer, cellId);
        const nextIds = itemId
            ? currentIds.filter((candidate) => candidate !== itemId)
            : [];
        onStructuredAnswerChange(question.id, {
            kind: QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP,
            placements: writeStructuredValue(currentAnswer.placements, cellId, nextIds, allowMultipleItemsPerCell),
        });
    };

    if (rows.length === 0 || columns.length === 0) {
        return (
            <div className={QUESTION_CONTENT_OFFSET_CLASS}>
                <div className="rounded-xl border border-dashed border-border/40 px-4 py-5 text-sm text-text-muted">
                    Esta tabla todavía no está configurada.
                </div>
            </div>
        );
    }

    const handleDragStart = (event: DragStartEvent) => {
        const itemId = event.active.data.current?.itemId;
        const label = event.active.data.current?.label;
        if (typeof itemId !== "string" || typeof label !== "string") return;
        setActiveDrag({ itemId, label });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const itemId = event.active.data.current?.itemId;
        const overId = typeof event.over?.id === "string" ? event.over.id : null;

        if (typeof itemId === "string" && overId?.startsWith("table-cell:")) {
            assignItem(overId.replace("table-cell:", ""), itemId);
        }

        setActiveDrag(null);
    };

    return (
        <div className={QUESTION_CONTENT_OFFSET_CLASS}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveDrag(null)}
            >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(220px,260px)] lg:items-start lg:gap-5">
                    <div className="overflow-x-auto">
                        <div
                            className="grid min-w-[820px] gap-px rounded-2xl border border-border/30 bg-border/30"
                            style={{ gridTemplateColumns: `minmax(170px, 1fr) repeat(${columns.length}, minmax(240px, 1fr))` }}
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

                                        const assignedItemIds = getTableAnswerItemIds(currentAnswer, cell.id);
                                        return (
                                            <div key={cell.id} className="bg-background/70 p-3">
                                                <DroppableAnswerSlot
                                                    id={`table-cell:${cell.id}`}
                                                    className={cn(
                                                        "flex min-h-[112px] flex-col rounded-xl border border-dashed p-3 transition-colors",
                                                        assignedItemIds.length > 0
                                                            ? "border-accent-blue/30 bg-accent-blue/8"
                                                            : "border-border/40 bg-background/60",
                                                    )}
                                                >
                                                    {assignedItemIds.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {assignedItemIds.map((assignedItemId) => (
                                                                <span key={assignedItemId} className="inline-flex items-center gap-2 rounded-full border border-accent-blue/20 bg-accent-blue/10 px-3 py-1 text-sm text-foreground">
                                                                    <span>{getAssignedItemLabel(question, assignedItemId)}</span>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        aria-label="Quitar opción de la celda"
                                                                        className="size-6 shrink-0 text-text-muted hover:text-red-400"
                                                                        onClick={() => clearItem(cell.id, assignedItemId)}
                                                                    >
                                                                        <X className="size-3.5" />
                                                                    </Button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-text-muted">Suelta aquí la opción correcta</p>
                                                    )}
                                                </DroppableAnswerSlot>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:sticky lg:top-4 lg:self-start">
                        <div className="space-y-2 rounded-xl border border-dashed border-accent-blue/20 bg-accent-blue/5 p-3.5">
                            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Opciones arrastrables</p>
                            <div className="flex min-h-72 max-h-280 flex-wrap content-start gap-2 overflow-y-auto pr-1">
                                {visibleTableItems.map((item) => (
                                    <DraggableAnswerChip
                                        key={item.id}
                                        dragId={`table-item:${item.id}`}
                                        itemId={item.id}
                                        label={item.text}
                                    />
                                ))}
                                {tableItems.length === 0 && (
                                    <span className="text-xs text-text-muted">No hay opciones configuradas.</span>
                                )}
                                {tableItems.length > 0 && visibleTableItems.length === 0 && (
                                    <span className="text-xs text-text-muted">
                                        {allowItemReuse
                                            ? "No hay opciones disponibles."
                                            : "Ya has colocado todas las opciones disponibles. Quita una de la tabla para volver a usarla."}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-text-muted">
                                {allowItemReuse
                                    ? "La misma opción puede reutilizarse en varias celdas."
                                    : "Cada opción solo puede usarse una vez. Al quitarla de una celda, vuelve a aparecer aquí."}
                            </p>
                        </div>
                    </div>
                </div>

                <DragOverlay>
                    {activeDrag ? <DragOverlayChip label={activeDrag.label} /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

function MatchingPairsAnswer({
    question,
    structuredAnswers,
    onStructuredAnswerChange,
}: Pick<QuizQuestionAnswerFieldProps, "question" | "structuredAnswers" | "onStructuredAnswerChange">) {
    const [activeDrag, setActiveDrag] = useState<ActiveStructuredDrag | null>(null);
    const currentAnswer = getMatchingAnswer(question.id, structuredAnswers);
    const matchingOptions = question.matchingOptions ?? [];
    const allowMultiplePerPrompt = doesMatchingAllowMultiplePerPrompt(question);
    const allowReuse = doesMatchingAllowReuse(question);
    const usedOptionIds = new Set(
        allowReuse
            ? []
            : Object.keys(currentAnswer.matches).flatMap((promptId) => getMatchingAnswerItemIds(currentAnswer, promptId)),
    );
    const visibleOptions = allowReuse
        ? matchingOptions
        : matchingOptions.filter((option) => !usedOptionIds.has(option.id));
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const assignMatch = (promptId: string, optionId: string) => {
        const currentIds = getMatchingAnswerItemIds(currentAnswer, promptId);
        const nextIds = allowMultiplePerPrompt
            ? [...new Set([...currentIds, optionId])]
            : [optionId];
        onStructuredAnswerChange(question.id, {
            kind: QUIZ_QUESTION_TYPE.MATCHING_PAIRS,
            matches: writeStructuredValue(currentAnswer.matches, promptId, nextIds, allowMultiplePerPrompt),
        });
    };

    const clearMatch = (promptId: string, optionId?: string) => {
        const currentIds = getMatchingAnswerItemIds(currentAnswer, promptId);
        const nextIds = optionId
            ? currentIds.filter((candidate) => candidate !== optionId)
            : [];
        onStructuredAnswerChange(question.id, {
            kind: QUIZ_QUESTION_TYPE.MATCHING_PAIRS,
            matches: writeStructuredValue(currentAnswer.matches, promptId, nextIds, allowMultiplePerPrompt),
        });
    };

    const handleDragStart = (event: DragStartEvent) => {
        const itemId = event.active.data.current?.itemId;
        const label = event.active.data.current?.label;
        if (typeof itemId !== "string" || typeof label !== "string") return;
        setActiveDrag({ itemId, label });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const itemId = event.active.data.current?.itemId;
        const overId = typeof event.over?.id === "string" ? event.over.id : null;

        if (typeof itemId === "string" && overId?.startsWith("matching-prompt:")) {
            assignMatch(overId.replace("matching-prompt:", ""), itemId);
        }

        setActiveDrag(null);
    };

    return (
        <div className={QUESTION_CONTENT_OFFSET_CLASS}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveDrag(null)}
            >
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)] lg:items-start">
                    <div className="space-y-3">
                        {(question.matchingPrompts ?? []).map((prompt) => {
                            const assignedOptionIds = getMatchingAnswerItemIds(currentAnswer, prompt.id);
                            return (
                                <div
                                    key={prompt.id}
                                    className="grid gap-3 rounded-xl border border-border/40 bg-background/50 p-4 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.9fr)] md:items-center"
                                >
                                    <p className="text-sm font-semibold text-foreground">{prompt.text}</p>
                                    <DroppableAnswerSlot
                                        id={`matching-prompt:${prompt.id}`}
                                        className={cn(
                                            "flex min-h-[72px] items-start justify-between gap-2 rounded-xl border border-dashed p-3 transition-colors",
                                            assignedOptionIds.length > 0
                                                ? "border-accent-blue/30 bg-accent-blue/8"
                                                : "border-border/40 bg-background/60",
                                        )}
                                    >
                                        {assignedOptionIds.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {assignedOptionIds.map((assignedOptionId) => (
                                                    <span key={assignedOptionId} className="inline-flex items-center gap-2 rounded-full border border-accent-blue/20 bg-accent-blue/10 px-3 py-1 text-sm text-foreground">
                                                        <span>{getAssignedItemLabel(question, assignedOptionId)}</span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label="Quitar emparejamiento"
                                                            className="size-6 shrink-0 text-text-muted hover:text-red-400"
                                                            onClick={() => clearMatch(prompt.id, assignedOptionId)}
                                                        >
                                                            <X className="size-3.5" />
                                                        </Button>
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-text-muted">Suelta aquí la opción correspondiente</p>
                                        )}
                                    </DroppableAnswerSlot>
                                </div>
                            );
                        })}
                    </div>

                    <div className="lg:sticky lg:top-4 lg:self-start">
                        <div className="space-y-2 rounded-xl border border-dashed border-accent-blue/20 bg-accent-blue/5 p-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Matches</p>
                            <div className="flex max-h-80 flex-wrap gap-2 overflow-y-auto pr-1">
                                {visibleOptions.map((option) => (
                                    <DraggableAnswerChip
                                        key={option.id}
                                        dragId={`matching-option:${option.id}`}
                                        itemId={option.id}
                                        label={option.text}
                                    />
                                ))}
                                {matchingOptions.length === 0 && (
                                    <span className="text-xs text-text-muted">No hay matches configurados.</span>
                                )}
                                {matchingOptions.length > 0 && visibleOptions.length === 0 && (
                                    <span className="text-xs text-text-muted">Todos los matches disponibles ya están colocados. Quita uno para reutilizarlo.</span>
                                )}
                            </div>
                            <p className="text-xs text-text-muted">
                                {allowReuse
                                    ? "Un mismo match se puede reutilizar tantas veces como haga falta."
                                    : "Cada match solo puede usarse una vez. Si lo quitas de un prompt volverá a aparecer aquí."}
                            </p>
                        </div>
                    </div>
                </div>

                <DragOverlay>
                    {activeDrag ? <DragOverlayChip label={activeDrag.label} /> : null}
                </DragOverlay>
            </DndContext>
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
        <div className={QUESTION_CONTENT_OFFSET_CLASS}>
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
    const allowReuse = doesCategorizationAllowReuse(question);
    const poolItems = allowReuse
        ? (question.categoryItems ?? [])
        : (question.categoryItems ?? []).filter((item) => getCategorizationAssignedCategoryIds(currentAnswer, item.id).length === 0);

    return (
        <div className={cn("space-y-4", QUESTION_CONTENT_OFFSET_CLASS)}>
            <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-accent-blue/20 bg-accent-blue/5 p-3">
                {poolItems.map((item) => (
                    <DraggableAnswerChip
                        key={item.id}
                        id={item.id}
                        label={item.text}
                        onDragStart={(itemId) => setDraggedItemId(itemId)}
                        onDragEnd={() => setDraggedItemId(null)}
                    />
                ))}
                {poolItems.length === 0 && (
                    <span className="text-xs text-text-muted">Todos los elementos están asignados.</span>
                )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                {(question.categories ?? []).map((category) => {
                    const categoryItems = (question.categoryItems ?? []).filter((item) =>
                        getCategorizationAssignedCategoryIds(currentAnswer, item.id).includes(category.id),
                    );
                    return (
                        <div
                            key={category.id}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                                event.preventDefault();
                                if (!draggedItemId) return;
                                const nextCategoryIds = [...new Set([
                                    ...(allowReuse ? getCategorizationAssignedCategoryIds(currentAnswer, draggedItemId) : []),
                                    category.id,
                                ])];
                                onStructuredAnswerChange(question.id, {
                                    kind: QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP,
                                    assignments: writeStructuredValue(currentAnswer.assignments, draggedItemId, nextCategoryIds, allowReuse),
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
                                                const nextAssignments = writeStructuredValue(
                                                    currentAnswer.assignments,
                                                    item.id,
                                                    getCategorizationAssignedCategoryIds(currentAnswer, item.id).filter((candidate) => candidate !== category.id),
                                                    allowReuse,
                                                );
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
        <div className={cn("space-y-3", QUESTION_CONTENT_OFFSET_CLASS)}>
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
        <div className={cn("flex items-center gap-3", QUESTION_CONTENT_OFFSET_CLASS)}>
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
            <div className={QUESTION_CONTENT_OFFSET_CLASS}>
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
            <div className={cn("space-y-3", QUESTION_CONTENT_OFFSET_CLASS)}>
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
