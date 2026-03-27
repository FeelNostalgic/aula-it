"use client";

import { useState, useTransition, useEffect } from "react";
import { Users2, CheckCircle2, Clock, ChevronLeft, ChevronRight, ExternalLink, ClipboardList, MessageSquare, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PeerEvaluationContent, ActivitySubmission, RubricCriteria, criteriaMaxPoints } from "@/types/activity";
import { getMyPeerAssignments, submitPeerEvaluation, getMyReceivedPeerFeedback, type PeerAssignmentWithTarget } from "@/app/activities/[id]/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PeerEvaluationViewerProps {
    content: PeerEvaluationContent;
    stepId: string;
    activityId: string;
    initialSubmission?: ActivitySubmission | null;
    isPreview?: boolean;
    isClosed?: boolean;
}

export function PeerEvaluationViewer({
    content,
    stepId,
    activityId,
    initialSubmission,
    isPreview,
    isClosed,
}: PeerEvaluationViewerProps) {
    const [assignments, setAssignments] = useState<PeerAssignmentWithTarget[]>([]);
    const [receivedFeedback, setReceivedFeedback] = useState<{ rubricScores: Record<string, number>; justifications: Record<string, string> }[]>([]);
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (isPreview) { setLoading(false); return; }
        Promise.all([
            getMyPeerAssignments(stepId),
            getMyReceivedPeerFeedback(stepId),
        ]).then(([assignRes, feedbackRes]) => {
            if (assignRes.assignments) setAssignments(assignRes.assignments);
            if (feedbackRes.items) setReceivedFeedback(feedbackRes.items);
            setFeedbackVisible(feedbackRes.visible ?? false);
            setLoading(false);
        });
    }, [stepId, isPreview]);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
                <div className="h-32 rounded-2xl bg-surface-dark" />
                <div className="h-64 rounded-2xl bg-surface-dark" />
            </div>
        );
    }

    if (isPreview || assignments.length === 0) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="p-12 bg-surface-dark border border-white/5 rounded-2xl flex flex-col items-center text-center gap-4">
                    <Users2 className="size-12 text-text-muted/20" />
                    <p className="text-sm font-medium text-foreground">
                        {isPreview ? "Vista previa — coevaluación" : "No hay asignaciones pendientes"}
                    </p>
                    <p className="text-xs text-text-muted max-w-sm">
                        {isPreview
                            ? "Las asignaciones se generan cuando el profesor abre la coevaluación."
                            : "El profesor todavía no ha generado las asignaciones de coevaluación o ya las has completado todas."}
                    </p>
                </div>
            </div>
        );
    }

    const completedCount = assignments.filter(a => !!a.eval_submission_id).length;
    const current = assignments[currentIndex];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Progress header */}
            <div className="p-4 bg-surface-dark border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Users2 className="size-5 text-indigo-400 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-foreground">Coevaluación</p>
                        <p className="text-xs text-text-muted">{completedCount} de {assignments.length} completadas</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {assignments.map((a, i) => (
                        <button
                            key={a.id}
                            onClick={() => setCurrentIndex(i)}
                            className={cn(
                                "size-7 rounded-full text-xs font-bold transition-colors border",
                                i === currentIndex
                                    ? "bg-indigo-500 border-indigo-500 text-white"
                                    : a.eval_submission_id
                                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                        : "bg-surface border-border/50 text-text-muted hover:text-foreground"
                            )}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            </div>

            {/* Single assignment view */}
            <AssignmentPanel
                key={current.id}
                assignment={current}
                assignmentIndex={currentIndex}
                total={assignments.length}
                content={content}
                activityId={activityId}
                isClosed={isClosed}
                onCompleted={(updatedId) => {
                    setAssignments(prev =>
                        prev.map(a => a.id === current.id ? { ...a, eval_submission_id: updatedId } : a)
                    );
                }}
                onPrev={() => setCurrentIndex(i => Math.max(0, i - 1))}
                onNext={() => setCurrentIndex(i => Math.min(assignments.length - 1, i + 1))}
            />

            {/* Received feedback section */}
            {feedbackVisible && receivedFeedback.length > 0 && (
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

// ─── Sub-component: single assignment ────────────────────────────────────────

function AssignmentPanel({
    assignment,
    assignmentIndex,
    total,
    content,
    activityId,
    isClosed,
    onCompleted,
    onPrev,
    onNext,
}: {
    assignment: PeerAssignmentWithTarget;
    assignmentIndex: number;
    total: number;
    content: PeerEvaluationContent;
    activityId: string;
    isClosed?: boolean;
    onCompleted: (evalSubId: string) => void;
    onPrev: () => void;
    onNext: () => void;
}) {
    const rubric = content.rubric ?? [];
    const isCompleted = !!assignment.eval_submission_id;

    const [scores, setScores] = useState<Record<string, number>>({});
    const [justifications, setJustifications] = useState<Record<string, string>>({});
    const [qaNotes, setQaNotes] = useState("");
    const [isPending, startTransition] = useTransition();

    const targetName = (assignment.target_submission?.student as any)?.full_name
        ?? (assignment.target_submission?.group as any)?.name
        ?? "Alumno";

    const allScored = rubric.every(c => scores[c.id] !== undefined);
    const allJustified = !content.requireJustification
        || rubric.every(c => {
            const text = justifications[c.id] ?? "";
            const minLen = content.minJustificationLength ?? 0;
            return text.trim().length >= (minLen > 0 ? minLen : 1);
        });
    const canSubmit = allScored && allJustified && !isCompleted && !isClosed;

    function handleSubmit() {
        startTransition(async () => {
            const res = await submitPeerEvaluation(
                assignment.id,
                activityId,
                scores,
                justifications,
                content.livePresentationMode ? qaNotes : undefined,
            );
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Evaluación enviada correctamente.");
                onCompleted(assignment.id); // optimistic — real id set server-side
            }
        });
    }

    return (
        <div className="space-y-6">
            {/* Target submission */}
            <div className="rounded-2xl border border-white/5 bg-surface-dark overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-text-muted uppercase tracking-widest font-bold">Entrega a evaluar</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">
                            {content.anonymousEvaluation ? `Entrega ${assignmentIndex + 1}` : targetName}
                        </p>
                    </div>
                    {assignment.target_submission?.drive_file_url && (
                        <a
                            href={assignment.target_submission.drive_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-accent-blue hover:underline"
                        >
                            <ExternalLink className="size-3.5" /> Abrir en Drive
                        </a>
                    )}
                </div>
                {assignment.target_submission?.drive_file_url && (
                    <div className="aspect-4/3 bg-white">
                        <iframe
                            src={assignment.target_submission.drive_file_url}
                            className="w-full h-full"
                            title="Entrega a evaluar"
                        />
                    </div>
                )}
            </div>

            {/* Rubric */}
            {isCompleted ? (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                    <CheckCircle2 className="size-4 shrink-0" />
                    Evaluación completada.
                    {!content.anonymousEvaluation && content.peerFeedbackVisibleToStudents && (
                        <span className="text-text-muted text-xs ml-1">El alumno podrá ver tu feedback cuando el profesor lo publique.</span>
                    )}
                </div>
            ) : (
                <>
                    <div className="p-6 bg-surface-dark border border-white/5 rounded-2xl space-y-6">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                            <ClipboardList className="size-4" /> Rúbrica de evaluación
                        </h3>
                        {rubric.map(criterion => (
                            <CriterionBlock
                                key={criterion.id}
                                criterion={criterion}
                                selected={scores[criterion.id]}
                                justification={justifications[criterion.id] ?? ""}
                                requireJustification={content.requireJustification}
                                minLength={content.minJustificationLength ?? 0}
                                onSelect={pts => setScores(p => ({ ...p, [criterion.id]: pts }))}
                                onJustify={text => setJustifications(p => ({ ...p, [criterion.id]: text }))}
                            />
                        ))}
                    </div>

                    {/* Q&A section (live presentation mode) */}
                    {content.livePresentationMode && (
                        <div className="p-6 bg-surface-dark border border-white/5 rounded-2xl space-y-3">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare className="size-4" /> Sesión de Preguntas
                            </h3>
                            <Textarea
                                value={qaNotes}
                                onChange={e => setQaNotes(e.target.value)}
                                placeholder="Preguntas realizadas, respuestas destacadas, observaciones de la presentación..."
                                className="resize-none text-sm min-h-[100px] bg-surface border-border/50"
                            />
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button
                            onClick={handleSubmit}
                            disabled={!canSubmit || isPending}
                            className="gap-2 px-8"
                        >
                            <CheckCircle2 className="size-4" />
                            {isPending ? "Enviando..." : "Enviar evaluación"}
                        </Button>
                    </div>
                </>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onPrev}
                    disabled={assignmentIndex <= 0}
                    className="gap-2 border-border/50"
                >
                    <ChevronLeft className="size-4" /> Anterior
                </Button>
                <span className="text-xs text-text-muted">{assignmentIndex + 1} / {total}</span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onNext}
                    disabled={assignmentIndex >= total - 1}
                    className="gap-2 border-border/50"
                >
                    Siguiente <ChevronRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}

// ─── Criterion block ──────────────────────────────────────────────────────────

function CriterionBlock({
    criterion, selected, justification, requireJustification, minLength, onSelect, onJustify,
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                                    : "bg-surface border-border/50 hover:bg-surface-dark"
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
                            "resize-none text-sm min-h-[72px] bg-surface border-border/50",
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
