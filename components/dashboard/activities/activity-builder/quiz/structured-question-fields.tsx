"use client";

import type { ReactNode } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getQuestionType, QUIZ_QUESTION_TYPE } from "@/lib/quiz-core";
import type {
    QuizCategory,
    QuizCategoryItem,
    QuizDropdownBlank,
    QuizMatchingOption,
    QuizMatchingPrompt,
    QuizOrderingItem,
    QuizPromptSegment,
    QuizQuestion,
    QuizTableColumn,
    QuizTableItem,
    QuizTableRow,
} from "@/types/activity";
import { Plus, Trash2, ArrowDown, ArrowUp, GripVertical } from "lucide-react";

type StructuredQuestionFieldsProps = {
    question: QuizQuestion;
    onUpdate: (updates: Partial<QuizQuestion>) => void;
};

function createOption(text = "", isCorrect = false) {
    return { id: crypto.randomUUID(), text, isCorrect };
}

function createTextSegment(text = ""): QuizPromptSegment {
    return { id: crypto.randomUUID(), kind: "text", text };
}

function createBlankSegment(blankId: string): QuizPromptSegment {
    return { id: crypto.randomUUID(), kind: "blank", blankId };
}

function createBlank(): QuizDropdownBlank {
    return {
        id: crypto.randomUUID(),
        options: [createOption("Correcta", true), createOption("Distractor", false)],
    };
}

function createColumn(label = ""): QuizTableColumn {
    return { id: crypto.randomUUID(), label };
}

function createRow(label = ""): QuizTableRow {
    return { id: crypto.randomUUID(), label };
}

function createTableItem(text = ""): QuizTableItem {
    return { id: crypto.randomUUID(), text };
}

function createMatchingOption(text = ""): QuizMatchingOption {
    return { id: crypto.randomUUID(), text };
}

function createMatchingPrompt(correctMatchId: string): QuizMatchingPrompt {
    return { id: crypto.randomUUID(), text: "", correctMatchId };
}

function createOrderingItem(text = ""): QuizOrderingItem {
    return { id: crypto.randomUUID(), text };
}

function createCategory(label = ""): QuizCategory {
    return { id: crypto.randomUUID(), label };
}

function createCategoryItem(correctCategoryId: string): QuizCategoryItem {
    return { id: crypto.randomUUID(), text: "", correctCategoryId };
}

function moveItem<T>(items: T[], fromIndex: number, direction: -1 | 1) {
    const nextIndex = fromIndex + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return items;
    const result = [...items];
    const [item] = result.splice(fromIndex, 1);
    result.splice(nextIndex, 0, item);
    return result;
}

