"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
    Lock, 
    Terminal, 
    GripVertical,
    MoreVertical,
    Copy,
    Trash2,
    AlertCircle,
    BookOpen
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NextDueDisplay } from "./next-due-display";
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
import { duplicateUnit, deleteUnit } from "@/app/dashboard/units/[id]/actions";
import { toast } from "sonner";

type Unit = {
    id: string;
    module_id: string;
    name: string;
    description: string | null;
    order_index: number;
    created_at: string;
    status?: string | null;
    next_due_step?: {
        title: string;
        due_date: string;
    } | null;
    activities?: any[];
};

interface SortableUnitItemProps {
    unit: Unit;
    userRole: "teacher" | "student";
}

const UNIT_STATUS_CONFIG = {
    published: {
        color: "text-accent-green",
        bg: "bg-accent-green/10",
        border: "border-accent-green/30",
        label: "PUBLICADO",
        dotBg: "bg-accent-green",
    },
    blocked: {
        color: "text-accent-red",
        bg: "bg-accent-red/10",
        border: "border-accent-red/30",
        label: "BLOQUEADO",
        dotBg: "bg-accent-red",
    },
    draft: {
        color: "text-accent-orange",
        bg: "bg-accent-orange/10",
        border: "border-accent-orange/30",
        label: "BORRADOR",
        dotBg: "bg-accent-orange",
    },
} as const;

function getNormalizedStatus(status: string | null | undefined) {
    const rawStatus = status?.toLowerCase() || 'draft';
    if (rawStatus === 'active' || rawStatus === 'activo') return 'published';
    if (rawStatus === 'bloqueado') return 'blocked';
    if (rawStatus === 'borrador') return 'draft';
    return rawStatus as keyof typeof UNIT_STATUS_CONFIG;
}

function calculateProgress(unit: Unit) {
    const unitActivities = unit.activities || [];
    const totalActivities = unitActivities.length;
    const completedActivities = unitActivities.filter(a => {
        const total = (a as any).total_steps || 0;
        const completed = (a as any).completed_steps || 0;
        return total > 0 && completed === total;
    }).length;

    return totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;
}

function UnitActions({ unit }: { unit: Unit }) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();

    const handleDuplicate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPending(true);
        
        toast.promise(
            (async () => {
                const result = await duplicateUnit(unit.module_id, unit.id);
                if (result?.error) throw new Error(result.error);
                router.refresh();
                return result;
            })(),
            {
                loading: 'Duplicando unidad...',
                success: 'Unidad duplicada correctamente',
                error: (err) => `Error al duplicar: ${err.message}`,
            }
        );
        
        setIsPending(false);
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPending(true);
        const result = await deleteUnit(unit.id);
        setIsPending(false);

        if (result?.error) {
            toast.error(`Error al eliminar: ${result.error}`);
        } else {
            toast.success("Unidad eliminada correctamente");
            router.refresh();
        }
        setIsDeleteDialogOpen(false);
    };

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-text-muted hover:text-foreground"
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
                        onClick={() => setIsDeleteDialogOpen(true)}
                    >
                        <Trash2 className="mr-2 size-4" />
                        Eliminar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-surface border-border-strong">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-500">¿Eliminar unidad permanentemente?</AlertDialogTitle>
                        <AlertDialogDescription className="text-text-muted">
                            Esta acción eliminará la unidad <span className="text-foreground font-bold">"{unit.name}"</span> y todos sus retos, hitos y datos asociados. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={(e) => e.stopPropagation()} className="bg-transparent border-border-strong hover:bg-surface-dark">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Eliminar Unidad
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export function SortableUnitListItem({ unit, userRole }: SortableUnitItemProps) {
    const router = useRouter();
    const isTeacher = userRole === "teacher";
    const normalizedStatus = getNormalizedStatus(unit.status);
    const unitStatusConfig = UNIT_STATUS_CONFIG[normalizedStatus] || UNIT_STATUS_CONFIG.draft;
    const isLocked = !isTeacher && normalizedStatus === 'blocked';
    const progress = calculateProgress(unit);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: unit.id, disabled: !isTeacher });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.5 : 1,
    };

    const content = (
        <>
            {isTeacher && (
                <button
                    {...attributes}
                    {...listeners}
                    className="flex items-center justify-center size-8 rounded-lg text-text-muted hover:text-foreground hover:bg-surface transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none"
                    tabIndex={-1}
                    aria-label="Arrastrar para reordenar"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className="size-5" />
                </button>
            )}

            <div 
                className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 flex-1 min-w-0"
                onClick={() => !isLocked && router.push(`/dashboard/units/${unit.id}`)}
            >
                {/* Col 1: Order + Name */}
                <div className="flex items-center gap-4 w-full md:w-[280px] shrink-0">
                    <div className={cn(
                        "size-10 rounded-lg bg-surface border shadow-[0_0_10px_rgba(34,211,238,0.05)] flex items-center justify-center shrink-0 transition-colors",
                        isLocked ? "border-border-subtle" : "border-accent-blue/20"
                    )}>
                        {isLocked ? (
                            <Lock className="size-4 text-text-muted" />
                        ) : (
                            <span className="text-sm font-bold text-accent-blue font-mono">{unit.order_index + 1}</span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-foreground truncate group-hover:text-accent-blue transition-colors tracking-tight">
                            {unit.name}
                        </h3>
                        <p className="text-xs text-text-muted truncate">
                            {unit.description || "Sin descripción"}
                        </p>
                    </div>
                </div>

                {/* Col 2: Next Delivery */}
                <div className="hidden lg:block">
                    <NextDueDisplay nextDueStep={unit.next_due_step} viewMode="list" />
                </div>

                {/* Col 3: Progress */}
                <div className="w-full md:w-[180px] shrink-0">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Progreso</span>
                        <span className="text-xs font-bold text-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 bg-surface [&>div]:bg-accent-blue" />
                </div>

                {/* Col 4: Status Badge */}
                <div className="w-full md:w-[130px] shrink-0 flex items-center justify-end gap-4 mt-2 md:mt-0">
                    <Badge variant="outline" className={`${unitStatusConfig.border} ${unitStatusConfig.bg} ${unitStatusConfig.color} gap-1.5 py-1 px-3 shadow-sm`}>
                        <span className={`size-1.5 rounded-full ${unitStatusConfig.dotBg}`} />
                        {unitStatusConfig.label}
                    </Badge>
                    {isTeacher && <UnitActions unit={unit} />}
                </div>
            </div>
        </>
    );

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "bg-surface-dark border border-border-subtle rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 group transition-all shadow-sm",
                !isLocked && "hover:border-accent-blue/50 hover:shadow-md cursor-pointer",
                isLocked && "opacity-50 grayscale saturate-50 cursor-not-allowed",
                isDragging && "scale-[1.01] shadow-xl border-accent-blue/50"
            )}
        >
            {content}
        </div>
    );
}

