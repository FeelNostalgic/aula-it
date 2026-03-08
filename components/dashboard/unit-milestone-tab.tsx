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
import { ClassMilestoneWidget } from "@/components/dashboard/class-milestone-widget";
import { createUnitMilestone, updateUnitMilestone, deleteUnitMilestone, reorderUnitMilestones } from "@/app/dashboard/units/[id]/actions";
import { cn } from "@/lib/utils";

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
    onSuccess,
}: {
    unitId: string;
    initialData?: Partial<MilestoneFormData>;
    milestoneId?: string;
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
                toast.success(milestoneId ? "Hito actualizado correctamente" : "Hito creado correctamente");
                onSuccess?.();
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-bold text-text-muted uppercase tracking-wider">Título</Label>
                <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Ej: Exploradores de Node.js"
                    className="bg-surface-dark border-border-strong text-foreground focus-visible:ring-accent-blue"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-bold text-text-muted uppercase tracking-wider">Descripción</Label>
                <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe el objetivo..."
                    className="bg-surface-dark border-border-strong text-foreground focus-visible:ring-accent-blue min-h-[80px]"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="target_points" className="text-xs font-bold text-text-muted uppercase tracking-wider">XP Objetivo</Label>
                    <Input
                        id="target_points"
                        type="number"
                        min={1}
                        value={form.target_points}
                        onChange={(e) => setForm(f => ({ ...f, target_points: Number(e.target.value) }))}
                        className="bg-surface-dark border-border-strong text-foreground focus-visible:ring-accent-blue"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status" className="text-xs font-bold text-text-muted uppercase tracking-wider">Estado inicial</Label>
                    <Select
                        value={form.status}
                        onValueChange={(v) => setForm(f => ({ ...f, status: v as MilestoneStatus }))}
                    >
                        <SelectTrigger className="bg-surface-dark border-border-strong text-foreground focus:ring-accent-blue">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-dark border-border-strong text-foreground">
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
                <Label htmlFor="reward" className="text-xs font-bold text-text-muted uppercase tracking-wider">Recompensa</Label>
                <Input
                    id="reward"
                    value={form.reward}
                    onChange={(e) => setForm(f => ({ ...f, reward: e.target.value }))}
                    placeholder="Ej: +0.5 en el examen final"
                    className="bg-surface-dark border-border-strong text-foreground focus-visible:ring-accent-blue"
                />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-accent-blue hover:bg-accent-blue/90 text-surface-dark font-black uppercase tracking-widest px-8 rounded-xl h-11"
                >
                    {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {milestoneId ? "Actualizar" : "Crear Hito"}
                </Button>
            </div>
        </form>
    );
}


export function UnitMilestoneTab({ unitId, initialMilestones, isTeacher }: UnitMilestoneTabProps) {
    const [milestones, setMilestones] = useState<ClassMilestone[]>(initialMilestones);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState<ClassMilestone | null>(null);
    const [isPending, startTransition] = useTransition();

    // Sync milestones when prop changes
    useEffect(() => {
        setMilestones(initialMilestones);
    }, [initialMilestones]);

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
                toast.success("Hito eliminado");
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
            transition,
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
                                        <AlertDialogTitle>¿Eliminar hito?</AlertDialogTitle>
                                        <AlertDialogDescription className="text-text-muted">
                                            Esta acción eliminará el hito "{milestone.title}" permanentemente.
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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Main Column: Active & Drafts */}
            <div className="lg:col-span-8 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Target className="size-5 text-accent-blue" />
                            Planificación de Hitos
                        </h2>
                        <p className="text-sm text-text-muted mt-1">
                            Gestiona la secuencia de objetivos cooperativos para los alumnos.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-surface-dark border border-border-strong rounded-lg p-0.5">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode("grid")}
                                className={cn("size-8 p-0 rounded-md", viewMode === "grid" ? "bg-surface text-accent-blue" : "text-text-muted")}
                            >
                                <LayoutGrid className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewMode("list")}
                                className={cn("size-8 p-0 rounded-md", viewMode === "list" ? "bg-surface text-accent-blue" : "text-text-muted")}
                            >
                                <List className="size-4" />
                            </Button>
                        </div>
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            className="bg-accent-blue hover:bg-accent-blue/90 text-surface-dark font-black uppercase tracking-widest text-[10px] px-4 rounded-xl h-9 gap-2 shadow-lg shadow-accent-blue/20"
                        >
                            <Plus className="size-4" strokeWidth={3} />
                            Añadir Hito
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
                            Crea el primer hito de la unidad para motivar a tus alumnos a colaborar.
                        </p>
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            className="bg-accent-blue hover:bg-accent-blue/90 text-surface-dark font-black uppercase tracking-widest text-xs px-8 rounded-xl h-12"
                        >
                            Crear mi primer hito
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
                                viewMode === "grid" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                            )}>
                                {sortedActiveAndDrafts.map(m => (
                                    <SortableMilestoneCard key={m.id} milestone={m} />
                                ))}
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
                            <p className="text-xs font-bold uppercase tracking-widest font-mono">No hay hitos completados aún</p>
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
                <DialogContent className="bg-surface border-border-strong sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Plus className="size-5 text-accent-blue" />
                            Nuevo Hito Secuencial
                        </DialogTitle>
                        <DialogDescription className="text-text-muted">
                            Añade un nuevo objetivo. Los hitos se activan automáticamente en orden de XP.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="pt-4">
                        <MilestoneForm unitId={unitId} onSuccess={() => setIsCreateOpen(false)} />
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editingMilestone} onOpenChange={(open) => !open && setEditingMilestone(null)}>
                <DialogContent className="bg-surface border-border-strong sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Edit className="size-5 text-accent-blue" />
                            Editar Hito
                        </DialogTitle>
                    </DialogHeader>
                    {editingMilestone && (
                        <div className="pt-4">
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
                                onSuccess={() => setEditingMilestone(null)}
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
