"use client";

import { useState, useTransition, useEffect, useMemo, useCallback } from "react";
import { Users2, AlertTriangle, Clock, PlayCircle, Star, Eye, EyeOff, Users, Trash2, Lock, ArrowUp, ArrowDown, ArrowUpDown, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
    useReactTable, getCoreRowModel, getSortedRowModel, flexRender,
    type ColumnDef, type SortingState, type RowSelectionState,
} from "@tanstack/react-table";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
    generatePeerAssignments,
    deletePeerAssignments,
    getPeerEvaluationResults,
    computeEvaluatorReliability,
    togglePeerFeedbackVisible,
} from "@/app/dashboard/units/[id]/actions";
import { updateStepActivityClosed } from "@/app/activities/[id]/edit/actions";
import { PeerEvalReviewModal } from "@/components/dashboard/shared/peer-eval-review-modal";
import { toast } from "sonner";
import { RubricCriteria, QuizQuestion } from "@/types/activity";

interface PeerEvaluationTeacherViewProps {
    stepId: string;
    moduleId: string;
    stepTitle: string;
    activityId: string;
    isActivityClosed?: boolean;
    students?: { student_id: string; name: string }[];
}

type Assignment = {
    id: string;
    evaluator_id: string | null;
    evaluator_group_id: string | null;
    target_submission_id: string;
    eval_submission_id: string | null;
    reliability_score: number | null;
    is_outlier: boolean | null;
    calibration_score: number | null;
    evaluator: { id: string; full_name: string | null } | null;
    evaluator_group: { id: string; name: string } | null;
    target_submission: {
        id: string;
        student_id: string | null;
        group_id: string | null;
        score: number | null;
        peer_eval_override_score: number | null;
        student: { full_name: string | null } | null;
        group: { name: string } | null;
    } | null;
    eval_submission: {
        id: string;
        self_eval_rubric_scores: Record<string, number> | null;
        self_eval_justifications: Record<string, string> | null;
        files: any[] | null;
    } | null;
};

type EvaluatorRow = {
    evaluatorKey: string;
    evaluatorName: string;
    isGroup: boolean;
    assignments: Assignment[];
    completedCount: number;
    totalCount: number;
    avgReliability: number | null;
    outlierCount: number;
};

