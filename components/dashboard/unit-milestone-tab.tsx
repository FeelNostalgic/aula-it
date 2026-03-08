"use client";

import { useState, useTransition } from "react";
import { Target, Gift, Edit, Trash2, CheckCircle2, Clock, Archive, DraftingCompass, Plus, Loader2 } from "lucide-react";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ClassMilestone, MilestoneStatus } from "@/types/database";
import { ClassMilestoneWidget } from "@/components/dashboard/class-milestone-widget";
import { createUnitMilestone, updateUnitMilestone, deleteUnitMilestone } from "@/app/dashboard/units/[id]/actions";

interface UnitMilestoneTabProps {
    unitId: string;
    milestone: ClassMilestone | null;
    isTeacher: boolean;
}

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; icon: React.ReactNode; color: string }> = {
    draft: {
        label: "Borrador",
        icon: <DraftingCompass className="size-4 text-text-muted" />,
        color: "text-text-muted border-border-subtle",
    },
    active: {
        label: "Activo",
        icon: <Clock className="size-4 text-accent-blue animate-pulse" />,
        color: "text-accent-blue border-accent-blue/30",
    },
    completed: {
        label: "Completado",
        icon: <CheckCircle2 className="size-4 text-accent-green" />,
        color: "text-accent-green border-accent-green/30",
    },
    archived: {
        label: "Archivado",
        icon: <Archive className="size-4 text-text-muted/50" />,
        color: "text-text-muted/50 border-border-subtle",
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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground">Título</Label>
                <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Ej: Supervivientes de Backend"
                    className="bg-surface border-border-strong text-foreground focus-visible:ring-accent-blue"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">Descripción (opcional)</Label>
                <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Explica el objetivo a los alumnos..."
                    className="bg-surface border-border-strong text-foreground focus-visible:ring-accent-blue min-h-[80px]"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="target_points" className="text-foreground">XP Objetivo</Label>
                    <Input
                        id="target_points"
                        type="number"
                        min={1}
                        value={form.target_points}
                        onChange={(e) => setForm(f => ({ ...f, target_points: Number(e.target.value) }))}
                        className="bg-surface border-border-strong text-foreground focus-visible:ring-accent-blue"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status" className="text-foreground">Estado</Label>
                    <Select
                        value={form.status}
                        onValueChange={(v) => setForm(f => ({ ...f, status: v as MilestoneStatus }))}
                    >
                        <SelectTrigger className="bg-surface border-border-strong text-foreground focus:ring-accent-blue">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-dark border-border-strong text-foreground">
                            <SelectItem value="draft">Borrador</SelectItem>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="completed">Completado</SelectItem>
                            <SelectItem value="archived">Archivado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="reward" className="text-foreground">Recompensa</Label>
                <Input
                    id="reward"
                    value={form.reward}
                    onChange={(e) => setForm(f => ({ ...f, reward: e.target.value }))}
                    placeholder="Ej: +1 pto extra examen"
                    className="bg-surface border-border-strong text-foreground focus-visible:ring-accent-blue"
                />
            </div>

            <div className="flex justify-end pt-2">
                <Button
                    type="submit"
                    disabled={isPending}
                    className="bg-accent-blue hover:bg-accent-blue/90 text-surface-dark font-semibold px-6"
                >
                    {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {milestoneId ? "Guardar Cambios" : "Crear Hito"}
                </Button>
            </div>
        </form>
    );
}

export function UnitMilestoneTab({ unitId, milestone, isTeacher }: UnitMilestoneTabProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleDelete = () => {
        if (!milestone) return;
        startTransition(async () => {
            const result = await deleteUnitMilestone(milestone.id, unitId);
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success("Hito eliminado correctamente");
            }
        });
    };

    const handleStatusChange = (newStatus: MilestoneStatus) => {
        if (!milestone) return;
        startTransition(async () => {
            const result = await updateUnitMilestone(milestone.id, unitId, { status: newStatus });
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success(`Estado actualizado a: ${STATUS_CONFIG[newStatus].label}`);
            }
        });
    };

    // --- STUDENT VIEW ---
    if (!isTeacher) {
        if (!milestone || (milestone.status !== 'active' && milestone.status !== 'completed')) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="size-14 rounded-full bg-surface border border-border-subtle flex items-center justify-center mb-4">
                        <Target className="size-7 text-text-muted/40" />
                    </div>
                    <p className="text-text-muted font-medium">No hay ningún hito activo para esta unidad.</p>
                    <p className="text-xs text-text-muted/60 mt-1">El profesor puede configurarlo en cualquier momento.</p>
                </div>
            );
        }

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ClassMilestoneWidget milestone={milestone} label="Objetivo de la Unidad" />
            </div>
        );
    }

    // --- TEACHER VIEW ---
    return (
        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-surface-dark border border-border-strong rounded-2xl p-6 md:p-8">
                <div className="mb-6 border-b border-border-subtle pb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Target className="size-5 text-accent-blue" />
                            Hito de la Unidad
                        </h2>
                        <p className="text-sm text-text-muted mt-1">
                            Define un objetivo cooperativo que los alumnos de esta unidad deben alcanzar juntos.
                        </p>
                    </div>
                </div>

                {!milestone ? (
                    /* No milestone yet — show creation form */
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-surface border border-dashed border-border-subtle rounded-xl">
                            <DraftingCompass className="size-5 text-text-muted/50 shrink-0" />
                            <p className="text-sm text-text-muted">
                                Esta unidad todavía no tiene hito configurado. Créalo aquí para que los alumnos lo vean en su vista.
                            </p>
                        </div>
                        <MilestoneForm unitId={unitId} />
                    </div>
                ) : isEditing ? (
                    /* Edit mode */
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-text-muted uppercase tracking-widest font-mono">Editando hito</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(false)}
                                className="text-text-muted hover:text-foreground"
                            >
                                Cancelar
                            </Button>
                        </div>
                        <MilestoneForm
                            unitId={unitId}
                            milestoneId={milestone.id}
                            initialData={{
                                title: milestone.title,
                                description: milestone.description ?? "",
                                target_points: milestone.target_points,
                                reward: milestone.reward,
                                status: milestone.status,
                            }}
                            onSuccess={() => setIsEditing(false)}
                        />
                    </div>
                ) : (
                    /* Read mode with actions */
                    <div className="space-y-6">
                        {/* Current milestone card */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h3 className="text-lg font-bold text-foreground">{milestone.title}</h3>
                                    <Badge
                                        variant="outline"
                                        className={`font-mono text-[10px] uppercase gap-1.5 ${STATUS_CONFIG[milestone.status].color}`}
                                    >
                                        {STATUS_CONFIG[milestone.status].icon}
                                        {STATUS_CONFIG[milestone.status].label}
                                    </Badge>
                                </div>
                                {milestone.description && (
                                    <p className="text-sm text-text-muted">{milestone.description}</p>
                                )}
                                <div className="flex items-center gap-6 pt-1 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Target className="size-4 text-accent-blue" />
                                        <span className="text-text-muted">Objetivo:</span>
                                        <span className="font-bold font-mono">{milestone.target_points.toLocaleString()} XP</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Gift className="size-4 text-amber-500" />
                                        <span className="text-text-muted">Recompensa:</span>
                                        <span className="font-bold">{milestone.reward}</span>
                                    </div>
                                </div>
                                <div className="text-xs text-text-muted/60 font-mono">
                                    Progreso actual: {milestone.current_points.toLocaleString()} / {milestone.target_points.toLocaleString()} XP
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditing(true)}
                                    className="border-border-strong text-foreground hover:border-accent-blue/50 gap-1.5"
                                >
                                    <Edit className="size-3.5" />
                                    Editar
                                </Button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={isPending}
                                            className="border-border-strong text-accent-red hover:border-accent-red/50 hover:bg-accent-red/5 gap-1.5"
                                        >
                                            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                                            Eliminar
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="bg-surface-dark border-border-strong">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Eliminar hito?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-text-muted">
                                                Esta acción no se puede deshacer. El hito y todo su progreso acumulado se eliminarán permanentemente.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="border-border-strong">Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDelete}
                                                className="bg-accent-red hover:bg-accent-red/90 text-white"
                                            >
                                                Eliminar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>

                        {/* Status transition buttons */}
                        <div className="border-t border-border-subtle pt-4 space-y-3">
                            <h4 className="text-xs font-bold font-mono text-text-muted uppercase tracking-widest">Cambiar estado</h4>
                            <div className="flex flex-wrap gap-2">
                                {milestone.status !== 'active' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isPending}
                                        onClick={() => handleStatusChange('active')}
                                        className="border-accent-blue/30 text-accent-blue hover:bg-accent-blue/10 gap-1.5"
                                    >
                                        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Clock className="size-3.5" />}
                                        Activar
                                    </Button>
                                )}
                                {milestone.status === 'active' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isPending}
                                        onClick={() => handleStatusChange('completed')}
                                        className="border-accent-green/30 text-accent-green hover:bg-accent-green/10 gap-1.5"
                                    >
                                        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                                        Marcar Completado
                                    </Button>
                                )}
                                {milestone.status !== 'archived' && milestone.status !== 'draft' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isPending}
                                        onClick={() => handleStatusChange('archived')}
                                        className="border-border-strong text-text-muted hover:border-border-strong hover:text-foreground gap-1.5"
                                    >
                                        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Archive className="size-3.5" />}
                                        Archivar
                                    </Button>
                                )}
                                {milestone.status === 'archived' && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isPending}
                                        onClick={() => handleStatusChange('draft')}
                                        className="border-border-strong text-text-muted hover:border-border-strong hover:text-foreground gap-1.5"
                                    >
                                        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <DraftingCompass className="size-3.5" />}
                                        Volver a Borrador
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
