"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import {
    LayoutGrid,
    List,
    Plus,
    Clock,
    Zap,
    BarChart3,
    ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
    difficulty?: string | null;
    duration?: string | null;
    logo_url?: string | null;
    phasesCount?: number;
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
function SortableActivityItem({ activity, viewMode }: { activity: Activity, viewMode: 'grid' | 'list' }) {
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

    const router = useRouter();

    if (viewMode === 'grid') {
        return (
            <div
                ref={setNodeRef}
                style={style}
                onClick={() => router.push(`/activities/${activity.id}/edit`)}
                className={cn(
                    "group relative bg-surface-dark border border-border-strong rounded-2xl p-5 hover:border-accent-blue/40 hover:bg-surface/50 transition-all duration-300 cursor-pointer flex flex-col h-full",
                    isDragging && "opacity-50 ring-2 ring-accent-blue/20 cursor-grabbing shadow-2xl scale-105"
                )}
            >
                {/* Status Badge */}
                <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className={cn(
                        "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border",
                        activity.status === 'published' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-accent-orange/10 text-accent-orange border-accent-orange/20"
                    )}>
                        {activity.status === 'published' ? 'Publicado' : 'Borrador'}
                    </Badge>
                    <div
                        {...attributes}
                        {...listeners}
                        className="text-text-muted opacity-30 hover:opacity-100 cursor-grab active:cursor-grabbing p-1 -mt-1 transition-opacity"
                    >
                        <GripVertical className="size-4" />
                    </div>
                </div>

                {/* Logo / Icon */}
                <div className="mb-4">
                    {activity.logo_url ? (
                        <div className="size-12 rounded-xl border border-border-subtle bg-surface overflow-hidden">
                            <img src={activity.logo_url} alt={activity.title} className="size-full object-cover" />
                        </div>
                    ) : (
                        <div className="size-12 rounded-xl border border-border-subtle bg-surface flex items-center justify-center">
                            {getActivityIcon(activity.type)}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1">
                    <h4 className="font-bold text-lg text-foreground mb-2 group-hover:text-accent-blue transition-colors line-clamp-1">{activity.title}</h4>
                    <p className="text-sm text-text-muted line-clamp-2 leading-relaxed">
                        {activity.description || "Sin descripción para este reto."}
                    </p>
                </div>

                {/* Footer Info */}
                <div className="mt-6 pt-4 border-t border-border-subtle flex flex-wrap gap-y-3 justify-between items-center text-[11px] font-bold text-text-muted uppercase tracking-wider">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <Zap className="size-3 text-accent-orange" />
                            <span>{activity.xp} XP</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <BarChart3 className="size-3 text-accent-blue" />
                            <span>{activity.phasesCount || 0} Pasos</span>
                        </div>
                    </div>
                </div>

                {/* Hover Action */}
                <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-1 group-hover:translate-x-0">
                    <div className="bg-accent-blue/10 p-2 rounded-full border border-accent-blue/20">
                        <ArrowRight className="size-4 text-accent-blue" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => router.push(`/activities/${activity.id}/edit`)}
            className={cn(
                "group flex items-center gap-4 bg-surface-dark border border-border-strong rounded-xl p-4 hover:border-accent-blue/30 hover:bg-surface/50 transition-all cursor-pointer",
                isDragging && "opacity-50 ring-2 ring-accent-blue/20 cursor-grabbing shadow-lg"
            )}
        >
            {/* Drag handle */}
            <div
                {...attributes}
                {...listeners}
                className="text-text-muted opacity-30 hover:opacity-100 cursor-grab active:cursor-grabbing p-1 -ml-1 transition-opacity"
            >
                <GripVertical className="size-5" />
            </div>

            {/* Icon/Logo */}
            <div className="shrink-0">
                {activity.logo_url ? (
                    <div className="size-12 rounded-xl border border-border-subtle bg-surface overflow-hidden">
                        <img src={activity.logo_url} alt={activity.title} className="size-full object-cover" />
                    </div>
                ) : (
                    <div className="bg-surface p-3 rounded-xl border border-border-subtle">
                        {getActivityIcon(activity.type)}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-bold text-foreground truncate group-hover:text-accent-blue transition-colors">{activity.title}</h4>
                    <span className={cn(
                        "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border leading-none",
                        activity.status === 'published' ? "text-green-400 border-green-500/20 bg-green-500/5" : "text-accent-orange border-accent-orange/20 bg-accent-orange/5"
                    )}>
                        {activity.status === 'published' ? 'Publicado' : 'Borrador'}
                    </span>
                </div>
                <p className="text-xs text-text-muted truncate max-w-xl">
                    {activity.description || "Explora este reto y completa tus objetivos."}
                </p>
            </div>

            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 mr-4">
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-text-muted uppercase tracking-tighter mb-0.5">Exp</span>
                    <div className="flex items-center gap-1 text-accent-orange font-bold text-sm">
                        <Zap className="size-3" />
                        <span>{activity.xp}</span>
                    </div>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] text-text-muted uppercase tracking-tighter mb-0.5">Pasos</span>
                    <div className="flex items-center gap-1 text-accent-blue font-bold text-sm">
                        <BarChart3 className="size-3" />
                        <span>{activity.phasesCount || 0}</span>
                    </div>
                </div>
            </div>

            {/* Actions Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-foreground relative z-10" onClick={(e) => e.stopPropagation()}>
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Opciones de actividad</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-surface-dark border-border-strong text-foreground w-48">
                    <DropdownMenuItem className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer" onClick={(e) => e.stopPropagation()}>
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
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
        <div className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Retos de la Unidad</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-text-muted">
                                {activities.length} {activities.length === 1 ? 'Actividad' : 'Actividades'} configuradas
                            </p>
                            {isReordering && (
                                <div className="bg-surface px-2 py-0.5 rounded-full border border-border-subtle flex items-center gap-1.5 animate-in fade-in transition-all">
                                    <Loader2 className="size-2.5 animate-spin text-accent-blue" />
                                    <span className="text-[9px] font-mono font-bold tracking-widest text-text-muted uppercase">Guardando...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-surface border border-border-subtle rounded-lg p-1">
                        <Button
                            variant={viewMode === "grid" ? "secondary" : "ghost"}
                            size="icon"
                            className={cn("h-8 w-8", viewMode === 'grid' ? "bg-background shadow-sm text-foreground" : "text-text-muted")}
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="size-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            size="icon"
                            className={cn("h-8 w-8", viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-text-muted")}
                            onClick={() => setViewMode('list')}
                        >
                            <List className="size-4" />
                        </Button>
                    </div>
                    <CreateActivityDialog unitId={unitId} />
                </div>
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
                        <div className={cn(
                            viewMode === 'grid'
                                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                : "space-y-3"
                        )}>
                            {activities.map((activity) => (
                                <SortableActivityItem
                                    key={activity.id}
                                    activity={activity}
                                    viewMode={viewMode}
                                />
                            ))}

                            {/* Empty Card for creating new activity */}
                            <CreateActivityDialog
                                unitId={unitId}
                                trigger={
                                    <button className={cn(
                                        "bg-transparent border-2 border-dashed border-border-subtle hover:border-accent-blue/50 cursor-pointer transition-all group hover:bg-accent-blue/5 flex",
                                        viewMode === 'grid'
                                            ? "flex-col items-center justify-center gap-3 p-6 rounded-2xl min-h-[180px] h-full"
                                            : "items-center gap-4 p-4 rounded-xl w-full"
                                    )}>
                                        <div className={cn(
                                            "bg-surface border border-border-subtle group-hover:border-accent-blue/30 group-hover:bg-accent-blue/10 flex items-center justify-center transition-all shrink-0",
                                            viewMode === 'grid' ? "size-12 rounded-full" : "size-10 rounded-lg"
                                        )}>
                                            <Plus className={cn(
                                                "text-text-muted group-hover:text-accent-blue transition-colors",
                                                viewMode === 'grid' ? "size-5" : "size-4"
                                            )} />
                                        </div>
                                        <div className={viewMode === 'grid' ? "text-center" : "text-left"}>
                                            <p className="text-sm font-bold text-foreground group-hover:text-accent-blue transition-colors">
                                                Nuevo Reto
                                            </p>
                                            <p className={cn(
                                                "text-xs text-text-muted",
                                                viewMode === 'grid' && "mt-0.5"
                                            )}>
                                                Añade contenido didáctico
                                            </p>
                                        </div>
                                    </button>
                                }
                            />
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}

