"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    LayoutGrid,
    List,
    Users,
    BookOpen,
    Clock,
    Plus,
    GripVertical,
    AlertTriangle,
    Globe,
    Cpu,
    Shield,
    Smartphone,
    Monitor,
    Cloud,
    Brain,
    Code,
    Network,
    Database,
    Terminal,
    MoreVertical,
    Copy,
    Trash2,
    CalendarClock,
    ChevronDown,
    Loader2
} from "lucide-react";
import {
    DndContext,
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
    KeyboardSensor,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateModuleDialog } from "@/components/dashboard/modules/create-module-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { reorderModules, updateDashboardSettings, duplicateModule } from "@/app/dashboard/actions";
import { deleteModule } from "@/app/dashboard/modules/[id]/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NextDueDisplay } from "@/components/dashboard/shared/next-due-display";
import { getModuleRoleLabel, type ModuleCollaboratorRole } from "@/lib/module-collaborator-defs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export const ICON_MAP: Record<string, any> = {
    BookOpen,
    Brain,
    Code,
    Network,
    Database,
    Terminal,
    Globe,
    Cpu,
    Shield,
    Smartphone,
    Monitor,
    Cloud,
};

type Module = {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    custom_icon_url?: string | null;
    order_index?: number | null;
    created_at: string;
    teacher_id: string;
    module_role?: ModuleCollaboratorRole;
    is_shared?: boolean;
    status?: "active" | "completed" | "draft" | null;
    progress?: number;
    next_due_step?: { title: string; due_date: string } | null;
    enrolled_students?: {
        student: {
            id: string;
            avatar_url: string | null;
        } | null;
    }[] | null;
};

export type TeacherStats = {
    totalModules: number;
    activeModules: number;
    totalStudents: number;
    pendingSubmissions: number;
    nextDueDate: string | null;
};

interface TeacherDashboardProps {
    initialModules: Module[];
    totalStudents: number;
    teacherStats?: TeacherStats;
    gridColumns?: number;
}

const STATUS_CONFIG = {
    active: {
        color: "text-accent-green",
        bg: "bg-accent-green/10",
        border: "border-accent-green/30",
        label: "ACTIVO",
        dotBg: "bg-accent-green",
        dotAnim: "animate-pulse",
    },
    draft: {
        color: "text-accent-orange",
        bg: "bg-accent-orange/10",
        border: "border-accent-orange/30",
        label: "BORRADOR",
        dotBg: "bg-accent-orange",
        dotAnim: "",
    },
    pending: { // Fallback
        color: "text-accent-orange",
        bg: "bg-accent-orange/10",
        border: "border-accent-orange/30",
        label: "BORRADOR",
        dotBg: "bg-accent-orange",
        dotAnim: "",
    },
    archived: {
        color: "text-text-muted",
        bg: "bg-surface-dark",
        border: "border-border-strong border-dashed",
        label: "ARCHIVADO",
        dotBg: "bg-text-muted",
        dotAnim: "",
    },
    completed: {
        color: "text-accent-blue",
        bg: "bg-accent-blue/10",
        border: "border-accent-blue/30",
        label: "COMPLETADO",
        dotBg: "bg-accent-blue",
        dotAnim: "",
    },
} as const;

function ModuleIcon({ module, className }: { module: Module; className?: string }) {
    const Icon = ICON_MAP[module.icon] || BookOpen;

    if (module.custom_icon_url) {
        return (
            <div className={cn(
                "size-10 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-surface border border-accent-blue/20",
                className
            )}>
                <img src={module.custom_icon_url} alt={module.name} className="size-full object-cover" />
            </div>
        );
    }

    return (
        <div className={cn(
            "size-10 rounded-lg bg-surface border border-accent-blue/20 shadow-[0_0_10px_rgba(34,211,238,0.05)] flex items-center justify-center text-accent-blue group-hover:scale-110 transition-transform shrink-0",
            className
        )}>
            <Icon className="size-5" />
        </div>
    );
}

