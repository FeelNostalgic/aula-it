"use client";

import { useState, useTransition, useEffect } from "react";
import {
    Target,
    Gift,
    Edit,
    Trash2,
    CheckCircle2,
    Clock,
    Archive,
    DraftingCompass,
    Plus,
    Loader2,
    LayoutGrid,
    List,
    MoreVertical,
    Trophy,
    GripVertical
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ClassMilestone, MilestoneStatus } from "@/types/database";
import { ClassMilestoneWidget } from "@/components/dashboard/shared/class-milestone-widget";
import { createUnitMilestone, updateUnitMilestone, deleteUnitMilestone, reorderUnitMilestones } from "@/app/dashboard/units/[id]/actions";
import { cn } from "@/lib/utils";
import {
    CREATE_DIALOG_BODY_CLASS,
    CREATE_DIALOG_CONTENT_CLASS,
    CREATE_DIALOG_FOOTER_CLASS,
    CREATE_DIALOG_HEADER_CLASS,
    CREATE_DIALOG_INPUT_CLASS,
    CREATE_DIALOG_LABEL_CLASS,
    CREATE_DIALOG_PRIMARY_ACTION_CLASS,
    CREATE_DIALOG_SELECT_CONTENT_CLASS,
    CREATE_DIALOG_SELECT_TRIGGER_CLASS,
    CREATE_DIALOG_TEXTAREA_CLASS,
} from "@/components/dashboard/shared/create-dialog-styles";

interface UnitMilestoneTabProps {
    unitId: string;
    initialMilestones: ClassMilestone[];
    isTeacher: boolean;
}

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
    draft: {
        label: "Borrador",
        icon: <DraftingCompass className="size-3.5" />,
        color: "text-text-muted",
        bg: "bg-surface border-border-subtle",
    },
    active: {
        label: "Activo",
        icon: <Clock className="size-3.5 animate-pulse" />,
        color: "text-accent-blue",
        bg: "bg-accent-blue/5 border-accent-blue/20",
    },
    completed: {
        label: "Completado",
        icon: <CheckCircle2 className="size-3.5" />,
        color: "text-accent-green",
        bg: "bg-accent-green/5 border-accent-green/20",
    },
    archived: {
        label: "Archivado",
        icon: <Archive className="size-3.5" />,
        color: "text-text-muted/50",
        bg: "bg-surface/50 border-border-subtle/50",
    },
};

type MilestoneFormData = {
    title: string;
    description: string;
    target_points: number;
    reward: string;
    status: MilestoneStatus;
};

