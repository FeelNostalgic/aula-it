"use client";

import { useState, useTransition, useEffect, useMemo, useCallback } from "react";
import { Users2, AlertTriangle, Clock, PlayCircle, Star, Eye, EyeOff, Users, Trash2, Lock, ArrowUp, ArrowDown, ArrowUpDown, CheckCircle2, XCircle, MinusCircle, ShieldCheck } from "lucide-react";
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
    ensureIntraGroupAssignments,
    ensureGroupAssignments,
    bulkValidateNumericAnswers,
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
    target_student_id: string | null;
    eval_submission_id: string | null;
    reliability_score: number | null;
    is_outlier: boolean | null;
    calibration_score: number | null;
    evaluator: { id: string; full_name: string | null } | null;
    evaluator_group: { id: string; name: string; color?: string | null } | null;
    target_submission: {
        id: string;
        student_id: string | null;
        group_id: string | null;
        score: number | null;
        peer_eval_override_score: number | null;
        student: { full_name: string | null } | null;
        group: { name: string; color?: string | null } | null;
    } | null;
    target_student: { full_name: string | null } | null;
    validated_numeric_answers: Record<string, boolean> | null;
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

type IntraGroupRow = {
    studentId: string;
    studentName: string;
    groupName: string;
    groupColor: string | null;
    madeCompleted: number;
    madeTotal: number;
    receivedCompleted: number;
    receivedTotal: number;
    evaluatorAssignments: Assignment[];
    receivedAssignments: Assignment[];
};

type GroupEvalRow = {
    groupId: string;
    groupName: string;
    groupColor: string | null;
    groupMembers: string[];
    completedCount: number;
    totalCount: number;
    evaluatorAssignments: Assignment[];
};

