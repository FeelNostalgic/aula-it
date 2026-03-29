"use client";

import { useState, useTransition, useEffect, useMemo, useCallback } from "react";
import { Users2, AlertTriangle, CheckCircle2, Clock, RefreshCw, PlayCircle, Send, ShieldAlert, Star, Eye, EyeOff, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    generatePeerAssignments,
    getPeerEvaluationResults,
    computeEvaluatorReliability,
    publishPeerFinalGrades,
    togglePeerFeedbackVisible,
    overridePeerScore,
} from "@/app/dashboard/units/[id]/actions";
import { toast } from "sonner";

interface PeerEvaluationTeacherViewProps {
    stepId: string;
    moduleId: string;
    stepTitle: string;
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
};

// Group assignments by evaluator (evaluator_id or evaluator_group_id)
type EvaluatorRow = {
    evaluatorKey: string;
    evaluatorName: string;
    isGroup: boolean;
    assignments: Assignment[];
    completedCount: number;
    totalCount: number;
    avgReliability: number | null;
    hasOutlier: boolean;
};

export function PeerEvaluationTeacherView({ stepId, moduleId, stepTitle }: PeerEvaluationTeacherViewProps) {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [mode, setMode] = useState<string>("individual");
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    const load = () => {
        setLoading(true);
        getPeerEvaluationResults(stepId).then(res => {
            if (res.assignments) setAssignments(res.assignments as Assignment[]);
            setFeedbackVisible(res.peerFeedbackVisibleToStudents ?? false);
            setMode(res.mode ?? "individual");
            setLoading(false);
        });
    };

    useEffect(() => { load(); }, [stepId]);

    const evaluatorRows = useMemo<EvaluatorRow[]>(() => {
        const map = new Map<string, EvaluatorRow>();
        for (const a of assignments) {
            const key = a.evaluator_id ?? a.evaluator_group_id ?? "unknown";
            const isGroup = !!a.evaluator_group_id;
            const name = isGroup
                ? (a.evaluator_group?.name ?? "Grupo")
                : (a.evaluator?.full_name ?? "Alumno");
            if (!map.has(key)) {
                map.set(key, { evaluatorKey: key, evaluatorName: name, isGroup, assignments: [], completedCount: 0, totalCount: 0, avgReliability: null, hasOutlier: false });
            }
            const row = map.get(key)!;
            row.assignments.push(a);
            row.totalCount++;
            if (a.eval_submission_id) row.completedCount++;
            if (a.is_outlier) row.hasOutlier = true;
        }
        // Compute avg reliability per evaluator
        for (const row of map.values()) {
            const scored = row.assignments.filter(a => a.reliability_score !== null);
            if (scored.length > 0) {
                row.avgReliability = scored.reduce((s, a) => s + a.reliability_score!, 0) / scored.length;
            }
        }
        return [...map.values()].sort((a, b) => a.evaluatorName.localeCompare(b.evaluatorName));
    }, [assignments]);

    // Group submissions by target (who is being evaluated)
    const targetRows = useMemo(() => {
        const map = new Map<string, {
            submissionId: string;
            targetName: string;
            count: number;
            teacherScore: number | null;
            overrideScore: number | null;
        }>();
        for (const a of assignments) {
            const key = a.target_submission_id;
            const name = a.target_submission?.group?.name
                ?? a.target_submission?.student?.full_name
                ?? "Alumno";
            if (!map.has(key)) {
                map.set(key, {
                    submissionId: key,
                    targetName: name,
                    count: 0,
                    teacherScore: a.target_submission?.score ?? null,
                    overrideScore: a.target_submission?.peer_eval_override_score ?? null,
                });
            }
            if (a.eval_submission_id) map.get(key)!.count++;
        }
        return [...map.values()].sort((a, b) => a.targetName.localeCompare(b.targetName));
    }, [assignments]);

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

    function handlePublish(excludeOutliers: boolean) {
        startTransition(async () => {
            const res = await publishPeerFinalGrades(stepId, excludeOutliers);
            if (res.error) { toast.error(res.error); return; }
            toast.success("Notas finales publicadas.");
            load();
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
                    {!hasAssignments ? (
                        <Button onClick={handleGenerate} disabled={isPending} size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-500">
                            <PlayCircle className="size-4" />
                            Generar asignaciones
                        </Button>
                    ) : (
                        <>
                            <Button onClick={() => load()} variant="outline" size="sm" disabled={isPending} className="gap-2 border-border/50">
                                <RefreshCw className={cn("size-3.5", isPending && "animate-spin")} />
                                Actualizar
                            </Button>
                            <Button
                                onClick={handleToggleFeedback}
                                variant="outline"
                                size="sm"
                                disabled={isPending}
                                className={cn(
                                    "gap-2 border-border/50",
                                    feedbackVisible && "border-indigo-500/30 text-indigo-400 bg-indigo-500/5"
                                )}
                            >
                                {feedbackVisible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                                {feedbackVisible ? "Feedback visible" : "Mostrar feedback"}
                            </Button>
                            <Button onClick={handleComputeReliability} variant="outline" size="sm" disabled={isPending} className="gap-2 border-border/50">
                                <Star className="size-3.5 text-amber-400" />
                                Calcular fiabilidad
                            </Button>
                            <Button onClick={() => handlePublish(false)} size="sm" disabled={isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-500">
                                <Send className="size-3.5" />
                                Publicar notas
                            </Button>
                            {hasReliabilityData && assignments.some(a => a.is_outlier) && (
                                <Button onClick={() => handlePublish(true)} size="sm" variant="outline" disabled={isPending} className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                                    <ShieldAlert className="size-3.5" />
                                    Publicar (sin outliers)
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {!hasAssignments ? (
                <EmptyState />
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Evaluators table */}
                    <EvaluatorsTable rows={evaluatorRows} mode={mode} />
                    {/* Targets summary */}
                    <TargetsSummary
                        rows={targetRows}
                        totalAssignments={assignments.length}
                        mode={mode}
                        onOverrideChange={(submissionId, score) => {
                            setAssignments(prev => prev.map(a =>
                                a.target_submission_id === submissionId && a.target_submission
                                    ? { ...a, target_submission: { ...a.target_submission, peer_eval_override_score: score } }
                                    : a
                            ));
                        }}
                    />
                </div>
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

function EvaluatorsTable({ rows, mode }: { rows: EvaluatorRow[]; mode: string }) {
    const evaluatorLabel = mode === "group" ? "Grupos evaluadores" : mode === "intra_group" ? "Miembros evaluadores" : "Evaluadores";
    return (
        <div className="bg-surface-dark border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                {mode === "intra_group" ? <UserCheck className="size-4 text-indigo-400" /> : <Users2 className="size-4 text-indigo-400" />}
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">{evaluatorLabel}</h3>
            </div>
            <div className="divide-y divide-white/5">
                {rows.map(row => (
                    <EvaluatorRowItem key={row.evaluatorKey} row={row} />
                ))}
            </div>
        </div>
    );
}

function EvaluatorRowItem({ row }: { row: EvaluatorRow }) {
    const allDone = row.completedCount === row.totalCount;
    const noneDone = row.completedCount === 0;

    return (
        <div className="px-5 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{row.evaluatorName}</p>
                    {row.hasOutlier && (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[9px] px-1.5 py-0 bg-amber-500/5 shrink-0">
                            <AlertTriangle className="size-2.5 mr-1" /> Outlier
                        </Badge>
                    )}
                    {noneDone && (
                        <Badge variant="outline" className="border-red-500/30 text-red-400 text-[9px] px-1.5 py-0 bg-red-500/5 shrink-0">
                            No evaluó
                        </Badge>
                    )}
                </div>
                {row.avgReliability !== null && (
                    <p className="text-[10px] text-text-muted mt-0.5">
                        Fiabilidad: <span className={cn("font-bold", row.avgReliability >= 0.7 ? "text-emerald-400" : row.avgReliability >= 0.4 ? "text-amber-400" : "text-red-400")}>
                            {(row.avgReliability * 100).toFixed(0)}%
                        </span>
                    </p>
                )}
            </div>
            {/* Completion pills */}
            <div className="flex items-center gap-1 shrink-0">
                {row.assignments.map(a => (
                    <div
                        key={a.id}
                        title={a.target_submission?.student?.full_name ?? a.target_submission?.group?.name ?? ""}
                        className={cn(
                            "size-5 rounded-full border text-[9px] font-bold flex items-center justify-center shrink-0",
                            a.eval_submission_id
                                ? a.is_outlier
                                    ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                                    : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                : "bg-surface border-border/50 text-text-muted"
                        )}
                    >
                        {a.eval_submission_id ? <CheckCircle2 className="size-2.5" /> : <Clock className="size-2.5" />}
                    </div>
                ))}
            </div>
            <div className="text-xs font-mono text-text-muted shrink-0 w-10 text-right">
                <span className={cn("font-bold", allDone ? "text-emerald-400" : noneDone ? "text-red-400" : "text-foreground")}>
                    {row.completedCount}
                </span>
                /{row.totalCount}
            </div>
        </div>
    );
}

// ─── Targets summary ──────────────────────────────────────────────────────────

type TargetRow = {
    submissionId: string;
    targetName: string;
    count: number;
    teacherScore: number | null;
    overrideScore: number | null;
};

function TargetsSummary({ rows, totalAssignments, mode, onOverrideChange }: {
    rows: TargetRow[];
    totalAssignments: number;
    mode: string;
    onOverrideChange: (submissionId: string, score: number | null) => void;
}) {
    const targetLabel = mode === "group" ? "Grupos evaluados" : mode === "intra_group" ? "Miembros evaluados" : "Entregas evaluadas";
    const countLabel = mode === "intra_group" ? "miembros" : mode === "group" ? "grupos" : "entregas";
    return (
        <div className="bg-surface-dark border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-2">
                {mode === "intra_group" ? <Users className="size-4 text-emerald-400" /> : <CheckCircle2 className="size-4 text-emerald-400" />}
                <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">{targetLabel}</h3>
                <span className="ml-auto text-[10px] font-mono text-text-muted">{rows.length} {countLabel}</span>
            </div>
            <div className="divide-y divide-white/5">
                {rows.map((row) => (
                    <TargetRowItem key={row.submissionId} row={row} onOverrideChange={onOverrideChange} />
                ))}
            </div>
        </div>
    );
}

function TargetRowItem({ row, onOverrideChange }: {
    row: TargetRow;
    onOverrideChange: (submissionId: string, score: number | null) => void;
}) {
    const [editMode, setEditMode] = useState(false);
    const [value, setValue] = useState(row.overrideScore?.toString() ?? "");
    const [isPending, startTransition] = useTransition();

    function handleSave() {
        const parsed = value.trim() === "" ? null : parseFloat(value);
        if (parsed !== null && isNaN(parsed)) { setEditMode(false); return; }
        startTransition(async () => {
            const res = await overridePeerScore(row.submissionId, parsed as any);
            if ((res as any).error) { toast.error((res as any).error); return; }
            onOverrideChange(row.submissionId, parsed);
            setEditMode(false);
        });
    }

    return (
        <div className="px-5 py-3 flex items-center gap-4">
            <p className="text-sm font-medium text-foreground truncate flex-1">{row.targetName}</p>
            <div className="flex items-center gap-3 shrink-0">
                {row.teacherScore !== null && (
                    <span className="text-xs font-mono text-text-muted">
                        Profe: <span className="text-emerald-400 font-bold">{row.teacherScore}</span>
                    </span>
                )}
                {editMode ? (
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="10"
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            className="w-16 h-6 text-xs font-mono bg-surface border border-border/50 rounded px-1.5 text-foreground focus:outline-none focus:border-indigo-500/50"
                            autoFocus
                        />
                        <button
                            onClick={handleSave}
                            disabled={isPending}
                            className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20"
                        >OK</button>
                        <button
                            onClick={() => { setValue(row.overrideScore?.toString() ?? ""); setEditMode(false); }}
                            className="text-[10px] font-black text-text-muted hover:text-foreground px-1.5 py-0.5"
                        >✕</button>
                    </div>
                ) : (
                    <button
                        onClick={() => setEditMode(true)}
                        className={cn(
                            "text-xs font-mono px-2 py-0.5 rounded border transition-colors",
                            row.overrideScore !== null
                                ? "text-indigo-400 border-indigo-500/30 bg-indigo-500/10"
                                : "text-text-muted border-border/30 hover:border-border/60 hover:text-foreground"
                        )}
                    >
                        {row.overrideScore !== null ? `Override: ${row.overrideScore}` : "Override"}
                    </button>
                )}
                <span className="text-[10px] font-mono text-text-muted">
                    {row.count} eval{row.count !== 1 ? "s" : ""}
                </span>
            </div>
        </div>
    );
}