export function PeerEvaluationTeacherView({ stepId, moduleId, stepTitle, activityId, isActivityClosed, students = [] }: PeerEvaluationTeacherViewProps) {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [mode, setMode] = useState<string>("individual");
    const [evalMode, setEvalMode] = useState<"rubric" | "questions">("rubric");
    const [rubric, setRubric] = useState<RubricCriteria[]>([]);
    const [evalQuestions, setEvalQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmReset, setConfirmReset] = useState(false);
    const [closed, setClosed] = useState(isActivityClosed ?? false);
    const [reviewEvaluatorKey, setReviewEvaluatorKey] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const load = useCallback(() => {
        setLoading(true);
        getPeerEvaluationResults(stepId).then(res => {
            if (res.assignments) setAssignments(res.assignments as Assignment[]);
            setFeedbackVisible(res.peerFeedbackVisibleToStudents ?? false);
            setMode(res.mode ?? "individual");
            setEvalMode((res.evalMode as "rubric" | "questions") ?? "rubric");
            setRubric(res.rubric ?? []);
            setEvalQuestions(res.evalQuestions ?? []);
            setLoading(false);
        });
    }, [stepId]);

    useEffect(() => { load(); }, [load]);

    const evaluatorRows = useMemo<EvaluatorRow[]>(() => {
        const map = new Map<string, EvaluatorRow>();
        for (const a of assignments) {
            const key = a.evaluator_id ?? a.evaluator_group_id ?? "unknown";
            const isGroup = !!a.evaluator_group_id;
            const name = isGroup
                ? (a.evaluator_group?.name ?? "Grupo")
                : (a.evaluator?.full_name ?? "Alumno");
            if (!map.has(key)) {
                map.set(key, { evaluatorKey: key, evaluatorName: name, isGroup, assignments: [], completedCount: 0, totalCount: 0, avgReliability: null, outlierCount: 0 });
            }
            const row = map.get(key)!;
            row.assignments.push(a);
            row.totalCount++;
            if (a.eval_submission_id) row.completedCount++;
            if (a.is_outlier) row.outlierCount++;
        }
        for (const row of map.values()) {
            const scored = row.assignments.filter(a => a.reliability_score !== null);
            if (scored.length > 0) {
                row.avgReliability = scored.reduce((s, a) => s + a.reliability_score!, 0) / scored.length;
            }
        }
        // Add students with no assignments so all enrolled students appear
        for (const s of students) {
            if (!map.has(s.student_id)) {
                map.set(s.student_id, {
                    evaluatorKey: s.student_id,
                    evaluatorName: s.name,
                    isGroup: false,
                    assignments: [],
                    completedCount: 0,
                    totalCount: 0,
                    avgReliability: null,
                    outlierCount: 0,
                });
            }
        }
        return [...map.values()].sort((a, b) => a.evaluatorName.localeCompare(b.evaluatorName));
    }, [assignments, students]);

    const reviewEvaluator = reviewEvaluatorKey
        ? evaluatorRows.find(r => r.evaluatorKey === reviewEvaluatorKey) ?? null
        : null;

    const reviewAssignments = useMemo(() => {
        if (!reviewEvaluator) return [];
        return reviewEvaluator.assignments.map(a => ({
            id: a.id,
            targetName: a.target_submission?.group?.name
                ?? a.target_submission?.student?.full_name
                ?? "Alumno",
            isOutlier: a.is_outlier,
            reliabilityScore: a.reliability_score,
            evalSubmission: a.eval_submission ?? null,
        }));
    }, [reviewEvaluator]);

    function handleOutlierToggled(assignmentId: string, newValue: boolean) {
        setAssignments(prev => prev.map(a =>
            a.id === assignmentId ? { ...a, is_outlier: newValue } : a
        ));
    }

    const hasAssignments = assignments.length > 0;
    const hasReliabilityData = assignments.some(a => a.reliability_score !== null);
    const completedTotal = assignments.filter(a => a.eval_submission_id).length;

    function handleGenerate() {
        startTransition(async () => {
            const res = await generatePeerAssignments(stepId, moduleId);
            if (res.error) { toast.error(res.error); return; }
            toast.success("Asignaciones generadas correctamente.");
            load();
        });
    }

    function handleReset() {
        if (!confirmReset) {
            setConfirmReset(true);
            setTimeout(() => setConfirmReset(false), 4000);
            return;
        }
        setConfirmReset(false);
        startTransition(async () => {
            const del = await deletePeerAssignments(stepId);
            if (del.error) { toast.error(del.error); return; }
            const gen = await generatePeerAssignments(stepId, moduleId);
            if (gen.error) { toast.error(gen.error); return; }
            toast.success("Asignaciones regeneradas correctamente.");
            load();
        });
    }

    function handleComputeReliability() {
        startTransition(async () => {
            const res = await computeEvaluatorReliability(stepId);
            if (res.error) { toast.error(res.error); return; }
            toast.success("Fiabilidad calculada.");
            load();
        });
    }

    function handleToggleFeedback() {
        const next = !feedbackVisible;
        startTransition(async () => {
            const res = await togglePeerFeedbackVisible(stepId, next);
            if (res.error) { toast.error(res.error); return; }
            setFeedbackVisible(next);
            toast.success(next ? "Feedback visible para alumnos." : "Feedback oculto.");
        });
    }

    function handleToggleClose() {
        const next = !closed;
        startTransition(async () => {
            const res = await updateStepActivityClosed(stepId, next);
            if ((res as any)?.error) { toast.error((res as any).error); return; }
            setClosed(next);
            toast.success(next ? "Entregas cerradas." : "Entregas abiertas.");
        });
    }

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-20 rounded-2xl bg-surface-dark" />
                <div className="h-64 rounded-2xl bg-surface-dark" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 bg-surface border border-border-strong rounded-2xl shadow-xl shadow-black/5">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <Users2 className="size-5 text-indigo-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Coevaluación</p>
                            <span className={cn(
                                "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border",
                                mode === "individual" ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                : mode === "group" ? "bg-accent-green/10 border-accent-green/30 text-accent-green"
                                : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                            )}>
                                {mode === "individual" ? "Individual" : mode === "group" ? "Grupos" : "Entre miembros"}
                            </span>
                        </div>
                        <h2 className="text-base font-black text-foreground uppercase tracking-tighter">{stepTitle}</h2>
                        {hasAssignments && (
                            <p className="text-xs text-text-muted mt-0.5">
                                {completedTotal} / {assignments.length} evaluaciones completadas
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Cerrar/Abrir — siempre visible */}
                    <Button
                        onClick={handleToggleClose}
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        className={cn(
                            "h-9 text-[10px] font-black uppercase gap-2",
                            closed
                                ? "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                                : "border-amber-500/20 text-amber-500 hover:bg-amber-500/10"
                        )}
                    >
                        <Lock className="size-3.5" />
                        {isPending ? "..." : closed ? "Abrir" : "Cerrar"}
                    </Button>

                    {!hasAssignments ? (
                        <Button onClick={handleGenerate} disabled={isPending} size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white">
                            <PlayCircle className="size-3.5" />
                            Generar asignaciones
                        </Button>
                    ) : (
                        <>
                            <Button
                                onClick={handleReset}
                                variant="outline"
                                size="sm"
                                disabled={isPending}
                                className={cn(
                                    "gap-2 transition-colors",
                                    confirmReset
                                        ? "border-red-500/50 text-red-400 bg-red-500/5 hover:bg-red-500/10"
                                        : "border-red-500/20 text-red-400 hover:bg-red-500/10"
                                )}
                            >
                                <Trash2 className="size-3.5" />
                                {confirmReset ? "¿Confirmar?" : "Regenerar asignaciones"}
                            </Button>
                            <Button
                                onClick={handleToggleFeedback}
                                variant="outline"
                                size="sm"
                                disabled={isPending}
                                className={cn(
                                    "gap-2",
                                    feedbackVisible
                                        ? "border-indigo-500/30 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10"
                                        : "border-border/50 text-text-muted hover:text-foreground"
                                )}
                            >
                                {feedbackVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                                {feedbackVisible ? "Feedback visible" : "Feedback oculto"}
                            </Button>
                            <Button
                                onClick={handleComputeReliability}
                                variant="outline"
                                size="sm"
                                disabled={isPending}
                                className="gap-2 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                            >
                                <Star className="size-3.5" />
                                Calcular fiabilidad
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {evaluatorRows.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    {!hasAssignments && (
                        <div className="px-5 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[11px] text-amber-400 font-medium">
                            Sin asignaciones generadas. Pulsa "Generar asignaciones" para distribuir las evaluaciones.
                        </div>
                    )}
                    <EvaluatorsTable
                        rows={evaluatorRows}
                        mode={mode}
                        onReview={(key) => setReviewEvaluatorKey(key)}
                    />
                </>
            )}

            {/* Review Modal */}
            {reviewEvaluator && (
                <PeerEvalReviewModal
                    open={reviewEvaluatorKey !== null}
                    onClose={() => setReviewEvaluatorKey(null)}
                    evaluatorName={reviewEvaluator.evaluatorName}
                    assignments={reviewAssignments}
                    evalMode={evalMode}
                    rubric={rubric}
                    evalQuestions={evalQuestions}
                    onOutlierToggled={handleOutlierToggled}
                />
            )}
        </div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div className="p-12 bg-surface-dark border border-white/5 rounded-2xl flex flex-col items-center text-center gap-4">
            <Users2 className="size-12 text-text-muted/20" />
            <div>
                <p className="text-sm font-semibold text-foreground">Sin asignaciones generadas</p>
                <p className="text-xs text-text-muted mt-1 max-w-xs">
                    Pulsa "Generar asignaciones" para distribuir las entregas entre los alumnos. Asegúrate de que existen entregas en el paso fuente.
                </p>
            </div>
        </div>
    );
}

// ─── Evaluators table ─────────────────────────────────────────────────────────

function SortBtn({ column, label }: { column: any; label: string }) {
    const sorted = column.getIsSorted();
    return (
        <button
            className="flex items-center gap-1 uppercase text-[11px] font-mono font-medium tracking-wider hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(sorted === "asc")}
        >
            {label}
            {sorted === "asc" ? <ArrowUp className="size-3" />
                : sorted === "desc" ? <ArrowDown className="size-3" />
                : <ArrowUpDown className="size-3 opacity-30" />}
        </button>
    );
}

function EvaluatorsTable({ rows, mode, onReview }: {
    rows: EvaluatorRow[];
    mode: string;
    onReview: (evaluatorKey: string) => void;
}) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const columns: ColumnDef<EvaluatorRow>[] = useMemo(() => [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                    onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                    aria-label="Seleccionar todos"
                    className="border-border-strong"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(v) => row.toggleSelected(!!v)}
                    aria-label="Seleccionar fila"
                    className="border-border-strong"
                />
            ),
            enableSorting: false,
            size: 40,
        },
        {
            accessorKey: "evaluatorName",
            header: ({ column }) => <SortBtn column={column} label={mode === "group" ? "Grupo" : mode === "intra_group" ? "Miembro" : "Evaluador"} />,
            cell: ({ row }) => {
                const r = row.original;
                const initial = r.evaluatorName.charAt(0).toUpperCase();
                return (
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "size-8 rounded-xl border flex items-center justify-center text-[11px] font-black shrink-0 shadow-inner",
                            r.isGroup
                                ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                                : "bg-surface-dark border-border-strong text-text-muted"
                        )}>
                            {r.isGroup ? <Users className="size-3.5" /> : initial}
                        </div>
                        <span className="text-[14px] font-bold text-foreground truncate uppercase tracking-tight font-mono">{r.evaluatorName}</span>
                    </div>
                );
            },
            size: 240,
        },
        {
            id: "status",
            header: ({ column }) => <SortBtn column={column} label="Estado" />,
            cell: ({ row }) => {
                const r = row.original;
                if (r.totalCount === 0) return <span className="text-text-muted/20 font-mono text-[10px]">Sin asignar</span>;
                const allDone = r.completedCount === r.totalCount;
                const noneDone = r.completedCount === 0;
                return (
                    <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-lg border",
                        allDone
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : noneDone
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    )}>
                        {allDone
                            ? <><CheckCircle2 className="size-2.5" />Completo</>
                            : noneDone
                            ? <><XCircle className="size-2.5" />Sin evaluar</>
                            : <><MinusCircle className="size-2.5" />Parcial</>}
                    </span>
                );
            },
            sortingFn: (a, b) => {
                const score = (r: EvaluatorRow) => r.totalCount === 0 ? -1 : r.completedCount / Math.max(r.totalCount, 1);
                return score(a.original) - score(b.original);
            },
            enableSorting: true,
            size: 120,
        },
        {
            id: "evals",
            header: ({ column }) => <SortBtn column={column} label="Evaluaciones" />,
            cell: ({ row }) => {
                const r = row.original;
                if (r.totalCount === 0) return <span className="text-text-muted/20 font-mono text-[10px]">—</span>;
                const allDone = r.completedCount === r.totalCount;
                const noneDone = r.completedCount === 0;
                return (
                    <span className={cn(
                        "text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border",
                        allDone
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : noneDone
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : "bg-surface-dark border-border-strong text-foreground"
                    )}>
                        {r.completedCount}<span className="text-text-muted/50">/{r.totalCount}</span>
                    </span>
                );
            },
            sortingFn: (a, b) => (a.original.completedCount / Math.max(a.original.totalCount, 1)) - (b.original.completedCount / Math.max(b.original.totalCount, 1)),
            enableSorting: true,
            size: 110,
        },
        {
            id: "reliability",
            header: ({ column }) => <SortBtn column={column} label="Fiabilidad" />,
            cell: ({ row }) => {
                const r = row.original;
                if (r.avgReliability === null) return <span className="text-text-muted/20 font-mono text-[10px]">—</span>;
                return (
                    <span className={cn(
                        "text-[11px] font-black font-mono px-2 py-0.5 rounded-lg border",
                        r.avgReliability >= 0.7
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : r.avgReliability >= 0.4
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            : "bg-red-500/10 border-red-500/20 text-red-400"
                    )}>
                        {(r.avgReliability * 100).toFixed(0)}%
                    </span>
                );
            },
            sortingFn: (a, b) => (a.original.avgReliability ?? -1) - (b.original.avgReliability ?? -1),
            enableSorting: true,
            size: 110,
        },
        {
            id: "outliers",
            header: ({ column }) => <SortBtn column={column} label="Outliers" />,
            cell: ({ row }) => {
                const r = row.original;
                if (r.outlierCount === 0) return <span className="text-text-muted/20 font-mono text-[10px]">—</span>;
                return (
                    <span className="text-[11px] font-black font-mono px-2 py-0.5 rounded-lg border bg-amber-500/10 border-amber-500/20 text-amber-400 flex items-center gap-1 w-fit">
                        <AlertTriangle className="size-2.5" />
                        {r.outlierCount}
                    </span>
                );
            },
            sortingFn: (a, b) => a.original.outlierCount - b.original.outlierCount,
            enableSorting: true,
            size: 90,
        },
        {
            id: "actions",
            header: () => <span className="text-right block uppercase text-[11px] font-mono font-medium tracking-wider">Acciones</span>,
            cell: ({ row }) => {
                const r = row.original;
                if (r.totalCount === 0) return null;
                return (
                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] px-2.5 border-border/50 gap-1.5"
                            onClick={() => onReview(r.evaluatorKey)}
                        >
                            <Eye className="size-3" />
                            Ver evals
                        </Button>
                    </div>
                );
            },
            enableSorting: false,
            size: 110,
        },
    ], [mode, onReview]);

    const table = useReactTable({
        data: rows,
        columns,
        state: { sorting, rowSelection },
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId: (row) => row.evaluatorKey,
        enableRowSelection: true,
    });

    const selectedCount = Object.keys(rowSelection).length;

    return (
        <div className="bg-surface border border-border-strong rounded-[2rem] overflow-hidden flex flex-col shadow-xl shadow-black/5">
            {selectedCount > 0 && (
                <div className="flex items-center gap-3 px-5 py-2.5 bg-accent-blue/5 border-b border-accent-blue/20">
                    <span className="text-[11px] font-black text-accent-blue uppercase tracking-wider">
                        {selectedCount} seleccionado{selectedCount !== 1 ? "s" : ""}
                    </span>
                    <div className="flex-1" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] px-2 text-text-muted hover:text-foreground"
                        onClick={() => setRowSelection({})}
                    >
                        Cancelar selección
                    </Button>
                </div>
            )}
            <div className="overflow-auto flex-1 rounded-[2rem]">
                <Table className="table-fixed">
                    <TableHeader className="sticky top-0 z-10">
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id} className="bg-surface-dark/50 border-b border-border-strong hover:bg-surface-dark/50">
                                {headerGroup.headers.map(header => (
                                    <TableHead key={header.id} style={{ width: header.getSize() }}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-text-muted/40 text-xs">
                                    Sin evaluadores asignados
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows.map(row => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() ? "selected" : undefined}
                                className={cn("group transition-colors odd:bg-muted/60 even:bg-transparent hover:bg-blue-500/10",
                                    row.getIsSelected() && "bg-accent-blue/10 hover:bg-accent-blue/15")}
                            >
                                {row.getVisibleCells().map(cell => (
                                    <TableCell key={cell.id}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

