"use client";

import type { ReactNode } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
    doesCategorizationAllowReuse,
    doesMatchingAllowMultiplePerPrompt,
    doesMatchingAllowReuse,
    doesTableDragAllowItemReuse,
    doesTableDragAllowMultipleItemsPerCell,
    getCategoryItemCorrectCategoryIds,
    getCategorizationItemsWithMultipleCorrectCategories,
    getMatchingDuplicateCorrectMatchIds,
    getMatchingPromptCorrectMatchIds,
    getQuestionType,
    getTableCellCorrectItemIds,
    getTableDragDuplicateCorrectItemIds,
    QUIZ_QUESTION_TYPE,
} from "@/lib/quiz-core";
import type {
    QuizCategory,
    QuizCategoryItem,
    QuizDropdownBlank,
    QuizMatchingOption,
    QuizMatchingPrompt,
    QuizOption,
    QuizOrderingItem,
    QuizPromptSegment,
    QuizQuestion,
    QuizTableColumn,
    QuizTableItem,
    QuizTableRow,
} from "@/types/activity";
import { Plus, Trash2, GripVertical, HelpCircle } from "lucide-react";

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
    const correctOption = createOption("Correcta", true);
    const distractorOption = createOption("Distractor", false);
    return {
        id: crypto.randomUUID(),
        correctOptionId: correctOption.id,
        options: [correctOption, distractorOption],
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
    return { id: crypto.randomUUID(), text: "", correctMatchId, correctMatchIds: correctMatchId ? [correctMatchId] : [] };
}

function createOrderingItem(text = ""): QuizOrderingItem {
    return { id: crypto.randomUUID(), text };
}

function createCategory(label = ""): QuizCategory {
    return { id: crypto.randomUUID(), label };
}

function createCategoryItem(correctCategoryId: string): QuizCategoryItem {
    return { id: crypto.randomUUID(), text: "", correctCategoryId, correctCategoryIds: correctCategoryId ? [correctCategoryId] : [] };
}

