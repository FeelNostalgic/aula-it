"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    GripVertical,
    MoreVertical,
    PenTool,
    Code,
    FileText,
    CheckSquare,
    Gamepad2,
    HelpCircle,
    Trophy,
    Loader2
} from "lucide-react";
import { reorderMultipleActivities } from "@/app/dashboard/units/[id]/actions";
import { CreateActivityDialog } from "./create-activity-dialog";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// DnD Kit Imports
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
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Activity = {
    id: string;
    unit_id: string;
    title: string;
    description: string | null;
    type: string;
    xp: number;
    order_index: number;
    status?: string | null;
};

interface UnitActivitiesTabProps {
    unitId: string;
    initialActivities: Activity[];
}

// Icon mapping function based on type
const getActivityIcon = (type: string) => {
    switch (type) {
        case 'theory': return <FileText className="size-5 text-accent-blue" />;
        case 'quiz': return <CheckSquare className="size-5 text-accent-orange" />;
        case 'code': return <Code className="size-5 text-accent-green" />;
        case 'project': return <PenTool className="size-5 text-purple-400" />;
        case 'game': return <Gamepad2 className="size-5 text-pink-400" />;
        default: return <HelpCircle className="size-5 text-text-muted" />;
    }
};

// Sortable Item Component
function SortableActivityItem({ activity }: { activity: Activity }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: activity.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group flex items-center gap-4 bg-surface-dark border border-border-strong rounded-xl p-4 hover:border-accent-blue/30 transition-colors ${isDragging ? 'opacity-50 ring-2 ring-accent-blue/20 cursor-grabbing' : ''}`}
        >
            {/* Drag handle */}
            <div
                {...attributes}
                {...listeners}
                className="text-text-muted opacity-30 hover:opacity-100 cursor-grab active:cursor-grabbing p-1 -ml-1 transition-opacity"
            >
                <GripVertical className="size-5" />
            </div>

            {/* Icon */}
            <div className="bg-surface p-3 rounded-xl border border-border-subtle shrink-0">
                {getActivityIcon(activity.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground truncate">{activity.title}</h4>
                {activity.description && (
                    <p className="text-sm text-text-muted truncate mt-0.5">
                        {activity.description}
                    </p>
                )}
            </div>

            {/* XP Badge */}
            <div className="hidden sm:flex items-center gap-1.5 bg-accent-orange/10 text-accent-orange px-3 py-1 rounded-full font-bold text-sm shrink-0 border border-accent-orange/20">
                <span>{activity.xp}</span>
                <span className="text-[10px] uppercase tracking-wider">XP</span>
            </div>

            {/* Actions Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-foreground">
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Opciones de actividad</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-surface-dark border-border-strong text-foreground w-48">
                    <DropdownMenuItem className="focus:bg-surface focus:text-foreground cursor-pointer">
                        Editar Reto
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer">
                        Eliminar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export function UnitActivitiesTab({ unitId, initialActivities }: UnitActivitiesTabProps) {
    const [activities, setActivities] = useState<Activity[]>(
        [...initialActivities].sort((a, b) => a.order_index - b.order_index)
    );
    const [isReordering, setIsReordering] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Avoid accidental drags when clicking
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        setActivities([...initialActivities].sort((a, b) => a.order_index - b.order_index));
    }, [initialActivities]);

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = activities.findIndex((item) => item.id === active.id);
            const newIndex = activities.findIndex((item) => item.id === over.id);

            const reorderedList = arrayMove(activities, oldIndex, newIndex);

            // Re-map order_indices locally
            const activitiesWithNewOrder = reorderedList.map((activity, idx) => ({
                ...activity,
                order_index: idx
            }));

            setActivities(activitiesWithNewOrder);
            setIsReordering(true);

            // Persist to database
            const updates = activitiesWithNewOrder.map(a => ({ id: a.id, order_index: a.order_index }));

            toast.promise(reorderMultipleActivities(unitId, updates), {
                loading: 'Guardando orden...',
                success: (result) => {
                    if (result?.error) throw new Error(result.error);
                    return 'Orden actualizado correctamente';
                },
                error: (err) => {
                    // Revert to initial on error
                    setActivities([...initialActivities].sort((a, b) => a.order_index - b.order_index));
                    return `Error al reordenar: ${err.message}`;
                },
            });

            setIsReordering(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Retos de la Unidad</h2>
                        <p className="text-sm text-text-muted mt-1">
                            Crea y organiza las actividades que los alumnos deberán completar.
                        </p>
                    </div>
                    {isReordering && (
                        <div className="bg-surface px-3 py-1 rounded-full border border-border-subtle flex items-center gap-2 animate-in fade-in slide-in-from-left-2 transition-all">
                            <Loader2 className="size-3 animate-spin text-accent-blue" />
                            <span className="text-[10px] font-mono font-bold tracking-widest text-text-muted uppercase">Guardando...</span>
                        </div>
                    )}
                </div>

                <CreateActivityDialog unitId={unitId} />
            </div>

            {activities.length === 0 ? (
                <div className="bg-surface-dark border border-dashed border-border-strong rounded-2xl flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="bg-surface size-16 rounded-full flex items-center justify-center mb-4">
                        <Trophy className="size-8 text-text-muted opacity-50" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Aún no hay retos creados</h3>
                    <p className="text-text-muted text-sm max-w-sm mb-6">
                        Comienza a construir el recorrido de aprendizaje añadiendo el primer reto para esta unidad.
                    </p>
                    <CreateActivityDialog unitId={unitId} />
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={activities.map(a => a.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-3">
                            {activities.map((activity) => (
                                <SortableActivityItem
                                    key={activity.id}
                                    activity={activity}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}

