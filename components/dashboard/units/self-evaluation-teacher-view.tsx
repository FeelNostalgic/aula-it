"use client";

import { useState, useEffect } from "react";
import { UserCheck, CheckCircle2, Minus, TrendingUp, TrendingDown, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { criteriaMaxPoints, type RubricCriteria, type EvalQuestion, type EvalMode } from "@/types/activity";
import { getSelfEvaluationResults } from "@/app/dashboard/units/[id]/actions";

interface SelfEvaluationTeacherViewProps {
    stepId: string;
    stepTitle: string;
}

type Row = {
    student_id: string;
    student_name: string | null;
    self_eval_rubric_scores: Record<string, number> | null;
    self_eval_justifications: Record<string, string> | null;
    teacher_score: number | null;
    status: string;
};

export function SelfEvaluationTeacherView({ stepId, stepTitle }: SelfEvaluationTeacherViewProps) {
    const [rows, setRows] = useState<Row[]>([]);
    const [rubric, setRubric] = useState<RubricCriteria[]>([]);
    const [evalMode, setEvalMode] = useState<EvalMode>("rubric");
    const [questions, setQuestions] = useState<EvalQuestion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSelfEvaluationResults(stepId).then(res => {
            if (res.rows) setRows(res.rows);
            if (res.rubric) setRubric(res.rubric);
            if (res.evalMode) setEvalMode(res.evalMode);
            if (res.questions) setQuestions(res.questions);
            setLoading(false);
        });
    }, [stepId]);

    const rubricMax = rubric.reduce((s, c) => s + criteriaMaxPoints(c), 0);

    function selfScore(row: Row): number | null {
        if (!row.self_eval_rubric_scores) return null;
        const total = Object.values(row.self_eval_rubric_scores).reduce((a, b) => a + b, 0);
        return rubricMax > 0 ? Math.round((total / rubricMax) * 1000) / 100 : null;
    }

    if (loading) {
        return (
            <div className="space-y-3 animate-pulse">
                <div className="h-16 rounded-2xl bg-surface-dark" />
                <div className="h-48 rounded-2xl bg-surface-dark" />
            </div>
        );
    }

    const submittedRows = rows.filter(r =>
        evalMode === "questions"
            ? !!r.self_eval_justifications
            : !!r.self_eval_rubric_scores
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 p-5 bg-surface border border-border-strong rounded-2xl shadow-xl shadow-black/5">
                <div className="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    {evalMode === "questions"
                        ? <MessageSquare className="size-5 text-indigo-400" />
                        : <UserCheck className="size-5 text-indigo-400" />
                    }
                </div>
                <div>
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                        Autoevaluación — {evalMode === "questions" ? "Preguntas abiertas" : "Rúbrica"}
                    </p>
                    <h2 className="text-base font-black text-foreground uppercase tracking-tighter">{stepTitle}</h2>
                    <p className="text-xs text-text-muted mt-0.5">{submittedRows.length} autoevaluaciones recibidas</p>
                </div>
            </div>

            {submittedRows.length === 0 ? (
                <div className="p-12 bg-surface-dark border border-white/5 rounded-2xl flex flex-col items-center text-center gap-4">
                    <UserCheck className="size-12 text-text-muted/20" />
                    <p className="text-sm font-medium text-foreground">Sin autoevaluaciones todavía</p>
                    <p className="text-xs text-text-muted max-w-xs">
                        Los alumnos aún no han enviado su autoevaluación para este paso.
                    </p>
                </div>
            ) : evalMode === "questions" ? (
                /* ── Questions mode: one card per student with their answers ── */
                <div className="space-y-3">
                    {submittedRows.map(row => (
                        <QuestionsCard
                            key={row.student_id}
                            row={row}
                            questions={questions}
                        />
                    ))}
                </div>
            ) : (
                /* ── Rubric mode: comparison table ── */
                <div className="bg-surface-dark border border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-text-muted">
                                <th className="px-5 py-3 text-left">Alumno</th>
                                <th className="px-4 py-3 text-center">Autoevaluación</th>
                                <th className="px-4 py-3 text-center">Nota profesor</th>
                                <th className="px-4 py-3 text-center">Diferencia</th>
                                <th className="px-4 py-3 text-right">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {submittedRows.map(row => {
                                const selfVal = selfScore(row);
                                const teacherVal = row.teacher_score;
                                const diff = selfVal !== null && teacherVal !== null
                                    ? Math.round((selfVal - teacherVal) * 100) / 100
                                    : null;
                                return (
                                    <tr key={row.student_id} className="hover:bg-white/2 transition-colors">
                                        <td className="px-5 py-3 font-semibold text-foreground">
                                            {row.student_name ?? "Alumno"}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {selfVal !== null ? (
                                                <span className="font-mono font-bold text-indigo-400">{selfVal.toFixed(2)}</span>
                                            ) : (
                                                <span className="text-text-muted">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {teacherVal !== null ? (
                                                <span className="font-mono font-bold text-emerald-400">{teacherVal}</span>
                                            ) : (
                                                <span className="text-text-muted text-xs">Sin calificar</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <DeltaBadge diff={diff} />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <StatusBadge status={row.status} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Questions mode card ────────────────────────────────────────────────────────

function QuestionsCard({ row, questions }: { row: Row; questions: EvalQuestion[] }) {
    const [expanded, setExpanded] = useState(false);
    const answers = row.self_eval_justifications ?? {};
    const answeredCount = questions.filter(q => (answers[q.id] ?? "").trim().length > 0).length;

    return (
        <div className="bg-surface-dark border border-white/5 rounded-2xl overflow-hidden">
            <button
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/2 transition-colors"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-foreground">{row.student_name ?? "Alumno"}</p>
                    <span className="text-xs text-text-muted">{answeredCount}/{questions.length} respondidas</span>
                    <StatusBadge status={row.status} />
                </div>
                {expanded ? <ChevronUp className="size-4 text-text-muted" /> : <ChevronDown className="size-4 text-text-muted" />}
            </button>
            {expanded && questions.length > 0 && (
                <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
                    {questions.map((q, idx) => {
                        const answer = answers[q.id] ?? "";
                        return (
                            <div key={q.id} className="space-y-1.5">
                                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                                    {idx + 1}. {q.text}
                                </p>
                                {answer.trim() ? (
                                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{answer}</p>
                                ) : (
                                    <p className="text-xs text-text-muted/50 italic">Sin respuesta</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function DeltaBadge({ diff }: { diff: number | null }) {
    if (diff === null) return <span className="text-text-muted">—</span>;
    const abs = Math.abs(diff);
    const isPos = diff > 0;
    const isNeutral = abs < 0.1;
    return (
        <span className={cn(
            "inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-lg",
            isNeutral
                ? "text-text-muted bg-white/5"
                : isPos
                    ? "text-amber-400 bg-amber-500/10"
                    : "text-sky-400 bg-sky-500/10"
        )}>
            {isNeutral
                ? <Minus className="size-3" />
                : isPos
                    ? <TrendingUp className="size-3" />
                    : <TrendingDown className="size-3" />
            }
            {isNeutral ? "±0" : `${isPos ? "+" : ""}${diff.toFixed(2)}`}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === "published") {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="size-3" /> Publicada
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-surface text-text-muted border border-border/50">
            {status}
        </span>
    );
}