function reorderItemsById<T extends { id: string }>(items: T[], activeId: string, overId: string) {
    const oldIndex = items.findIndex((item) => item.id === activeId);
    const newIndex = items.findIndex((item) => item.id === overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return items;
    return arrayMove(items, oldIndex, newIndex);
}

function SortableFieldRow({
    id,
    handleLabel,
    children,
    className,
}: {
    id: string;
    handleLabel: string;
    children: ReactNode;
    className?: string;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn("flex items-center gap-2", isDragging && "z-10", className)}
        >
            <button
                type="button"
                aria-label={handleLabel}
                className="shrink-0 rounded-md p-1 text-text-muted transition-colors hover:bg-surface hover:text-foreground cursor-grab active:cursor-grabbing"
                {...attributes}
                {...listeners}
            >
                <GripVertical className="size-4" />
            </button>
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}

function FillInTheBlankFields({ question, onUpdate }: StructuredQuestionFieldsProps) {
    const promptSegments = question.promptSegments ?? [createTextSegment(""), createBlankSegment((question.dropdownBlanks ?? [createBlank()])[0].id)];
    const dropdownBlanks = question.dropdownBlanks ?? [createBlank()];

    return (
        <div className="pl-14 space-y-4">
            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Texto con huecos</p>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => onUpdate({ promptSegments: [...promptSegments, createTextSegment("")] })}
                        >
                            <Plus className="size-3 mr-1" /> Texto
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                                const blank = createBlank();
                                onUpdate({
                                    dropdownBlanks: [...dropdownBlanks, blank],
                                    promptSegments: [...promptSegments, createBlankSegment(blank.id)],
                                });
                            }}
                        >
                            <Plus className="size-3 mr-1" /> Hueco
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    {promptSegments.map((segment, index) => (
                        <div key={segment.id} className="flex items-center gap-2">
                            {segment.kind === "text" ? (
                                <Input
                                    value={segment.text}
                                    onChange={(event) => {
                                        const nextSegments = [...promptSegments];
                                        nextSegments[index] = { ...segment, text: event.target.value };
                                        onUpdate({ promptSegments: nextSegments });
                                    }}
                                    placeholder="Bloque de texto..."
                                    className="bg-background/60 border-border/40 text-sm"
                                />
                            ) : (
                                <div className="flex-1 rounded-lg border border-accent-blue/20 bg-accent-blue/8 px-3 py-2 text-sm text-accent-blue">
                                    Hueco {dropdownBlanks.findIndex((blank) => blank.id === segment.blankId) + 1}
                                </div>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Eliminar segmento"
                                className="size-8 text-text-muted hover:text-red-400"
                                onClick={() => {
                                    const nextSegments = promptSegments.filter((candidate) => candidate.id !== segment.id);
                                    if (segment.kind === "blank") {
                                        onUpdate({
                                            promptSegments: nextSegments,
                                            dropdownBlanks: dropdownBlanks.filter((blank) => blank.id !== segment.blankId),
                                        });
                                        return;
                                    }
                                    onUpdate({ promptSegments: nextSegments });
                                }}
                            >
                                <Trash2 className="size-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                {dropdownBlanks.map((blank, blankIndex) => (
                    <div key={blank.id} className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Hueco {blankIndex + 1}</p>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-text-muted hover:text-red-400"
                                onClick={() => onUpdate({
                                    dropdownBlanks: dropdownBlanks.filter((candidate) => candidate.id !== blank.id),
                                    promptSegments: promptSegments.filter((segment) => segment.kind !== "blank" || segment.blankId !== blank.id),
                                })}
                            >
                                <Trash2 className="size-3 mr-1" /> Eliminar
                            </Button>
                        </div>
                        {blank.options.map((option, optionIndex) => (
                            <div key={option.id} className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => onUpdate({
                                        dropdownBlanks: dropdownBlanks.map((candidate) => candidate.id !== blank.id ? candidate : {
                                            ...candidate,
                                            options: candidate.options.map((candidateOption) => ({
                                                ...candidateOption,
                                                isCorrect: candidateOption.id === option.id,
                                            })),
                                        }),
                                    })}
                                    className={cn(
                                        "rounded-md border px-2 py-1 text-[11px] font-bold uppercase tracking-widest",
                                        option.isCorrect
                                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                            : "border-border/40 text-text-muted"
                                    )}
                                >
                                    {option.isCorrect ? "Correcta" : `Opción ${optionIndex + 1}`}
                                </button>
                                <Input
                                    value={option.text}
                                    onChange={(event) => onUpdate({
                                        dropdownBlanks: dropdownBlanks.map((candidate) => candidate.id !== blank.id ? candidate : {
                                            ...candidate,
                                            options: candidate.options.map((candidateOption) => candidateOption.id === option.id
                                                ? { ...candidateOption, text: event.target.value }
                                                : candidateOption),
                                        }),
                                    })}
                                    placeholder="Texto de opción..."
                                    className="bg-background/60 border-border/40 text-sm"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Eliminar opción del hueco"
                                    disabled={blank.options.length <= 2}
                                    className="size-8 text-text-muted hover:text-red-400"
                                    onClick={() => onUpdate({
                                        dropdownBlanks: dropdownBlanks.map((candidate) => candidate.id !== blank.id ? candidate : {
                                            ...candidate,
                                            options: candidate.options.filter((candidateOption) => candidateOption.id !== option.id),
                                        }),
                                    })}
                                >
                                    <Trash2 className="size-3.5" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-text-muted hover:text-accent-blue"
                            onClick={() => onUpdate({
                                dropdownBlanks: dropdownBlanks.map((candidate) => candidate.id !== blank.id ? candidate : {
                                    ...candidate,
                                    options: [...candidate.options, createOption("", false)],
                                }),
                            })}
                        >
                            <Plus className="size-3 mr-1" /> Añadir opción
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TableDragFields({ question, onUpdate }: StructuredQuestionFieldsProps) {
    const columns = question.tableColumns ?? [createColumn("Campo 1"), createColumn("Campo 2")];
    const rows = question.tableRows ?? [createRow("Elemento 1"), createRow("Elemento 2")];
    const items = question.tableItems ?? [createTableItem("Elemento A"), createTableItem("Elemento B"), createTableItem("Elemento C"), createTableItem("Elemento D")];
    const rowHeaderLabel = question.tableRowHeaderLabel ?? "Concepto";
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const cells = question.tableCells ?? rows.flatMap((row) => columns.map((column, index) => ({
        id: crypto.randomUUID(),
        rowId: row.id,
        columnId: column.id,
        correctItemId: items[index % items.length]?.id ?? "",
    })));

    const patchQuestion = (updates: Partial<QuizQuestion>) => {
        onUpdate({
            tableRowHeaderLabel: rowHeaderLabel,
            tableColumns: columns,
            tableRows: rows,
            tableItems: items,
            tableCells: cells,
            ...updates,
        });
    };

    return (
        <div className="pl-14 space-y-4">
            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Columna fija</p>
                <Input
                    value={rowHeaderLabel}
                    onChange={(event) => patchQuestion({ tableRowHeaderLabel: event.target.value })}
                    placeholder="Título de la columna fija"
                    className="bg-background/60 border-border/40 text-sm"
                />
                <p className="text-xs text-text-muted">
                    Esta cabecera se muestra a la izquierda. Cada fila define el valor fijo de esa columna.
                </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Columnas a completar</p>
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                            const nextColumn = createColumn(`Columna ${columns.length + 1}`);
                            patchQuestion({
                                tableColumns: [...columns, nextColumn],
                                tableCells: [
                                    ...cells,
                                    ...rows.map((row) => ({
                                        id: crypto.randomUUID(),
                                        rowId: row.id,
                                        columnId: nextColumn.id,
                                        correctItemId: "",
                                    })),
                                ],
                            });
                        }}>
                            <Plus className="size-3 mr-1" /> Añadir
                        </Button>
                    </div>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => {
                            const { active, over } = event;
                            if (!over || active.id === over.id) return;
                            patchQuestion({
                                tableColumns: reorderItemsById(columns, String(active.id), String(over.id)),
                            });
                        }}
                    >
                        <SortableContext items={columns.map((column) => column.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {columns.map((column) => (
                                    <SortableFieldRow key={column.id} id={column.id} handleLabel="Reordenar columna">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={column.label}
                                                onChange={(event) => patchQuestion({ tableColumns: columns.map((candidate) => candidate.id === column.id ? { ...candidate, label: event.target.value } : candidate) })}
                                                placeholder="Cabecera de columna"
                                                className="bg-background/60 border-border/40 text-sm"
                                            />
                                            <Button type="button" variant="ghost" size="icon" aria-label="Eliminar columna" className="size-8 text-text-muted hover:text-red-400" onClick={() => patchQuestion({ tableColumns: columns.filter((candidate) => candidate.id !== column.id), tableCells: cells.filter((cell) => cell.columnId !== column.id) })}>
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    </SortableFieldRow>
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Valores de la columna fija</p>
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                            const nextRow = createRow(`Fila ${rows.length + 1}`);
                            patchQuestion({
                                tableRows: [...rows, nextRow],
                                tableCells: [
                                    ...cells,
                                    ...columns.map((column) => ({
                                        id: crypto.randomUUID(),
                                        rowId: nextRow.id,
                                        columnId: column.id,
                                        correctItemId: "",
                                    })),
                                ],
                            });
                        }}>
                            <Plus className="size-3 mr-1" /> Añadir
                        </Button>
                    </div>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => {
                            const { active, over } = event;
                            if (!over || active.id === over.id) return;
                            patchQuestion({
                                tableRows: reorderItemsById(rows, String(active.id), String(over.id)),
                            });
                        }}
                    >
                        <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {rows.map((row) => (
                                    <SortableFieldRow key={row.id} id={row.id} handleLabel="Reordenar valor fijo">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={row.label}
                                                onChange={(event) => patchQuestion({ tableRows: rows.map((candidate) => candidate.id === row.id ? { ...candidate, label: event.target.value } : candidate) })}
                                                placeholder="Valor fijo de la fila"
                                                className="bg-background/60 border-border/40 text-sm"
                                            />
                                            <Button type="button" variant="ghost" size="icon" aria-label="Eliminar fila" className="size-8 text-text-muted hover:text-red-400" onClick={() => patchQuestion({ tableRows: rows.filter((candidate) => candidate.id !== row.id), tableCells: cells.filter((cell) => cell.rowId !== row.id) })}>
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    </SortableFieldRow>
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Opciones arrastrables</p>
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => patchQuestion({ tableItems: [...items, createTableItem("")] })}>
                            <Plus className="size-3 mr-1" /> Añadir
                        </Button>
                    </div>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => {
                            const { active, over } = event;
                            if (!over || active.id === over.id) return;
                            patchQuestion({
                                tableItems: reorderItemsById(items, String(active.id), String(over.id)),
                            });
                        }}
                    >
                        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {items.map((item) => (
                                    <SortableFieldRow key={item.id} id={item.id} handleLabel="Reordenar opción arrastrable">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={item.text}
                                                onChange={(event) => patchQuestion({ tableItems: items.map((candidate) => candidate.id === item.id ? { ...candidate, text: event.target.value } : candidate) })}
                                                placeholder="Texto de opción"
                                                className="bg-background/60 border-border/40 text-sm"
                                            />
                                            <Button type="button" variant="ghost" size="icon" aria-label="Eliminar opción arrastrable" className="size-8 text-text-muted hover:text-red-400" onClick={() => patchQuestion({ tableItems: items.filter((candidate) => candidate.id !== item.id), tableCells: cells.map((cell) => cell.correctItemId === item.id ? { ...cell, correctItemId: "" } : cell) })}>
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    </SortableFieldRow>
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>

            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Respuestas correctas por celda</p>
                <div className="overflow-x-auto">
                    <div
                        className="grid min-w-[720px] gap-px rounded-xl border border-border/30 bg-border/30"
                        style={{ gridTemplateColumns: `minmax(180px, 1.2fr) repeat(${Math.max(columns.length, 1)}, minmax(180px, 1fr))` }}
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
                                <div className="bg-background/70 px-4 py-3 text-sm font-semibold text-foreground">
                                    {row.label || "Fila sin texto"}
                                </div>
                                {columns.map((column) => {
                                    const cell = cells.find((candidate) => candidate.rowId === row.id && candidate.columnId === column.id)
                                        ?? { id: crypto.randomUUID(), rowId: row.id, columnId: column.id, correctItemId: "" };
                                    return (
                                        <div key={cell.id} className="bg-background/70 p-3">
                                            <Select
                                                value={cell.correctItemId || "__empty__"}
                                                onValueChange={(value) => {
                                                    const nextValue = value === "__empty__" ? "" : value;
                                                    const existingCell = cells.some((candidate) => candidate.id === cell.id);
                                                    patchQuestion({
                                                        tableCells: existingCell
                                                            ? cells.map((candidate) => candidate.id === cell.id ? { ...candidate, correctItemId: nextValue } : candidate)
                                                            : [...cells, { ...cell, correctItemId: nextValue }],
                                                    });
                                                }}
                                            >
                                                <SelectTrigger className="bg-background border-border/40">
                                                    <SelectValue placeholder="Selecciona la opción correcta" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__empty__">Sin asignar</SelectItem>
                                                    {items.map((item) => (
                                                        <SelectItem key={item.id} value={item.id}>{item.text || "Opción sin texto"}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MatchingPairsFields({ question, onUpdate }: StructuredQuestionFieldsProps) {
    const matchingOptions = question.matchingOptions ?? [createMatchingOption(""), createMatchingOption(""), createMatchingOption("")];
    const matchingPrompts = question.matchingPrompts ?? matchingOptions.map((option) => createMatchingPrompt(option.id));
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    return (
        <div className="pl-14 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Matches</p>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUpdate({ matchingOptions: [...matchingOptions, createMatchingOption("")] })}>
                        <Plus className="size-3 mr-1" /> Añadir
                    </Button>
                </div>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => {
                        const { active, over } = event;
                        if (!over || active.id === over.id) return;
                        onUpdate({
                            matchingOptions: reorderItemsById(matchingOptions, String(active.id), String(over.id)),
                        });
                    }}
                >
                    <SortableContext items={matchingOptions.map((option) => option.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {matchingOptions.map((option) => (
                                <SortableFieldRow key={option.id} id={option.id} handleLabel="Reordenar match">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={option.text}
                                            onChange={(event) => onUpdate({ matchingOptions: matchingOptions.map((candidate) => candidate.id === option.id ? { ...candidate, text: event.target.value } : candidate) })}
                                            placeholder="Texto del match"
                                            className="bg-background/60 border-border/40 text-sm"
                                        />
                                        <Button type="button" variant="ghost" size="icon" aria-label="Eliminar match" className="size-8 text-text-muted hover:text-red-400" onClick={() => onUpdate({ matchingOptions: matchingOptions.filter((candidate) => candidate.id !== option.id), matchingPrompts: matchingPrompts.map((prompt) => prompt.correctMatchId === option.id ? { ...prompt, correctMatchId: "" } : prompt) })}>
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                </SortableFieldRow>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Prompts</p>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUpdate({ matchingPrompts: [...matchingPrompts, createMatchingPrompt(matchingOptions[0]?.id ?? "")] })}>
                        <Plus className="size-3 mr-1" /> Añadir
                    </Button>
                </div>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => {
                        const { active, over } = event;
                        if (!over || active.id === over.id) return;
                        onUpdate({
                            matchingPrompts: reorderItemsById(matchingPrompts, String(active.id), String(over.id)),
                        });
                    }}
                >
                    <SortableContext items={matchingPrompts.map((prompt) => prompt.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {matchingPrompts.map((prompt) => (
                                <SortableFieldRow key={prompt.id} id={prompt.id} handleLabel="Reordenar prompt" className="items-start">
                                    <div className="space-y-2 rounded-lg border border-border/20 bg-background/40 p-3">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={prompt.text}
                                                onChange={(event) => onUpdate({ matchingPrompts: matchingPrompts.map((candidate) => candidate.id === prompt.id ? { ...candidate, text: event.target.value } : candidate) })}
                                                placeholder="Texto del prompt"
                                                className="bg-background/60 border-border/40 text-sm"
                                            />
                                            <Button type="button" variant="ghost" size="icon" aria-label="Eliminar prompt" className="size-8 text-text-muted hover:text-red-400" onClick={() => onUpdate({ matchingPrompts: matchingPrompts.filter((candidate) => candidate.id !== prompt.id) })}>
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                        <Select
                                            value={prompt.correctMatchId || "__empty__"}
                                            onValueChange={(value) => onUpdate({ matchingPrompts: matchingPrompts.map((candidate) => candidate.id === prompt.id ? { ...candidate, correctMatchId: value === "__empty__" ? "" : value } : candidate) })}
                                        >
                                            <SelectTrigger className="bg-background border-border/40">
                                                <SelectValue placeholder="Selecciona la respuesta correcta" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__empty__">Sin asignar</SelectItem>
                                                {matchingOptions.map((option) => (
                                                    <SelectItem key={option.id} value={option.id}>{option.text || "Match sin texto"}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </SortableFieldRow>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
}

function OrderingSequenceFields({ question, onUpdate }: StructuredQuestionFieldsProps) {
    const orderingItems = question.orderingItems ?? [createOrderingItem(""), createOrderingItem(""), createOrderingItem("")];

    return (
        <div className="pl-14 rounded-xl border border-border/30 bg-surface/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Orden correcto</p>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUpdate({ orderingItems: [...orderingItems, createOrderingItem("")] })}>
                    <Plus className="size-3 mr-1" /> Añadir paso
                </Button>
            </div>
            {orderingItems.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                    <div className="w-8 shrink-0 rounded-md border border-border/30 bg-background/60 py-2 text-center text-xs font-black text-text-muted">
                        {index + 1}
                    </div>
                    <Input
                        value={item.text}
                        onChange={(event) => onUpdate({ orderingItems: orderingItems.map((candidate) => candidate.id === item.id ? { ...candidate, text: event.target.value } : candidate) })}
                        placeholder="Paso de la secuencia"
                        className="bg-background/60 border-border/40 text-sm"
                    />
                    <Button type="button" variant="ghost" size="icon" aria-label="Mover arriba" className="size-8 text-text-muted" disabled={index === 0} onClick={() => onUpdate({ orderingItems: moveItem(orderingItems, index, -1) })}>
                        <ArrowUp className="size-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label="Mover abajo" className="size-8 text-text-muted" disabled={index === orderingItems.length - 1} onClick={() => onUpdate({ orderingItems: moveItem(orderingItems, index, 1) })}>
                        <ArrowDown className="size-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label="Eliminar paso" className="size-8 text-text-muted hover:text-red-400" onClick={() => onUpdate({ orderingItems: orderingItems.filter((candidate) => candidate.id !== item.id) })}>
                        <Trash2 className="size-3.5" />
                    </Button>
                </div>
            ))}
        </div>
    );
}

function CategorizationFields({ question, onUpdate }: StructuredQuestionFieldsProps) {
    const categories = question.categories ?? [createCategory("Categoría A"), createCategory("Categoría B")];
    const categoryItems = question.categoryItems ?? [createCategoryItem(categories[0].id), createCategoryItem(categories[1].id)];

    return (
        <div className="pl-14 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Categorías</p>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUpdate({ categories: [...categories, createCategory("")] })}>
                        <Plus className="size-3 mr-1" /> Añadir
                    </Button>
                </div>
                {categories.map((category) => (
                    <div key={category.id} className="flex items-center gap-2">
                        <Input
                            value={category.label}
                            onChange={(event) => onUpdate({ categories: categories.map((candidate) => candidate.id === category.id ? { ...candidate, label: event.target.value } : candidate) })}
                            placeholder="Nombre de categoría"
                            className="bg-background/60 border-border/40 text-sm"
                        />
                        <Button type="button" variant="ghost" size="icon" aria-label="Eliminar categoría" className="size-8 text-text-muted hover:text-red-400" onClick={() => onUpdate({ categories: categories.filter((candidate) => candidate.id !== category.id), categoryItems: categoryItems.map((item) => item.correctCategoryId === category.id ? { ...item, correctCategoryId: "" } : item) })}>
                            <Trash2 className="size-3.5" />
                        </Button>
                    </div>
                ))}
            </div>

            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Elementos</p>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUpdate({ categoryItems: [...categoryItems, createCategoryItem(categories[0]?.id ?? "")] })}>
                        <Plus className="size-3 mr-1" /> Añadir
                    </Button>
                </div>
                {categoryItems.map((item) => (
                    <div key={item.id} className="space-y-2 rounded-lg border border-border/20 bg-background/40 p-3">
                        <div className="flex items-center gap-2">
                            <Input
                                value={item.text}
                                onChange={(event) => onUpdate({ categoryItems: categoryItems.map((candidate) => candidate.id === item.id ? { ...candidate, text: event.target.value } : candidate) })}
                                placeholder="Texto del elemento"
                                className="bg-background/60 border-border/40 text-sm"
                            />
                            <Button type="button" variant="ghost" size="icon" aria-label="Eliminar elemento" className="size-8 text-text-muted hover:text-red-400" onClick={() => onUpdate({ categoryItems: categoryItems.filter((candidate) => candidate.id !== item.id) })}>
                                <Trash2 className="size-3.5" />
                            </Button>
                        </div>
                        <Select
                            value={item.correctCategoryId || "__empty__"}
                            onValueChange={(value) => onUpdate({ categoryItems: categoryItems.map((candidate) => candidate.id === item.id ? { ...candidate, correctCategoryId: value === "__empty__" ? "" : value } : candidate) })}
                        >
                            <SelectTrigger className="bg-background border-border/40">
                                <SelectValue placeholder="Selecciona la categoría correcta" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__empty__">Sin asignar</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>{category.label || "Categoría sin texto"}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function StructuredQuestionFields({ question, onUpdate }: StructuredQuestionFieldsProps) {
    const questionType = getQuestionType(question);

    if (questionType === QUIZ_QUESTION_TYPE.FILL_IN_THE_BLANK_DROPDOWN) {
        return <FillInTheBlankFields question={question} onUpdate={onUpdate} />;
    }

    if (questionType === QUIZ_QUESTION_TYPE.TABLE_DRAG_DROP) {
        return <TableDragFields question={question} onUpdate={onUpdate} />;
    }

    if (questionType === QUIZ_QUESTION_TYPE.MATCHING_PAIRS) {
        return <MatchingPairsFields question={question} onUpdate={onUpdate} />;
    }

    if (questionType === QUIZ_QUESTION_TYPE.ORDERING_SEQUENCE) {
        return <OrderingSequenceFields question={question} onUpdate={onUpdate} />;
    }

    if (questionType === QUIZ_QUESTION_TYPE.CATEGORIZATION_DRAG_DROP) {
        return <CategorizationFields question={question} onUpdate={onUpdate} />;
    }

    return null;
}