function reorderItemsById<T extends { id: string }>(items: T[], activeId: string, overId: string) {
    const oldIndex = items.findIndex((item) => item.id === activeId);
    const newIndex = items.findIndex((item) => item.id === overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return items;
    return arrayMove(items, oldIndex, newIndex);
}

function getDropdownCorrectOptionId(blank: QuizDropdownBlank) {
    return blank.correctOptionId ?? blank.options.find((option) => option.isCorrect)?.id ?? "";
}

function getDropdownPoolOptions(question: QuizQuestion, blanks: QuizDropdownBlank[]) {
    if (question.dropdownPoolOptions?.length) return question.dropdownPoolOptions;

    const optionsById = new Map<string, QuizOption>();
    for (const blank of blanks) {
        for (const option of blank.options) {
            if (!optionsById.has(option.id)) {
                optionsById.set(option.id, { ...option, isCorrect: false });
            }
        }
    }

    return Array.from(optionsById.values());
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

function FieldHelpTooltip({ title, description }: { title: string; description: string }) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button type="button" className="text-text-muted transition-colors hover:text-accent-blue cursor-help" aria-label={`Ayuda sobre ${title}`}>
                        <HelpCircle className="size-3.5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs p-3 space-y-1.5 bg-surface-dark border-border-subtle shadow-xl">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-accent-blue">{title}</p>
                    <p className="text-xs leading-relaxed text-text-muted">{description}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function SectionTitleWithHelp({ title, help }: { title: string; help?: string }) {
    return (
        <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted">{title}</p>
            {help ? <FieldHelpTooltip title={title} description={help} /> : null}
        </div>
    );
}

function MultipleChoiceChecklist({
    title,
    help,
    options,
    selectedIds,
    onChange,
    emptyLabel,
}: {
    title: string;
    help?: string;
    options: Array<{ id: string; label: string }>;
    selectedIds: string[];
    onChange: (nextIds: string[]) => void;
    emptyLabel: string;
}) {
    const selectedSet = new Set(selectedIds);

    return (
        <div className="space-y-2 rounded-lg border border-border/20 bg-background/40 p-3">
            <SectionTitleWithHelp title={title} help={help} />
            {options.length === 0 ? (
                <p className="text-xs text-text-muted">{emptyLabel}</p>
            ) : (
                <div className="space-y-2">
                    {options.map((option) => (
                        <label key={option.id} className="flex items-start gap-2 rounded-md border border-border/20 bg-background/30 px-2.5 py-2 text-xs text-foreground">
                            <Checkbox
                                checked={selectedSet.has(option.id)}
                                onCheckedChange={(checked) => {
                                    const nextIds = checked === true
                                        ? [...selectedIds, option.id]
                                        : selectedIds.filter((candidate) => candidate !== option.id);
                                    onChange([...new Set(nextIds)]);
                                }}
                            />
                            <span className="leading-relaxed">{option.label}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

function FillInTheBlankFields({ question, onUpdate }: StructuredQuestionFieldsProps) {
    const fallbackBlank = createBlank();
    const dropdownBlanks = (question.dropdownBlanks?.length ? question.dropdownBlanks : [fallbackBlank]).map((blank) => ({
        ...blank,
        correctOptionId: getDropdownCorrectOptionId(blank),
    }));
    const promptSegments = question.promptSegments ?? [createTextSegment(""), createBlankSegment(dropdownBlanks[0].id)];
    const poolOptions = getDropdownPoolOptions(question, dropdownBlanks);
    const consumesOptions = !!question.dropdownPoolConsumesOptions;
    const segmentSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleSegmentDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        onUpdate({ promptSegments: reorderItemsById(promptSegments, String(active.id), String(over.id)) });
    };

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
                                const correctOptionId = poolOptions[0]?.id ?? getDropdownCorrectOptionId(blank);
                                onUpdate({
                                    dropdownBlanks: [...dropdownBlanks, { id: blank.id, correctOptionId, options: [] }],
                                    dropdownPoolOptions: poolOptions.length ? poolOptions : blank.options,
                                    promptSegments: [...promptSegments, createBlankSegment(blank.id)],
                                });
                            }}
                        >
                            <Plus className="size-3 mr-1" /> Hueco
                        </Button>
                    </div>
                </div>

                <DndContext sensors={segmentSensors} collisionDetection={closestCenter} onDragEnd={handleSegmentDragEnd}>
                    <SortableContext items={promptSegments.map((segment) => segment.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {promptSegments.map((segment, index) => (
                                <SortableFieldRow key={segment.id} id={segment.id} handleLabel="Reordenar segmento">
                                    <div className="flex items-center gap-2">
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
                                            <div className="flex-1 rounded-lg border border-accent-blue/20 bg-accent-blue/8 px-3 py-2 text-sm font-semibold text-accent-blue">
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
                                                        dropdownPoolOptions: poolOptions,
                                                    });
                                                    return;
                                                }
                                                onUpdate({ promptSegments: nextSegments });
                                            }}
                                        >
                                            <Trash2 className="size-3.5" />
                                        </Button>
                                    </div>
                                </SortableFieldRow>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Pool compartida</p>
                        <p className="text-xs text-text-muted/70">Estas palabras aparecen en todos los huecos.</p>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-text-muted hover:text-accent-blue"
                        onClick={() => onUpdate({ dropdownPoolOptions: [...poolOptions, createOption("", false)] })}
                    >
                        <Plus className="size-3 mr-1" /> Añadir palabra
                    </Button>
                </div>
                <div className="space-y-2">
                    {poolOptions.map((option, optionIndex) => (
                        <div key={option.id} className="flex items-center gap-2">
                            <span className="w-20 shrink-0 rounded-md border border-border/40 px-2 py-1 text-center text-[11px] font-bold uppercase tracking-widest text-text-muted">
                                Opción {optionIndex + 1}
                            </span>
                            <Input
                                value={option.text}
                                onChange={(event) => onUpdate({
                                    dropdownPoolOptions: poolOptions.map((candidate) => candidate.id === option.id ? { ...candidate, text: event.target.value } : candidate),
                                })}
                                placeholder="Palabra de la pool..."
                                className="bg-background/60 border-border/40 text-sm"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Eliminar palabra de la pool"
                                disabled={poolOptions.length <= 2}
                                className="size-8 text-text-muted hover:text-red-400"
                                onClick={() => {
                                    const fallbackOptionId = poolOptions.find((candidate) => candidate.id !== option.id)?.id ?? "";
                                    onUpdate({
                                        dropdownPoolOptions: poolOptions.filter((candidate) => candidate.id !== option.id),
                                        dropdownBlanks: dropdownBlanks.map((blank) => getDropdownCorrectOptionId(blank) === option.id
                                            ? { ...blank, correctOptionId: fallbackOptionId, options: [] }
                                            : { ...blank, options: [] }),
                                    });
                                }}
                            >
                                <Trash2 className="size-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Configuración de uso</p>
                <div className="grid gap-2 md:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => onUpdate({ dropdownPoolConsumesOptions: true })}
                        className={cn(
                            "rounded-lg border p-3 text-left text-xs transition-colors",
                            consumesOptions ? "border-accent-blue/40 bg-accent-blue/10 text-foreground" : "border-border/30 bg-background/40 text-text-muted hover:text-foreground"
                        )}
                    >
                        <span className="block font-bold">La pool se va gastando</span>
                        <span className="mt-1 block leading-relaxed">Cuando el alumno elige una palabra, desaparece del resto de huecos.</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onUpdate({ dropdownPoolConsumesOptions: false })}
                        className={cn(
                            "rounded-lg border p-3 text-left text-xs transition-colors",
                            !consumesOptions ? "border-accent-blue/40 bg-accent-blue/10 text-foreground" : "border-border/30 bg-background/40 text-text-muted hover:text-foreground"
                        )}
                    >
                        <span className="block font-bold">La pool no se gasta</span>
                        <span className="mt-1 block leading-relaxed">La misma palabra puede seleccionarse en varios huecos.</span>
                    </button>
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
                                    dropdownPoolOptions: poolOptions,
                                    promptSegments: promptSegments.filter((segment) => segment.kind !== "blank" || segment.blankId !== blank.id),
                                })}
                            >
                                <Trash2 className="size-3 mr-1" /> Eliminar
                            </Button>
                        </div>
                        <Select
                            value={getDropdownCorrectOptionId(blank) || "__empty__"}
                            onValueChange={(value) => onUpdate({
                                dropdownBlanks: dropdownBlanks.map((candidate) => candidate.id === blank.id
                                    ? { ...candidate, correctOptionId: value === "__empty__" ? "" : value, options: [] }
                                    : { ...candidate, options: [] }),
                                dropdownPoolOptions: poolOptions,
                            })}
                        >
                            <SelectTrigger className="h-9 border-border/50 bg-background/60">
                                <SelectValue placeholder="Selecciona la opción correcta..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__empty__">Sin respuesta correcta</SelectItem>
                                {poolOptions.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                        {option.text || "Opción sin texto"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
    const allowItemReuse = doesTableDragAllowItemReuse(question);
    const allowMultipleItemsPerCell = doesTableDragAllowMultipleItemsPerCell(question);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const cells = question.tableCells ?? rows.flatMap((row) => columns.map((column, index) => ({
        id: crypto.randomUUID(),
        rowId: row.id,
        columnId: column.id,
        correctItemId: items[index % items.length]?.id ?? "",
        correctItemIds: items[index % items.length]?.id ? [items[index % items.length].id] : [],
    })));

    const patchQuestion = (updates: Partial<QuizQuestion>) => {
        onUpdate({
            tableRowHeaderLabel: rowHeaderLabel,
            tableColumns: columns,
            tableRows: rows,
            tableItems: items,
            tableCells: cells,
            tableAllowItemReuse: allowItemReuse,
            tableAllowMultipleItemsPerCell: allowMultipleItemsPerCell,
            ...updates,
        });
    };

    const duplicateCorrectItemIds = getTableDragDuplicateCorrectItemIds({
        ...question,
        tableColumns: columns,
        tableRows: rows,
        tableItems: items,
        tableCells: cells,
    });
    const duplicateCorrectItemLabels = duplicateCorrectItemIds
        .map((itemId) => items.find((item) => item.id === itemId)?.text?.trim() || "Opción sin texto");

    return (
        <div className="pl-14 space-y-4">
            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-2">
                <SectionTitleWithHelp
                    title="Columna fija"
                    help="Es la columna de referencia que siempre aparece a la izquierda. Cada fila define el valor base desde el que el alumno completa el resto de celdas."
                />
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

            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-3">
                <div className="flex items-start gap-3">
                    <Checkbox
                        id={`table-allow-item-reuse-${question.id}`}
                        checked={allowItemReuse}
                        onCheckedChange={(checked) => patchQuestion({ tableAllowItemReuse: checked === true })}
                        disabled={allowItemReuse && duplicateCorrectItemLabels.length > 0}
                    />
                    <div className="space-y-1">
                        <label
                            htmlFor={`table-allow-item-reuse-${question.id}`}
                            className="text-sm font-semibold text-foreground"
                        >
                            Permitir reutilizar opciones arrastrables
                        </label>
                        <p className="text-xs text-text-muted">
                            Si está activo, la misma opción puede colocarse en varias celdas. Si lo desactivas, cada opción solo podrá usarse una vez.
                        </p>
                    </div>
                    <FieldHelpTooltip
                        title="Reutilizar opciones"
                        description="Controla si una misma ficha arrastrable puede usarse en varias celdas distintas. Si lo desactivas, cada ficha solo podrá resolver una celda."
                    />
                </div>
                <div className="flex items-start gap-3">
                    <Checkbox
                        id={`table-allow-multi-cell-${question.id}`}
                        checked={allowMultipleItemsPerCell}
                        onCheckedChange={(checked) => patchQuestion({ tableAllowMultipleItemsPerCell: checked === true })}
                    />
                    <div className="space-y-1">
                        <label
                            htmlFor={`table-allow-multi-cell-${question.id}`}
                            className="text-sm font-semibold text-foreground"
                        >
                            Permitir varias opciones por celda
                        </label>
                        <p className="text-xs text-text-muted">
                            Si está activo, una misma celda puede requerir varias fichas correctas y el alumno podrá soltar varias dentro.
                        </p>
                    </div>
                    <FieldHelpTooltip
                        title="Varias opciones por celda"
                        description="Convierte cada celda en un objetivo múltiple. La corrección exige coincidencia exacta entre el conjunto seleccionado y el conjunto correcto."
                    />
                </div>
                {duplicateCorrectItemLabels.length > 0 && (
                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-200">
                        {allowItemReuse
                            ? `No puedes desactivar la reutilización mientras haya respuestas correctas repetidas en varias celdas: ${duplicateCorrectItemLabels.join(", ")}.`
                            : `Esta pregunta tiene respuestas correctas repetidas en varias celdas: ${duplicateCorrectItemLabels.join(", ")}. Así no es resoluble si cada opción solo puede usarse una vez.`}
                    </div>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <SectionTitleWithHelp
                            title="Columnas a completar"
                            help="Cada columna adicional crea un hueco que el alumno tendrá que completar en cada fila de la tabla."
                        />
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
                        <SectionTitleWithHelp
                            title="Valores de la columna fija"
                            help="Cada fila representa un elemento base de la tabla. Después cada celda de esa fila se corrige con sus opciones correspondientes."
                        />
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
                        <SectionTitleWithHelp
                            title="Opciones arrastrables"
                            help="Estas son las fichas que verá el alumno para arrastrar a las celdas. También determina el catálogo de respuestas posibles."
                        />
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
                                            <Button type="button" variant="ghost" size="icon" aria-label="Eliminar opción arrastrable" className="size-8 text-text-muted hover:text-red-400" onClick={() => patchQuestion({
                                                tableItems: items.filter((candidate) => candidate.id !== item.id),
                                                tableCells: cells.map((cell) => {
                                                    const nextCorrectItemIds = getTableCellCorrectItemIds(cell).filter((candidate) => candidate !== item.id);
                                                    return {
                                                        ...cell,
                                                        correctItemId: nextCorrectItemIds[0] ?? "",
                                                        correctItemIds: nextCorrectItemIds,
                                                    };
                                                }),
                                            })}>
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
                <SectionTitleWithHelp
                    title="Respuestas correctas por celda"
                    help="Aquí defines qué fichas resuelven correctamente cada celda. Si el modo múltiple está activo, puedes marcar varias respuestas correctas en la misma celda."
                />
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
                                        ?? { id: crypto.randomUUID(), rowId: row.id, columnId: column.id, correctItemId: "", correctItemIds: [] };
                                    const selectedItemIds = getTableCellCorrectItemIds(cell);
                                    return (
                                        <div key={cell.id} className="bg-background/70 p-3">
                                            {allowMultipleItemsPerCell ? (
                                                <MultipleChoiceChecklist
                                                    title="Opciones correctas"
                                                    help="Marca todas las fichas que deben estar presentes en esta celda para que cuente como correcta."
                                                    options={items.map((item) => ({ id: item.id, label: item.text || "Opción sin texto" }))}
                                                    selectedIds={selectedItemIds}
                                                    onChange={(nextIds) => {
                                                        const existingCell = cells.some((candidate) => candidate.id === cell.id);
                                                        const nextCell = { ...cell, correctItemId: nextIds[0] ?? "", correctItemIds: nextIds };
                                                        patchQuestion({
                                                            tableCells: existingCell
                                                                ? cells.map((candidate) => candidate.id === cell.id ? nextCell : candidate)
                                                                : [...cells, nextCell],
                                                        });
                                                    }}
                                                    emptyLabel="No hay opciones arrastrables configuradas."
                                                />
                                            ) : (
                                                <Select
                                                    value={selectedItemIds[0] || "__empty__"}
                                                    onValueChange={(value) => {
                                                        const nextValue = value === "__empty__" ? "" : value;
                                                        const existingCell = cells.some((candidate) => candidate.id === cell.id);
                                                        const nextCell = { ...cell, correctItemId: nextValue, correctItemIds: nextValue ? [nextValue] : [] };
                                                        patchQuestion({
                                                            tableCells: existingCell
                                                                ? cells.map((candidate) => candidate.id === cell.id ? nextCell : candidate)
                                                                : [...cells, nextCell],
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
                                            )}
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
    const allowMultiplePerPrompt = doesMatchingAllowMultiplePerPrompt(question);
    const allowReuse = doesMatchingAllowReuse(question);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const duplicateMatchIds = getMatchingDuplicateCorrectMatchIds({
        ...question,
        matchingOptions,
        matchingPrompts,
    });
    const duplicateMatchLabels = duplicateMatchIds.map((matchId) =>
        matchingOptions.find((option) => option.id === matchId)?.text?.trim() || "Match sin texto",
    );

    return (
        <div className="pl-14 space-y-4">
            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-3">
                <div className="flex items-start gap-3">
                    <Checkbox
                        id={`matching-allow-multi-${question.id}`}
                        checked={allowMultiplePerPrompt}
                        onCheckedChange={(checked) => onUpdate({ matchingAllowMultiplePerPrompt: checked === true })}
                    />
                    <div className="space-y-1">
                        <label htmlFor={`matching-allow-multi-${question.id}`} className="text-sm font-semibold text-foreground">
                            Permitir varios matches por prompt
                        </label>
                        <p className="text-xs text-text-muted">
                            Si está activo, un mismo prompt podrá requerir varias respuestas correctas.
                        </p>
                    </div>
                    <FieldHelpTooltip
                        title="Varios matches por prompt"
                        description="Convierte cada prompt en un objetivo múltiple. El alumno tendrá que soltar todos los matches correctos y no podrá sobrar ninguno."
                    />
                </div>
                <div className="flex items-start gap-3">
                    <Checkbox
                        id={`matching-allow-reuse-${question.id}`}
                        checked={allowReuse}
                        onCheckedChange={(checked) => onUpdate({ matchingAllowReuse: checked === true })}
                        disabled={allowReuse && duplicateMatchLabels.length > 0}
                    />
                    <div className="space-y-1">
                        <label htmlFor={`matching-allow-reuse-${question.id}`} className="text-sm font-semibold text-foreground">
                            Permitir reutilizar matches
                        </label>
                        <p className="text-xs text-text-muted">
                            Si está activo, el mismo match podrá usarse en varios prompts diferentes.
                        </p>
                    </div>
                    <FieldHelpTooltip
                        title="Reutilizar matches"
                        description="Define si una misma ficha de respuesta puede resolver varios prompts o si cada una debe usarse una sola vez."
                    />
                </div>
                {duplicateMatchLabels.length > 0 && (
                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-200">
                        {allowReuse
                            ? `No puedes desactivar la reutilización mientras haya matches correctos repetidos en varios prompts: ${duplicateMatchLabels.join(", ")}.`
                            : `Esta pregunta tiene matches correctos repetidos en varios prompts: ${duplicateMatchLabels.join(", ")}. Así no es resoluble si cada match solo puede usarse una vez.`}
                    </div>
                )}
            </div>

            <div className="pl-0 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <SectionTitleWithHelp
                        title="Matches"
                        help="Son las respuestas arrastrables que el alumno verá a la derecha. Representan el catálogo de posibles emparejamientos."
                    />
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
                                        <Button type="button" variant="ghost" size="icon" aria-label="Eliminar match" className="size-8 text-text-muted hover:text-red-400" onClick={() => onUpdate({
                                            matchingOptions: matchingOptions.filter((candidate) => candidate.id !== option.id),
                                            matchingPrompts: matchingPrompts.map((prompt) => {
                                                const nextCorrectMatchIds = getMatchingPromptCorrectMatchIds(prompt).filter((candidate) => candidate !== option.id);
                                                return {
                                                    ...prompt,
                                                    correctMatchId: nextCorrectMatchIds[0] ?? "",
                                                    correctMatchIds: nextCorrectMatchIds,
                                                };
                                            }),
                                        })}>
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
                    <SectionTitleWithHelp
                        title="Prompts"
                        help="Cada prompt es un enunciado que el alumno debe relacionar con uno o varios matches según la configuración."
                    />
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
                                        {!allowMultiplePerPrompt ? (
                                            <Select
                                                value={getMatchingPromptCorrectMatchIds(prompt)[0] || "__empty__"}
                                                onValueChange={(value) => onUpdate({
                                                    matchingPrompts: matchingPrompts.map((candidate) => candidate.id === prompt.id ? {
                                                        ...candidate,
                                                        correctMatchId: value === "__empty__" ? "" : value,
                                                        correctMatchIds: value === "__empty__" ? [] : [value],
                                                    } : candidate),
                                                })}
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
                                        ) : (
                                            <MultipleChoiceChecklist
                                                title="Matches correctos"
                                                help="Marca todos los matches que deben estar presentes en este prompt. La corrección será por coincidencia exacta."
                                                options={matchingOptions.map((option) => ({ id: option.id, label: option.text || "Match sin texto" }))}
                                                selectedIds={getMatchingPromptCorrectMatchIds(prompt)}
                                                onChange={(nextIds) => onUpdate({
                                                    matchingPrompts: matchingPrompts.map((candidate) => candidate.id === prompt.id ? {
                                                        ...candidate,
                                                        correctMatchId: nextIds[0] ?? "",
                                                        correctMatchIds: nextIds,
                                                    } : candidate),
                                                })}
                                                emptyLabel="No hay matches configurados."
                                            />
                                        )}
                                    </div>
                                </SortableFieldRow>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </div>
        </div>
    );
}

function OrderingSequenceFields({ question, onUpdate }: StructuredQuestionFieldsProps) {
    const orderingItems = question.orderingItems ?? [createOrderingItem(""), createOrderingItem(""), createOrderingItem("")];
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        onUpdate({ orderingItems: reorderItemsById(orderingItems, String(active.id), String(over.id)) });
    };

    return (
        <div className="pl-14 rounded-xl border border-border/30 bg-surface/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Orden correcto</p>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUpdate({ orderingItems: [...orderingItems, createOrderingItem("")] })}>
                    <Plus className="size-3 mr-1" /> Añadir paso
                </Button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={orderingItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {orderingItems.map((item, index) => (
                            <SortableFieldRow key={item.id} id={item.id} handleLabel="Reordenar paso">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 shrink-0 rounded-md border border-border/30 bg-background/60 py-2 text-center text-xs font-black text-text-muted">
                                        {index + 1}
                                    </div>
                                    <Input
                                        value={item.text}
                                        onChange={(event) => onUpdate({ orderingItems: orderingItems.map((candidate) => candidate.id === item.id ? { ...candidate, text: event.target.value } : candidate) })}
                                        placeholder="Paso de la secuencia"
                                        className="bg-background/60 border-border/40 text-sm"
                                    />
                                    <Button type="button" variant="ghost" size="icon" aria-label="Eliminar paso" className="size-8 text-text-muted hover:text-red-400" onClick={() => onUpdate({ orderingItems: orderingItems.filter((candidate) => candidate.id !== item.id) })}>
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                </div>
                            </SortableFieldRow>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}

function CategorizationFields({ question, onUpdate }: StructuredQuestionFieldsProps) {
    const categories = question.categories ?? [createCategory("Categoría A"), createCategory("Categoría B")];
    const categoryItems = question.categoryItems ?? [createCategoryItem(categories[0].id), createCategoryItem(categories[1].id)];
    const allowReuse = doesCategorizationAllowReuse(question);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );
    const multiCategoryItemIds = getCategorizationItemsWithMultipleCorrectCategories({
        ...question,
        categories,
        categoryItems,
    });
    const multiCategoryItemLabels = multiCategoryItemIds.map((itemId) =>
        categoryItems.find((item) => item.id === itemId)?.text?.trim() || "Elemento sin texto",
    );

    return (
        <div className="pl-14 space-y-4">
            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-3">
                <div className="flex items-start gap-3">
                    <Checkbox
                        id={`categorization-allow-reuse-${question.id}`}
                        checked={allowReuse}
                        onCheckedChange={(checked) => onUpdate({ categorizationAllowReuse: checked === true })}
                        disabled={allowReuse && multiCategoryItemLabels.length > 0}
                    />
                    <div className="space-y-1">
                        <label htmlFor={`categorization-allow-reuse-${question.id}`} className="text-sm font-semibold text-foreground">
                            Permitir reutilizar elementos entre categorías
                        </label>
                        <p className="text-xs text-text-muted">
                            Si está activo, un mismo elemento podrá clasificarse en varias categorías distintas.
                        </p>
                    </div>
                    <FieldHelpTooltip
                        title="Reutilizar elementos"
                        description="Actívalo cuando un mismo elemento deba aparecer correctamente en más de una categoría. La corrección exige que el conjunto final sea exacto."
                    />
                </div>
                {multiCategoryItemLabels.length > 0 && (
                    <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-200">
                        {allowReuse
                            ? `No puedes desactivar la reutilización mientras haya elementos con varias categorías correctas: ${multiCategoryItemLabels.join(", ")}.`
                            : `Esta pregunta tiene elementos con varias categorías correctas: ${multiCategoryItemLabels.join(", ")}. Así no es resoluble si cada elemento solo puede pertenecer a una categoría.`}
                    </div>
                )}
            </div>

            <div className="pl-0 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <SectionTitleWithHelp
                        title="Categorías"
                        help="Son los contenedores en los que el alumno soltará los elementos. Ahora también puedes reordenarlas con drag & drop."
                    />
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUpdate({ categories: [...categories, createCategory("")] })}>
                        <Plus className="size-3 mr-1" /> Añadir
                    </Button>
                </div>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => {
                        const { active, over } = event;
                        if (!over || active.id === over.id) return;
                        onUpdate({ categories: reorderItemsById(categories, String(active.id), String(over.id)) });
                    }}
                >
                    <SortableContext items={categories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {categories.map((category) => (
                                <SortableFieldRow key={category.id} id={category.id} handleLabel="Reordenar categoría">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={category.label}
                                            onChange={(event) => onUpdate({ categories: categories.map((candidate) => candidate.id === category.id ? { ...candidate, label: event.target.value } : candidate) })}
                                            placeholder="Nombre de categoría"
                                            className="bg-background/60 border-border/40 text-sm"
                                        />
                                        <Button type="button" variant="ghost" size="icon" aria-label="Eliminar categoría" className="size-8 text-text-muted hover:text-red-400" onClick={() => onUpdate({
                                            categories: categories.filter((candidate) => candidate.id !== category.id),
                                            categoryItems: categoryItems.map((item) => ({
                                                ...item,
                                                correctCategoryId: item.correctCategoryId === category.id ? "" : item.correctCategoryId,
                                                correctCategoryIds: getCategoryItemCorrectCategoryIds(item).filter((candidate) => candidate !== category.id),
                                            })),
                                        })}>
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
                    <SectionTitleWithHelp
                        title="Elementos"
                        help="Son las fichas que el alumno arrastrará a las categorías. Puedes reordenarlas y definir una o varias categorías correctas por elemento."
                    />
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onUpdate({ categoryItems: [...categoryItems, createCategoryItem(categories[0]?.id ?? "")] })}>
                        <Plus className="size-3 mr-1" /> Añadir
                    </Button>
                </div>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => {
                        const { active, over } = event;
                        if (!over || active.id === over.id) return;
                        onUpdate({ categoryItems: reorderItemsById(categoryItems, String(active.id), String(over.id)) });
                    }}
                >
                    <SortableContext items={categoryItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {categoryItems.map((item) => (
                                <SortableFieldRow key={item.id} id={item.id} handleLabel="Reordenar elemento" className="items-start">
                                    <div className="space-y-2 rounded-lg border border-border/20 bg-background/40 p-3">
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
                                        {!allowReuse ? (
                                            <Select
                                                value={getCategoryItemCorrectCategoryIds(item)[0] || "__empty__"}
                                                onValueChange={(value) => onUpdate({
                                                    categoryItems: categoryItems.map((candidate) => candidate.id === item.id ? {
                                                        ...candidate,
                                                        correctCategoryId: value === "__empty__" ? "" : value,
                                                        correctCategoryIds: value === "__empty__" ? [] : [value],
                                                    } : candidate),
                                                })}
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
                                        ) : (
                                            <MultipleChoiceChecklist
                                                title="Categorías correctas"
                                                help="Marca todas las categorías en las que este elemento debe poder clasificarse correctamente."
                                                options={categories.map((category) => ({ id: category.id, label: category.label || "Categoría sin texto" }))}
                                                selectedIds={getCategoryItemCorrectCategoryIds(item)}
                                                onChange={(nextIds) => onUpdate({
                                                    categoryItems: categoryItems.map((candidate) => candidate.id === item.id ? {
                                                        ...candidate,
                                                        correctCategoryId: nextIds[0] ?? "",
                                                        correctCategoryIds: nextIds,
                                                    } : candidate),
                                                })}
                                                emptyLabel="No hay categorías configuradas."
                                            />
                                        )}
                                    </div>
                                </SortableFieldRow>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
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
