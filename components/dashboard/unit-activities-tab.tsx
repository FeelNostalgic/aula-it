"use client";

import { useState, useEffect, useTransition } from "react";
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
    Loader2,
    Trash2,
    AlertCircle,
    LayoutGrid,
    List,
    Plus,
    Clock,
    Zap,
    BarChart3,
    Copy,
    Play,
    Lock,
    EyeOff
} from "lucide-react";
import { reorderMultipleActivities, deleteActivity, duplicateActivity, updateActivityStatus } from "@/app/dashboard/units/[id]/actions";
import { CreateActivityDialog } from "./create-activity-dialog";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BadgeDisplay } from "./badge-display";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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
    rectSortingStrategy,
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
    status: 'published' | 'active' | 'blocked' | 'draft';
    difficulty?: string | null;
    duration?: number | null;
    logo_url?: string | null;
    phasesCount?: number;
    total_steps?: number;
    completed_steps?: number;
    position_x?: number;
    position_y?: number;
};

interface UnitActivitiesTabProps {
    unitId: string;
    initialActivities: Activity[];
    isTeacher?: boolean;
    submissions: any[];
    studentBadges?: any[];
    gridCols?: number;
    setGridCols?: (cols: number) => void;
    viewModeExternal?: 'grid' | 'list' | null;
    setViewModeExternal?: (mode: 'grid' | 'list') => void;
}

import { getDurationConfig } from "@/lib/activity-config";

