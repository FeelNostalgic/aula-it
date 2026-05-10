"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { CheckCircle2, ClipboardList, Link2, MessageSquare, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitSelfEvaluation } from "@/app/activities/[id]/actions";
import { buildQuizRenderItems } from "@/lib/quiz-content";
import { cn } from "@/lib/utils";
import type { ActivitySubmission, QuizQuestion, RubricCriteria, SelfEvaluationContent } from "@/types/activity";
import { criteriaMaxPoints } from "@/types/activity";
import { toast } from "sonner";
import { EvaluationQuestionResponse } from "../quiz/evaluation-question-response";

interface SelfEvaluationViewerProps {
    content: SelfEvaluationContent;
    stepId: string;
    activityId: string;
    initialSubmission?: ActivitySubmission | null;
    referenceStepTitle?: string | null;
    referenceScore?: number | null;
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
    const showsRubric = evalMode === "rubric" || evalMode === "combined";
    const showsQuestions = evalMode === "questions" || evalMode === "combined";
    const hasSubmitted = !!((showsQuestions ? initialSubmission?.self_eval_justifications : null) || (showsRubric ? initialSubmission?.self_eval_rubric_scores : null));
    const isPublished = initialSubmission?.status === "published";

    const [scores, setScores] = useState<Record<string, number>>(initialSubmission?.self_eval_rubric_scores ?? {});
    const [answers, setAnswers] = useState<Record<string, string>>(initialSubmission?.self_eval_justifications ?? {});
    const [isPending, startTransition] = useTransition();

    const questionItems = buildQuizRenderItems(content);
    const allScored = !showsRubric || rubric.every((criterion) => scores[criterion.id] !== undefined);
    const allAnswered = !showsQuestions || questions.every((question) => isValidQuestionAnswer(question, answers));
    const minJustLen = content.minJustificationLength ?? 0;
    const allJustified = !showsRubric || !content.requireJustification || rubric.every((criterion) => {
        const text = (answers[criterion.id] ?? "").trim();
        return text.length >= (minJustLen > 0 ? minJustLen : 1);
    });
    const canSubmit = allScored && allAnswered && allJustified && !isPreview && !isClosed && !hasSubmitted;

    function handleSubmit() {
        if (!canSubmit) return;
        startTransition(async () => {
            const result = await submitSelfEvaluation(stepId, activityId, showsRubric ? scores : {}, answers);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            toast.success("Autoevaluación enviada correctamente.");
        });
    }

