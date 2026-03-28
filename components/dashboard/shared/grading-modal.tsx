"use client";

import { useState, useEffect, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { gradeSubmission, saveQuizShortAnswerScores, StepSubmissionRow, SubmissionFile } from "@/app/dashboard/units/[id]/actions";
import { urlToPreviewUrl } from "@/lib/google-drive-urls";
import { RubricCriteria, criteriaMaxPoints, QuizContent, QuizQuestion } from "@/types/activity";
import { toast } from "sonner";
import { ExternalLink, FileText, File, Image, Video, User, Calendar, CheckCircle2, XCircle, Circle, AlertTriangle, ChevronLeft, ChevronRight, AlignLeft, UserCheck, MessageSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { buildQuestionReview, getQuestionType, QUIZ_QUESTION_TYPE } from "@/lib/quiz-core";

type GradingMode = 'score' | 'rubric' | 'complete';

interface GradingModalProps {
    submission: StepSubmissionRow | null;
    rubric?: RubricCriteria[];
    open: boolean;
    onClose: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
    onPrev?: () => void;
    onNext?: () => void;
    onGraded: (
        submissionId: string,
        score: number | null,
        feedback: string | null,
        completed: boolean,
        gradingMode: GradingMode
    ) => void;
}

export function GradingModal({ submission, rubric, open, onClose, hasPrev, hasNext, onPrev, onNext, onGraded }: GradingModalProps) {
    const [gradingMode, setGradingMode] = useState<GradingMode>('score');
    const [score, setScore] = useState<string>("");
    const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
    const [selfEvalRubricScores, setSelfEvalRubricScores] = useState<Record<string, number>>({});
    const [feedback, setFeedback] = useState<string>("");
    const [shortAnswerScores, setShortAnswerScores] = useState<Record<string, number>>({});
    const [shortAnswerFeedback, setShortAnswerFeedback] = useState<Record<string, string>>({});
    const [isPending, startTransition] = useTransition();
    const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

    const isQuiz = submission?.step_type === "quiz";
    const isSelfEval = submission?.step_type === "self_evaluation";
    const isSelfEvalRubric = isSelfEval && submission?.step_eval_mode === 'rubric';
    const quizContent = submission?.quiz_content ?? null;
    
    // We try to get the attempt for evaluation.
    // If a specific one is selected via UI, we use that.
    // Otherwise we default to the submission's quiz_attempt (legacy) or the first in quiz_attempts.
    const quizAttempt = (submission?.quiz_attempts ?? []).find(a => a.id === selectedAttemptId) 
        || submission?.quiz_attempt 
        || (submission?.quiz_attempts && submission.quiz_attempts.length > 0 ? submission.quiz_attempts[0] : null);

    // Strip previously saved manual pts to get pure auto-graded points
    const savedManualPts = isQuiz && quizAttempt
        ? Object.values(quizAttempt.short_answer_scores ?? {}).reduce((a: number, b: number) => a + b, 0)
        : 0;
    const autoPoints = isQuiz && quizAttempt ? quizAttempt.points_earned - savedManualPts : 0;

    // Compute quiz score from auto + current manual short_answer scores
    const computedQuizScore = (() => {
        if (!isQuiz || !quizAttempt || !quizContent) return null;
        const manualPts = Object.values(shortAnswerScores).reduce((a, b) => a + b, 0);
        const total = quizAttempt.points_total;
        if (total === 0) return null;
        return Math.round(((autoPoints + manualPts) / total) * 1000) / 100;
    })();

    useEffect(() => {
        if (submission) {
            // Pre-fill score: prefer computed quiz score if available
            const baseScore = submission.score !== null && submission.score !== undefined ? String(submission.score) : "";
            setScore(baseScore);
            setFeedback(submission.feedback ?? "");
            setRubricScores(submission.rubric_scores ?? {});
            setSelfEvalRubricScores(submission.self_eval_rubric_scores ?? {});
            setShortAnswerScores(submission.quiz_attempt?.short_answer_scores ?? {});
            setShortAnswerFeedback(submission.quiz_attempt?.short_answer_feedback ?? {});
            if (submission.grading_mode) {
                setGradingMode(submission.grading_mode);
            } else if (submission.step_type === 'self_evaluation') {
                setGradingMode('complete');
            } else {
                setGradingMode(rubric?.length ? 'rubric' : 'score');
            }
            // Initialize selected attempt
            setSelectedAttemptId(submission.quiz_attempt?.id ?? (submission.quiz_attempts?.[0]?.id ?? null));
        }
    }, [submission, rubric]);

    // Update short-answer state when selected attempt changes
    useEffect(() => {
        if (quizAttempt) {
            setShortAnswerScores(quizAttempt.short_answer_scores ?? {});
            setShortAnswerFeedback(quizAttempt.short_answer_feedback ?? {});
        }
    }, [quizAttempt?.id]);

    // Keep score field in sync with computed quiz score when short_answer scores change
    useEffect(() => {
        if (computedQuizScore !== null) {
            setScore(String(computedQuizScore));
        }
    }, [computedQuizScore]);

    const rubricTotal = (rubric ?? []).reduce((sum, c) => sum + (rubricScores[c.id] ?? 0), 0);
    const rubricMax = (rubric ?? []).reduce((sum, c) => sum + criteriaMaxPoints(c), 0);

    function handleSave() {
        if (!submission) return;

        if (gradingMode === 'score') {
            const scoreNum = score.trim() !== "" ? parseFloat(score) : null;
            if (scoreNum !== null && (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10)) {
                toast.error("La nota debe estar entre 0 y 10.");
                return;
            }
            startTransition(async () => {
                // Persist short_answer scores to quiz_attempts if applicable
                if (isQuiz && quizAttempt && Object.keys(shortAnswerScores).length > 0) {
                    const saveRes = await saveQuizShortAnswerScores(
                        quizAttempt.id,
                        shortAnswerScores,
                        shortAnswerFeedback,
                        autoPoints,
                    );
                    if (saveRes.error) {
                        toast.error(`Error al guardar notas de respuestas cortas: ${saveRes.error}`);
                        return;
                    }
                }

                const result = await gradeSubmission(submission.id, {
                    gradingMode: 'score',
                    score: scoreNum,
                    feedback: feedback.trim() || null,
                });
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success("Evaluación guardada.");
                    onGraded(submission.id, scoreNum, feedback.trim() || null, true, 'score');
                    onClose();
                }
            });
        } else if (gradingMode === 'rubric') {
            startTransition(async () => {
                const result = await gradeSubmission(submission.id, {
                    gradingMode: 'rubric',
                    rubricScores,
                    feedback: feedback.trim() || null,
                });
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success("Evaluación guardada.");
                    onGraded(submission.id, null, feedback.trim() || null, true, 'rubric');
                    onClose();
                }
            });
        } else {
            startTransition(async () => {
                const result = await gradeSubmission(submission.id, {
                    gradingMode: 'complete',
                    feedback: feedback.trim() || null,
                    ...(isSelfEvalRubric && Object.keys(selfEvalRubricScores).length > 0
                        ? { selfEvalRubricScores }
                        : {}),
                });
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success(isSelfEval ? "Autoevaluación revisada." : "Entrega marcada como completada.");
                    onGraded(submission.id, null, feedback.trim() || null, true, 'complete');
                    onClose();
                }
            });
        }
    }

    const submittedDate = submission?.submitted_at
        ? new Date(submission.submitted_at).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : "—";

    const hasRubric = !!(rubric?.length);

    // Keyboard navigation
    useEffect(() => {
        if (!open) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "ArrowLeft" && hasPrev) onPrev?.();
            if (e.key === "ArrowRight" && hasNext) onNext?.();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, hasPrev, hasNext, onPrev, onNext]);

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
                <DialogHeader className="shrink-0 px-6 py-4 border-b border-border-strong">
                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                        Evaluar entrega
                        {submission && (
                            <span className="text-text-muted font-normal">
                                — {submission.step_title}
                            </span>
                        )}
                        {(hasPrev || hasNext) && (
                            <div className="flex items-center gap-1 ml-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0 border-border-strong text-text-muted hover:text-foreground"
                                    onClick={onPrev}
                                    disabled={!hasPrev}
                                    title="Alumno anterior (←)"
                                >
                                    <ChevronLeft className="size-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0 border-border-strong text-text-muted hover:text-foreground"
                                    onClick={onNext}
                                    disabled={!hasNext}
                                    title="Alumno siguiente (→)"
                                >
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
                    {/* Left: Quiz attempt, Drive iframe, or file list */}
                    <ResizablePanel defaultSize={70} minSize={40}>
                        <div className="h-full flex flex-col bg-surface-dark">
                            {isSelfEval ? (
                                <SelfEvalAnswersPanel submission={submission!} />
                            ) : isQuiz ? (
                                quizAttempt ? (
                                    <QuizAttemptPanel
                                        submission={submission!}
                                        attempt={quizAttempt}
                                        content={quizContent!}
                                        shortAnswerScores={shortAnswerScores}
                                        onShortAnswerScore={(qId, pts) => setShortAnswerScores(prev => ({ ...prev, [qId]: pts }))}
                                        shortAnswerFeedback={shortAnswerFeedback}
                                        onShortAnswerFeedback={(qId, text) => setShortAnswerFeedback(prev => ({ ...prev, [qId]: text }))}
                                        onSelectedAttemptIdChange={setSelectedAttemptId}
                                    />
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                                        <div className="size-16 rounded-full bg-surface-dark flex items-center justify-center border border-border-strong">
                                            <FileText className="size-8 text-text-muted" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-semibold text-foreground">Sin intentos</h3>
                                            <p className="text-sm text-text-muted max-w-[200px]">Este alumno aún no ha realizado ningún intento del cuestionario.</p>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <SubmissionFilePanel submission={submission} />
                            )}
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="bg-border-subtle hover:bg-accent-blue transition-colors duration-200 w-1.5" />

                    {/* Right: grading form */}
                    <ResizablePanel defaultSize={30} minSize={24}>
                        <div className="h-full flex flex-col overflow-y-auto bg-surface">
                            <div className="p-6 space-y-6">
                                {/* Student info */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                                        <User className="size-4 text-text-muted" />
                                        {submission?.student_name || submission?.student_email || "—"}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-text-muted">
                                        <Calendar className="size-3.5" />
                                        Entregado: {submittedDate}
                                    </div>
                                </div>

                                <div className="border-t border-border-strong" />

                                {/* Mode selector — hidden for self-eval */}
                                {!isSelfEval && (
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-text-muted uppercase tracking-widest">Modo de evaluación</Label>
                                        <div className="flex gap-1.5">
                                            {(["score", "rubric", "complete"] as GradingMode[]).map((mode) => {
                                                const labels: Record<GradingMode, string> = {
                                                    score: "Nota",
                                                    rubric: "Rúbrica",
                                                    complete: "Completado",
                                                };
                                                const isDisabled = mode === 'rubric' && !hasRubric;
                                                return (
                                                    <button
                                                        key={mode}
                                                        onClick={() => !isDisabled && setGradingMode(mode)}
                                                        title={isDisabled ? "Define una rúbrica en el editor del paso" : undefined}
                                                        disabled={isDisabled}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                                                            gradingMode === mode
                                                                ? "bg-accent-blue/10 border-accent-blue/40 text-accent-blue"
                                                                : "bg-surface-dark border-border-strong text-text-muted hover:text-foreground hover:border-border-subtle",
                                                            isDisabled && "opacity-40 cursor-not-allowed hover:text-text-muted hover:border-border-strong"
                                                        )}
                                                    >
                                                        {labels[mode]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Self-eval info banner */}
                                {isSelfEval && (
                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                        <UserCheck className="size-4 text-indigo-400 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-indigo-300">Autoevaluación del alumno</p>
                                            {submission?.step_eval_counts_toward_grade ? (
                                                <p className="text-xs text-indigo-200/80">
                                                    Contribuye a la nota del entregable vinculado:
                                                    <span className="font-bold"> {submission.step_eval_weight ?? 20}% autoevaluación</span> + {100 - (submission.step_eval_weight ?? 20)}% nota del profesor.
                                                    Marca como revisado cuando hayas comprobado las respuestas.
                                                </p>
                                            ) : (
                                                <p className="text-xs text-indigo-200/80">
                                                    Marca como revisado cuando hayas comprobado las respuestas del alumno.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Self-eval rubric adjustment */}
                                {isSelfEvalRubric && (submission?.step_eval_rubric ?? []).length > 0 && (
                                    <div className="space-y-3">
                                        <Label className="text-xs font-bold text-text-muted uppercase tracking-widest">
                                            Ajustar niveles (opcional)
                                        </Label>
                                        <p className="text-xs text-text-muted -mt-1">
                                            Si la justificación del alumno no corresponde con el nivel seleccionado, ajústalo.
                                        </p>
                                        {(submission!.step_eval_rubric!).map((criterion) => (
                                            <CriterionRow
                                                key={criterion.id}
                                                criterion={criterion}
                                                score={selfEvalRubricScores[criterion.id]}
                                                onScore={(pts) => setSelfEvalRubricScores(prev => ({ ...prev, [criterion.id]: pts }))}
                                            />
                                        ))}
                                        {(() => {
                                            const evalRubric = submission!.step_eval_rubric!;
                                            const rubricMax = evalRubric.reduce((sum, c) => sum + criteriaMaxPoints(c), 0);
                                            const selfTotal = Object.values(selfEvalRubricScores).reduce((a, b) => a + b, 0);
                                            const selfNorm = rubricMax > 0 ? Math.round((selfTotal / rubricMax) * 1000) / 100 : 0;
                                            return (
                                                <div className="flex items-center justify-between px-3 py-2 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
                                                    <span className="text-xs font-bold text-foreground">Nota ajustada</span>
                                                    <span className="text-sm font-bold font-mono text-indigo-400">{selfNorm} / 10</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Mode content */}
                                {gradingMode === 'score' && !isSelfEval && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-foreground">
                                            Nota (0–10)
                                        </Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={10}
                                            step={0.01}
                                            value={score}
                                            onChange={(e) => setScore(e.target.value)}
                                            placeholder="Sin nota"
                                            className="bg-surface-dark border-border-strong w-32 font-mono text-lg text-center"
                                        />
                                        <p className="text-xs text-text-muted">Déjalo vacío para no asignar nota numérica.</p>
                                        {/* Weighted formula preview — shown when a linked self-eval with countsTowardGrade exists */}
                                        {submission?.linked_self_eval_score != null && score !== "" && (() => {
                                            const selfW = submission!.linked_self_eval_weight ?? 20;
                                            const selfS = submission!.linked_self_eval_score!;
                                            const teacherS = parseFloat(score);
                                            if (isNaN(teacherS)) return null;
                                            const final = Math.round(((selfW / 100) * selfS + ((100 - selfW) / 100) * teacherS) * 100) / 100;
                                            return (
                                                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
                                                    <UserCheck className="size-3.5 shrink-0 text-indigo-400 mt-0.5" />
                                                    <div>
                                                        <p className="font-semibold text-indigo-300 mb-0.5">Nota ponderada con autoevaluación</p>
                                                        <p className="font-mono">
                                                            {selfW}% × {selfS} + {100 - selfW}% × {teacherS} = <span className="font-bold text-white">{final}</span> / 10
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {gradingMode === 'rubric' && !isSelfEval && (
                                    <div className="space-y-3">
                                        {hasRubric ? (
                                            <>
                                                <div className="space-y-2">
                                                    {rubric!.map((criterion) => (
                                                        <CriterionRow
                                                            key={criterion.id}
                                                            criterion={criterion}
                                                            score={rubricScores[criterion.id]}
                                                            onScore={(pts) => setRubricScores(prev => ({ ...prev, [criterion.id]: pts }))}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="flex items-center justify-between px-3 py-2 bg-accent-blue/5 border border-accent-blue/20 rounded-xl">
                                                    <span className="text-sm font-bold text-foreground">Total</span>
                                                    <span className="text-sm font-bold font-mono text-accent-blue">
                                                        {rubricTotal} / {rubricMax} pts
                                                        {rubricMax > 0 && (
                                                            <span className="ml-2 text-text-muted font-normal">
                                                                ({Math.round((rubricTotal / rubricMax) * 10 * 100) / 100} / 10)
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                {submission?.linked_self_eval_score != null && rubricMax > 0 && (() => {
                                                    const selfW = submission!.linked_self_eval_weight ?? 20;
                                                    const selfS = submission!.linked_self_eval_score!;
                                                    const teacherS = Math.round((rubricTotal / rubricMax) * 10 * 100) / 100;
                                                    const final = Math.round(((selfW / 100) * selfS + ((100 - selfW) / 100) * teacherS) * 100) / 100;
                                                    return (
                                                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
                                                            <UserCheck className="size-3.5 shrink-0 text-indigo-400 mt-0.5" />
                                                            <div>
                                                                <p className="font-semibold text-indigo-300 mb-0.5">Nota ponderada con autoevaluación</p>
                                                                <p className="font-mono">{selfW}% × {selfS} + {100 - selfW}% × {teacherS} = <span className="font-bold text-white">{final}</span> / 10</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </>
                                        ) : (
                                            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                                <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                                                <p className="text-sm text-amber-200">
                                                    Sin rúbrica configurada. Ve al editor del paso y añade criterios.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {gradingMode === 'complete' && !isSelfEval && (
                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                        <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <p className="text-sm text-emerald-200">
                                            Esta entrega se marcará como completada sin nota numérica.
                                        </p>
                                    </div>
                                )}

                                {/* Feedback */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground">
                                        Comentarios para el alumno
                                    </Label>
                                    <Textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        placeholder="Escribe tus observaciones aquí..."
                                        rows={5}
                                        className="bg-surface-dark border-border-strong resize-none text-sm"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1 border-border-strong"
                                        onClick={onClose}
                                        disabled={isPending}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        className="flex-1 bg-accent-blue hover:bg-accent-blue/90 text-white"
                                        onClick={handleSave}
                                        disabled={isPending}
                                    >
                                        {isPending ? "Guardando..." : isSelfEval ? "Marcar como revisado" : "Guardar evaluación"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </DialogContent>
        </Dialog>
    );
}

// ---------------------------------------------------------------------------
// Left panel: self-evaluation answers
// ---------------------------------------------------------------------------

function SelfEvalAnswersPanel({ submission }: { submission: StepSubmissionRow }) {
    const evalMode = submission.step_eval_mode ?? 'rubric';
    const rubric = submission.step_eval_rubric ?? [];
    const questions = (submission.step_eval_questions ?? []) as QuizQuestion[];
    const rubricScores = submission.self_eval_rubric_scores ?? {};
    const justifications = submission.self_eval_justifications ?? {};

    const hasData = evalMode === 'questions'
        ? Object.keys(justifications).length > 0
        : Object.keys(rubricScores).length > 0;

    if (!hasData) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="size-16 rounded-full bg-surface-dark flex items-center justify-center border border-border-strong">
                    <UserCheck className="size-8 text-text-muted" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground">Sin autoevaluación</h3>
                    <p className="text-sm text-text-muted max-w-[220px]">El alumno aún no ha enviado su autoevaluación.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-5 space-y-5">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400">
                {evalMode === 'questions' ? <MessageSquare className="size-3.5" /> : <UserCheck className="size-3.5" />}
                Autoevaluación — {evalMode === 'questions' ? 'Preguntas abiertas' : 'Rúbrica'}
            </div>

            {evalMode === 'rubric' ? (
                rubric.map(criterion => {
                    const selectedPts = rubricScores[criterion.id];
                    const selectedLevel = criterion.levels.find(l => l.points === selectedPts);
                    const justification = justifications[criterion.id];
                    return (
                        <div key={criterion.id} className="space-y-2">
                            <p className="text-xs font-semibold text-foreground">{criterion.name}</p>
                            {criterion.description && <p className="text-[11px] text-text-muted">{criterion.description}</p>}
                            {selectedLevel ? (
                                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-indigo-400">{selectedLevel.label}</span>
                                        <span className="text-[10px] font-mono text-indigo-400">{selectedLevel.points} pts</span>
                                    </div>
                                    {selectedLevel.description && (
                                        <p className="text-[10px] text-text-muted mt-1">{selectedLevel.description}</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-text-muted/50 italic">Sin selección</p>
                            )}
                            {justification && (
                                <div className="px-3 py-2 rounded-lg bg-surface border border-border/50">
                                    <p className="text-[11px] text-text-muted leading-relaxed whitespace-pre-wrap">{justification}</p>
                                </div>
                            )}
                        </div>
                    );
                })
            ) : (
                questions.map((q, idx) => {
                    const answer = justifications[q.id] ?? "";
                    return (
                        <div key={q.id} className="space-y-1.5">
                            <p className="text-xs font-semibold text-foreground">
                                <span className="text-text-muted font-normal mr-1">{idx + 1}.</span>{q.text}
                            </p>
                            {answer.trim() ? (
                                <div className="px-3 py-2 rounded-lg bg-surface border border-border/50">
                                    <p className="text-[11px] text-text-muted leading-relaxed whitespace-pre-wrap">{answer}</p>
                                </div>
                            ) : (
                                <p className="text-xs text-text-muted/50 italic">Sin respuesta</p>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Left panel: quiz attempt review
// ---------------------------------------------------------------------------

function QuizAttemptPanel({
    submission,
    attempt,
    content,
    shortAnswerScores,
    onShortAnswerScore,
    shortAnswerFeedback,
    onShortAnswerFeedback,
    onSelectedAttemptIdChange,
}: {
    submission: NonNullable<StepSubmissionRow>;
    attempt: NonNullable<StepSubmissionRow['quiz_attempt']>;
    content: QuizContent | null;
    shortAnswerScores: Record<string, number>;
    onShortAnswerScore: (qId: string, pts: number) => void;
    shortAnswerFeedback: Record<string, string>;
    onShortAnswerFeedback: (qId: string, text: string) => void;
    onSelectedAttemptIdChange: (id: string) => void;
}) {
    const attempts = submission.quiz_attempts ?? [attempt];

    const savedManual = Object.values(attempt.short_answer_scores ?? {}).reduce((a: number, b: number) => a + b, 0);
    const autoPoints = attempt.points_earned - savedManual;
    const manualPoints = Object.values(shortAnswerScores).reduce((a, b) => a + b, 0);
    const totalPoints = attempt.points_total;

    return (
        <>
            <div className="shrink-0 h-10 flex items-center justify-between px-4 border-b border-border-strong bg-surface">
                {attempts.length > 1 ? (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted font-mono uppercase tracking-widest">
                            Intento:
                        </span>
                        <Select 
                            value={attempt.id} 
                            onValueChange={onSelectedAttemptIdChange}
                        >
                            <SelectTrigger className="h-7 text-xs border-border-strong w-[220px] bg-surface-dark">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {attempts.map(a => (
                                    <SelectItem key={a.id} value={a.id} className="text-xs">
                                        Intento {a.attempt_number} — {a.points_earned}/{a.points_total} pts
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : (
                    <span className="text-xs text-text-muted font-mono uppercase tracking-widest">
                        Respuestas del alumno — intento {attempt.attempt_number}
                    </span>
                )}
                <span className="text-xs font-mono text-accent-blue font-bold">
                    {autoPoints + manualPoints} / {totalPoints} pts
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
                {(attempt.resolved_questions && attempt.resolved_questions.length > 0 
                    ? attempt.resolved_questions 
                    : (content?.questions ?? [])
                ).map((q: any, idx: number) => {
                    const qType = getQuestionType(q);
                    const review = buildQuestionReview(q, attempt, !!content?.penalizeWrongAnswers);
                    const ptsEarned = review.pointsEarned ?? 0;

                    return (
                        <div key={q.id} className="rounded-xl border border-border-strong bg-surface p-5 md:p-6 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 flex-1">
                                    <span className="size-5 rounded bg-surface-dark text-text-muted flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{idx + 1}</span>
                                    <p className="text-sm font-semibold text-foreground leading-snug">{q.text}</p>
                                </div>
                                <span className="text-xs font-mono text-text-muted shrink-0">
                                    {qType !== QUIZ_QUESTION_TYPE.SHORT_ANSWER
                                    ? `${ptsEarned}/${review.pointsTotal}pts`
                                    : shortAnswerScores[q.id] != null
                                        ? `${shortAnswerScores[q.id]}/${review.pointsTotal}pts`
                                        : `?/${review.pointsTotal}pts`}
                                </span>
                            </div>

                            {qType === QUIZ_QUESTION_TYPE.SHORT_ANSWER ? (
                                <div className="space-y-2">
                                    <div className="flex items-start gap-2 p-3 rounded-lg bg-surface-dark border border-border-strong">
                                        <AlignLeft className="size-3.5 text-text-muted shrink-0 mt-0.5" />
                                        <p className="text-sm text-foreground leading-snug">
                                            {attempt.short_answers[q.id] || <span className="italic text-text-muted">Sin respuesta</span>}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-text-muted">Puntos:</label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={review.pointsTotal}
                                            step={0.5}
                                            value={shortAnswerScores[q.id] ?? ""}
                                            onChange={(e) => onShortAnswerScore(q.id, Math.min(review.pointsTotal, Math.max(0, Number(e.target.value) || 0)))}
                                            placeholder="0"
                                            className="w-16 h-7 text-xs font-mono bg-surface-dark border-border-strong text-center px-1"
                                        />
                                        <span className="text-xs text-text-muted">/ {review.pointsTotal}</span>
                                    </div>
                                    <Textarea
                                        value={shortAnswerFeedback[q.id] ?? ""}
                                        onChange={(e) => onShortAnswerFeedback(q.id, e.target.value)}
                                        placeholder="Comentario para el alumno (opcional)..."
                                        rows={2}
                                        className="text-xs bg-surface-dark border-border-strong resize-none"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {review.rows.map((row) => {
                                        return (
                                            <div key={row.id} className={cn(
                                                "flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
                                                row.isCorrect === true ? "text-emerald-400 bg-emerald-500/5" :
                                                row.isCorrect === false ? "text-red-400 bg-red-500/5" : "text-text-muted"
                                            )}>
                                                {row.isCorrect === true ? <CheckCircle2 className="size-3.5 shrink-0" /> :
                                                 row.isCorrect === false ? <XCircle className="size-3.5 shrink-0" /> :
                                                 <Circle className="size-3.5 shrink-0 opacity-30" />}
                                                <span className="font-medium">{row.label}:</span>
                                                <span>{row.value}</span>
                                                {row.expectedValue && row.expectedValue !== row.value && (
                                                    <span className="ml-auto opacity-60">Correcta: {row.expectedValue}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Left panel: single PDF → iframe, multiple/non-PDF → file list, empty → placeholder
// ---------------------------------------------------------------------------

function getMimeIcon(mimeType: string) {
    if (mimeType === "application/pdf") return <FileText className="size-4 text-red-400 shrink-0" />;
    if (mimeType.startsWith("image/")) return <Image className="size-4 text-blue-400 shrink-0" />;
    if (mimeType.startsWith("video/")) return <Video className="size-4 text-purple-400 shrink-0" />;
    return <File className="size-4 text-text-muted shrink-0" />;
}

function FileListPanel({ files }: { files: SubmissionFile[] }) {
    return (
        <>
            <div className="shrink-0 h-9 flex items-center px-4 border-b border-border-strong bg-surface">
                <span className="text-xs text-text-muted font-mono uppercase tracking-widest">
                    Archivos entregados ({files.length})
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {files.map((f) => (
                    <a
                        key={f.driveFileId}
                        href={f.driveFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl border border-border-strong bg-surface hover:bg-surface-dark transition-colors group"
                    >
                        {getMimeIcon(f.driveMimeType)}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{f.driveFileName}</p>
                            <p className="text-xs text-text-muted">{f.driveMimeType}</p>
                        </div>
                        <ExternalLink className="size-3.5 text-text-muted group-hover:text-foreground shrink-0" />
                    </a>
                ))}
            </div>
        </>
    );
}

function SubmissionFilePanel({ submission }: { submission: StepSubmissionRow | null }) {
    if (!submission) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-12">
                <FileText className="size-12 text-text-muted/20" />
                <p className="text-sm text-text-muted">Sin entrega seleccionada.</p>
            </div>
        );
    }

    // Build the canonical file list
    const allFiles: SubmissionFile[] = submission.files && submission.files.length > 0
        ? submission.files
        : submission.drive_file_url
            ? [{ driveFileId: submission.drive_file_id ?? "", driveFileUrl: submission.drive_file_url, driveFileName: "Documento", driveMimeType: "application/pdf" }]
            : [];

    if (allFiles.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-12">
                <FileText className="size-12 text-text-muted/20" />
                <p className="text-sm text-text-muted">Este alumno no ha subido archivos.</p>
                <p className="text-xs text-text-muted/50">Solo disponible en modo "Copia del profesor".</p>
            </div>
        );
    }

    // Single file → iframe (use preview URL to avoid auth/account issues)
    if (allFiles.length === 1) {
        const file = allFiles[0];
        const previewUrl = urlToPreviewUrl(file.driveFileUrl, file.driveMimeType) ?? file.driveFileUrl;
        return (
            <>
                <div className="shrink-0 h-9 flex items-center justify-between px-4 border-b border-border-strong bg-surface">
                    <span className="text-xs text-text-muted font-mono uppercase tracking-widest">Documento del alumno</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs gap-1 text-text-muted hover:text-foreground"
                        onClick={() => window.open(file.driveFileUrl, "_blank")}
                    >
                        {/*<ExternalLink className="size-3" /> Abrir en Drive*/}
                    </Button>
                </div>
                <iframe
                    src={previewUrl}
                    className="flex-1 w-full border-none bg-white"
                    title="Documento del alumno"
                    allow="autoplay"
                />
            </>
        );
    }

    // Multiple files or non-PDF → file list
    return <FileListPanel files={allFiles} />;
}

// ---------------------------------------------------------------------------
// Per-criterion horizontal level selector
// ---------------------------------------------------------------------------

function CriterionRow({
    criterion,
    score,
    onScore,
}: {
    criterion: RubricCriteria;
    score: number | undefined;
    onScore: (points: number) => void;
}) {
    const hasLevels = !!(criterion.levels?.length);

    if (!hasLevels) {
        // Legacy fallback: free-text number input
        const max = (criterion as any).maxPoints ?? 0;
        return (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-dark border border-border-strong">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{criterion.name || "Sin nombre"}</p>
                    {criterion.description && (
                        <p className="text-xs text-text-muted mt-0.5">{criterion.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Input
                        type="number"
                        min={0}
                        max={max}
                        value={score ?? ""}
                        onChange={(e) => onScore(Math.min(max, Math.max(0, parseInt(e.target.value) || 0)))}
                        placeholder="0"
                        className="w-16 h-8 bg-surface border-border-strong font-mono text-sm text-center"
                    />
                    <span className="text-xs text-text-muted font-mono whitespace-nowrap">/ {max}</span>
                </div>
            </div>
        );
    }

    const selectedLevel = criterion.levels.find(l => l.points === score) ?? null;

    return (
        <div className="p-3 rounded-xl bg-surface-dark border border-border-strong space-y-2">
            <div>
                <p className="text-sm font-semibold text-foreground">{criterion.name || "Sin nombre"}</p>
                {criterion.description && (
                    <p className="text-xs text-text-muted mt-0.5">{criterion.description}</p>
                )}
            </div>

            {/* Horizontal level bar */}
            <div className="flex gap-1">
                {[...criterion.levels].sort((a, b) => a.points - b.points).map((level) => {
                    const isActive = score === level.points;
                    return (
                        <button
                            key={level.id}
                            onClick={() => onScore(level.points)}
                            className={cn(
                                "flex-1 flex flex-col items-center py-2 px-1 rounded-lg border text-center transition-colors",
                                isActive
                                    ? "bg-accent-blue/15 border-accent-blue/50 text-accent-blue"
                                    : "bg-surface border-border-strong text-text-muted hover:bg-surface-dark hover:text-foreground"
                            )}
                        >
                            <span className="text-[11px] font-semibold leading-tight w-full text-center truncate">{level.label}</span>
                            <span className="text-[10px] font-mono mt-0.5 opacity-70">{level.points}pts</span>
                        </button>
                    );
                })}
            </div>

            {/* Selected level description */}
            {selectedLevel && (
                <div className="px-3 py-1.5 rounded-lg bg-accent-blue/5 border border-accent-blue/15 text-xs flex items-start gap-1.5">
                    <span className="font-semibold text-accent-blue shrink-0">{selectedLevel.label}</span>
                    {selectedLevel.description && (
                        <span className="text-text-muted italic">{selectedLevel.description}</span>
                    )}
                </div>
            )}
        </div>
    );
}