function ModuleActions({ module }: { module: Module }) {
    if (module.module_role && module.module_role !== "creator") {
        return null;
    }

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();

    const handleDuplicate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPending(true);
        
        toast.promise(
            (async () => {
                const result = await duplicateModule(module.id);
                if (result?.error) throw new Error(result.error);
                router.refresh();
                return result;
            })(),
            {
                loading: 'Duplicando módulo...',
                success: 'Módulo duplicado correctamente',
                error: (err) => `Error al duplicar: ${err.message}`,
            }
        );
        
        setIsPending(false);
    };

    const handleDelete = async () => {
        setIsPending(true);
        const result = await deleteModule(module.id);
        setIsPending(false);

        if (result?.error) {
            toast.error(`Error al eliminar: ${result.error}`);
        } else {
            toast.success("Módulo eliminado correctamente");
            router.refresh();
        }
        setIsDeleteDialogOpen(false);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="size-8 text-text-muted hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                        disabled={isPending}
                    >
                        <MoreVertical className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-surface-dark border-border-strong">
                    <DropdownMenuItem 
                        className="focus:bg-accent-blue/10 focus:text-accent-blue cursor-pointer"
                        onClick={handleDuplicate}
                    >
                        <Copy className="mr-2 size-4" />
                        Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        className="text-red-500 focus:bg-red-500/10 focus:text-red-500 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsDeleteDialogOpen(true);
                        }}
                    >
                        <Trash2 className="mr-2 size-4" />
                        Eliminar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-surface border-border-strong">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-500">¿Eliminar módulo permanentemente?</AlertDialogTitle>
                        <AlertDialogDescription className="text-text-muted">
                            Esta acción eliminará el módulo <span className="text-foreground font-bold">"{module.name}"</span>, todas sus unidades, retos y datos de alumnos asociados. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()} className="bg-transparent border-border-strong hover:bg-surface-dark">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete();
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Eliminar Módulo
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

function SortableModuleListItem({ module }: { module: Module }) {
    const router = useRouter();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: module.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.5 : 1,
    };

    const canReorder = !module.is_shared;
    const progress = module.progress ?? 0;
    const studentsCount = module.enrolled_students?.length || 0;
    const studentAvatars = module.enrolled_students
        ?.map(e => e.student?.avatar_url)
        .filter(Boolean)
        .slice(0, 3) || [];
    const statusConfig = STATUS_CONFIG[module.status as keyof typeof STATUS_CONFIG || "draft"];

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "bg-surface-dark border border-border-subtle hover:border-accent-blue/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 group transition-all shadow-sm hover:shadow-md",
                isDragging && "scale-[1.01] shadow-xl border-accent-blue/50"
            )}
        >
            <button
                {...(canReorder ? attributes : {})}
                {...(canReorder ? listeners : {})}
                className="flex items-center justify-center size-8 rounded-lg text-text-muted hover:text-foreground hover:bg-surface transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none"
                tabIndex={-1}
                aria-label={canReorder ? "Arrastrar para reordenar" : "Módulo compartido"}
                onClick={(e) => e.stopPropagation()}
                disabled={!canReorder}
            >
                <GripVertical className="size-5" />
            </button>

            <div
                className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 flex-1 cursor-pointer"
                onClick={() => router.push(`/dashboard/modules/${module.id}`)}
            >
                <div className="flex items-center gap-4 min-w-[280px] flex-1">
                    <ModuleIcon module={module} />
                    <div className="min-w-0">
                        <h3 className="font-bold text-foreground truncate group-hover:text-accent-blue transition-colors tracking-tight">
                            {module.name}
                        </h3>
                        <p className="text-xs text-text-muted truncate">{module.description || "Sin descripción"}</p>
                    </div>
                </div>

                <div className="w-full md:w-[180px] shrink-0">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Progreso</span>
                        <span className="text-xs font-bold text-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 bg-surface [&>div]:bg-accent-blue" />
                </div>

                <div className="hidden lg:block">
                    <NextDueDisplay nextDueStep={module.next_due_step} viewMode="list" />
                </div>

                <div className="w-full md:w-[120px] shrink-0 flex items-center gap-3">
                    <div className="flex -space-x-2 shrink-0">
                        {studentAvatars.length > 0 ? (
                            studentAvatars.map((url, i) => (
                                <div key={i} className="size-7 rounded-full bg-surface-dark border-2 border-border-subtle flex items-center justify-center overflow-hidden z-10">
                                    <img src={url!} alt="Student" className="size-full object-cover" />
                                </div>
                            ))
                        ) : (
                            <div className="size-7 rounded-full bg-surface-dark border-2 border-border-subtle flex items-center justify-center z-10">
                                <Users className="size-3.5 text-text-muted opacity-50" />
                            </div>
                        )}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                        <div className="text-[10px] uppercase tracking-widest font-bold text-text-muted leading-none">Alumnos</div>
                        <div className="text-sm font-bold text-foreground leading-none truncate">{studentsCount}</div>
                    </div>
                </div>

                <div className="w-full md:w-[130px] shrink-0 flex items-center justify-end gap-4 mt-2 md:mt-0">
                    <div className="flex items-center gap-2">
                        {statusConfig && (
                            <Badge
                                variant="outline"
                                className={`${statusConfig.border} ${statusConfig.bg} ${statusConfig.color} gap-1.5 py-1 px-3`}
                            >
                                <span className={`size-1.5 rounded-full ${statusConfig.dotBg} ${statusConfig.dotAnim}`} />
                                {statusConfig.label}
                            </Badge>
                        )}
                        {module.module_role && module.module_role !== "creator" && (
                            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                                {getModuleRoleLabel(module.module_role)}
                            </Badge>
                        )}
                    </div>
                    <ModuleActions module={module} />
                </div>
            </div>
        </div>
    );
}