    const rubricMax = rubric.reduce((sum, criterion) => sum + criteriaMaxPoints(criterion), 0);
    const selfTotal = Object.values(scores).reduce((sum, value) => sum + value, 0);
    const selfNormalized = rubricMax > 0 ? Math.round((selfTotal / rubricMax) * 1000) / 100 : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {hasSubmitted && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                    <CheckCircle2 className="size-4 shrink-0" />
                    {isPublished
                        ? (showsRubric
                            ? "Autoevaluación publicada. Ya puedes ver tu nota comparativa abajo."
                            : "Autoevaluación completada.")
                        : "Autoevaluación enviada. El profesor la revisará pronto."}
                </div>
            )}

            {content.instructionsMarkdown && (
                <div className="p-6 bg-surface-dark border border-white/5 rounded-2xl space-y-4">
                    <h3 className="text-sm font-bold text-accent-blue flex items-center gap-2 uppercase tracking-widest">
                        <UserCheck className="size-4" /> Instrucciones
                    </h3>
                    <div className="prose dark:prose-invert prose-sm max-w-none text-text-muted font-sans">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}>
                            {content.instructionsMarkdown}
                        </ReactMarkdown>
                    </div>
                </div>
            )}

            {referenceStepTitle && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-dark border border-white/5 text-xs text-text-muted">
                    <Link2 className="size-3.5 text-accent-blue shrink-0" />
                    Vinculado a: <span className="font-semibold text-foreground">{referenceStepTitle}</span>
                </div>
            )}

            {showsRubric && isPublished && hasSubmitted && (
                <div className={cn("grid gap-4", content.countsTowardGrade && referenceScore != null ? "grid-cols-2" : "grid-cols-1 max-w-xs")}>
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

            {showsRubric && (
                rubric.length > 0 ? (
                    <div className="p-6 bg-surface-dark border border-white/5 rounded-2xl space-y-6">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                            <ClipboardList className="size-4" /> Rúbrica de autoevaluación
                        </h3>
                        {rubric.map((criterion) => (
                            <CriterionBlock
                                key={criterion.id}
                                criterion={criterion}
                                selected={scores[criterion.id]}
                                justification={answers[criterion.id] ?? ""}
                                requireJustification={content.requireJustification}
                                minJustificationLength={content.minJustificationLength}
                                readOnly={hasSubmitted || !!isPreview || !!isClosed}
                                onSelect={(points) => setScores((prev) => ({ ...prev, [criterion.id]: points }))}
                                onJustify={(text) => setAnswers((prev) => ({ ...prev, [criterion.id]: text }))}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-text-muted text-sm">
                        El profesor aún no ha configurado la rúbrica para esta autoevaluación.
                    </div>
                )
            )}

            {showsQuestions && (
                questions.length > 0 ? (
                    <div className="p-6 bg-surface-dark border border-white/5 rounded-2xl space-y-6">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare className="size-4" /> Reflexión
                        </h3>
                        {questionItems.map((item, index) => (
                            item.kind === "section" ? (
                                <div key={item.id} className="rounded-xl border border-accent-blue/20 bg-accent-blue/5 px-4 py-3">
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-accent-blue">{item.section.title || "Sección"}</p>
                                </div>
                            ) : (
                                <EvaluationQuestionResponse
                                    key={item.id}
                                    question={item.question}
                                    index={index}
                                    answer={answers[item.question.id] ?? ""}
                                    justification={answers[`${item.question.id}:justification`] ?? ""}
                                    readOnly={hasSubmitted || !!isPreview || !!isClosed}
                                    surfaceClassName="bg-surface border-border/50"
                                    onAnswer={(value) => !hasSubmitted && !isPreview && !isClosed && setAnswers((prev) => ({ ...prev, [item.question.id]: value }))}
                                    onJustification={(value) => !hasSubmitted && !isPreview && !isClosed && setAnswers((prev) => ({ ...prev, [`${item.question.id}:justification`]: value }))}
                                />
                            )
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-text-muted text-sm">
                        El profesor aún no ha configurado las preguntas para esta autoevaluación.
                    </div>
                )
            )}

            {!hasSubmitted && ((showsRubric && rubric.length > 0) || (showsQuestions && questions.length > 0)) && (
                <div className="flex justify-end">
                    <Button onClick={handleSubmit} disabled={!canSubmit || isPending} className="gap-2 px-8">
                        <CheckCircle2 className="size-4" />
                        {isPending ? "Enviando..." : "Enviar autoevaluación"}
                    </Button>
                </div>
            )}
        </div>
    );
}

function isValidQuestionAnswer(question: QuizQuestion, answers: Record<string, string>) {
    const answer = (answers[question.id] ?? "").trim();
    if (!answer) return false;

    if (question.type === "numeric") {
        const value = parseFloat(answer);
        if (Number.isNaN(value)) return false;
        const min = question.numericMin ?? 0;
        const max = question.numericMax ?? 10;
        if (value < min || value > max) return false;
    }

    if (question.type === "short_answer" && question.minLength && answer.length < question.minLength) {
        return false;
    }

    if ((question.type === "likert" || question.type === "numeric") && question.requireJustification) {
        const justification = (answers[`${question.id}:justification`] ?? "").trim();
        if (!justification) return false;
        if (question.minLength && justification.length < question.minLength) return false;
    }

    return true;
}

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
    onSelect: (points: number) => void;
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
                {criterion.levels.map((level) => {
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
                            {level.description && <p className="text-[10px] text-text-muted mt-1 leading-snug">{level.description}</p>}
                        </button>
                    );
                })}
            </div>
            {(requireJustification || justification) && (
                <div className="space-y-1">
                    <Textarea
                        value={justification}
                        onChange={(event) => !readOnly && onJustify(event.target.value)}
                        readOnly={readOnly}
                        placeholder={requireJustification ? "Justifica tu puntuación (obligatorio)..." : "Justificación (opcional)..."}
                        className={cn(
                            "resize-none text-sm min-h-[72px] bg-surface border-border/50",
                            readOnly && "cursor-default opacity-80",
                            showWarning && "border-amber-500/50"
                        )}
                    />
                    {showWarning && (
                        <p className="text-[11px] text-amber-400">Faltan {minLen - charCount} caracteres para cumplir el mínimo.</p>
                    )}
                </div>
            )}
        </div>
    );
}