function MilestoneForm({
    unitId,
    initialData,
    milestoneId,
    onCancel,
    onSuccess,
}: {
    unitId: string;
    initialData?: Partial<MilestoneFormData>;
    milestoneId?: string;
    onCancel?: () => void;
    onSuccess?: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [form, setForm] = useState<MilestoneFormData>({
        title: initialData?.title ?? "",
        description: initialData?.description ?? "",
        target_points: initialData?.target_points ?? 1000,
        reward: initialData?.reward ?? "",
        status: initialData?.status ?? "draft",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.title.trim()) {
            toast.error("El título es obligatorio");
            return;
        }
        if (!form.reward.trim()) {
            toast.error("La recompensa es obligatoria");
            return;
        }
        if (form.target_points <= 0) {
            toast.error("El objetivo de XP debe ser mayor a 0");
            return;
        }

        startTransition(async () => {
            let result;
            if (milestoneId) {
                result = await updateUnitMilestone(milestoneId, unitId, form);
            } else {
                result = await createUnitMilestone(unitId, form);
            }

            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success(milestoneId ? "Objetivo actualizado correctamente" : "Objetivo creado correctamente");
                onSuccess?.();
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="contents">
            <div className={`${CREATE_DIALOG_BODY_CLASS} space-y-5`}>
            <div className="space-y-2">
                <Label htmlFor="title" className={CREATE_DIALOG_LABEL_CLASS}>Título</Label>
                <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Ej: Exploradores de Node.js"
                    className={`${CREATE_DIALOG_INPUT_CLASS} h-11`}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description" className={CREATE_DIALOG_LABEL_CLASS}>Descripción</Label>
                <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe el objetivo..."
                    className={`${CREATE_DIALOG_TEXTAREA_CLASS} min-h-[96px] resize-none`}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="target_points" className={CREATE_DIALOG_LABEL_CLASS}>XP Objetivo</Label>
                    <Input
                        id="target_points"
                        type="number"
                        min={1}
                        value={form.target_points}
                        onChange={(e) => setForm(f => ({ ...f, target_points: Number(e.target.value) }))}
                        className={`${CREATE_DIALOG_INPUT_CLASS} h-11`}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status" className={CREATE_DIALOG_LABEL_CLASS}>Estado inicial</Label>
                    <Select
                        value={form.status}
                        onValueChange={(v) => setForm(f => ({ ...f, status: v as MilestoneStatus }))}
                    >
                        <SelectTrigger className={`${CREATE_DIALOG_SELECT_TRIGGER_CLASS} h-11`}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={CREATE_DIALOG_SELECT_CONTENT_CLASS}>
                            <SelectItem value="draft">
                                <div className="flex items-center gap-2">
                                    <DraftingCompass className="size-3.5 text-text-muted" />
                                    <span>Borrador</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="active">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="size-3.5 text-accent-green" />
                                    <span>Activo</span>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="reward" className={CREATE_DIALOG_LABEL_CLASS}>Recompensa</Label>
                <Input
                    id="reward"
                    value={form.reward}
                    onChange={(e) => setForm(f => ({ ...f, reward: e.target.value }))}
                    placeholder="Ej: +0.5 en el examen final"
                    className={`${CREATE_DIALOG_INPUT_CLASS} h-11`}
                />
            </div>
            </div>
            <DialogFooter className={CREATE_DIALOG_FOOTER_CLASS}>
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={isPending}
                    className={CREATE_DIALOG_PRIMARY_ACTION_CLASS}
                >
                    {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {milestoneId ? "ACTUALIZAR" : "CREAR OBJETIVO"}
                </Button>
            </DialogFooter>
        </form>
    );
}


export function UnitMilestoneTab({ unitId, initialMilestones, isTeacher }: UnitMilestoneTabProps) {
    const [milestones, setMilestones] = useState<ClassMilestone[]>(initialMilestones);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [gridCols, setGridCols] = useState(2);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState<ClassMilestone | null>(null);
    const [isPending, startTransition] = useTransition();

    // Sync milestones when prop changes
    useEffect(() => {
        setMilestones(initialMilestones);
    }, [initialMilestones]);

    useEffect(() => {
        const savedCols = localStorage.getItem("aula-it:milestones:grid-cols");
        if (!savedCols) return;
        const parsed = Number(savedCols);
        if ([2, 3, 4].includes(parsed)) {
            setGridCols(parsed);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("aula-it:milestones:grid-cols", String(gridCols));
    }, [gridCols]);

    const activeAndDrafts = milestones.filter(m => m.status === 'active' || m.status === 'draft');
    const completedAndArchived = milestones.filter(m => m.status === 'completed' || m.status === 'archived');

    const handleStatusChange = (milestoneId: string, newStatus: MilestoneStatus) => {
        startTransition(async () => {
            const result = await updateUnitMilestone(milestoneId, unitId, { status: newStatus });
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success(`Estado actualizado`);
            }
        });
    };

    const handleDelete = (milestoneId: string) => {
        startTransition(async () => {
            const result = await deleteUnitMilestone(milestoneId, unitId);
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success("Objetivo eliminado");
            }
        });
    };

    const SortableMilestoneCard = ({ milestone }: { milestone: ClassMilestone }) => {
        const {
            attributes,
            listeners,
            setNodeRef,
            transform,
            transition,
            isDragging
        } = useSortable({ id: milestone.id });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition: isDragging ? 'none' : transition,
            zIndex: isDragging ? 50 : undefined,
            opacity: isDragging ? 0.5 : 1,
        };

        const config = STATUS_CONFIG[milestone.status];
        const isActive = milestone.status === 'active';

        return (
            <div
                ref={setNodeRef}
                style={style}
                className={cn(
                    "group relative flex flex-col p-5 rounded-2xl border transition-all duration-300",
                    config.bg,
                    isActive ? "shadow-lg shadow-accent-blue/10 ring-1 ring-accent-blue/20" : "hover:border-border-strong",
                    isDragging && "scale-[1.02] shadow-2xl border-accent-blue/50"
                )}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div {...attributes} {...listeners} className="p-1 hover:bg-surface-dark rounded cursor-grab active:cursor-grabbing text-text-muted/30 hover:text-text-muted transition-colors">
                            <GripVertical className="size-4" />
                        </div>
                        <Badge
                            variant="outline"
                            className={cn(
                                "font-bold text-[10px] uppercase tracking-tighter gap-1.5 px-2 py-0.5",
                                isActive ? "text-accent-green bg-accent-green/10 border-accent-green/20" : config.color,
                                !isActive && "border-current/20"
                            )}
                        >
                            {isActive ? <CheckCircle2 className="size-3.5" /> : config.icon}
                            {isActive ? "Activo" : config.label}
                        </Badge>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 text-text-muted hover:text-foreground">
                                <MoreVertical className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-surface border-border-strong text-foreground w-40">
                            <DropdownMenuItem onClick={() => setEditingMilestone(milestone)} className="gap-2 cursor-pointer">
                                <Edit className="size-3.5" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleStatusChange(milestone.id, milestone.status === 'active' ? 'draft' : 'active')}
                                className="gap-2 cursor-pointer"
                            >
                                {milestone.status === 'active' ? <DraftingCompass className="size-3.5" /> : <Clock className="size-3.5" />}
                                {milestone.status === 'active' ? 'Pasar a Borrador' : 'Activar'}
                            </DropdownMenuItem>
                            <div className="h-px bg-border-subtle my-1" />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2 text-accent-red cursor-pointer">
                                        <Trash2 className="size-3.5" /> Eliminar
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-surface-dark border-border-strong">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar objetivo?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-text-muted">
                                            Esta acción eliminará el objetivo "{milestone.title}" permanentemente.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="border-border-strong">Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => handleDelete(milestone.id)}
                                            className="bg-accent-red hover:bg-accent-red/90 text-white"
                                        >
                                            Eliminar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="space-y-1 mb-4 flex-1">
                    <h3 className="font-bold text-foreground leading-tight group-hover:text-accent-blue transition-colors">
                        {milestone.title}
                    </h3>
                    <p className="text-xs text-text-muted line-clamp-2 italic">
                        {milestone.description || "Sin descripción"}
                    </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-border-subtle/50">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-text-muted">OBJETIVO</span>
                        <span className="text-foreground font-bold">{milestone.target_points.toLocaleString()} XP</span>
                    </div>
                    {/* Redundant progress bar removed as requested */}
                    <div className="flex items-center gap-2 text-[11px]">
                        <Trophy className="size-3 text-amber-500 shrink-0" />
                        <span className="text-foreground font-medium truncate">{milestone.reward}</span>
                    </div>
                </div>
            </div>
        );
    };

    if (!isTeacher) return null;

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = milestones.findIndex(m => m.id === active.id);
            const newIndex = milestones.findIndex(m => m.id === over.id);

            const newMilestones = arrayMove(milestones, oldIndex, newIndex);

            // Optimistic update
            setMilestones(newMilestones);

            startTransition(async () => {
                const result = await reorderUnitMilestones(unitId, newMilestones.map(m => m.id));
                if (result?.error) {
                    toast.error(result.error);
                    // Rollback
                    setMilestones(milestones);
                } else {
                    toast.success("Orden actualizado");
                }
            });
        }
    };

    const sortedActiveAndDrafts = [...activeAndDrafts].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const gridColsClass =
        {
            2: "md:grid-cols-2 lg:grid-cols-2",
            3: "md:grid-cols-2 lg:grid-cols-3",
            4: "md:grid-cols-3 lg:grid-cols-4",
        }[gridCols as 2 | 3 | 4] || "md:grid-cols-2 lg:grid-cols-2";
    const createMilestoneTrigger = (
        <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className={cn(
                "bg-transparent border-2 border-dashed border-border-subtle hover:border-accent-blue/50 cursor-pointer transition-all group hover:bg-accent-blue/5",
                viewMode === "grid"
                    ? "rounded-2xl p-5 h-full w-full flex flex-col items-center justify-center gap-3 text-center"
                    : "rounded-xl p-4 w-full flex items-center gap-4 text-left"
            )}
        >
            <div
                className={cn(
                    "bg-surface border border-border-subtle group-hover:border-accent-blue/30 group-hover:bg-accent-blue/10 flex items-center justify-center transition-all shrink-0",
                    viewMode === "grid" ? "size-12 rounded-full" : "size-10 rounded-lg"
                )}
            >
                <Plus
                    className={cn(
                        "text-text-muted group-hover:text-accent-blue transition-colors",
                        viewMode === "grid" ? "size-5" : "size-4"
                    )}
                />
            </div>
            <div className={viewMode === "grid" ? "text-center" : "text-left"}>
                <p className="text-sm font-bold text-foreground group-hover:text-accent-blue transition-colors">
                    Nuevo objetivo
                </p>
                <p className="text-xs text-text-muted">
                    Definir un nuevo hito de progreso
                </p>
            </div>
        </button>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Main Column: Active & Drafts */}
            <div className="lg:col-span-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Target className="size-5 text-accent-blue" />
                            Planificación de objetivos
                        </h2>
                        <p className="text-sm text-text-muted mt-1">
                            Gestiona la secuencia de objetivos cooperativos para los alumnos.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {viewMode === "grid" && (
                            <div className="flex items-center gap-2 mr-2">
                                <div className="flex items-center bg-muted/30 dark:bg-surface-dark/50 p-1 rounded-xl border border-border/50">
                                    {([2, 3, 4] as const).map((count) => (
                                        <Button
                                            key={count}
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setGridCols(count)}
                                            className={cn(
                                                "h-8 w-8 p-0 rounded-lg transition-all text-xs font-bold",
                                                gridCols === count ? "bg-background text-foreground shadow-sm" : "text-text-muted hover:text-foreground"
                                            )}
                                        >
                                            {count}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-2 p-1 bg-slate-900/[0.09] dark:bg-surface border border-border-subtle rounded-xl shadow-sm self-end md:self-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                viewMode === 'grid' ? "bg-accent-blue/15 text-accent-blue shadow-sm dark:bg-background dark:text-foreground" : "text-text-muted hover:text-foreground"
                            )}
                        >
                            <LayoutGrid className="size-3.5 mr-2" />
                            Grid
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                viewMode === 'list' ? "bg-accent-blue/15 text-accent-blue shadow-sm dark:bg-background dark:text-foreground" : "text-text-muted hover:text-foreground"
                            )}
                        >
                            <List className="size-3.5 mr-2" />
                            Lista
                        </Button>
                    </div>
                    <Button
                            onClick={() => setIsCreateOpen(true)}
                            className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-9 px-4 uppercase"
                        >
                            <Plus className="mr-2 size-4" />
                            NUEVO OBJETIVO
                        </Button>
                    </div>
                </div>

                {activeAndDrafts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-surface-dark/50 border-2 border-dashed border-border-strong rounded-3xl text-center px-6">
                        <div className="size-16 rounded-full bg-surface border border-border-strong flex items-center justify-center mb-6">
                            <Target className="size-8 text-text-muted/20" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">Empieza la aventura</h3>
                        <p className="max-w-xs text-text-muted text-sm mb-8 italic">
                            Crea el primer objetivo de la unidad para motivar a tus alumnos a colaborar.
                        </p>
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            className="bg-accent-blue hover:bg-accent-blue/90 text-primary-foreground font-mono font-bold tracking-widest text-[10px] h-11 px-8 uppercase"
                        >
                            CREAR MI PRIMER OBJETIVO
                        </Button>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sortedActiveAndDrafts.map(m => m.id)}
                            strategy={viewMode === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
                        >
                            <div className={cn(
                                "grid gap-4 transition-all duration-500",
                                viewMode === "grid" ? `grid-cols-1 ${gridColsClass}` : "grid-cols-1"
                            )}>
                                {sortedActiveAndDrafts.map(m => (
                                    <SortableMilestoneCard key={m.id} milestone={m} />
                                ))}
                                <div className={viewMode === "grid" ? "h-full" : undefined}>{createMilestoneTrigger}</div>
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Side Column: History */}
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-surface-dark border border-border-strong rounded-3xl p-6 h-full flex flex-col">
                    <h3 className="font-bold text-foreground flex items-center gap-2 mb-6">
                        <Archive className="size-4 text-accent-green" />
                        Historial Completados
                    </h3>

                    {completedAndArchived.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-30 text-center grayscale">
                            <Trophy className="size-10 mb-4" />
                            <p className="text-xs font-bold uppercase tracking-widest font-mono">No hay objetivos completados aún</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {completedAndArchived.map(m => (
                                <div key={m.id} className="relative pl-6 pb-6 border-l border-border-subtle last:pb-0">
                                    <div className="absolute left-[-5px] top-0 size-2.5 rounded-full bg-accent-green border-2 border-surface-dark" />
                                    <div className="bg-surface/30 rounded-xl p-4 border border-border-subtle/30">
                                        <div className="flex justify-between items-start mb-1 gap-2">
                                            <h4 className="text-xs font-bold text-foreground leading-tight">{m.title}</h4>
                                            <Badge variant="outline" className="text-[9px] h-4 px-1 text-accent-green border-accent-green/20 font-mono">
                                                {m.target_points} XP
                                            </Badge>
                                        </div>
                                        <p className="text-[10px] text-text-muted mb-2 line-clamp-1 italic">
                                            Recompensa: {m.reward}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="size-3 text-accent-green" />
                                            <span className="text-[9px] font-mono text-text-muted/60">
                                                Completado el {new Date(m.updated_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className={`sm:max-w-[450px] ${CREATE_DIALOG_CONTENT_CLASS}`}
                    onInteractOutside={(e) => { e.preventDefault(); }}
                    onPointerDownOutside={(e) => { e.preventDefault(); }}
                    onEscapeKeyDown={(e) => { e.preventDefault(); }}>
                    <DialogHeader className={CREATE_DIALOG_HEADER_CLASS}>
                        <DialogTitle>Nuevo objetivo</DialogTitle>
                        <DialogDescription>
                            Añade un nuevo objetivo. Los objetivos se activan automáticamente en orden.
                        </DialogDescription>
                    </DialogHeader>
                    <MilestoneForm
                        unitId={unitId}
                        onCancel={() => setIsCreateOpen(false)}
                        onSuccess={() => setIsCreateOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingMilestone} onOpenChange={(open) => !open && setEditingMilestone(null)}>
                <DialogContent className={`sm:max-w-[450px] ${CREATE_DIALOG_CONTENT_CLASS}`}>
                    <DialogHeader className={CREATE_DIALOG_HEADER_CLASS}>
                        <DialogTitle>Editar objetivo</DialogTitle>
                    </DialogHeader>
                    {editingMilestone && (
                        <MilestoneForm
                            unitId={unitId}
                            milestoneId={editingMilestone.id}
                            initialData={{
                                title: editingMilestone.title,
                                description: editingMilestone.description ?? "",
                                target_points: editingMilestone.target_points,
                                reward: editingMilestone.reward,
                                status: editingMilestone.status,
                            }}
                            onCancel={() => setEditingMilestone(null)}
                            onSuccess={() => setEditingMilestone(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
