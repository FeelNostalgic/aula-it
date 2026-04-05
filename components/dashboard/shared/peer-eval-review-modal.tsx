"use client";

import { useState, useEffect, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { setAssignmentOutlier, setQuestionValidation } from "@/app/dashboard/units/[id]/actions";
import { RubricCriteria, QuizQuestion } from "@/types/activity";
import { extractPeerEvaluationLiveNotes } from "@/lib/peer-evaluation-live-notes";
import { toast } from "sonner";
import { CheckCircle2, Clock, AlertTriangle, ChevronLeft, ChevronRight, ShieldCheck, ShieldOff, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type EvalMode = "rubric" | "questions";

type AssignmentForReview = {
    id: string;
    targetName: string;
    isOutlier: boolean | null;
    reliabilityScore: number | null;
    validatedNumericAnswers: Record<string, boolean> | null;
    evalSubmission: {
        self_eval_rubric_scores: Record<string, number> | null;
        self_eval_justifications: Record<string, string> | null;
        files: any[] | null;
    } | null;
};

interface PeerEvalReviewModalProps {
    open: boolean;
    onClose: () => void;
    evaluatorName: string;
    assignments: AssignmentForReview[];
    showLivePresentationNotes?: boolean;
    evalMode: EvalMode;
    rubric: RubricCriteria[];
    evalQuestions: QuizQuestion[];
    onOutlierToggled: (assignmentId: string, newValue: boolean) => void;
    onQuestionValidated?: (assignmentId: string, questionId: string, validated: boolean, newMap: Record<string, boolean>) => void;
}

export function PeerEvalReviewModal({
    open,
    onClose,
    evaluatorName,
    assignments,
    showLivePresentationNotes = false,
    evalMode,
    rubric,
    evalQuestions,
    onOutlierToggled,
    onQuestionValidated,
}: PeerEvalReviewModalProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isPending, startTransition] = useTransition();
    const [validatingQuestion, setValidatingQuestion] = useState<string | null>(null);

    // Reset selection when modal opens or evaluator changes
    useEffect(() => {
        if (open) setSelectedIndex(0);
    }, [open, evaluatorName]);

    // Keyboard navigation
    useEffect(() => {
        if (!open) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "ArrowUp" && selectedIndex > 0) setSelectedIndex(i => i - 1);
            if (e.key === "ArrowDown" && selectedIndex < assignments.length - 1) setSelectedIndex(i => i + 1);
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, selectedIndex, assignments.length]);

    const selected = assignments[selectedIndex] ?? null;
    const completedCount = assignments.filter(a => a.evalSubmission !== null).length;

    function handleToggleOutlier() {
        if (!selected) return;
        const newValue = !selected.isOutlier;
        startTransition(async () => {
            const res = await setAssignmentOutlier(selected.id, newValue);
            if (res.error) { toast.error(res.error); return; }
            onOutlierToggled(selected.id, newValue);
            toast.success(newValue ? "Marcado como outlier." : "Outlier eliminado.");
        });
    }

    async function handleValidateQuestion(questionId: string, currentlyValidated: boolean) {
        if (!selected) return;
        setValidatingQuestion(questionId);
        const res = await setQuestionValidation(selected.id, questionId, !currentlyValidated);
        setValidatingQuestion(null);
        if (res.error) { toast.error(res.error); return; }
        onQuestionValidated?.(selected.id, questionId, !currentlyValidated, res.validated_numeric_answers ?? {});
        toast.success(!currentlyValidated ? "Respuesta validada." : "Validación retirada.");
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent
                className="max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={() => onClose()}
            >
                <DialogHeader className="shrink-0 px-6 py-4 pr-14 border-b border-border-strong">
                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                        <div className="flex items-center gap-1 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0 border-border-strong text-text-muted hover:text-foreground"
                                onClick={() => setSelectedIndex(i => Math.max(0, i - 1))}
                                disabled={selectedIndex === 0}
                                title="Anterior (↑)"
                            >
                                <ChevronLeft className="size-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0 border-border-strong text-text-muted hover:text-foreground"
                                onClick={() => setSelectedIndex(i => Math.min(assignments.length - 1, i + 1))}
                                disabled={selectedIndex === assignments.length - 1}
                                title="Siguiente (↓)"
                            >
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                        <span>Evaluaciones de</span>
                        <span className="text-text-muted font-normal truncate">{evaluatorName}</span>
                        <Badge variant="outline" className="ml-auto shrink-0 border-border-strong text-text-muted text-[10px]">
                            {completedCount}/{assignments.length} completadas
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
                    {/* Left: list of assignments */}
                    <ResizablePanel defaultSize={38} minSize={25}>
                        <div className="h-full flex flex-col bg-surface overflow-y-auto">
                            <div className="px-4 py-2 border-b border-border-strong">
                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-text-muted">
                                    Alumnos evaluados
                                </p>
                            </div>
                            <div className="flex-1 divide-y divide-border/30">
                                {assignments.map((a, i) => {
                                    const isActive = i === selectedIndex;
                                    const isDone = a.evalSubmission !== null;
                                    return (
                                        <button
                                            key={a.id}
                                            onClick={() => setSelectedIndex(i)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 text-left transition-all relative",
                                                isActive
                                                    ? "bg-accent-blue/10 text-accent-blue"
                                                    : "hover:bg-white/5 text-text-muted hover:text-foreground"
                                            )}
                                        >
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-accent-blue rounded-full" />
                                            )}
                                            <div className={cn(
                                                "size-6 rounded-full flex items-center justify-center border shrink-0",
                                                isDone
                                                    ? a.isOutlier
                                                        ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                                                        : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                                    : "bg-surface-dark border-border-strong text-text-muted"
                                            )}>
                                                {isDone
                                                    ? <CheckCircle2 className="size-3.5" />
                                                    : <Clock className="size-3.5" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-semibold truncate">{a.targetName}</p>
                                                {a.reliabilityScore !== null && (
                                                    <p className="text-[9px] font-mono text-text-muted/60">
                                                        fiab: <span className={cn(
                                                            "font-bold",
                                                            a.reliabilityScore >= 0.7 ? "text-emerald-400"
                                                            : a.reliabilityScore >= 0.4 ? "text-amber-400"
                                                            : "text-red-400"
                                                        )}>{(a.reliabilityScore * 100).toFixed(0)}%</span>
                                                    </p>
                                                )}
                                            </div>
                                            {a.isOutlier && (
                                                <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[9px] px-1.5 py-0 bg-amber-500/5 shrink-0">
                                                    <AlertTriangle className="size-2.5 mr-0.5" />outlier
                                                </Badge>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Right: evaluation detail */}
                    <ResizablePanel defaultSize={62} minSize={40}>
                        <div className="h-full flex flex-col bg-surface-dark overflow-y-auto">
                            {selected ? (
                                <>
                                    {/* Sub-header */}
                                    <div className="px-6 py-3 border-b border-border-strong flex items-center gap-3 shrink-0">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-text-muted uppercase tracking-widest mb-0.5">Evaluando a</p>
                                            <p className="text-sm font-bold text-foreground truncate">{selected.targetName}</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={isPending || !selected.evalSubmission}
                                            onClick={handleToggleOutlier}
                                            className={cn(
                                                "gap-2 text-[11px] border-border/50 transition-colors",
                                                selected.isOutlier && "border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10"
                                            )}
                                        >
                                            <AlertTriangle className="size-3" />
                                            {selected.isOutlier ? "Quitar outlier" : "Marcar outlier"}
                                        </Button>
                                    </div>

                                    {/* Content */}
                                    {selected.evalSubmission === null ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3">
                                            <Clock className="size-10 text-text-muted/20" />
                                            <p className="text-sm font-semibold text-foreground">Sin respuesta enviada</p>
                                            <p className="text-xs text-text-muted">Este evaluador aún no ha completado esta evaluación.</p>
                                        </div>
                                    ) : evalMode === "rubric" ? (
                                        <RubricAnswersPanel
                                            rubric={rubric}
                                            scores={selected.evalSubmission.self_eval_rubric_scores ?? {}}
                                            justifications={selected.evalSubmission.self_eval_justifications ?? {}}
                                            qaNotes={extractPeerEvaluationLiveNotes(selected.evalSubmission.files)}
                                            showLivePresentationNotes={showLivePresentationNotes}
                                        />
                                    ) : (
                                        <QuestionsAnswersPanel
                                            questions={evalQuestions}
                                            answers={selected.evalSubmission.self_eval_justifications ?? {}}
                                            qaNotes={extractPeerEvaluationLiveNotes(selected.evalSubmission.files)}
                                            showLivePresentationNotes={showLivePresentationNotes}
                                            validatedNumericAnswers={selected.validatedNumericAnswers ?? {}}
                                            onValidateQuestion={handleValidateQuestion}
                                            validatingQuestion={validatingQuestion}
                                        />
                                    )}
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-text-muted/30 text-sm">
                                    Selecciona una evaluación
                                </div>
                            )}
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </DialogContent>
        </Dialog>
    );
}

// ─── Rubric answers (read-only) ───────────────────────────────────────────────

function RubricAnswersPanel({
    rubric,
    scores,
    justifications,
    qaNotes,
    showLivePresentationNotes,
}: {
    rubric: RubricCriteria[];
    scores: Record<string, number>;
    justifications: Record<string, string>;
    qaNotes: string | null;
    showLivePresentationNotes: boolean;
}) {
    if (!rubric.length) {
        return (
            <div className="flex-1 flex items-center justify-center text-text-muted/40 text-sm p-8">
                Sin rúbrica configurada.
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {rubric.map((criterion) => {
                const selectedPoints = scores[criterion.id] ?? null;
                const selectedLevel = criterion.levels?.find(l => l.points === selectedPoints) ?? null;
                const justification = justifications[criterion.id] ?? null;

                return (
                    <div key={criterion.id} className="space-y-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-foreground">{criterion.name}</p>
                            {criterion.description && (
                                <p className="text-[10px] text-text-muted mt-0.5">{criterion.description}</p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(criterion.levels ?? []).map((level) => {
                                const isSelected = level.points === selectedPoints;
                                return (
                                    <div
                                        key={level.id}
                                        className={cn(
                                            "px-3 py-2 rounded-xl border text-[10px] transition-all",
                                            isSelected
                                                ? "bg-accent-blue/20 border-accent-blue/40 text-accent-blue font-bold ring-1 ring-accent-blue/30"
                                                : "bg-surface border-border/30 text-text-muted/50"
                                        )}
                                    >
                                        <span className="font-mono font-black">{level.points}p</span>
                                        {level.label && <span className="ml-1.5">{level.label}</span>}
                                        {level.description && (
                                            <p className="mt-0.5 text-[9px] opacity-70">{level.description}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {selectedLevel && (
                            <p className="text-[10px] font-mono text-accent-blue/60">
                                Seleccionado: <span className="font-bold">{selectedLevel.label ?? `${selectedLevel.points}p`}</span>
                            </p>
                        )}
                        {justification && (
                            <div className="bg-surface/50 border border-border/30 rounded-xl px-3 py-2">
                                <p className="text-[9px] font-black uppercase tracking-wider text-text-muted/60 mb-1">Justificación</p>
                                <p className="text-xs text-foreground/80 italic">{justification}</p>
                            </div>
                        )}
                        {!justification && (
                            <p className="text-[10px] text-text-muted/30 italic">Sin justificación proporcionada.</p>
                        )}
                    </div>
                );
            })}
            <LivePresentationNotesBlock
                qaNotes={qaNotes}
                showLivePresentationNotes={showLivePresentationNotes}
            />
        </div>
    );
}

// ─── Questions answers (read-only) ────────────────────────────────────────────

function QuestionsAnswersPanel({
    questions,
    answers,
    qaNotes,
    showLivePresentationNotes,
    validatedNumericAnswers,
    onValidateQuestion,
    validatingQuestion,
}: {
    questions: QuizQuestion[];
    answers: Record<string, string>;
    qaNotes: string | null;
    showLivePresentationNotes: boolean;
    validatedNumericAnswers: Record<string, boolean>;
    onValidateQuestion?: (questionId: string, currentlyValidated: boolean) => void;
    validatingQuestion?: string | null;
}) {
    if (!questions.length) {
        return (
            <div className="flex-1 flex items-center justify-center text-text-muted/40 text-sm p-8">
                Sin preguntas configuradas.
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 space-y-5 overflow-y-auto">
            {questions.map((q, idx) => {
                const answer = answers[q.id] ?? null;
                const needsValidation = q.type === 'numeric' && (q.points ?? 0) > 0 && (q as any).requireJustification;
                const isValidated = validatedNumericAnswers[q.id] === true;
                const isValidating = validatingQuestion === q.id;

                return (
                    <div key={q.id} className={cn(
                        "space-y-2 rounded-xl p-3 border transition-colors",
                        needsValidation
                            ? isValidated
                                ? "border-emerald-500/30 bg-emerald-500/5"
                                : "border-amber-500/20 bg-amber-500/5"
                            : "border-transparent"
                    )}>
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground">
                                <span className="text-text-muted/50 font-mono mr-1">{idx + 1}.</span>
                                {q.text}
                                {needsValidation && (
                                    <span className={cn(
                                        "ml-2 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border",
                                        isValidated
                                            ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                                            : "text-amber-400 border-amber-500/30 bg-amber-500/10"
                                    )}>
                                        {isValidated ? "Validada" : "Pendiente"}
                                    </span>
                                )}
                            </p>
                            {needsValidation && answer && onValidateQuestion && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isValidating}
                                    onClick={() => onValidateQuestion(q.id, isValidated)}
                                    className={cn(
                                        "shrink-0 h-7 text-[10px] gap-1.5 border transition-colors",
                                        isValidated
                                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30"
                                            : "border-amber-500/30 text-amber-400 bg-amber-500/10 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30"
                                    )}
                                >
                                    {isValidated
                                        ? <><ShieldOff className="size-3" />Retirar</>
                                        : <><ShieldCheck className="size-3" />Validar</>
                                    }
                                </Button>
                            )}
                        </div>
                        <div className="bg-surface/50 border border-border/30 rounded-xl px-3 py-2">
                            {answer ? (
                                q.type === 'numeric' ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-foreground tabular-nums">{answer}</span>
                                        <span className="text-[10px] text-text-muted/50 font-mono">
                                            [{q.numericMin ?? 0} – {q.numericMax ?? 10}]
                                        </span>
                                        {(q.points ?? 0) > 0 && (
                                            <span className="text-[9px] font-mono text-text-muted/50">{q.points}% peso</span>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-foreground/80">{answer}</p>
                                )
                            ) : (
                                <p className="text-xs text-text-muted/40 italic">Sin respuesta.</p>
                            )}
                        </div>
                    </div>
                );
            })}
            <LivePresentationNotesBlock
                qaNotes={qaNotes}
                showLivePresentationNotes={showLivePresentationNotes}
            />
        </div>
    );
}

function LivePresentationNotesBlock({
    qaNotes,
    showLivePresentationNotes,
}: {
    qaNotes: string | null;
    showLivePresentationNotes: boolean;
}) {
    if (!showLivePresentationNotes) {
        return null;
    }

    return (
        <div className="space-y-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
            <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-indigo-400" />
                <p className="text-xs font-black uppercase tracking-wider text-indigo-300">Sesión de preguntas</p>
            </div>
            {qaNotes ? (
                <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">{qaNotes}</p>
            ) : (
                <p className="text-xs italic text-text-muted">Sin observaciones enviadas.</p>
            )}
        </div>
    );
}