function SortableModuleGridItem({ module }: { module: Module }) {
    const router = useRouter();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: module.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.5 : 1,
    };

    const canReorder = !module.is_shared;
    const progress = module.progress ?? 0;
    const studentsCount = module.enrolled_students?.length || 0;
    const studentAvatars = module.enrolled_students
        ?.map(e => e.student?.avatar_url)
        .filter(Boolean)
        .slice(0, 3) || [];
    const statusConfig = STATUS_CONFIG[module.status as keyof typeof STATUS_CONFIG || "draft"];

    return (
        <div ref={setNodeRef} style={style} className={cn("h-full", isDragging && "scale-[1.01]")}>
            <Card className="bg-surface-dark border-border-subtle hover:border-accent-blue/50 hover:shadow-lg hover:shadow-accent-blue/5 transition-all group overflow-hidden cursor-pointer flex flex-col h-full rounded-2xl">
                <div className="p-6 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-5">
                        <ModuleIcon module={module} className="size-12" />
                        <div className="flex items-center gap-1">
                            {statusConfig && (
                                <Badge
                                    variant="outline"
                                    className={`${statusConfig.border} ${statusConfig.bg} ${statusConfig.color} gap-1.5 shadow-sm`}
                                >
                                    <span className={`size-1.5 rounded-full ${statusConfig.dotBg} ${statusConfig.dotAnim}`} />
                                    {statusConfig.label}
                                </Badge>
                            )}
                            {module.module_role && module.module_role !== "creator" && (
                                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
                                    {getModuleRoleLabel(module.module_role)}
                                </Badge>
                            )}
                            <ModuleActions module={module} />
                            <button
                                {...(canReorder ? attributes : {})}
                                {...(canReorder ? listeners : {})}
                                className="flex items-center justify-center size-7 rounded-lg text-text-muted hover:text-foreground hover:bg-surface transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none"
                                tabIndex={-1}
                                aria-label={canReorder ? "Arrastrar para reordenar" : "Módulo compartido"}
                                onClick={(e) => e.stopPropagation()}
                                disabled={!canReorder}
                            >
                                <GripVertical className="size-4" />
                            </button>
                        </div>
                    </div>

                    <div
                        className="flex flex-col flex-1 cursor-pointer"
                        onClick={() => router.push(`/dashboard/modules/${module.id}`)}
                    >
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-accent-blue transition-colors line-clamp-1">
                                {module.name}
                            </h3>
                            <p className="text-sm text-text-muted mt-1.5 line-clamp-2">
                                {module.description || "Sin descripción proporcionada para este módulo."}
                            </p>
                        </div>

                        <div className="mt-auto space-y-4 pt-4 border-t border-border-subtle/50">
                            <div className="flex items-end justify-between">
                                <div className="space-y-1.5">
                                    <div className="text-[10px] uppercase tracking-widest font-mono font-bold text-text-muted">
                                        Progreso Global
                                    </div>
                                    <div className="flex items-baseline gap-1 font-bold text-foreground">
                                        <span className="text-2xl leading-none">{progress}</span>
                                        <span className="text-sm text-text-muted">%</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1.5">
                                    <div className="flex -space-x-2">
                                        {studentAvatars.length > 0 ? (
                                            studentAvatars.map((url, i) => (
                                                <div key={i} className="size-6 rounded-full bg-surface-dark border-2 border-border-subtle flex items-center justify-center overflow-hidden z-20">
                                                    <img src={url!} alt="Student" className="size-full object-cover" />
                                                </div>
                                            ))
                                        ) : (
                                            <div className="size-6 rounded-full bg-surface-dark border-2 border-border-subtle flex items-center justify-center z-10">
                                                <Users className="size-3 text-text-muted opacity-50" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-text-muted tracking-wider uppercase">
                                        {studentsCount} {studentsCount === 1 ? "Alumno" : "Alumnos"}
                                    </span>
                                </div>
                            </div>

                            <Progress value={progress} className="h-1.5 bg-surface [&>div]:bg-accent-blue" />

                            <div className="mt-4">
                                <NextDueDisplay nextDueStep={module.next_due_step} viewMode="grid" />
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

export function TeacherDashboard({ initialModules, totalStudents, teacherStats, gridColumns: initialGridColumns }: TeacherDashboardProps) {
    const [viewMode, setViewMode] = useState<"grid" | "list" | null>(null);
    const [gridCols, setGridCols] = useState(initialGridColumns || 3);
    const [modules, setModules] = useState<Module[]>([]);
    const [, startTransition] = useTransition();

    // Sync state with props when they change (e.g. after revalidatePath)
    useEffect(() => {
        setModules(
            [...initialModules].sort((a, b) => {
                if (!!a.is_shared !== !!b.is_shared) {
                    return a.is_shared ? 1 : -1;
                }

                return (a.order_index ?? 0) - (b.order_index ?? 0);
            })
        );
    }, [initialModules]);

    useEffect(() => {
        const saved = (localStorage.getItem("aula-it:dashboard:view-mode") as "grid" | "list") || "grid";
        setViewMode(saved);
    }, []);

    useEffect(() => {
        if (viewMode) {
            localStorage.setItem("aula-it:dashboard:view-mode", viewMode);
        }
    }, [viewMode]);

    const handleGridColsChange = async (cols: string) => {
        const val = parseInt(cols);
        setGridCols(val);
        const result = await updateDashboardSettings(val);
        if (result?.error) {
            toast.error("Error al guardar la configuración de columnas");
        }
    };

    const [statsOpen, setStatsOpen] = useState(() => {
        if (typeof window === "undefined") return true;
        const saved = localStorage.getItem("aula-it:teacher-dashboard:stats-open");
        return saved === null ? true : saved === "true";
    });

    useEffect(() => {
        localStorage.setItem("aula-it:teacher-dashboard:stats-open", String(statsOpen));
    }, [statsOpen]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    );

    if (viewMode === null) {
        return (
            <div className="animate-in fade-in duration-500">
                <TeacherDashboardSkeleton />
            </div>
        );
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const activeModule = modules.find(m => m.id === active.id);
        const overModule = modules.find(m => m.id === over.id);
        if (activeModule?.is_shared || overModule?.is_shared) return;

        const oldIndex = modules.findIndex(m => m.id === active.id);
        const newIndex = modules.findIndex(m => m.id === over.id);
        const reordered = arrayMove(modules, oldIndex, newIndex);

        const snapshot = modules;
        setModules(reordered);

        startTransition(async () => {
            const result = await reorderModules(
                reordered.map((m, index) => ({ id: m.id, order_index: index }))
            );
            if (result?.error) {
                toast.error("Error al reordenar los módulos");
                setModules(snapshot);
            }
        });
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "Sin fechas";
        return new Date(dateStr).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const activeCount =
        teacherStats?.activeModules ??
        modules.filter(m => m.status === "active" || !m.status).length;
    const pendingSubmissions = teacherStats?.pendingSubmissions ?? 0;

    const gridColsClass = {
        2: "md:grid-cols-2 lg:grid-cols-2",
        3: "md:grid-cols-2 lg:grid-cols-3",
        4: "md:grid-cols-3 lg:grid-cols-4",
        5: "md:grid-cols-4 lg:grid-cols-5",
    }[gridCols as 2 | 3 | 4 | 5] || "md:grid-cols-2 lg:grid-cols-3";

    return (
        <div className="flex flex-col gap-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Módulos</h2>
                    <p className="text-sm font-medium text-text-muted">Supervisión general de tus cursos y contenidos.</p>
                </div>
                <div className="flex items-center gap-3">
                    {viewMode === "grid" && (
                        <div className="flex items-center gap-2 mr-2">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest hidden lg:inline">Columnas:</span>
                            <Select value={gridCols.toString()} onValueChange={handleGridColsChange}>
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
                    <div className="flex items-center bg-surface border border-border-subtle rounded-lg p-1">
                        <Button
                            variant={viewMode === "grid" ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => setViewMode("grid")}
                            className={`size-8 rounded-md ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-text-muted"}`}
                        >
                            <LayoutGrid className="size-4" />
                        </Button>
                        <Button
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            size="icon"
                            onClick={() => setViewMode("list")}
                            className={`size-8 rounded-md ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-text-muted"}`}
                        >
                            <List className="size-4" />
                        </Button>
                    </div>
                    <CreateModuleDialog />
                </div>
            </div>

            <div className="bg-surface-dark border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setStatsOpen(prev => !prev)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface/50 transition-colors"
                >
                    <span className="text-sm font-bold uppercase tracking-widest text-text-muted">
                        Estadísticas
                    </span>
                    <ChevronDown
                        className={cn(
                            "size-4 text-text-muted transition-transform duration-300",
                            statsOpen && "rotate-180"
                        )}
                    />
                </button>

                {statsOpen && (
                    <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 border-t border-border-subtle/50">
                        <div className="flex items-center gap-4 pt-6">
                            <div className="size-10 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue shrink-0">
                                <BookOpen className="size-5" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Total Módulos</p>
                                <h3 className="text-2xl font-bold text-foreground font-mono">{teacherStats?.totalModules ?? modules.length}</h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 pt-6">
                            <div className="size-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                                <Clock className="size-5" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Módulos Activos</p>
                                <h3 className="text-2xl font-bold text-foreground font-mono">{activeCount}</h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 pt-6">
                            <div className="size-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                                <Users className="size-5" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Total Alumnos</p>
                                <h3 className="text-2xl font-bold text-foreground font-mono">{teacherStats?.totalStudents ?? 0}</h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 pt-6">
                            <div className={cn("size-10 rounded-lg flex items-center justify-center shrink-0", pendingSubmissions > 0 ? "bg-amber-500/10 text-amber-400" : "bg-surface text-text-muted")}>
                                <AlertTriangle className="size-5" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Entregas Pendientes</p>
                                <h3 className={cn("text-2xl font-bold font-mono", pendingSubmissions > 0 ? "text-amber-400" : "text-foreground")}>{pendingSubmissions}</h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 pt-6">
                            <div className="size-10 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue shrink-0">
                                <CalendarClock className="size-5" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Próxima Entrega</p>
                                <h3 className="text-sm font-bold text-foreground font-mono leading-tight">{formatDate(teacherStats?.nextDueDate ?? null)}</h3>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {modules.length === 0 ? (
                <Card className="bg-surface-dark border-border-subtle border-dashed p-12 text-center flex flex-col items-center gap-4">
                    <div className="size-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
                        <BookOpen className="size-6 text-accent-blue" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold">No hay módulos registrados</h3>
                        <p className="text-xs text-text-muted">Aún no has creado ningún módulo. ¡Comienza ahora!</p>
                    </div>
                    <CreateModuleDialog />
                </Card>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={modules.map(m => m.id)} strategy={viewMode === "list" ? verticalListSortingStrategy : rectSortingStrategy}>
                        {viewMode === "list" ? (
                            <div className="flex flex-col gap-4">
                                {modules.map((module) => (
                                    <SortableModuleListItem key={module.id} module={module} />
                                ))}
                                <CreateModuleDialog>
                                    <button className="bg-transparent border-2 border-dashed border-border-subtle hover:border-accent-blue/50 rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all group hover:bg-accent-blue/5">
                                        <div className="size-10 rounded-lg bg-surface border border-border-subtle group-hover:border-accent-blue/30 group-hover:bg-accent-blue/10 flex items-center justify-center transition-all shrink-0">
                                            <Plus className="size-4 text-text-muted group-hover:text-accent-blue transition-colors" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-foreground group-hover:text-accent-blue transition-colors">Nuevo Módulo</p>
                                            <p className="text-xs text-text-muted">Crear módulo formativo</p>
                                        </div>
                                    </button>
                                </CreateModuleDialog>
                            </div>
                        ) : (
                            <div className={cn("grid gap-6", gridColsClass)}>
                                {modules.map((module) => (
                                    <SortableModuleGridItem key={module.id} module={module} />
                                ))}
                                <CreateModuleDialog>
                                    <button className="bg-transparent border-2 border-dashed border-border-subtle hover:border-accent-blue/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group min-h-[180px] hover:bg-accent-blue/5">
                                        <div className="size-12 rounded-full bg-surface border border-border-subtle group-hover:border-accent-blue/30 group-hover:bg-accent-blue/10 flex items-center justify-center transition-all">
                                            <Plus className="size-5 text-text-muted group-hover:text-accent-blue transition-colors" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-foreground group-hover:text-accent-blue transition-colors">Nuevo Módulo</p>
                                            <p className="text-xs text-text-muted mt-0.5">Crear módulo formativo</p>
                                        </div>
                                    </button>
                                </CreateModuleDialog>
                            </div>
                        )}
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}

function TeacherDashboardSkeleton() {
    let initialView: "grid" | "list" = "grid";
    if (typeof window !== "undefined") {
        initialView = (localStorage.getItem("aula-it:dashboard:view-mode") as "grid" | "list") || "grid";
    }

    return (
        <div className="flex flex-col gap-10">
            <div className="bg-surface-dark border border-border-subtle rounded-2xl h-24" />
            
            {initialView === "list" ? (
                <div className="flex flex-col gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-surface-dark border border-border-subtle rounded-xl p-4 flex items-center gap-6">
                            <Skeleton className="size-10 rounded-lg bg-surface" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/4 bg-surface" />
                                <Skeleton className="h-3 w-1/2 bg-surface" />
                            </div>
                            <Skeleton className="h-8 w-24 rounded-lg bg-surface" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i} className="bg-surface-dark border-border-subtle h-64">
                            <CardContent className="p-6 space-y-4">
                                <Skeleton className="size-12 rounded-xl bg-surface" />
                                <Skeleton className="h-6 w-3/4 bg-surface" />
                                <Skeleton className="h-4 w-full bg-surface" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
