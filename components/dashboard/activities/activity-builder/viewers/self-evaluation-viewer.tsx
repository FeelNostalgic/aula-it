"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { UserCheck, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, ClipboardList, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SelfEvaluationContent, ActivitySubmission, RubricCriteria, criteriaMaxPoints } from "@/types/activity";
import { submitSelfEvaluation } from "@/app/activities/[id]/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SelfEvaluationViewerProps {
    content: SelfEvaluationContent;
    stepId: string;
    activityId: string;
    initialSubmission?: ActivitySubmission | null;
    referenceSubmission?: ActivitySubmission | null;
    isPreview?: boolean;
    isClosed?: boolean;
}

export function SelfEvaluationViewer({
    content,
    stepId,
    activityId,
    initialSubmission,
    referenceSubmission,
    isPreview,
    isClosed,
}: SelfEvaluationViewerProps) {
    const evalMode = content.evalMode ?? "rubric";
    const rubric = content.rubric ?? [];
    const questions = content.questions ?? [];

    const hasSubmitted = !!(
        evalMode === "questions"
            ? initialSubmission?.self_eval_justifications
            : initialSubmission?.self_eval_rubric_scores
    );
    const isPublished = initialSubmission?.status === "published";

    const [scores, setScores] = useState<Record<string, number>>(
        initialSubmission?.self_eval_rubric_scores ?? {}
    );
    const [answers, setAnswers] = useState<Record<string, string>>(
        initialSubmission?.self_eval_justifications ?? {}
    );
    const [referenceExpanded, setReferenceExpanded] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Validation
    const allScored = evalMode === "questions" || rubric.every(c => scores[c.id] !== undefined);
    const allAnswered = evalMode !== "questions" || questions.every(q => (answers[q.id] ?? "").trim().length > 0);
    const allJustified = evalMode !== "rubric" || !content.requireJustification || rubric.every(c => (answers[c.id] ?? "").trim().length > 0);
    const canSubmit = allScored && allAnswered && allJustified && !isPreview && !isClosed && !hasSubmitted;

    function handleSubmit() {
        if (!canSubmit) return;
        startTransition(async () => {
            const rubricScores = evalMode === "questions" ? {} : scores;
            const result = await submitSelfEvaluation(stepId, activityId, rubricScores, answers);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Autoevaluación enviada correctamente.");
            }
        });
    }

    // Numeric comparison (rubric mode only)
    const rubricMax = rubric.reduce((sum, c) => sum + criteriaMaxPoints(c), 0);
    const selfTotal = Object.values(scores).reduce((a, b) => a + b, 0);
    const selfNormalized = rubricMax > 0 ? Math.round((selfTotal / rubricMax) * 1000) / 100 : 0;
    const teacherScore = isPublished ? initialSubmission?.score : null;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Instructions */}
            {content.instructionsMarkdown && (
                <div className="p-6 bg-surface-dark border border-white/5 rounded-2xl space-y-4">
                    <h3 className="text-sm font-bold text-accent-blue flex items-center gap-2 uppercase tracking-widest">
                        <UserCheck className="size-4" /> Instrucciones
                    </h3>
                    <div className="prose dark:prose-invert prose-sm max-w-none text-text-muted font-sans">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                        >
                            {content.instructionsMarkdown}
                        </ReactMarkdown>
                    </div>
                </div>
            )}

            {/* Reference submission (collapsible) */}
            {referenceSubmission?.drive_file_url && (
                <div className="rounded-2xl border border-white/5 bg-surface-dark overflow-hidden">
                    <button
                        className="w-full px-6 py-4 flex items-center justify-between text-sm font-semibold text-foreground hover:bg-white/2 transition-colors"
                        onClick={() => setReferenceExpanded(v => !v)}
                    >
                        <span className="flex items-center gap-2">
                            <ExternalLink className="size-4 text-accent-blue" />
                            Tu entrega de referencia
                        </span>
                        {referenceExpanded ? <ChevronUp className="size-4 text-text-muted" /> : <ChevronDown className="size-4 text-text-muted" />}
                    </button>
                    {referenceExpanded && (
                        <div className="px-6 pb-6">
                            <div className="aspect-4/3 w-full rounded-xl overflow-hidden border border-border bg-white shadow">
                                <iframe src={referenceSubmission.drive_file_url} className="w-full h-full" title="Entrega de referencia" />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Published comparison banner — rubric mode only */}
            {evalMode === "rubric" && isPublished && teacherScore !== null && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">Tu autoevaluación</span>
                        <span className="text-2xl font-black font-mono text-indigo-400">{selfNormalized} / 10</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1">Nota del profesor</span>
                        <span className="text-2xl font-black font-mono text-emerald-400">{teacherScore} / 10</span>
                    </div>
                </div>
            )}

            {/* ── RUBRIC MODE ── */}
            {evalMode === "rubric" && (
                rubric.length > 0 ? (
                    <div className="p-6 bg-surface-dark border border-white/5 rounded-2xl space-y-6">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                            <ClipboardList className="size-4" /> Rúbrica de autoevaluación
                        </h3>
                        {rubric.map(criterion => (
                            <CriterionBlock
                                key={criterion.id}
                                criterion={criterion}
                                selected={scores[criterion.id]}
                                justification={answers[criterion.id] ?? ""}
                                requireJustification={content.requireJustification}
                                readOnly={hasSubmitted || !!isPreview || !!isClosed}
                                onSelect={(pts) => setScores(prev => ({ ...prev, [criterion.id]: pts }))}
                                onJustify={(text) => setAnswers(prev => ({ ...prev, [criterion.id]: text }))}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-text-muted text-sm">
                        El profesor aún no ha configurado la rúbrica para esta autoevaluación.
                    </div>
                )
            )}

            {/* ── QUESTIONS MODE ── */}
            {evalMode === "questions" && (
                questions.length > 0 ? (
                    <div className="p-6 bg-surface-dark border border-white/5 rounded-2xl space-y-6">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare className="size-4" /> Reflexión
                        </h3>
                        {questions.map((q, idx) => (
                            <div key={q.id} className="space-y-2">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        <span className="text-text-muted font-normal mr-1">{idx + 1}.</span>
                                        {q.text}
                                    </p>
                                    {q.description && (
                                        <p className="text-xs text-text-muted mt-0.5">{q.description}</p>
                                    )}
                                </div>
                                <Textarea
                                    value={answers[q.id] ?? ""}
                                    onChange={(e) => !hasSubmitted && !isPreview && !isClosed && setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    readOnly={hasSubmitted || !!isPreview || !!isClosed}
                                    placeholder="Escribe tu respuesta..."
                                    className={cn(
                                        "resize-none text-sm min-h-[96px] bg-surface border-border/50",
                                        (hasSubmitted || isPreview || isClosed) && "cursor-default opacity-80"
                                    )}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-text-muted text-sm">
                        El profesor aún no ha configurado las preguntas para esta autoevaluación.
                    </div>
                )
            )}

            {/* Submit button */}
            {!hasSubmitted && (evalMode === "rubric" ? rubric.length > 0 : questions.length > 0) && (
                <div className="flex justify-end">
                    <Button
                        onClick={handleSubmit}
                        disabled={!canSubmit || isPending}
                        className="gap-2 px-8"
                    >
                        <CheckCircle2 className="size-4" />
                        {isPending ? "Enviando..." : "Enviar autoevaluación"}
                    </Button>
                </div>
            )}

            {hasSubmitted && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                    <CheckCircle2 className="size-4 shrink-0" />
                    Autoevaluación enviada.{" "}
                    {evalMode === "rubric" && isPublished
                        ? "Ya puedes ver tu nota comparativa arriba."
                        : "El profesor la revisará pronto."}
                </div>
            )}
        </div>
    );
}

// ─── Sub-component: criterion block (rubric mode) ─────────────────────────────

function CriterionBlock({
    criterion,
    selected,
    justification,
    requireJustification,
    readOnly,
    onSelect,
    onJustify,
}: {
    criterion: RubricCriteria;
    selected?: number;
    justification: string;
    requireJustification: boolean;
    readOnly: boolean;
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
                            disabled={readOnly}
                            onClick={() => !readOnly && onSelect(level.points)}
                            className={cn(
                                "p-2.5 border rounded-xl text-left transition-colors",
                                isSelected
                                    ? "bg-indigo-500/15 border-indigo-500/40 ring-1 ring-indigo-500/40"
                                    : "bg-surface border-border/50 hover:bg-surface-dark",
                                readOnly && "cursor-default"
                            )}
                        >
                            <div className="flex items-center justify-between gap-1">
                                <p className={cn("text-xs font-bold", isSelected ? "text-indigo-400" : "text-foreground")}>{level.label}</p>
                                {isSelected && <CheckCircle2 className="size-3 text-indigo-400 shrink-0" />}
                            </div>
                            <p className={cn("text-[10px] font-mono", isSelected ? "text-indigo-400" : "text-accent-blue")}>{level.points} pts</p>
                            {level.description && (
                                <p className="text-[10px] text-text-muted mt-1 leading-snug">{level.description}</p>
                            )}
                        </button>
                    );
                })}
            </div>
            {(requireJustification || justification) && (
                <Textarea
                    value={justification}
                    onChange={(e) => !readOnly && onJustify(e.target.value)}
                    readOnly={readOnly}
                    placeholder={requireJustification ? "Justifica tu puntuación (obligatorio)..." : "Justificación (opcional)..."}
                    className={cn(
                        "resize-none text-sm min-h-[72px] bg-surface border-border/50",
                        readOnly && "cursor-default opacity-80"
                    )}
                />
            )}
        </div>
    );
}