// Difficulty color helper
const getDifficultyConfig = (difficulty?: string | null) => {
    const val = difficulty?.toLowerCase();
    switch (val) {
        case 'baño': // Fallback for typo "bajo" if any
        case 'fácil':
        case 'bajo':
        case 'easy':
            return { color: "text-accent-green", bg: "bg-accent-green/10", border: "border-accent-green/20", label: "Fácil" };
        case 'medio':
        case 'media':
        case 'medium':
        case 'normal':
            return { color: "text-accent-amber", bg: "bg-accent-amber/10", border: "border-accent-amber/20", label: "Medio" };
        case 'difícil':
        case 'hard':
            return { color: "text-accent-orange", bg: "bg-accent-orange/10", border: "border-accent-orange/20", label: "Difícil" };
        case 'experto':
        case 'expert':
        case 'alto':
            return { color: "text-red-700", bg: "bg-red-950/30", border: "border-red-900/40", label: "Experto" };
        default:
            return { color: "text-text-muted", bg: "bg-surface", border: "border-border-subtle", label: difficulty || "N/A" };
    }
};

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
function SortableActivityItem({
    activity,
    viewMode,
    unitId,
    onDelete,
    isTeacher,
    studentBadges = [],
    submission
}: {
    activity: Activity,
    viewMode: 'grid' | 'list',
    unitId: string,
    onDelete: (id: string) => void,
    isTeacher?: boolean,
    studentBadges?: any[],
    submission?: any
}) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);

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
        // 'none' overrides transition-all from the CSS class so the dragged
        // item follows the cursor instantly instead of animating each step.
        // Non-dragging items still use the dnd-kit transition to slide into place.
        transition: isDragging ? 'none' : transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.5 : 1,
    };

    const router = useRouter();
    const diffConfig = getDifficultyConfig(activity.difficulty);
    const durationConfig = getDurationConfig(activity.duration);

    const handleDelete = async () => {
        setIsPending(true);
        try {
            await toast.promise(
                (async () => {
                    const result = await deleteActivity(unitId, activity.id);
                    if (result && 'error' in result && result.error) {
                        throw new Error(result.error);
                    }
                    onDelete(activity.id);
                    return result;
                })(),
                {
                    loading: 'Eliminando reto...',
                    success: 'Reto eliminado correctamente',
                    error: (err) => `Error al eliminar: ${err.message}`,
                }
            );
        } catch (err) {
            console.error("Delete error:", err);
        } finally {
            setIsPending(false);
            setIsDeleteDialogOpen(false);
        }
    };

    const handleDuplicate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPending(true);
        
        toast.promise(
            (async () => {
                const result = await duplicateActivity(unitId, activity.id);
                if (result?.error) throw new Error(result.error);
                router.refresh();
                return result;
            })(),
            {
                loading: 'Duplicando reto...',
                success: 'Reto duplicado correctamente',
                error: (err) => `Error al duplicar: ${err.message}`,
            }
        );
        
        setIsPending(false);
    };

    const ActionsMenu = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 text-text-muted hover:text-foreground relative z-10" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-surface-dark border-border-strong text-foreground w-48">
                <DropdownMenuItem
                    className="focus:bg-accent-blue/10 focus:text-accent-blue cursor-pointer"
                    onClick={handleDuplicate}
                >
                    <Copy className="size-4 mr-2" />
                    Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border-subtle" />
                <DropdownMenuItem
                    className="gap-2 cursor-pointer focus:bg-green-500/10 focus:text-green-400"
                    onClick={async (e) => { e.stopPropagation(); const res = await updateActivityStatus(activity.id, 'published'); if (res.error) toast.error("Error al cambiar estado"); else { toast.success("Actividad publicada"); router.refresh(); } }}
                >
                    <Play className="size-4 text-green-400" />
                    <span className="text-xs font-bold uppercase tracking-tight text-green-400">Publicar</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="gap-2 cursor-pointer focus:bg-zinc-700/50 focus:text-zinc-300"
                    onClick={async (e) => { e.stopPropagation(); const res = await updateActivityStatus(activity.id, 'blocked'); if (res.error) toast.error("Error al cambiar estado"); else { toast.success("Actividad bloqueada"); router.refresh(); } }}
                >
                    <Lock className="size-4 text-zinc-400" />
                    <span className="text-xs font-bold uppercase tracking-tight text-zinc-400">Bloquear</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="gap-2 cursor-pointer focus:bg-accent-orange/10 focus:text-accent-orange"
                    onClick={async (e) => { e.stopPropagation(); const res = await updateActivityStatus(activity.id, 'draft'); if (res.error) toast.error("Error al cambiar estado"); else { toast.success("Cambiada a borrador"); router.refresh(); } }}
                >
                    <EyeOff className="size-4 text-accent-orange/60" />
                    <span className="text-xs font-bold uppercase tracking-tight text-accent-orange/80">Borrador</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border-subtle" />
                <DropdownMenuItem
                    className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsDeleteDialogOpen(true);
                    }}
                >
                    <Trash2 className="size-4 mr-2" />
                    Eliminar
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const DeleteConfirmation = () => (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent className="bg-surface-dark border-border-strong text-foreground">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertCircle className="size-5 text-red-400" />
                        ¿Eliminar este reto?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-text-muted">
                        Esta acción no se puede deshacer. Se eliminarán permanentemente todas las fases y configuraciones de "{activity.title}".
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="bg-surface border-border-subtle text-foreground hover:bg-surface/80">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-500 hover:bg-red-600 text-white border-none"
                        disabled={isPending}
                    >
                        {isPending ? "Eliminando..." : "Eliminar Reto"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    if (viewMode === 'grid') {
        return (
            <>
                <div
                    ref={setNodeRef}
                    style={style}
                    onClick={() => router.push(isTeacher ? `/activities/${activity.id}/edit` : `/activities/${activity.id}`)}
                    className={cn(
                        "group relative bg-surface-dark border border-border-strong rounded-2xl p-5 hover:border-accent-blue/40 hover:bg-surface/50 transition-all duration-300 cursor-pointer flex flex-col h-full",
                        isDragging && "opacity-50 ring-2 ring-accent-blue/20 cursor-grabbing shadow-2xl scale-105"
                    )}
                >
                    {/* Status and Actions */}
                    <div className="flex justify-between items-start mb-5">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn(
                                "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border",
                                (activity.status === 'published' || activity.status === 'active') ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                    activity.status === 'blocked' ? "bg-accent-red/10 text-accent-red border-accent-red/20" :
                                        "bg-accent-orange/10 text-accent-orange border-accent-orange/20"
                            )}>
                                {(activity.status === 'published' || activity.status === 'active') ? 'Publicado' : activity.status === 'blocked' ? 'Bloqueado' : 'Borrador'}
                            </Badge>
                            {!isTeacher && activity.total_steps! > 0 && activity.completed_steps === activity.total_steps && (
                                <Badge className="bg-accent-blue text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-full border-none shadow-[0_0_10px_rgba(var(--accent-blue),0.3)]">
                                    ¡Completado!
                                </Badge>
                            )}
                        </div>
                        {isTeacher && (
                            <div className="flex items-center gap-1">
                                <ActionsMenu />
                                <div
                                    {...attributes}
                                    {...listeners}
                    className="flex items-center justify-center size-8 rounded-lg text-text-muted hover:text-foreground hover:bg-surface transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <GripVertical className="size-4" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Logo and Title side by side */}
                    <div className="flex items-center gap-4 mb-4">
                        <div className="shrink-0">
                            {activity.logo_url ? (
                                <div className="size-14 rounded-xl border border-border-subtle bg-surface overflow-hidden shadow-sm">
                                    <img src={activity.logo_url} alt={activity.title} className="size-full object-cover" />
                                </div>
                            ) : (
                                <div className="size-14 rounded-xl border border-border-subtle bg-surface flex items-center justify-center shadow-sm">
                                    {getActivityIcon(activity.type)}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-lg text-foreground group-hover:text-accent-blue transition-colors line-clamp-1">{activity.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <div className={cn(
                                    "flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border",
                                    diffConfig.bg, diffConfig.color, diffConfig.border
                                )}>
                                    <Zap className="size-2.5" />
                                    {diffConfig.label}
                                </div>
                                {activity.duration && (
                                    <div className={`flex items-center gap-1 text-[10px] font-bold ${durationConfig.color}`}>
                                        <Clock className="size-2.5" />
                                        {activity.duration} min
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="flex-1">
                        <p className="text-sm text-text-muted line-clamp-3 leading-relaxed">
                            {activity.description || "Sin descripción para este reto."}
                        </p>
                    </div>

                    {/* Footer Stats & Badges */}
                    <div className="mt-6 pt-4 border-t border-border-subtle flex flex-col gap-3">
                        {/* Badges strip */}
                        {(activity as any).badges && (activity as any).badges.length > 0 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {(activity as any).badges
                                    .filter((b: any) => {
                                        if (isTeacher) return true;
                                        const isEarned = studentBadges?.some(sb => sb.badge_id === b.id);
                                        return isEarned || !b.is_hidden;
                                    })
                                    .map((badge: any) => {
                                        const earnedRecord = studentBadges?.find(sb => sb.badge_id === badge.id);
                                        return (
                                            <BadgeDisplay 
                                                key={badge.id}
                                                badge={badge}
                                                isEarned={!!earnedRecord || !!isTeacher}
                                                earnedAt={earnedRecord?.earned_at}
                                                variant="compact"
                                            />
                                        );
                                    })}
                            </div>
                        )}

                        <div className="flex justify-between items-center text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 px-2 py-1 rounded-lg border border-orange-500/20 group-hover:bg-orange-500/20 transition-colors shadow-xs">
                                    <Zap className="size-3 fill-orange-500" />
                                    <span className="text-[11px] font-black tracking-tight">{activity.xp} XP</span>
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <BarChart3 className="size-3 text-accent-blue shrink-0" />
                                    <span className="truncate">
                                        {(activity.total_steps || 0) > 0 && !isTeacher ? (
                                            <span className="text-accent-blue font-black tabular-nums">{activity.completed_steps} / {activity.total_steps}</span>
                                        ) : (
                                            <span>{activity.total_steps || activity.phasesCount || 0}</span>
                                        )}
                                        <span className="ml-1 opacity-70">Pasos</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <DeleteConfirmation />
            </>
        );
    }

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                onClick={() => router.push(isTeacher ? `/activities/${activity.id}/edit` : `/activities/${activity.id}`)}
                className={cn(
                    "group flex items-center gap-4 bg-surface-dark border border-border-strong rounded-xl p-4 hover:border-accent-blue/30 hover:bg-surface/50 transition-all cursor-pointer",
                    isDragging && "opacity-50 ring-2 ring-accent-blue/20 cursor-grabbing shadow-lg"
                )}
            >
                {/* Drag handle */}
                {isTeacher && (
                    <div
                        {...attributes}
                        {...listeners}
                    className="flex items-center justify-center size-8 rounded-lg text-text-muted hover:text-foreground hover:bg-surface transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="size-5" />
                    </div>
                )}

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
                            (activity.status === 'published' || activity.status === 'active') ? "text-green-400 border-green-500/20 bg-green-500/5" :
                                activity.status === 'blocked' ? "text-accent-red border-accent-red/20 bg-accent-red/5" :
                                    "text-accent-orange border-accent-orange/20 bg-accent-orange/5"
                        )}>
                            {(activity.status === 'published' || activity.status === 'active') ? 'Publicado' : activity.status === 'blocked' ? 'Bloqueado' : 'Borrador'}
                        </span>
                        {!isTeacher && activity.total_steps! > 0 && activity.completed_steps === activity.total_steps && (
                            <Badge className="bg-accent-blue text-white text-[9px] uppercase font-black px-2 py-0.5 rounded-full border-none shadow-[0_0_10px_rgba(var(--accent-blue),0.3)] h-fit">
                                ¡Completado!
                            </Badge>
                        )}
                        <div className={cn(
                            "flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border leading-none ml-2",
                            diffConfig.bg, diffConfig.color, diffConfig.border
                        )}>
                            {diffConfig.label}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <p className="text-xs text-text-muted truncate max-w-md">
                            {activity.description || "Explora este reto y completa tus objetivos."}
                        </p>
                        {activity.duration && (
                            <span className={`text-[10px] flex items-center gap-1 shrink-0 font-bold ${durationConfig.color}`}>
                                <Clock className="size-2.5" />
                                {activity.duration} min
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats & Badges */}
                <div className="hidden lg:flex flex-col items-end justify-center gap-2 mr-4">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-text-muted uppercase tracking-tighter mb-0.5">Exp</span>
                            <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 px-2.5 py-1.5 rounded-xl border border-orange-500/20 shadow-xs">
                                <Zap className="size-3.5 fill-orange-500" />
                                <span className="font-black text-sm tabular-nums tracking-tight">{activity.xp}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-text-muted uppercase tracking-tighter mb-0.5">Pasos</span>
                            <div className="flex items-center gap-1 text-accent-blue font-bold text-sm">
                                <BarChart3 className="size-3" />
                                {(activity.total_steps || 0) > 0 && !isTeacher ? (
                                    <span className="font-black tabular-nums">{activity.completed_steps} / {activity.total_steps}</span>
                                ) : (
                                    <span>{activity.total_steps || activity.phasesCount || 0}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Badges strip (List view) */}
                    {(activity as any).badges && (activity as any).badges.length > 0 && (
                        <div className="flex items-center justify-end gap-2 max-w-[200px] flex-wrap">
                            {(activity as any).badges
                                .filter((b: any) => {
                                    if (isTeacher) return true;
                                    const isEarned = studentBadges?.some(sb => sb.badge_id === b.id);
                                    return isEarned || !b.is_hidden;
                                })
                                .map((badge: any) => {
                                    const earnedRecord = studentBadges?.find(sb => sb.badge_id === badge.id);
                                    return (
                                        <BadgeDisplay 
                                            key={badge.id}
                                            badge={badge}
                                            isEarned={!!earnedRecord || !!isTeacher}
                                            earnedAt={earnedRecord?.earned_at}
                                            variant="compact"
                                        />
                                    );
                                })}
                        </div>
                    )}
                </div>

                {isTeacher && <ActionsMenu />}
            </div>
            <DeleteConfirmation />
        </>
    );
}

export function UnitActivitiesTab({
    unitId,
    initialActivities,
    isTeacher = false,
    submissions,
    studentBadges = [],
    gridCols = 3,
    setGridCols,
    viewModeExternal,
    setViewModeExternal
}: UnitActivitiesTabProps) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [activities, setActivities] = useState<Activity[]>(
        [...initialActivities]
            .filter(a => isTeacher || a.status !== 'draft')
            .sort((a, b) => a.order_index - b.order_index)
    );
    const [isReordering, setIsReordering] = useState(false);
    const [viewModeInternal, setViewModeInternal] = useState<'grid' | 'list'>('grid');

    const viewMode = viewModeExternal || viewModeInternal;
    const handleViewModeChange = (mode: 'grid' | 'list') => {
        if (setViewModeExternal) setViewModeExternal(mode);
        else setViewModeInternal(mode);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    );

    useEffect(() => {
        setActivities(
            [...initialActivities]
                .filter(a => isTeacher || a.status !== 'draft')
                .sort((a, b) => a.order_index - b.order_index)
        );
    }, [initialActivities, isTeacher]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = activities.findIndex((item) => item.id === active.id);
        const newIndex = activities.findIndex((item) => item.id === over.id);

        const reordered = arrayMove(activities, oldIndex, newIndex).map((a, idx) => ({
            ...a,
            order_index: idx,
        }));

        const snapshot = activities;
        setActivities(reordered);

        startTransition(async () => {
            const updates = reordered.map(a => ({ id: a.id, order_index: a.order_index }));
            const result = await reorderMultipleActivities(unitId, updates);
            if (result?.error) {
                toast.error(`Error al reordenar: ${result.error}`);
                setActivities(snapshot);
            }
        });
    };

    const gridColsClass = {
        2: "md:grid-cols-2 lg:grid-cols-2",
        3: "md:grid-cols-2 lg:grid-cols-3",
        4: "md:grid-cols-3 lg:grid-cols-4",
        5: "md:grid-cols-4 lg:grid-cols-5",
    }[gridCols as 2 | 3 | 4 | 5] || "md:grid-cols-2 lg:grid-cols-3";

    return (
        <div className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-foreground">Retos de la Unidad</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="border-border-subtle text-text-muted text-[10px] font-mono font-bold">
                            {activities.length}
                        </Badge>
                    </div>
                    {isReordering && (
                        <div className="bg-surface px-2 py-0.5 rounded-full border border-border-subtle flex items-center gap-1.5 animate-in fade-in transition-all">
                            <Loader2 className="size-2.5 animate-spin text-accent-blue" />
                            <span className="text-[9px] font-mono font-bold tracking-widest text-text-muted uppercase">Guardando...</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Grid Column Selector */}
                    {viewMode === "grid" && setGridCols && (
                        <div className="flex items-center gap-2 mr-2">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest hidden lg:inline">Columnas:</span>
                            <Select value={gridCols.toString()} onValueChange={(val) => setGridCols(parseInt(val))}>
                                <SelectTrigger className="w-[60px] h-8 bg-surface border-border-subtle focus:ring-accent-blue text-xs">
                                    <SelectValue placeholder="3" />
                                </SelectTrigger>
                                <SelectContent className="bg-surface border-border-subtle">
                                    <SelectItem value="2">2</SelectItem>
                                    <SelectItem value="3">3</SelectItem>
                                    <SelectItem value="4">4</SelectItem>
                                    <SelectItem value="5">5</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-surface border border-border-subtle rounded-lg p-1">
                        <Button
                            aria-label="Vista cuadrícula"
                            variant={viewMode === "grid" ? "secondary" : "ghost"}
                            size="icon"
                            className={cn("h-8 w-8", viewMode === 'grid' ? "bg-background shadow-sm text-foreground" : "text-text-muted")}
                            onClick={() => handleViewModeChange('grid')}
                        >
                            <LayoutGrid className="size-4" />
                        </Button>
                        <Button
                            aria-label="Vista lista"
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            size="icon"
                            className={cn("h-8 w-8", viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-text-muted")}
                            onClick={() => handleViewModeChange('list')}
                        >
                            <List className="size-4" />
                        </Button>
                    </div>

                    {isTeacher && (
                        <CreateActivityDialog unitId={unitId}>
                            <Button className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-9 px-4 uppercase">
                                <Plus className="mr-2 size-4" />
                                AÑADIR RETO
                            </Button>
                        </CreateActivityDialog>
                    )}
                </div>
            </div>

            {activities.length === 0 ? (
                <div className="bg-surface-dark border border-dashed border-border-strong rounded-2xl flex flex-col items-center justify-center py-16 px-4 text-center">
                    <div className="bg-surface size-16 rounded-full flex items-center justify-center mb-4">
                        <Trophy className="size-8 text-text-muted opacity-50" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">Aún no hay retos creados</h3>
                    <p className="text-text-muted text-sm max-w-sm mb-6">
                        {isTeacher
                            ? "Comienza a construir el recorrido de aprendizaje añadiendo el primer reto para esta unidad."
                            : "Vuelve más tarde para descubrir los retos de esta unidad."}
                    </p>
                    {isTeacher && (
                        <CreateActivityDialog unitId={unitId}>
                            <Button className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-11 px-8 uppercase">
                                <Plus className="mr-2 size-4" />
                                AÑADIR RETO
                            </Button>
                        </CreateActivityDialog>
                    )}
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={activities.map(a => a.id)}
                        strategy={viewMode === "list" ? verticalListSortingStrategy : rectSortingStrategy}
                    >
                        <div className={cn(
                            viewMode === 'grid'
                                ? cn("grid gap-6", gridColsClass)
                                : "space-y-3"
                        )}>
                            {activities.map((activity) => (
                                <SortableActivityItem
                                    key={activity.id}
                                    activity={activity}
                                    viewMode={viewMode}
                                    unitId={unitId}
                                    isTeacher={isTeacher}
                                    studentBadges={studentBadges}
                                    onDelete={(id) => setActivities(prev => prev.filter(a => a.id !== id))}
                                    submission={
                                        !isTeacher
                                            ? submissions.find(s => s.activity_steps?.activity_phases?.activity_id === activity.id)
                                            : null
                                    }
                                />
                            ))}

                            {isTeacher && (
                                <CreateActivityDialog
                                    unitId={unitId}
                                    trigger={
                                        <button className={cn(
                                            "bg-transparent border-2 border-dashed border-border-subtle hover:border-accent-blue/50 cursor-pointer transition-all group hover:bg-accent-blue/5 flex",
                                            viewMode === 'grid'
                                                ? "flex-col items-center justify-center gap-3 p-6 rounded-2xl min-h-[240px] h-full"
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
                            )}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}
