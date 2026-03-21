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
import { RubricCriteria, criteriaMaxPoints, QuizContent } from "@/types/activity";
import { toast } from "sonner";
import { ExternalLink, FileText, File, Image, Video, User, Calendar, CheckCircle2, XCircle, Circle, AlertTriangle, ChevronLeft, ChevronRight, AlignLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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
    const [feedback, setFeedback] = useState<string>("");
    const [shortAnswerScores, setShortAnswerScores] = useState<Record<string, number>>({});
    const [shortAnswerFeedback, setShortAnswerFeedback] = useState<Record<string, string>>({});
    const [isPending, startTransition] = useTransition();

    const isQuiz = submission?.step_type === 'quiz';
    const quizContent = submission?.quiz_content ?? null;
    const quizAttempt = submission?.quiz_attempt ?? null;

    // Compute quiz score from auto + manual short_answer scores
    const computedQuizScore = (() => {
        if (!isQuiz || !quizAttempt || !quizContent) return null;
        // points_earned already includes previously saved manual pts — strip them out first
        const savedManualPts = Object.values(quizAttempt.short_answer_scores).reduce((a, b) => a + b, 0);
        const autoPoints = quizAttempt.points_earned - savedManualPts;
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
            setShortAnswerScores(submission.quiz_attempt?.short_answer_scores ?? {});
            setShortAnswerFeedback(submission.quiz_attempt?.short_answer_feedback ?? {});
            if (submission.grading_mode) {
                setGradingMode(submission.grading_mode);
            } else {
                setGradingMode(rubric?.length ? 'rubric' : 'score');
            }
        }
    }, [submission, rubric]);

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
                        quizAttempt.points_earned,
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
                });
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success("Entrega marcada como completada.");
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
                    <ResizablePanel defaultSize={62} minSize={30}>
                        <div className="h-full flex flex-col bg-surface-dark">
                            {isQuiz && quizAttempt && quizContent ? (
                                <QuizAttemptPanel
                                    attempt={quizAttempt}
                                    content={quizContent}
                                    shortAnswerScores={shortAnswerScores}
                                    onShortAnswerScore={(qId, pts) => setShortAnswerScores(prev => ({ ...prev, [qId]: pts }))}
                                    shortAnswerFeedback={shortAnswerFeedback}
                                    onShortAnswerFeedback={(qId, text) => setShortAnswerFeedback(prev => ({ ...prev, [qId]: text }))}
                                />
                            ) : (
                                <SubmissionFilePanel submission={submission} />
                            )}
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="bg-border-subtle hover:bg-accent-blue transition-colors duration-200 w-1.5" />

                    {/* Right: grading form */}
                    <ResizablePanel defaultSize={38} minSize={28}>
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

                                {/* Mode selector */}
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

                                {/* Mode content */}
                                {gradingMode === 'score' && (
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
                                    </div>
                                )}

                                {gradingMode === 'rubric' && (
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
                                                    <span className="text-sm font-bold font-mono text-accent-blue">{rubricTotal} / {rubricMax} pts</span>
                                                </div>
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

                                {gradingMode === 'complete' && (
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
                                        {isPending ? "Guardando..." : "Guardar evaluación"}
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
// Left panel: quiz attempt review
// ---------------------------------------------------------------------------

function QuizAttemptPanel({
    attempt,
    content,
    shortAnswerScores,
    onShortAnswerScore,
    shortAnswerFeedback,
    onShortAnswerFeedback,
}: {
    attempt: NonNullable<StepSubmissionRow['quiz_attempt']>;
    content: QuizContent;
    shortAnswerScores: Record<string, number>;
    onShortAnswerScore: (qId: string, pts: number) => void;
    shortAnswerFeedback: Record<string, string>;
    onShortAnswerFeedback: (qId: string, text: string) => void;
}) {
    const autoPoints = attempt.points_earned;
    const manualPoints = Object.values(shortAnswerScores).reduce((a, b) => a + b, 0);
    const totalPoints = attempt.points_total;

    return (
        <>
            <div className="shrink-0 h-9 flex items-center justify-between px-4 border-b border-border-strong bg-surface">
                <span className="text-xs text-text-muted font-mono uppercase tracking-widest">
                    Respuestas del alumno — intento {attempt.attempt_number}
                </span>
                <span className="text-xs font-mono text-accent-blue">
                    {autoPoints + manualPoints} / {totalPoints} pts
                </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {content.questions.map((q, idx) => {
                    const qType = q.type ?? 'multiple_choice';
                    const studentOpts = attempt.answers[q.id] ?? [];
                    const correctOpts = q.options.filter(o => o.isCorrect).map(o => o.id);

                    let ptsEarned = 0;
                    if (qType !== 'short_answer') {
                        const correctSelected = studentOpts.filter(id => correctOpts.includes(id)).length;
                        const incorrectSelected = studentOpts.filter(id => !correctOpts.includes(id)).length;
                        const ratio = correctOpts.length > 0 ? (correctSelected - incorrectSelected) / correctOpts.length : 0;
                        ptsEarned = Math.max(0, Math.round((q.points ?? 1) * ratio));
                    }

                    return (
                        <div key={q.id} className="p-4 rounded-xl border border-border-strong bg-surface space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 flex-1">
                                    <span className="size-5 rounded bg-surface-dark text-text-muted flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{idx + 1}</span>
                                    <p className="text-sm font-semibold text-foreground leading-snug">{q.text}</p>
                                </div>
                                <span className="text-xs font-mono text-text-muted shrink-0">
                                    {qType !== 'short_answer' ? `${ptsEarned}/${q.points ?? 1}pts` : `?/${q.points ?? 1}pts`}
                                </span>
                            </div>

                            {qType === 'short_answer' ? (
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
                                            max={q.points ?? 1}
                                            step={0.5}
                                            value={shortAnswerScores[q.id] ?? ""}
                                            onChange={(e) => onShortAnswerScore(q.id, Math.min(q.points ?? 1, Math.max(0, Number(e.target.value) || 0)))}
                                            placeholder="0"
                                            className="w-16 h-7 text-xs font-mono bg-surface-dark border-border-strong text-center px-1"
                                        />
                                        <span className="text-xs text-text-muted">/ {q.points ?? 1}</span>
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
                                    {q.options.map(opt => {
                                        const selected = studentOpts.includes(opt.id);
                                        const correct = opt.isCorrect;
                                        return (
                                            <div key={opt.id} className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
                                                correct ? "text-emerald-400 bg-emerald-500/5" :
                                                selected ? "text-red-400 bg-red-500/5" : "text-text-muted"
                                            )}>
                                                {correct ? <CheckCircle2 className="size-3.5 shrink-0" /> :
                                                 selected ? <XCircle className="size-3.5 shrink-0" /> :
                                                 <Circle className="size-3.5 shrink-0 opacity-30" />}
                                                <span>{opt.text}</span>
                                                {selected && <span className="ml-auto opacity-60">alumno</span>}
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
                        <ExternalLink className="size-3" /> Abrir en Drive
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
