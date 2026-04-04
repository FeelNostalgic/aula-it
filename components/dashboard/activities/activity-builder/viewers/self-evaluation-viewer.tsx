"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { UserCheck, CheckCircle2, Link2, ClipboardList, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SelfEvaluationContent, ActivitySubmission, RubricCriteria, criteriaMaxPoints, QuizQuestion } from "@/types/activity";
import { submitSelfEvaluation } from "@/app/activities/[id]/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SelfEvaluationViewerProps {
    content: SelfEvaluationContent;
    stepId: string;
    activityId: string;
    initialSubmission?: ActivitySubmission | null;
    referenceStepTitle?: string | null;
    referenceScore?: number | null;  // published score of the linked deliverable (after weighting)
    isPreview?: boolean;
    isClosed?: boolean;
}

export function SelfEvaluationViewer({
    content,
    stepId,
    activityId,
    initialSubmission,
    referenceStepTitle,
    referenceScore,
    isPreview,
    isClosed,
}: SelfEvaluationViewerProps) {
    const evalMode = content.evalMode ?? "rubric";
    const rubric = content.rubric ?? [];
    const questions = (content.questions ?? []) as QuizQuestion[];

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
    const [isPending, startTransition] = useTransition();

    // Validation
    const allScored = evalMode === "questions" || rubric.every(c => scores[c.id] !== undefined);
    const allAnswered = evalMode !== "questions" || questions.every(q => {
        const ans = (answers[q.id] ?? "").trim();
        if (!ans) return false;
        if (q.type === 'numeric') {
            const val = parseFloat(ans);
            if (isNaN(val)) return false;
            const min = q.numericMin ?? 0, max = q.numericMax ?? 10;
            if (val < min || val > max) return false;
            return true;
        }
        if (q.type === 'short_answer' && q.minLength && ans.length < q.minLength) return false;
        if (q.type === 'likert') {
            if (q.requireJustification) {
                const just = (answers[`${q.id}:justification`] ?? "").trim();
                if (!just) return false;
                if (q.minLength && just.length < q.minLength) return false;
            }
        }
        return true;
    });
    const minJustLen = content.minJustificationLength ?? 0;
    const allJustified = evalMode !== "rubric" || !content.requireJustification || rubric.every(c => {
        const j = (answers[c.id] ?? "").trim();
        if (!j) return false;
        if (minJustLen > 0 && j.length < minJustLen) return false;
        return true;
    });
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

            {/* Linked deliverable badge */}
            {referenceStepTitle && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-dark border border-white/5 text-xs text-text-muted">
                    <Link2 className="size-3.5 text-accent-blue shrink-0" />
                    Vinculado a: <span className="font-semibold text-foreground">{referenceStepTitle}</span>
                </div>
            )}

            {/* Published comparison banner — rubric mode, student has submitted */}
            {evalMode === "rubric" && isPublished && hasSubmitted && (
                <div className={cn(
                    "grid gap-4",
                    content.countsTowardGrade && referenceScore != null ? "grid-cols-2" : "grid-cols-1 max-w-xs"
                )}>
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">Tu autoevaluación</span>
                        <span className="text-2xl font-black font-mono text-indigo-400">{selfNormalized} / 10</span>
                    </div>
                    {content.countsTowardGrade && referenceScore != null && (
                        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1">Nota final del entregable</span>
                            <span className="text-2xl font-black font-mono text-emerald-400">{referenceScore} / 10</span>
                            <span className="text-[10px] text-emerald-400/60 mt-1 text-center">
                                {content.selfEvalWeight ?? 20}% autoevaluación + {100 - (content.selfEvalWeight ?? 20)}% profesor
                            </span>
                        </div>
                    )}
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
                                minJustificationLength={content.minJustificationLength}
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
                            <QuestionBlock
                                key={q.id}
                                question={q}
                                index={idx}
                                answer={answers[q.id] ?? ""}
                                justification={answers[`${q.id}:justification`] ?? ""}
                                readOnly={hasSubmitted || !!isPreview || !!isClosed}
                                onAnswer={(v) => !hasSubmitted && !isPreview && !isClosed && setAnswers(prev => ({ ...prev, [q.id]: v }))}
                                onJustification={(v) => !hasSubmitted && !isPreview && !isClosed && setAnswers(prev => ({ ...prev, [`${q.id}:justification`]: v }))}
                            />
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
    minJustificationLength,
    readOnly,
    onSelect,
    onJustify,
}: {
    criterion: RubricCriteria;
    selected?: number;
    justification: string;
    requireJustification: boolean;
    minJustificationLength?: number;
    readOnly: boolean;
    onSelect: (pts: number) => void;
    onJustify: (text: string) => void;
}) {
    const charCount = justification.trim().length;
    const minLen = minJustificationLength ?? 0;
    const showWarning = !readOnly && requireJustification && minLen > 0 && charCount > 0 && charCount < minLen;

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
                <div className="space-y-1">
                    <Textarea
                        value={justification}
                        onChange={(e) => !readOnly && onJustify(e.target.value)}
                        readOnly={readOnly}
                        placeholder={requireJustification ? "Justifica tu puntuación (obligatorio)..." : "Justificación (opcional)..."}
                        className={cn(
                            "resize-none text-sm min-h-[72px] bg-surface border-border/50",
                            readOnly && "cursor-default opacity-80",
                            showWarning && "border-amber-500/50"
                        )}
                    />
                    {minLen > 0 && !readOnly && (
                        <p className={cn("text-[10px] text-right", showWarning ? "text-amber-400" : "text-text-muted/50")}>
                            {charCount}/{minLen} caracteres mínimos
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Sub-component: question block (questions mode — short_answer + likert) ──

function QuestionBlock({
    question,
    index,
    answer,
    justification,
    readOnly,
    onAnswer,
    onJustification,
}: {
    question: QuizQuestion;
    index: number;
    answer: string;
    justification: string;
    readOnly: boolean;
    onAnswer: (v: string) => void;
    onJustification: (v: string) => void;
}) {
    const isLikert = question.type === 'likert';
    const isNumeric = question.type === 'numeric';
    const scale = question.likertScale ?? 5;
    const labels = question.likertLabels ?? [];
    const charCount = answer.trim().length;
    const justificationCharCount = justification.trim().length;
    const minLength = question.minLength ?? 0;
    const showMinLengthWarning = !isLikert && !isNumeric && !readOnly && minLength > 0 && charCount > 0 && charCount < minLength;
    const showJustificationWarning = isLikert && question.requireJustification && !readOnly && minLength > 0 && justificationCharCount > 0 && justificationCharCount < minLength;

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
                <div className="flex items-center gap-3">
                    <input
                        type="number"
                        min={question.numericMin ?? 0}
                        max={question.numericMax ?? 10}
                        step="0.01"
                        value={answer}
                        onChange={(e) => !readOnly && onAnswer(e.target.value)}
                        readOnly={readOnly}
                        placeholder={`${question.numericMin ?? 0} – ${question.numericMax ?? 10}`}
                        className={cn(
                            "h-10 w-32 rounded-xl border border-border/50 bg-surface px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-indigo-500",
                            readOnly && "cursor-default opacity-80"
                        )}
                    />
                    <span className="text-xs text-text-muted">
                        Rango: {question.numericMin ?? 0} – {question.numericMax ?? 10}
                    </span>
                </div>
            ) : isLikert ? (
                <div className="space-y-2">
                    <div className={cn("grid gap-1.5", scale <= 5 ? "grid-cols-5" : "grid-cols-7")}>
                        {Array.from({ length: scale }, (_, i) => {
                            const val = String(i + 1);
                            const isSelected = answer === val;
                            const label = labels[i] ?? val;
                            return (
                                <button
                                    key={val}
                                    disabled={readOnly}
                                    onClick={() => !readOnly && onAnswer(val)}
                                    className={cn(
                                        "flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-colors",
                                        isSelected
                                            ? "bg-indigo-500/15 border-indigo-500/40 ring-1 ring-indigo-500/40"
                                            : "bg-surface border-border/50 hover:bg-surface-dark",
                                        readOnly && "cursor-default"
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
                    {question.requireJustification && (
                        <div className="space-y-1">
                            <Textarea
                                value={justification}
                                onChange={(e) => !readOnly && onJustification(e.target.value)}
                                readOnly={readOnly}
                                placeholder="Justifica tu respuesta (obligatorio)..."
                                className={cn(
                                    "resize-none text-sm min-h-[72px] bg-surface border-border/50",
                                    readOnly && "cursor-default opacity-80",
                                    showJustificationWarning && "border-amber-500/50"
                                )}
                            />
                            {minLength > 0 && !readOnly && (
                                <p className={cn(
                                    "text-[10px] text-right",
                                    showJustificationWarning ? "text-amber-400" : "text-text-muted/50"
                                )}>
                                    {justificationCharCount}/{minLength} caracteres mínimos
                                </p>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-1">
                    <Textarea
                        value={answer}
                        onChange={(e) => !readOnly && onAnswer(e.target.value)}
                        readOnly={readOnly}
                        placeholder="Escribe tu respuesta..."
                        className={cn(
                            "resize-none text-sm min-h-[96px] bg-surface border-border/50",
                            readOnly && "cursor-default opacity-80",
                            showMinLengthWarning && "border-amber-500/50"
                        )}
                    />
                    {minLength > 0 && !readOnly && (
                        <p className={cn(
                            "text-[10px] text-right",
                            showMinLengthWarning ? "text-amber-400" : "text-text-muted/50"
                        )}>
                            {charCount}/{minLength} caracteres mínimos
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
