"use client";

import { useState, useTransition, useEffect } from "react";
import {
    Users2, CheckCircle2, ExternalLink, ClipboardList,
    MessageSquare, MessageCircle, ArrowRight, FileText,
    ChevronLeft, ChevronRight, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { PeerEvaluationContent, RubricCriteria, QuizQuestion } from "@/types/activity";
import {
    getMyPeerAssignments, submitPeerEvaluation, getMyReceivedPeerFeedback,
    type PeerAssignmentWithTarget,
} from "@/app/activities/[id]/actions";
import { urlToPreviewUrl } from "@/lib/google-drive-urls";
import { buildPeerEvaluationLiveNoteFiles } from "@/lib/peer-evaluation-live-notes";
import { buildPeerEvaluationDraft } from "@/lib/peer-evaluation-draft";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PeerEvaluationViewerProps {
    content: PeerEvaluationContent;
    stepId: string;
    activityId: string;
    isPreview?: boolean;
    isClosed?: boolean;
}

export function PeerEvaluationViewer({
    content,
    stepId,
    activityId,
    isPreview,
    isClosed,
}: PeerEvaluationViewerProps) {
    const [assignments, setAssignments] = useState<PeerAssignmentWithTarget[]>([]);
    const [receivedFeedback, setReceivedFeedback] = useState<
        { rubricScores: Record<string, number>; justifications: Record<string, string> }[]
    >([]);
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    useEffect(() => {
        if (isPreview) { setLoading(false); return; }
        Promise.all([
            getMyPeerAssignments(stepId),
            getMyReceivedPeerFeedback(stepId),
        ]).then(([assignRes, feedbackRes]) => {
            if (assignRes.error) setLoadError(assignRes.error);
            if (assignRes.assignments) setAssignments(assignRes.assignments);
            if (feedbackRes.items) setReceivedFeedback(feedbackRes.items);
            setFeedbackVisible(feedbackRes.visible ?? false);
            setLoading(false);
        }).catch(err => {
            setLoadError(String(err));
            setLoading(false);
        });
    }, [stepId, isPreview]);

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto space-y-3 animate-pulse">
                <div className="h-16 rounded-2xl bg-surface-dark" />
                <div className="h-16 rounded-2xl bg-surface-dark" />
                <div className="h-16 rounded-2xl bg-surface-dark" />
            </div>
        );
    }

    if (isPreview || assignments.length === 0) {
        return (
            <div className="max-w-3xl mx-auto">
                <div className="p-12 bg-surface-dark border border-white/5 rounded-2xl flex flex-col items-center text-center gap-4">
                    <Users2 className="size-12 text-text-muted/20" />
                    <p className="text-sm font-medium text-foreground">
                        {isPreview ? "Vista previa — coevaluación" : "No hay asignaciones pendientes"}
                    </p>
                    <p className="text-xs text-text-muted max-w-sm">
                        {isPreview
                            ? "Las asignaciones se generan cuando el profesor abre la coevaluación."
                            : content.mode === "intra_group"
                                ? "El profesor todavía no ha generado las asignaciones o ya evaluaste a todos tus compañeros."
                                : "El profesor todavía no ha generado las asignaciones de coevaluación o ya las has completado todas."}
                    </p>
                    {loadError && (
                        <p className="text-[10px] font-mono text-red-400 max-w-sm break-all">{loadError}</p>
                    )}
                </div>
            </div>
        );
    }

    const completedCount = assignments.filter(a => !!a.eval_submission_id).length;

    function getTargetName(assignment: PeerAssignmentWithTarget, idx: number) {
        if (content.mode === "group") {
            return (assignment.target_submission?.group as any)?.name ?? `Grupo ${idx + 1}`;
        }

        const name = (assignment as any).target_student?.full_name
            ?? (assignment.target_submission?.student as any)?.full_name
            ?? "Alumno";

        return (content.anonymousEvaluation && content.mode === "individual") ? `Entrega ${idx + 1}` : name;
    }

    function handleCompleted(
        assignmentId: string,
        submittedScores: Record<string, number>,
        submittedAnswers: Record<string, string>,
        submittedQaNotes?: string,
    ) {
        setAssignments(prev =>
            prev.map(a => a.id === assignmentId ? {
                ...a,
                eval_submission_id: assignmentId, // truthy marker — real ID comes from next load
                eval_submission: {
                    self_eval_rubric_scores: submittedScores,
                    self_eval_justifications: submittedAnswers,
                    files: buildPeerEvaluationLiveNoteFiles(submittedQaNotes) as Record<string, unknown>[] | null,
                },
            } : a)
        );
        // intra_group: user navigates via the left panel — don't auto-advance or close
        if (content.mode === "intra_group") return;
        // Auto-advance to next pending or close
        const nextPending = assignments.findIndex(
            (a, i) => i > (activeIndex ?? 0) && !a.eval_submission_id && a.id !== assignmentId
        );
        if (nextPending !== -1) {
            setActiveIndex(nextPending);
        } else {
            setActiveIndex(null);
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="p-4 bg-surface-dark border border-white/5 rounded-2xl flex items-center gap-3">
                <Users2 className="size-5 text-indigo-400 shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-foreground">
                        {content.mode === "intra_group" ? "Evalúa a tus compañeros de grupo" : "Coevaluación"}
                    </p>
                    <p className="text-xs text-text-muted">{completedCount} de {assignments.length} evaluaciones completadas</p>
                </div>
            </div>

            {/* Assignment list */}
            <div className="space-y-2">
                {assignments.map((assignment, idx) => {
                    const displayName = getTargetName(assignment, idx);
                    const isCompleted = !!assignment.eval_submission_id;
                    const isGroupMode = content.mode === "group";
                    const targetColor = isGroupMode ? assignment.target_submission?.group?.color ?? null : null;

                    return (
                        <div
                            key={assignment.id}
                            className={cn(
                                "flex items-center gap-4 px-5 py-4 rounded-2xl border transition-colors",
                                isCompleted
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : "bg-surface-dark border-white/5"
                            )}
                        >
                            {isGroupMode ? (
                                <div
                                    className="size-8 rounded-xl border flex items-center justify-center shrink-0"
                                    style={targetColor
                                        ? { backgroundColor: `${targetColor}18`, borderColor: `${targetColor}40`, color: targetColor }
                                        : { backgroundColor: "rgb(99 102 241 / 0.1)", borderColor: "rgb(99 102 241 / 0.2)", color: "rgb(129 140 248)" }}
                                >
                                    <Users className="size-3.5" />
                                </div>
                            ) : (
                                <div className={cn(
                                    "size-8 rounded-full flex items-center justify-center shrink-0 border text-xs font-bold",
                                    isCompleted
                                        ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                                        : "bg-surface border-border/50 text-text-muted"
                                )}>
                                    {isCompleted ? <CheckCircle2 className="size-4" /> : idx + 1}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    isGroupMode
                                        ? "text-sm font-bold uppercase tracking-tight font-mono truncate"
                                        : "text-sm font-semibold truncate",
                                    isCompleted ? "text-emerald-400" : "text-foreground"
                                )}>
                                    {displayName}
                                </p>
                                <p className={cn("text-xs mt-0.5", isCompleted ? "text-emerald-400/60" : "text-text-muted")}>
                                    {isCompleted ? "Evaluación completada" : "Pendiente de evaluar"}
                                </p>
                            </div>
                            {isClosed ? (
                                <span className="text-xs text-text-muted/50 shrink-0">
                                    {isCompleted ? "Enviada" : "Cerrado"}
                                </span>
                            ) : isCompleted ? (
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs text-emerald-400/60 flex items-center gap-1">
                                        <CheckCircle2 className="size-3" /> Enviada
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setActiveIndex(idx)}
                                        className="gap-2 border-border/50 text-text-muted hover:text-foreground"
                                    >
                                        Modificar
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={() => setActiveIndex(idx)}
                                    className="gap-2 shrink-0 bg-indigo-600 hover:bg-indigo-500"
                                >
                                    Evaluar
                                    <ArrowRight className="size-3.5" />
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Eval modal */}
            {activeIndex !== null && (
                <PeerEvalModal
                    key={assignments[activeIndex].id}
                    assignment={assignments[activeIndex]}
                    assignmentIndex={activeIndex}
                    total={assignments.length}
                    content={content}
                    activityId={activityId}
                    hasPrev={activeIndex > 0}
                    hasNext={activeIndex < assignments.length - 1}
                    onPrev={() => setActiveIndex(i => Math.max(0, (i ?? 0) - 1))}
                    onNext={() => setActiveIndex(i => Math.min(assignments.length - 1, (i ?? 0) + 1))}
                    onClose={() => setActiveIndex(null)}
                    onCompleted={handleCompleted}
                    allAssignments={content.mode === "intra_group" ? assignments : undefined}
                    onNavigate={content.mode === "intra_group" ? (idx) => setActiveIndex(idx) : undefined}
                    getTargetName={getTargetName}
                />
            )}

            {/* Received feedback — rubric mode only */}
            {feedbackVisible && receivedFeedback.length > 0 && (content.evalMode ?? "rubric") === "rubric" && (
                <div className="p-6 bg-surface-dark border border-white/5 rounded-2xl space-y-4">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                        <MessageCircle className="size-4 text-indigo-400" /> Feedback recibido
                    </h3>
                    <p className="text-xs text-text-muted">Estas son las evaluaciones que recibiste de tus compañeros.</p>
                    <div className="space-y-4">
                        {receivedFeedback.map((fb, idx) => (
                            <div key={idx} className="p-4 bg-surface border border-border/50 rounded-xl space-y-3">
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Evaluación {idx + 1}</p>
                                {content.rubric?.map(criterion => {
                                    const pts = fb.rubricScores[criterion.id];
                                    const justif = fb.justifications[criterion.id];
                                    if (pts === undefined && !justif) return null;
                                    return (
                                        <div key={criterion.id} className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-semibold text-foreground">{criterion.name}</p>
                                                {pts !== undefined && (
                                                    <span className="text-xs font-mono text-indigo-400 font-bold">{pts} pts</span>
                                                )}
                                            </div>
                                            {justif && (
                                                <p className="text-xs text-text-muted leading-relaxed">{justif}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Eval modal ───────────────────────────────────────────────────────────────

function PeerEvalModal({
    assignment,
    assignmentIndex,
    total,
    content,
    activityId,
    hasPrev,
    hasNext,
    onPrev,
    onNext,
    onClose,
    onCompleted,
    allAssignments,
    onNavigate,
    getTargetName,
}: {
    assignment: PeerAssignmentWithTarget;
    assignmentIndex: number;
    total: number;
    content: PeerEvaluationContent;
    activityId: string;
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
    onClose: () => void;
    onCompleted: (assignmentId: string, scores: Record<string, number>, answers: Record<string, string>, qaNotes?: string) => void;
    allAssignments?: PeerAssignmentWithTarget[];
    onNavigate?: (idx: number) => void;
    getTargetName?: (a: PeerAssignmentWithTarget, idx: number) => string;
}) {
    const evalMode = content.evalMode ?? "rubric";
    const rubric = content.rubric ?? [];
    const questions = (content.questions ?? []) as QuizQuestion[];
    const isCompleted = !!assignment.eval_submission_id;

    const [scores, setScores] = useState<Record<string, number>>({});
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [qaNotes, setQaNotes] = useState("");
    const [isPending, startTransition] = useTransition();

    // Hydrate the draft from the existing submission so "Modificar" starts from
    // the previously saved evaluation instead of forcing the student to retype everything.
    useEffect(() => {
        const draft = buildPeerEvaluationDraft(assignment.eval_submission);
        setScores(draft.scores);
        setAnswers(draft.answers);
        setQaNotes(draft.qaNotes);
    }, [assignment.id, assignment.eval_submission]);

    // Keyboard navigation (← →)
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "ArrowLeft" && hasPrev) onPrev();
            if (e.key === "ArrowRight" && hasNext) onNext();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [hasPrev, hasNext, onPrev, onNext]);

    const displayName = getTargetName
        ? getTargetName(assignment, assignmentIndex)
        : ((assignment as any).target_student?.full_name
            ?? (assignment.target_submission?.student as any)?.full_name
            ?? (assignment.target_submission?.group as any)?.name
            ?? "Alumno");

    const rawDriveUrl = content.mode !== "intra_group"
        ? assignment.target_submission?.drive_file_url ?? null
        : null;
    const previewUrl = rawDriveUrl ? urlToPreviewUrl(rawDriveUrl) ?? rawDriveUrl : null;

    const allScored = evalMode === "questions" || rubric.every(c => scores[c.id] !== undefined);
    const allAnswered = evalMode !== "questions" || questions.every(q => {
        const ans = (answers[q.id] ?? "").trim();
        if (!ans) return false;
        if (q.type === "numeric") {
            const val = parseFloat(ans);
            if (isNaN(val)) return false;
            const min = q.numericMin ?? 0, max = q.numericMax ?? 10;
            if (val < min || val > max) return false;
        }
        if (q.type === "likert" && q.requireJustification) {
            const just = (answers[`${q.id}:justification`] ?? "").trim();
            if (!just) return false;
            if (q.minLength && just.length < q.minLength) return false;
        }
        if (q.type === "short_answer" && q.minLength && ans.length < q.minLength) return false;
        return true;
    });
    const allJustified = evalMode !== "rubric" || !content.requireJustification
        || rubric.every(c => {
            const text = answers[c.id] ?? "";
            const minLen = content.minJustificationLength ?? 0;
            return text.trim().length >= (minLen > 0 ? minLen : 1);
        });
    const canSubmit = allScored && allAnswered && allJustified;

    function handleSubmit() {
        startTransition(async () => {
            const rubricScores = evalMode === "questions" ? {} : scores;
            const res = await submitPeerEvaluation(
                assignment.id,
                activityId,
                rubricScores,
                answers,
                content.livePresentationMode ? qaNotes : undefined,
            );
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Evaluación enviada correctamente.");
                onCompleted(assignment.id, evalMode === "questions" ? {} : scores, answers, qaNotes);
            }
        });
    }

    return (
        <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
            <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}>
                    <DialogHeader className="shrink-0 px-6 py-4 border-b border-border-strong">
                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                        <Users2 className="size-4 text-indigo-400 shrink-0" />
                        {content.mode === "intra_group" ? "Evaluar compañero" : content.mode === "group" ? "Evaluar grupo" : "Evaluar entrega"}
                        <span className="text-text-muted font-normal">— {displayName}</span>

                    </DialogTitle>
                </DialogHeader>

                <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
                    {/* Left panel A: member list — intra_group only */}
                    {content.mode === "intra_group" && allAssignments && onNavigate && (
                        <>
                            <ResizablePanel defaultSize={28} minSize={18}>
                                <div className="h-full flex flex-col bg-surface overflow-hidden">
                                    <div className="px-4 py-2.5 border-b border-border-strong shrink-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-text-muted">
                                            Compañeros del grupo
                                        </p>
                                    </div>
                                    <div className="flex-1 overflow-y-auto divide-y divide-border/30">
                                        {allAssignments.map((a, i) => {
                                            const name = getTargetName
                                                ? getTargetName(a, i)
                                                : ((a as any).target_student?.full_name ?? `Compañero ${i + 1}`);
                                            const isActive = a.id === assignment.id;
                                            const isDone = !!a.eval_submission_id;
                                            return (
                                                <button
                                                    key={a.id}
                                                    onClick={() => onNavigate(i)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-all relative",
                                                        isActive
                                                            ? "bg-indigo-500/10 text-indigo-400"
                                                            : "hover:bg-white/5 text-text-muted hover:text-foreground"
                                                    )}
                                                >
                                                    {isActive && (
                                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-indigo-400 rounded-full" />
                                                    )}
                                                    <div className={cn(
                                                        "size-6 rounded-full flex items-center justify-center border shrink-0 text-[10px] font-bold",
                                                        isDone
                                                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                                            : "bg-surface-dark border-border-strong text-text-muted"
                                                    )}>
                                                        {isDone ? <CheckCircle2 className="size-3.5" /> : i + 1}
                                                    </div>
                                                    <p className="text-[11px] font-semibold truncate">{name}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </ResizablePanel>
                            <ResizableHandle withHandle className="bg-border-subtle hover:bg-indigo-500/40 transition-colors duration-200 w-1.5" />
                        </>
                    )}

                    {/* Left panel B: submission preview — standard modes only */}
                    {content.mode !== "intra_group" && (
                        <>
                            <ResizablePanel defaultSize={62} minSize={30}>
                                <div className="h-full flex flex-col bg-surface-dark">
                                    {previewUrl ? (
                                        <>
                                            <div className="shrink-0 h-9 flex items-center justify-between px-4 border-b border-border-strong bg-surface">
                                                <span className="text-xs text-text-muted font-mono uppercase tracking-widest">
                                                    {content.mode === "group" ? "Entrega del grupo" : "Entrega del alumno"}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-xs gap-1 text-text-muted hover:text-foreground"
                                                    onClick={() => window.open(rawDriveUrl!, "_blank")}
                                                >
                                                    <ExternalLink className="size-3" /> Abrir en Drive
                                                </Button>
                                            </div>
                                            <iframe
                                                src={previewUrl}
                                                className="flex-1 w-full border-none bg-white"
                                                title="Entrega a evaluar"
                                                allow="autoplay"
                                            />
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-12">
                                            <FileText className="size-12 text-text-muted/20" />
                                            <p className="text-sm text-text-muted">
                                                {content.mode === "group"
                                                    ? "Este grupo no ha adjuntado ningún archivo."
                                                    : "Este alumno no ha adjuntado ningún archivo."}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </ResizablePanel>
                            <ResizableHandle withHandle className="bg-border-subtle hover:bg-accent-blue transition-colors duration-200 w-1.5" />
                        </>
                    )}

                    {/* Right: rubric / questions + submit */}
                    <ResizablePanel
                        defaultSize={
                            content.mode === "intra_group"
                                ? (allAssignments ? 72 : 100)
                                : 38
                        }
                        minSize={28}
                    >
                        <div className="h-full flex flex-col bg-surface">
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-6 space-y-6">
                                    {isCompleted && (
                                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                                            <CheckCircle2 className="size-3.5 shrink-0" />
                                            Evaluación enviada — puedes modificarla hasta que el profesor cierre la actividad.
                                        </div>
                                    )}

                                    {/* Rubric mode */}
                                    {evalMode === "rubric" && (() => {
                                        return (
                                            <div className="space-y-6">
                                                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                                                    <ClipboardList className="size-3.5" /> Rúbrica de evaluación
                                                </h3>
                                                {rubric.map(criterion => (
                                                    <CriterionBlock
                                                        key={criterion.id}
                                                        criterion={criterion}
                                                        selected={scores[criterion.id]}
                                                        justification={answers[criterion.id] ?? ""}
                                                        requireJustification={content.requireJustification}
                                                        minLength={content.minJustificationLength ?? 0}
                                                        onSelect={pts => setScores(p => ({ ...p, [criterion.id]: pts }))}
                                                        onJustify={text => setAnswers(p => ({ ...p, [criterion.id]: text }))}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })()}

                                    {/* Questions mode */}
                                    {evalMode === "questions" && (() => {
                                        return (
                                            <div className="space-y-6">
                                                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                                                    <MessageSquare className="size-3.5" /> Preguntas de evaluación
                                                </h3>
                                                {questions.map((q, idx) => (
                                                    <QuestionBlock
                                                        key={q.id}
                                                        question={q}
                                                        index={idx}
                                                        answers={answers}
                                                        onChange={(key, val) => setAnswers(p => ({ ...p, [key]: val }))}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })()}

                                    {/* Q&A (live presentation mode) */}
                                    {content.livePresentationMode && (
                                        <div className="space-y-2">
                                            <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                                                <MessageSquare className="size-3.5" /> Sesión de preguntas
                                            </h3>
                                            <Textarea
                                                value={qaNotes}
                                                onChange={e => setQaNotes(e.target.value)}
                                                placeholder="Preguntas realizadas, respuestas destacadas, observaciones..."
                                                className="resize-none text-sm min-h-[96px] bg-surface-dark border-border-strong"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="shrink-0 px-6 py-4 border-t border-border-strong flex items-center justify-between gap-3">
                                {content.mode !== "intra_group" && (
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0 border-border-strong text-text-muted hover:text-foreground"
                                            onClick={onPrev}
                                            disabled={!hasPrev}
                                        >
                                            <ChevronLeft className="size-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 w-8 p-0 border-border-strong text-text-muted hover:text-foreground"
                                            onClick={onNext}
                                            disabled={!hasNext}
                                        >
                                            <ChevronRight className="size-4" />
                                        </Button>
                                    </div>
                                )}
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!canSubmit || isPending}
                                    className="flex-1 gap-2"
                                >
                                    <CheckCircle2 className="size-4" />
                                    {isPending ? "Guardando..." : isCompleted ? "Guardar cambios" : "Enviar evaluación"}
                                </Button>
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </DialogContent>
        </Dialog>
    );
}

// ─── Question block ───────────────────────────────────────────────────────────

function QuestionBlock({
    question,
    index,
    answers,
    onChange,
}: {
    question: QuizQuestion;
    index: number;
    answers: Record<string, string>;
    onChange: (key: string, val: string) => void;
}) {
    const isLikert = question.type === "likert";
    const isNumeric = question.type === "numeric";
    const scale = question.likertScale ?? 5;
    const labels = question.likertLabels ?? [];

    return (
        <div className="space-y-2">
            <div>
                <p className="text-sm font-semibold text-foreground">
                    <span className="text-text-muted font-normal mr-1">{index + 1}.</span>
                    {question.text}
                </p>
                {question.explanation && (
                    <p className="text-xs text-text-muted mt-0.5">{question.explanation}</p>
                )}
            </div>
            {isNumeric ? (
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            min={question.numericMin ?? 0}
                            max={question.numericMax ?? 10}
                            step="0.01"
                            value={answers[question.id] ?? ""}
                            onChange={(e) => onChange(question.id, e.target.value)}
                            placeholder={`${question.numericMin ?? 0} – ${question.numericMax ?? 10}`}
                            className="h-10 w-32 rounded-xl border border-border-strong bg-surface-dark px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-xs text-text-muted">
                            Rango: {question.numericMin ?? 0} – {question.numericMax ?? 10}
                        </span>
                    </div>
                </div>
            ) : isLikert ? (
                <div className="space-y-2">
                    <div className={cn("grid gap-1.5", scale <= 5 ? "grid-cols-5" : "grid-cols-7")}>
                        {Array.from({ length: scale }, (_, i) => {
                            const val = String(i + 1);
                            const isSelected = answers[question.id] === val;
                            const label = labels[i] ?? val;
                            return (
                                <button
                                    key={val}
                                    onClick={() => onChange(question.id, val)}
                                    className={cn(
                                        "flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-colors",
                                        isSelected
                                            ? "bg-indigo-500/15 border-indigo-500/40 ring-1 ring-indigo-500/40"
                                            : "bg-surface-dark border-border-strong hover:bg-surface"
                                    )}
                                >
                                    <span className={cn("text-xs font-bold", isSelected ? "text-indigo-400" : "text-foreground")}>{val}</span>
                                    {label !== val && (
                                        <span className={cn("text-[9px] leading-tight", isSelected ? "text-indigo-400" : "text-text-muted")}>{label}</span>
                                    )}
                                    {isSelected && <CheckCircle2 className="size-3 text-indigo-400 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                    {question.requireJustification && (() => {
                        const justVal = answers[`${question.id}:justification`] ?? "";
                        const justCount = justVal.trim().length;
                        const minLen = question.minLength ?? 0;
                        const showWarn = minLen > 0 && justCount > 0 && justCount < minLen;
                        return (
                            <div className="space-y-1">
                                <Textarea
                                    value={justVal}
                                    onChange={(e) => onChange(`${question.id}:justification`, e.target.value)}
                                    placeholder="Justifica tu respuesta (obligatorio)..."
                                    className={cn(
                                        "resize-none text-sm min-h-[72px] bg-surface-dark border-border-strong",
                                        showWarn && "border-amber-500/50"
                                    )}
                                />
                                {minLen > 0 && (
                                    <p className={cn("text-[10px] text-right", showWarn ? "text-amber-400" : "text-text-muted/50")}>
                                        {justCount}/{minLen} caracteres mínimos
                                    </p>
                                )}
                            </div>
                        );
                    })()}
                </div>
            ) : (() => {
                const ansVal = answers[question.id] ?? "";
                const ansCount = ansVal.trim().length;
                const minLen = question.minLength ?? 0;
                const showWarn = minLen > 0 && ansCount > 0 && ansCount < minLen;
                return (
                    <div className="space-y-1">
                        <Textarea
                            value={ansVal}
                            onChange={(e) => onChange(question.id, e.target.value)}
                            placeholder="Escribe tu respuesta..."
                            className={cn(
                                "resize-none text-sm min-h-[96px] bg-surface-dark border-border-strong",
                                showWarn && "border-amber-500/50"
                            )}
                        />
                        {minLen > 0 && (
                            <p className={cn("text-[10px] text-right", showWarn ? "text-amber-400" : "text-text-muted/50")}>
                                {ansCount}/{minLen} caracteres mínimos
                            </p>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}

// ─── Criterion block ──────────────────────────────────────────────────────────

function CriterionBlock({
    criterion, selected, justification, requireJustification, minLength,
    onSelect, onJustify,
}: {
    criterion: RubricCriteria;
    selected?: number;
    justification: string;
    requireJustification: boolean;
    minLength: number;
    onSelect: (pts: number) => void;
    onJustify: (text: string) => void;
}) {
    return (
        <div className="space-y-3">
            <div>
                <p className="text-sm font-semibold text-foreground">{criterion.name}</p>
                {criterion.description && <p className="text-xs text-text-muted mt-0.5">{criterion.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
                {criterion.levels.map(level => {
                    const isSelected = selected === level.points;
                    return (
                        <button
                            key={level.id}
                            onClick={() => onSelect(level.points)}
                            className={cn(
                                "p-2.5 border rounded-xl text-left transition-colors",
                                isSelected
                                    ? "bg-indigo-500/15 border-indigo-500/40 ring-1 ring-indigo-500/40"
                                    : "bg-surface-dark border-border-strong hover:bg-surface"
                            )}
                        >
                            <div className="flex items-center justify-between gap-1">
                                <p className={cn("text-xs font-bold", isSelected ? "text-indigo-400" : "text-foreground")}>{level.label}</p>
                                {isSelected && <CheckCircle2 className="size-3 text-indigo-400 shrink-0" />}
                            </div>
                            <p className={cn("text-[10px] font-mono", isSelected ? "text-indigo-400" : "text-accent-blue")}>{level.points} pts</p>
                            {level.description && <p className="text-[10px] text-text-muted mt-1 leading-snug">{level.description}</p>}
                        </button>
                    );
                })}
            </div>
            {(requireJustification || justification) && (
                <div>
                    <Textarea
                        value={justification}
                        onChange={e => onJustify(e.target.value)}
                        placeholder={
                            requireJustification
                                ? `Justificación obligatoria${minLength > 0 ? ` (mínimo ${minLength} caracteres)` : ""}...`
                                : "Justificación (opcional)..."
                        }
                        className={cn(
                            "resize-none text-sm min-h-[72px] bg-surface-dark border-border-strong",
                            requireJustification && minLength > 0 && justification.length > 0 && justification.length < minLength
                                && "border-amber-500/40"
                        )}
                    />
                    {requireJustification && minLength > 0 && (
                        <p className={cn(
                            "text-[10px] mt-1 text-right",
                            justification.length >= minLength ? "text-text-muted/50" : "text-amber-400/80"
                        )}>
                            {justification.length} / {minLength}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
