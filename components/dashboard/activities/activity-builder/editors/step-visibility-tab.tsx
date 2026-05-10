"use client";

import { forwardRef, useEffect, useEffectEvent, useImperativeHandle, useMemo, useState, useTransition } from "react";
import { Eye, Loader2, Users, UserRound } from "lucide-react";
import { toast } from "sonner";
import { ActivityStepWithClientState, STEP_AUDIENCE_MODE, type StepAudienceMode } from "@/types/activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { getStepAudienceContext, updateStepAudience, type StepAudienceContextPayload } from "@/app/activities/[id]/edit/actions";

interface StepVisibilityTabProps {
    step: ActivityStepWithClientState;
    onUpdateStep: (updated: ActivityStepWithClientState) => void;
    visible: boolean;
    onDirtyChange?: (dirty: boolean) => void;
}

export interface StepVisibilityTabHandle {
    save: () => Promise<boolean>;
    isDirty: () => boolean;
}

function toggleSelection(values: string[], id: string) {
    return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

export const StepVisibilityTab = forwardRef<StepVisibilityTabHandle, StepVisibilityTabProps>(function StepVisibilityTab({ step, onUpdateStep, visible, onDirtyChange }: StepVisibilityTabProps, ref) {
    const [context, setContext] = useState<StepAudienceContextPayload | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<StepAudienceMode>(STEP_AUDIENCE_MODE.ALL);
    const [inheritFromParent, setInheritFromParent] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    const [groupSearch, setGroupSearch] = useState("");
    const [isSaving, startSavingTransition] = useTransition();
    const [isDirty, setIsDirty] = useState(false);
    const [baseline, setBaseline] = useState<{
        mode: StepAudienceMode;
        inheritFromParent: boolean;
        studentIds: string[];
        groupIds: string[];
    } | null>(null);
    const emitDirtyChange = useEffectEvent((dirty: boolean) => {
        onDirtyChange?.(dirty);
    });

    useEffect(() => {
        if (!visible) return;

        let isMounted = true;
        const loadContext = async () => {
            setIsLoading(true);
            const result = await getStepAudienceContext(step.id);
            if (!isMounted) return;
            if (result.error || !result.context) {
                toast.error(result.error ?? "No se pudo cargar la visibilidad.");
                setContext(null);
                setIsLoading(false);
                return;
            }

            const nextContext = result.context;
            setContext(nextContext);
            setMode(nextContext.step.audienceMode);
            setInheritFromParent(nextContext.step.inheritFromParent);
            setSelectedStudentIds(nextContext.step.visibleStudentIds);
            setSelectedGroupIds(nextContext.step.visibleGroupIds);
            setBaseline({
                mode: nextContext.step.audienceMode,
                inheritFromParent: nextContext.step.inheritFromParent,
                studentIds: nextContext.step.visibleStudentIds,
                groupIds: nextContext.step.visibleGroupIds,
            });
            setIsDirty(false);
            setStudentSearch("");
            setGroupSearch("");
            setIsLoading(false);
        };

        loadContext();
        return () => {
            isMounted = false;
        };
    }, [step.id, visible]);

    const hasParent = Boolean(context?.step.parentStepId);
    const lockSelectorsByInheritance = hasParent && inheritFromParent;

    const filteredGroups = useMemo(() => {
        const groups = context?.groups ?? [];
        const query = groupSearch.trim().toLocaleLowerCase("es");
        if (!query) return groups;
        return groups.filter((group) => group.name.toLocaleLowerCase("es").includes(query));
    }, [context?.groups, groupSearch]);

    const filteredStudents = useMemo(() => {
        const students = context?.students ?? [];
        const query = studentSearch.trim().toLocaleLowerCase("es");
        if (!query) return students;
        return students.filter((student) =>
            student.name.toLocaleLowerCase("es").includes(query)
            || (student.groupName ?? "").toLocaleLowerCase("es").includes(query),
        );
    }, [context?.students, studentSearch]);

    const summary = useMemo(() => {
        if (mode === STEP_AUDIENCE_MODE.ALL) {
            return "Visible para todo el alumnado matriculado (si el paso no está oculto ni bloqueado).";
        }
        return `Visibilidad restringida: ${selectedGroupIds.length} grupo(s) y ${selectedStudentIds.length} alumno(s) seleccionados.`;
    }, [mode, selectedGroupIds.length, selectedStudentIds.length]);

    const handleModeChange = (nextMode: StepAudienceMode) => {
        if (nextMode === mode) return;

        if (
            mode === STEP_AUDIENCE_MODE.ALL
            && nextMode === STEP_AUDIENCE_MODE.RESTRICTED
            && selectedStudentIds.length === 0
            && selectedGroupIds.length === 0
            && context
        ) {
            setSelectedStudentIds(context.students.map((student) => student.id));
            setSelectedGroupIds(context.groups.map((group) => group.id));
        }

        setMode(nextMode);
    };

    const runSave = async () => {
        if (!context) return false;
        return await new Promise<boolean>((resolve) => {
            startSavingTransition(async () => {
            const result = await updateStepAudience(
                step.id,
                mode,
                selectedStudentIds,
                selectedGroupIds,
                inheritFromParent,
            );

            if (result.error || !result.data) {
                toast.error(result.error ?? "No se pudo guardar la visibilidad.");
                resolve(false);
                return;
            }

            onUpdateStep({
                ...step,
                audience_mode: result.data.audience_mode ?? mode,
                visible_student_ids: result.data.visible_student_ids ?? selectedStudentIds,
                visible_group_ids: result.data.visible_group_ids ?? selectedGroupIds,
                inherit_audience_from_parent: result.data.inherit_audience_from_parent ?? inheritFromParent,
            });
            setBaseline({
                mode,
                inheritFromParent,
                studentIds: [...selectedStudentIds].sort(),
                groupIds: [...selectedGroupIds].sort(),
            });
            setIsDirty(false);
            resolve(true);
            });
        });
    };

    useImperativeHandle(ref, () => ({
        save: runSave,
        isDirty: () => isDirty,
    }), [isDirty, mode, inheritFromParent, selectedStudentIds, selectedGroupIds, context, step.id]);

    useEffect(() => {
        if (!baseline) return;
        const currentStudents = [...selectedStudentIds].sort();
        const currentGroups = [...selectedGroupIds].sort();
        const baselineStudents = [...baseline.studentIds].sort();
        const baselineGroups = [...baseline.groupIds].sort();
        const dirtyNow = (
            mode !== baseline.mode
            || inheritFromParent !== baseline.inheritFromParent
            || currentStudents.join("|") !== baselineStudents.join("|")
            || currentGroups.join("|") !== baselineGroups.join("|")
        );
        if (dirtyNow === isDirty) return;
        setIsDirty(dirtyNow);
        emitDirtyChange(dirtyNow);
    }, [baseline, mode, inheritFromParent, selectedStudentIds, selectedGroupIds, isDirty, emitDirtyChange]);

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-6">
            <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Visibilidad</h3>
                <p className="text-sm text-text-muted">
                    Define qué alumnos o grupos pueden ver esta actividad. Si el paso está oculto, no se mostrará aunque esté seleccionado aquí.
                </p>
            </div>

            {isLoading ? (
                <div className="rounded-xl border border-border/50 bg-surface/30 p-6 text-sm text-text-muted flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Cargando datos de visibilidad...
                </div>
            ) : !context ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                    No se pudo cargar el contexto de visibilidad.
                </div>
            ) : (
                <>
                    <div className="grid gap-3 md:grid-cols-2">
                        <button
                            onClick={() => handleModeChange(STEP_AUDIENCE_MODE.ALL)}
                            className={cn(
                                "rounded-xl border p-4 text-left transition-colors",
                                mode === STEP_AUDIENCE_MODE.ALL
                                    ? "border-accent-blue/40 bg-accent-blue/10"
                                    : "border-border/60 bg-surface/20 hover:bg-surface/40",
                            )}
                        >
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <Eye className="size-4 text-accent-blue" />
                                Todos los alumnos
                            </div>
                            <p className="text-xs text-text-muted mt-2">
                                Cualquier alumno matriculado en el módulo puede ver la actividad.
                            </p>
                        </button>

                        <button
                            onClick={() => handleModeChange(STEP_AUDIENCE_MODE.RESTRICTED)}
                            className={cn(
                                "rounded-xl border p-4 text-left transition-colors",
                                mode === STEP_AUDIENCE_MODE.RESTRICTED
                                    ? "border-accent-blue/40 bg-accent-blue/10"
                                    : "border-border/60 bg-surface/20 hover:bg-surface/40",
                            )}
                        >
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <Users className="size-4 text-accent-blue" />
                                Restringido por audiencia
                            </div>
                            <p className="text-xs text-text-muted mt-2">
                                Solo verán la actividad los alumnos o grupos seleccionados.
                            </p>
                        </button>
                    </div>

                    {hasParent && (
                        <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface/20 p-4">
                            <Checkbox
                                checked={inheritFromParent}
                                onCheckedChange={(checked) => setInheritFromParent(checked === true)}
                                className="mt-0.5"
                            />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-foreground">
                                    Heredar visibilidad del paso padre
                                </p>
                                <p className="text-xs text-text-muted">
                                    Paso padre: <span className="text-foreground">{context.parentStep?.title ?? "Sin nombre"}</span>
                                </p>
                            </div>
                        </label>
                    )}

                    <div className="rounded-xl border border-border/60 bg-surface/20 p-4 text-xs text-text-muted">
                        {summary}
                    </div>

                    {mode === STEP_AUDIENCE_MODE.RESTRICTED && (
                        <div className={cn("grid gap-4 lg:grid-cols-2", lockSelectorsByInheritance && "opacity-60 pointer-events-none select-none")}>
                            <div className="rounded-xl border border-border/60 bg-surface/20 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-sm font-semibold text-foreground">Grupos</h4>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs"
                                            onClick={() => setSelectedGroupIds((context.groups ?? []).map((group) => group.id))}
                                        >
                                            Todos
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs"
                                            onClick={() => setSelectedGroupIds([])}
                                        >
                                            Ninguno
                                        </Button>
                                    </div>
                                </div>
                                <Input
                                    value={groupSearch}
                                    onChange={(event) => setGroupSearch(event.target.value)}
                                    placeholder="Buscar grupo..."
                                    className="h-9 bg-background/70 border-border/60"
                                />
                                <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                                    {filteredGroups.map((group) => (
                                        <label key={group.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface/50 cursor-pointer">
                                            <Checkbox
                                                checked={selectedGroupIds.includes(group.id)}
                                                onCheckedChange={() => setSelectedGroupIds((current) => toggleSelection(current, group.id))}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground truncate">{group.name}</p>
                                                <p className="text-[11px] text-text-muted">{group.memberCount} miembro(s)</p>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] border-border/60">
                                                Grupo
                                            </Badge>
                                        </label>
                                    ))}
                                    {filteredGroups.length === 0 && (
                                        <p className="text-xs text-text-muted py-3">No hay grupos que coincidan.</p>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-border/60 bg-surface/20 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-sm font-semibold text-foreground">Alumnos</h4>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs"
                                            onClick={() => setSelectedStudentIds((context.students ?? []).map((student) => student.id))}
                                        >
                                            Todos
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs"
                                            onClick={() => setSelectedStudentIds([])}
                                        >
                                            Ninguno
                                        </Button>
                                    </div>
                                </div>
                                <Input
                                    value={studentSearch}
                                    onChange={(event) => setStudentSearch(event.target.value)}
                                    placeholder="Buscar alumno..."
                                    className="h-9 bg-background/70 border-border/60"
                                />
                                <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                                    {filteredStudents.map((student) => (
                                        <label key={student.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface/50 cursor-pointer">
                                            <Checkbox
                                                checked={selectedStudentIds.includes(student.id)}
                                                onCheckedChange={() => setSelectedStudentIds((current) => toggleSelection(current, student.id))}
                                            />
                                            <UserRound className="size-3.5 text-text-muted shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground truncate">{student.name}</p>
                                                <p className="text-[11px] text-text-muted truncate">{student.groupName ?? "Sin grupo"}</p>
                                            </div>
                                        </label>
                                    ))}
                                    {filteredStudents.length === 0 && (
                                        <p className="text-xs text-text-muted py-3">No hay alumnos que coincidan.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="hidden" />
                </>
            )}
        </div>
    );
});