export function SortableUnitGridItem({ unit, userRole }: SortableUnitItemProps) {
    const router = useRouter();
    const isTeacher = userRole === "teacher";
    const normalizedStatus = getNormalizedStatus(unit.status);
    const unitStatusConfig = UNIT_STATUS_CONFIG[normalizedStatus] || UNIT_STATUS_CONFIG.draft;
    const isLocked = !isTeacher && normalizedStatus === 'blocked';
    const progress = calculateProgress(unit);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: unit.id, disabled: !isTeacher });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={cn("h-full", isDragging && "scale-[1.01]")}>
            <Card
                className={cn(
                    "bg-surface-dark border-border-subtle transition-all group overflow-hidden flex flex-col h-full rounded-2xl relative",
                    !isLocked && "hover:border-accent-blue/50 hover:shadow-lg hover:shadow-accent-blue/5 cursor-pointer",
                    isLocked && "opacity-50 grayscale saturate-50 cursor-not-allowed"
                )}
                onClick={() => !isLocked && router.push(`/dashboard/units/${unit.id}`)}
            >
                <div className="p-6 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                        <div className={cn(
                            "size-12 rounded-xl bg-surface border shadow-[0_0_15px_rgba(34,211,238,0.1)] flex items-center justify-center shrink-0 transition-all",
                            isLocked ? "border-border-subtle" : "border-accent-blue/20 group-hover:scale-110 group-hover:bg-accent-blue/10"
                        )}>
                            {isLocked ? (
                                <Lock className="size-5 text-text-muted" />
                            ) : (
                                <span className="text-lg font-bold text-accent-blue font-mono">{unit.order_index + 1}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unitStatusConfig && (
                                <Badge variant="outline" className={`${unitStatusConfig.border} ${unitStatusConfig.bg} ${unitStatusConfig.color} gap-1.5 shadow-sm`}>
                                    <span className={`size-1.5 rounded-full ${unitStatusConfig.dotBg}`} />
                                    {unitStatusConfig.label}
                                </Badge>
                            )}
                            {isTeacher && (
                                <>
                                    <UnitActions unit={unit} />
                                    <button
                                        {...attributes}
                                        {...listeners}
                                        className="flex items-center justify-center size-7 rounded-lg text-text-muted hover:text-foreground hover:bg-surface transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none"
                                        tabIndex={-1}
                                        aria-label="Arrastrar para reordenar"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <GripVertical className="size-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-accent-blue transition-colors line-clamp-1">
                            {unit.name}
                        </h3>
                        <p className="text-sm text-text-muted mt-1.5 line-clamp-2">
                            {unit.description || "Sin descripción proporcionada para esta unidad."}
                        </p>
                    </div>

                    {/* Footer Area */}
                    <div className="mt-auto space-y-4 pt-4 border-t border-border-subtle/50 relative">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-text-muted">Progreso</span>
                            <div className="flex items-baseline gap-1 font-bold text-foreground">
                                <span className="text-xl leading-none">{progress}</span>
                                <span className="text-sm text-text-muted">%</span>
                            </div>
                        </div>

                        <Progress value={progress} className="h-1.5 bg-surface [&>div]:bg-accent-blue" />

                        <div className="mt-4">
                            <NextDueDisplay nextDueStep={unit.next_due_step} viewMode="grid" />
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