export function PeerEvaluationTeacherView({ stepId, moduleId, stepTitle, activityId, isActivityClosed, students = [] }: PeerEvaluationTeacherViewProps) {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [mode, setMode] = useState<string>("individual");
    const [evalMode, setEvalMode] = useState<"rubric" | "questions">("rubric");
    const [livePresentationMode, setLivePresentationMode] = useState(false);
    const [rubric, setRubric] = useState<RubricCriteria[]>([]);
    const [evalQuestions, setEvalQuestions] = useState<QuizQuestion[]>([]);
    const [groupByStudentId, setGroupByStudentId] = useState<Record<string, { id: string; name: string; color?: string | null }>>({});
    const [allGroups, setAllGroups] = useState<{ id: string; name: string; color?: string | null }[]>([]);
    const [evaluateAllGroups, setEvaluateAllGroups] = useState(true);
    const [loading, setLoading] = useState(true);
    const [confirmReset, setConfirmReset] = useState(false);
    const [closed, setClosed] = useState(isActivityClosed ?? false);
    const [reviewTarget, setReviewTarget] = useState<{
        name: string;
        assignments: {
            id: string;
            targetName: string;
            isOutlier: boolean | null;
            reliabilityScore: number | null;
            validatedNumericAnswers: Record<string, boolean> | null;
            evalSubmission: any;
        }[];
    } | null>(null);
    const [isPending, startTransition] = useTransition();

    const load = useCallback(async () => {
        setLoading(true);
        const applyResults = (res: Awaited<ReturnType<typeof getPeerEvaluationResults>>) => {
            const loadedAssignments = (res.assignments ?? []) as Assignment[];
            const loadedMode = res.mode ?? "individual";

            setAssignments(loadedAssignments);
            setFeedbackVisible(res.peerFeedbackVisibleToStudents ?? false);
            setMode(loadedMode);
            setLivePresentationMode(res.livePresentationMode ?? false);
            setEvalMode((res.evalMode as "rubric" | "questions") ?? "rubric");
            setRubric(res.rubric ?? []);
            setEvalQuestions(res.evalQuestions ?? []);
            setGroupByStudentId(res.groupByStudentId ?? {});
            setAllGroups(res.allGroups ?? []);
            setEvaluateAllGroups(res.evaluateAllGroups ?? true);

            return { loadedAssignments, loadedMode };
        };

        let res = await getPeerEvaluationResults(stepId, moduleId);
        let { loadedAssignments, loadedMode } = applyResults(res);

        // Auto-generate for intra_group if no assignments yet
        if (loadedMode === 'intra_group' && loadedAssignments.length === 0) {
            await ensureIntraGroupAssignments(stepId, moduleId);
            res = await getPeerEvaluationResults(stepId, moduleId);
            ({ loadedAssignments, loadedMode } = applyResults(res));
        }

        if (loadedMode === 'group' && (res.evaluateAllGroups ?? true) && loadedAssignments.length === 0) {
            await ensureGroupAssignments(stepId, moduleId);
            res = await getPeerEvaluationResults(stepId, moduleId);
            applyResults(res);
        }

        setLoading(false);
    }, [stepId, moduleId]);

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

    const intraGroupRows = useMemo<IntraGroupRow[]>(() => {
        const rowMap = new Map<string, IntraGroupRow>();
        for (const s of students) {
            rowMap.set(s.student_id, {
                studentId: s.student_id,
                studentName: s.name,
                groupName: groupByStudentId[s.student_id]?.name ?? '—',
                groupColor: groupByStudentId[s.student_id]?.color ?? null,
                madeCompleted: 0, madeTotal: 0,
                receivedCompleted: 0, receivedTotal: 0,
                evaluatorAssignments: [],
                receivedAssignments: [],
            });
        }
        for (const a of assignments) {
            if (a.evaluator_id) {
                if (!rowMap.has(a.evaluator_id)) {
                    rowMap.set(a.evaluator_id, {
                        studentId: a.evaluator_id,
                        studentName: a.evaluator?.full_name ?? 'Alumno',
                        groupName: groupByStudentId[a.evaluator_id]?.name ?? '—',
                        groupColor: groupByStudentId[a.evaluator_id]?.color ?? null,
                        madeCompleted: 0, madeTotal: 0,
                        receivedCompleted: 0, receivedTotal: 0,
                        evaluatorAssignments: [],
                        receivedAssignments: [],
                    });
                }
                const row = rowMap.get(a.evaluator_id)!;
                row.madeTotal++;
                if (a.eval_submission_id) row.madeCompleted++;
                row.evaluatorAssignments.push(a);
            }
            if (a.target_student_id) {
                if (!rowMap.has(a.target_student_id)) {
                    rowMap.set(a.target_student_id, {
                        studentId: a.target_student_id,
                        studentName: a.target_student?.full_name ?? 'Alumno',
                        groupName: groupByStudentId[a.target_student_id]?.name ?? '—',
                        groupColor: groupByStudentId[a.target_student_id]?.color ?? null,
                        madeCompleted: 0, madeTotal: 0,
                        receivedCompleted: 0, receivedTotal: 0,
                        evaluatorAssignments: [],
                        receivedAssignments: [],
                    });
                }
                const row = rowMap.get(a.target_student_id)!;
                row.receivedTotal++;
                if (a.eval_submission_id) row.receivedCompleted++;
                row.receivedAssignments.push(a);
            }
        }
        return [...rowMap.values()].sort((a, b) => {
            const g = a.groupName.localeCompare(b.groupName);
            return g !== 0 ? g : a.studentName.localeCompare(b.studentName);
        });
    }, [assignments, students, groupByStudentId]);

    const groupEvalRows = useMemo<GroupEvalRow[]>(() => {
        const rowMap = new Map<string, GroupEvalRow>();
        const membersByGroupId = new Map<string, string[]>();

        for (const student of students) {
            const group = groupByStudentId[student.student_id];
            if (!group?.id) continue;

            const currentMembers = membersByGroupId.get(group.id) ?? [];
            currentMembers.push(student.name);
            membersByGroupId.set(group.id, currentMembers);
        }

        for (const [groupId, memberNames] of membersByGroupId.entries()) {
            memberNames.sort((a, b) => a.localeCompare(b));
            membersByGroupId.set(groupId, memberNames);
        }

        for (const group of allGroups) {
            rowMap.set(group.id, {
                groupId: group.id,
                groupName: group.name,
                groupColor: group.color ?? null,
                groupMembers: membersByGroupId.get(group.id) ?? [],
                completedCount: 0,
                totalCount: 0,
                evaluatorAssignments: [],
            });
        }

        for (const assignment of assignments) {
            if (!assignment.evaluator_group_id) continue;

            if (!rowMap.has(assignment.evaluator_group_id)) {
                rowMap.set(assignment.evaluator_group_id, {
                    groupId: assignment.evaluator_group_id,
                    groupName: assignment.evaluator_group?.name ?? "Grupo",
                    groupColor: assignment.evaluator_group?.color ?? null,
                    groupMembers: membersByGroupId.get(assignment.evaluator_group_id) ?? [],
                    completedCount: 0,
                    totalCount: 0,
                    evaluatorAssignments: [],
                });
            }

            const row = rowMap.get(assignment.evaluator_group_id)!;
            row.totalCount++;
            if (assignment.eval_submission_id) row.completedCount++;
            row.evaluatorAssignments.push(assignment);
        }

        return [...rowMap.values()].sort((a, b) => a.groupName.localeCompare(b.groupName));
    }, [assignments, allGroups, groupByStudentId, students]);

    function buildReviewAssignments(evals: Assignment[]) {
        return evals.map(a => ({
            id: a.id,
            targetName: a.target_student?.full_name
                ?? a.target_submission?.group?.name
                ?? a.target_submission?.student?.full_name
                ?? "Alumno",
            isOutlier: a.is_outlier,
            reliabilityScore: a.reliability_score,
            validatedNumericAnswers: a.validated_numeric_answers ?? null,
            evalSubmission: a.eval_submission ?? null,
        }));
    }

    function handleOutlierToggled(assignmentId: string, newValue: boolean) {
        setAssignments(prev => prev.map(a =>
            a.id === assignmentId ? { ...a, is_outlier: newValue } : a
        ));
    }

    function handleQuestionValidated(assignmentId: string, _questionId: string, _validated: boolean, newMap: Record<string, boolean>) {
        setAssignments(prev => prev.map(a =>
            a.id === assignmentId ? { ...a, validated_numeric_answers: newMap } : a
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

                    {/* Generate/Regenerate buttons only for non-intra_group */}
                    {mode !== 'intra_group' && (!hasAssignments ? (
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
                    ))}

                </div>
            </div>

            {mode === 'intra_group' ? (
                intraGroupRows.length === 0 ? (
                    <EmptyState />
                ) : (
                    <IntraGroupTable
                        rows={intraGroupRows}
                        evalMode={evalMode}
                        rubric={rubric}
                        evalQuestions={evalQuestions}
                        onReview={(row) => setReviewTarget({
                            name: row.studentName,
                            assignments: buildReviewAssignments(row.evaluatorAssignments),
                        })}
                    />
                )
            ) : mode === "group" ? (
                groupEvalRows.length === 0 ? (
                    <EmptyState />
                ) : (
                    <>
                        {!hasAssignments && !evaluateAllGroups && (
                            <div className="px-5 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[11px] text-amber-400 font-medium">
                                Sin asignaciones generadas. Pulsa "Generar asignaciones" para distribuir las evaluaciones.
                            </div>
                        )}
                        <GroupEvalTable
                            rows={groupEvalRows}
                            onReview={(row) => setReviewTarget({
                                name: row.groupName,
                                assignments: buildReviewAssignments(row.evaluatorAssignments),
                            })}
                        />
                    </>
                )
            ) : (
                evaluatorRows.length === 0 ? (
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
                            onReview={(key) => {
                                const ev = evaluatorRows.find(r => r.evaluatorKey === key);
                                if (!ev) return;
                                setReviewTarget({
                                    name: ev.evaluatorName,
                                    assignments: buildReviewAssignments(ev.assignments),
                                });
                            }}
                        />
                    </>
                )
            )}

            {/* Review Modal */}
            <PeerEvalReviewModal
                open={reviewTarget !== null}
                onClose={() => setReviewTarget(null)}
                evaluatorName={reviewTarget?.name ?? ''}
                assignments={reviewTarget?.assignments ?? []}
                showLivePresentationNotes={livePresentationMode}
                evalMode={evalMode}
                rubric={rubric}
                evalQuestions={evalQuestions}
                onOutlierToggled={handleOutlierToggled}
                onQuestionValidated={handleQuestionValidated}
            />
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

function GroupEvalTable({ rows, onReview }: {
    rows: GroupEvalRow[];
    onReview: (row: GroupEvalRow) => void;
}) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const columns: ColumnDef<GroupEvalRow>[] = useMemo(() => [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Seleccionar todos"
                    className="border-border-strong"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Seleccionar fila"
                    className="border-border-strong"
                />
            ),
            enableSorting: false,
            size: 40,
        },
        {
            accessorKey: "groupName",
            header: ({ column }) => <SortBtn column={column} label="Grupo" />,
            cell: ({ row }) => {
                const currentRow = row.original;
                return (
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="size-9 rounded-2xl border shrink-0 flex items-center justify-center"
                            style={currentRow.groupColor
                                ? { backgroundColor: `${currentRow.groupColor}18`, borderColor: `${currentRow.groupColor}45`, color: currentRow.groupColor }
                                : { backgroundColor: "rgb(99 102 241 / 0.08)", borderColor: "rgb(99 102 241 / 0.25)", color: "rgb(129 140 248)" }}
                        >
                            <Users className="size-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[14px] font-bold text-foreground truncate uppercase tracking-tight font-mono">
                                {currentRow.groupName}
                            </p>
                            <p className="text-[10px] font-mono uppercase tracking-wide text-text-muted truncate">
                                {currentRow.groupMembers.length > 0
                                    ? currentRow.groupMembers.join(" · ")
                                    : "Sin miembros asignados"}
                            </p>
                        </div>
                    </div>
                );
            },
            size: 260,
        },
        {
            id: "evals",
            header: ({ column }) => <SortBtn column={column} label="Evals. hechas" />,
            cell: ({ row }) => {
                const currentRow = row.original;
                if (currentRow.totalCount === 0) {
                    return (
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border bg-surface-dark border-border-strong text-text-muted">
                            0<span className="text-text-muted/50">/0</span>
                        </span>
                    );
                }

                const allDone = currentRow.completedCount === currentRow.totalCount;
                const noneDone = currentRow.completedCount === 0;
                return (
                    <span className={cn(
                        "text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border",
                        allDone
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : noneDone
                                ? "bg-red-500/10 border-red-500/20 text-red-400"
                                : "bg-surface-dark border-border-strong text-foreground"
                    )}>
                        {currentRow.completedCount}<span className="text-text-muted/50">/{currentRow.totalCount}</span>
                    </span>
                );
            },
            sortingFn: (a, b) => {
                const left = a.original.totalCount === 0 ? -1 : a.original.completedCount / Math.max(a.original.totalCount, 1);
                const right = b.original.totalCount === 0 ? -1 : b.original.completedCount / Math.max(b.original.totalCount, 1);
                return left - right;
            },
            enableSorting: true,
            size: 140,
        },
        {
            id: "actions",
            header: () => <span className="text-right block uppercase text-[11px] font-mono font-medium tracking-wider">Acciones</span>,
            cell: ({ row }) => {
                const currentRow = row.original;
                if (currentRow.totalCount === 0) return null;
                return (
                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] px-2.5 border-border/50 gap-1.5"
                            onClick={() => onReview(currentRow)}
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
    ], [onReview]);

    const table = useReactTable({
        data: rows,
        columns,
        state: { sorting, rowSelection },
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId: (row) => row.groupId,
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
                                    Sin grupos configurados
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows.map(row => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() ? "selected" : undefined}
                                className={cn(
                                    "group transition-colors odd:bg-muted/60 even:bg-transparent hover:bg-blue-500/10",
                                    row.getIsSelected() && "bg-accent-blue/10 hover:bg-accent-blue/15"
                                )}
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


// ─── Intra-group table ────────────────────────────────────────────────────────

function computeAvgReceivedScore(
    receivedAssignments: Assignment[],
    evalMode: "rubric" | "questions",
    rubric: RubricCriteria[],
    evalQuestions: QuizQuestion[],
): number | null {
    const completed = receivedAssignments.filter(a => a.eval_submission !== null && !a.is_outlier);
    if (completed.length === 0) return null;

    if (evalMode === "rubric") {
        const rubricMax = rubric.reduce((sum, c) =>
            sum + Math.max(0, ...(c.levels ?? []).map(l => l.points)), 0);
        if (rubricMax === 0) return null;
        const scores = completed.map(a => {
            const s = a.eval_submission?.self_eval_rubric_scores ?? {};
            const total = Object.values(s).reduce((acc: number, v) => acc + (v as number), 0);
            return (total / rubricMax) * 10;
        });
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        return Math.round(avg * 100) / 100;
    }

    // questions mode: only numeric questions with weight > 0 contribute.
    // If requireJustification is true, the answer only counts if the teacher validated it.
    const numericQs = evalQuestions.filter(q => q.type === 'numeric' && (q.points ?? 0) > 0);
    if (numericQs.length === 0) return null;
    const scores = completed.map(a => {
        const answers = a.eval_submission?.self_eval_justifications ?? {};
        const validated = a.validated_numeric_answers ?? null;
        let weightedSum = 0, totalWeight = 0;
        for (const q of numericQs) {
            // Skip if question requires justification and hasn't been validated by teacher
            if ((q as any).requireJustification && validated?.[q.id] !== true) continue;
            const raw = parseFloat(answers[q.id] ?? '');
            if (isNaN(raw)) continue;
            const min = q.numericMin ?? 0, max = q.numericMax ?? 10;
            const norm = max > min ? ((raw - min) / (max - min)) * 10 : 5;
            weightedSum += norm * (q.points ?? 1);
            totalWeight += (q.points ?? 1);
        }
        return totalWeight > 0 ? weightedSum / totalWeight : null;
    }).filter((s): s is number => s !== null);
    if (scores.length === 0) return null;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg * 100) / 100;
}

function IntraGroupTable({ rows, onReview, evalMode, rubric, evalQuestions }: {
    rows: IntraGroupRow[];
    onReview: (row: IntraGroupRow) => void;
    evalMode: "rubric" | "questions";
    rubric: RubricCriteria[];
    evalQuestions: QuizQuestion[];
}) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [isPendingBulkValidate, startBulkValidate] = useTransition();

    const columns: ColumnDef<IntraGroupRow>[] = useMemo(() => [
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
            accessorKey: "studentName",
            header: ({ column }) => <SortBtn column={column} label="Alumno" />,
            cell: ({ row }) => {
                const r = row.original;
                const initial = r.studentName.charAt(0).toUpperCase();
                return (
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-xl border bg-surface-dark border-border-strong text-text-muted flex items-center justify-center text-[11px] font-black shrink-0 shadow-inner">
                            {initial}
                        </div>
                        <span className="text-[14px] font-bold text-foreground truncate uppercase tracking-tight font-mono">{r.studentName}</span>
                    </div>
                );
            },
            size: 220,
        },
        {
            accessorKey: "groupName",
            header: ({ column }) => <SortBtn column={column} label="Grupo" />,
            cell: ({ row }) => {
                const r = row.original;
                if (r.groupName === '—') return <span className="text-text-muted text-xs">—</span>;
                return (
                    <div className="flex items-center gap-2">
                        <div
                            className="size-4 rounded-md border shrink-0"
                            style={r.groupColor
                                ? { backgroundColor: `${r.groupColor}20`, borderColor: `${r.groupColor}50` }
                                : { backgroundColor: "rgb(99 102 241 / 0.1)", borderColor: "rgb(99 102 241 / 0.3)" }}
                        />
                        <span className="text-[12px] font-bold text-foreground uppercase tracking-tight font-mono truncate">
                            {r.groupName}
                        </span>
                    </div>
                );
            },
            size: 140,
        },
        {
            id: "made",
            header: ({ column }) => <SortBtn column={column} label="Evals. hechas" />,
            cell: ({ row }) => {
                const r = row.original;
                if (r.madeTotal === 0) return <span className="text-text-muted/20 font-mono text-[10px]">—</span>;
                const allDone = r.madeCompleted === r.madeTotal;
                const noneDone = r.madeCompleted === 0;
                return (
                    <span className={cn(
                        "text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border",
                        allDone ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : noneDone ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : "bg-surface-dark border-border-strong text-foreground"
                    )}>
                        {r.madeCompleted}<span className="text-text-muted/50">/{r.madeTotal}</span>
                    </span>
                );
            },
            sortingFn: (a, b) => (a.original.madeCompleted / Math.max(a.original.madeTotal, 1)) - (b.original.madeCompleted / Math.max(b.original.madeTotal, 1)),
            enableSorting: true,
            size: 130,
        },
        {
            id: "received",
            header: ({ column }) => <SortBtn column={column} label="Evals. recibidas" />,
            cell: ({ row }) => {
                const r = row.original;
                if (r.receivedTotal === 0) return <span className="text-text-muted/20 font-mono text-[10px]">—</span>;
                const allDone = r.receivedCompleted === r.receivedTotal;
                const noneDone = r.receivedCompleted === 0;
                return (
                    <span className={cn(
                        "text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border",
                        allDone ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : noneDone ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : "bg-surface-dark border-border-strong text-foreground"
                    )}>
                        {r.receivedCompleted}<span className="text-text-muted/50">/{r.receivedTotal}</span>
                    </span>
                );
            },
            sortingFn: (a, b) => (a.original.receivedCompleted / Math.max(a.original.receivedTotal, 1)) - (b.original.receivedCompleted / Math.max(b.original.receivedTotal, 1)),
            enableSorting: true,
            size: 140,
        },
        {
            id: "avgScore",
            header: ({ column }) => <SortBtn column={column} label="Nota media" />,
            cell: ({ row }) => {
                const r = row.original;
                const score = computeAvgReceivedScore(r.receivedAssignments, evalMode, rubric, evalQuestions);
                if (score === null) return <span className="text-text-muted/20 font-mono text-[10px]">—</span>;
                return (
                    <span className={cn(
                        "text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border",
                        score >= 7 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : score >= 5 ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            : "bg-red-500/10 border-red-500/20 text-red-400"
                    )}>
                        {score.toFixed(2)}<span className="text-text-muted/50">/10</span>
                    </span>
                );
            },
            sortingFn: (a, b) => {
                const sa = computeAvgReceivedScore(a.original.receivedAssignments, evalMode, rubric, evalQuestions) ?? -1;
                const sb = computeAvgReceivedScore(b.original.receivedAssignments, evalMode, rubric, evalQuestions) ?? -1;
                return sa - sb;
            },
            enableSorting: true,
            size: 120,
        },
        {
            id: "actions",
            header: () => <span className="text-right block uppercase text-[11px] font-mono font-medium tracking-wider">Acciones</span>,
            cell: ({ row }) => {
                const r = row.original;
                if (r.madeTotal === 0) return null;
                return (
                    <div className="flex justify-end">
                        <Button variant="outline" size="sm" className="h-7 text-[10px] px-2.5 border-border/50 gap-1.5" onClick={() => onReview(r)}>
                            <Eye className="size-3" />
                            Ver evals
                        </Button>
                    </div>
                );
            },
            enableSorting: false,
            size: 110,
        },
    ], [onReview, evalMode, rubric, evalQuestions]);

    const table = useReactTable({
        data: rows,
        columns,
        state: { sorting, rowSelection },
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId: (row) => row.studentId,
        enableRowSelection: true,
    });

    const selectedCount = Object.keys(rowSelection).length;
    const selectedRows = table.getSelectedRowModel().rows.map(r => r.original);

    // Numeric questions requiring teacher validation before counting toward avg
    const validatableQuestionIds = useMemo(() =>
        evalQuestions
            .filter(q => q.type === 'numeric' && (q.points ?? 0) > 0 && (q as any).requireJustification)
            .map(q => q.id),
    [evalQuestions]);

    function handleBulkValidate() {
        const assignmentIds = selectedRows
            .flatMap(r => r.receivedAssignments)
            .filter(a => a.eval_submission !== null && !a.is_outlier)
            .map(a => a.id);
        if (assignmentIds.length === 0 || validatableQuestionIds.length === 0) {
            toast.error("No hay respuestas numéricas pendientes de validar en la selección.");
            return;
        }
        startBulkValidate(async () => {
            const res = await bulkValidateNumericAnswers(assignmentIds, validatableQuestionIds, true);
            if (res.error) { toast.error(res.error); return; }
            toast.success(`Validadas ${assignmentIds.length} evaluación(es) para ${selectedRows.length} alumno(s).`);
            setRowSelection({});
        });
    }

    return (
        <div className="bg-surface border border-border-strong rounded-[2rem] overflow-hidden flex flex-col shadow-xl shadow-black/5">
            {selectedCount > 0 && (
                <div className="flex items-center gap-3 px-5 py-2.5 bg-accent-blue/5 border-b border-accent-blue/20">
                    <span className="text-[11px] font-black text-accent-blue uppercase tracking-wider">
                        {selectedCount} seleccionado{selectedCount !== 1 ? "s" : ""}
                    </span>
                    <div className="flex-1" />
                    {validatableQuestionIds.length > 0 && (
                        <Button
                            size="sm"
                            disabled={isPendingBulkValidate}
                            onClick={handleBulkValidate}
                            className="h-7 text-[10px] gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                        >
                            <ShieldCheck className="size-3" />
                            Validar respuestas
                        </Button>
                    )}
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
                                <TableCell colSpan={columns.length} className="h-24 text-center text-text-muted/40 text-xs">Sin datos</TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows.map(row => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() ? "selected" : undefined}
                                className={cn("group transition-colors odd:bg-muted/60 even:bg-transparent hover:bg-blue-500/10",
                                    row.getIsSelected() && "bg-accent-blue/10 hover:bg-accent-blue/15")}
                            >
                                {row.getVisibleCells().map(cell => (
                                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
