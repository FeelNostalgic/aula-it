"use client";

import { ActivityStepWithClientState } from "@/types/activity";
import { cn } from "@/lib/utils";
import { X, GripVertical, FileText, PlaySquare, PenTool, CheckSquare } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ActivityStepType } from "@/types/activity";

interface EditorTabsBarProps {
    openedStepsIds: string[];
    onOpenedStepsChange: (newOrder: string[]) => void;
    activeStepId: string | null;
    onSelectStep: (id: string) => void;
    onCloseStep: (id: string) => void;
    allSteps: ActivityStepWithClientState[];
}

const getStepIcon = (type?: ActivityStepType) => {
    switch (type) {
        case 'theory': return <FileText className="size-3.5 text-accent-blue" />;
        case 'deliverable': return <PenTool className="size-3.5 text-purple-400" />;
        case 'animation': return <PlaySquare className="size-3.5 text-pink-400" />;
        case 'quiz': return <CheckSquare className="size-3.5 text-accent-orange" />;
        default: return <FileText className="size-3.5 text-text-muted" />;
    }
};

function SortableTab({
    id,
    step,
    isActive,
    onSelect,
    onClose
}: {
    id: string;
    step?: ActivityStepWithClientState;
    isActive: boolean;
    onSelect: () => void;
    onClose: (e: React.MouseEvent) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    if (!step) return null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onSelect}
            className={cn(
                "group flex items-center h-full min-w-32 max-w-48 px-3 border-r border-border/50 text-xs cursor-pointer select-none transition-colors",
                isActive
                    ? "bg-background border-t-2 border-t-accent-blue text-foreground"
                    : "bg-surface-dark border-t-2 border-t-transparent text-text-muted hover:bg-surface hover:text-foreground",
                isDragging && "opacity-50 ring-2 ring-accent-blue/20"
            )}
        >
            <div
                {...attributes}
                {...listeners}
                className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-text-muted hover:text-foreground mr-1"
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical className="size-3" />
            </div>

            <div className="mr-2 shrink-0">{getStepIcon(step.type)}</div>

            <span className="truncate flex-1 font-medium">{step.title}</span>

            <button
                onClick={onClose}
                className="ml-2 size-5 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 hover:bg-border/50 text-text-muted hover:text-foreground transition-all shrink-0"
            >
                <X className="size-3" />
            </button>
        </div>
    );
}

export function EditorTabsBar({
    openedStepsIds,
    onOpenedStepsChange,
    activeStepId,
    onSelectStep,
    onCloseStep,
    allSteps
}: EditorTabsBarProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = openedStepsIds.indexOf(active.id as string);
            const newIndex = openedStepsIds.indexOf(over.id as string);
            onOpenedStepsChange(arrayMove(openedStepsIds, oldIndex, newIndex));
        }
    };

    if (openedStepsIds.length === 0) {
        return <div className="h-10 bg-surface-dark border-b border-border/50 flex items-center px-4 text-xs text-text-muted">Ningún paso abierto</div>;
    }

    return (
        <div className="h-10 bg-surface-dark border-b border-border/50 flex">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={openedStepsIds} strategy={horizontalListSortingStrategy}>
                    {openedStepsIds.map((id) => (
                        <SortableTab
                            key={id}
                            id={id}
                            step={allSteps.find(s => s.id === id)}
                            isActive={activeStepId === id}
                            onSelect={() => onSelectStep(id)}
                            onClose={(e) => {
                                e.stopPropagation();
                                onCloseStep(id);
                            }}
                        />
                    ))}
                </SortableContext>
            </DndContext>
        </div>
    );
}
