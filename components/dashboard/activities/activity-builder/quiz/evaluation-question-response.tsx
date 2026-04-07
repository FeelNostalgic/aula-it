"use client";

import { Textarea } from "@/components/ui/textarea";
import { getLikertLabel, getLikertRange } from "@/lib/quiz-core";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/types/activity";
import { CheckCircle2 } from "lucide-react";

type EvaluationQuestionResponseProps = {
    question: QuizQuestion;
    index: number;
    answer: string;
    justification?: string;
    readOnly?: boolean;
    surfaceClassName?: string;
    onAnswer: (value: string) => void;
    onJustification?: (value: string) => void;
};

export function EvaluationQuestionResponse({
    question,
    index,
    answer,
    justification = "",
    readOnly,
    surfaceClassName = "bg-surface border-border/50",
    onAnswer,
    onJustification,
}: EvaluationQuestionResponseProps) {
    const isLikert = question.type === "likert";
    const isNumeric = question.type === "numeric";
    const { values } = getLikertRange(question);
    const charCount = answer.trim().length;
    const justificationCharCount = justification.trim().length;
    const minLength = question.minLength ?? 0;
    const showMinLengthWarning = !isLikert && !isNumeric && !readOnly && minLength > 0 && charCount > 0 && charCount < minLength;
    const showJustificationWarning = isLikert && question.requireJustification && !readOnly && minLength > 0 && justificationCharCount > 0 && justificationCharCount < minLength;
    const columnsClass = values.length <= 5 ? "grid-cols-5" : values.length <= 7 ? "grid-cols-7" : "grid-cols-4 sm:grid-cols-6";

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
                        onChange={(event) => !readOnly && onAnswer(event.target.value)}
                        readOnly={readOnly}
                        placeholder={`${question.numericMin ?? 0} - ${question.numericMax ?? 10}`}
                        className={cn(
                            "h-10 w-32 rounded-xl border px-3 text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-indigo-500",
                            surfaceClassName,
                            readOnly && "cursor-default opacity-80",
                        )}
                    />
                    <span className="text-xs text-text-muted">
                        Rango: {question.numericMin ?? 0} - {question.numericMax ?? 10}
                    </span>
                </div>
            ) : isLikert ? (
                <div className="space-y-2">
                    <div className={cn("grid gap-1.5", columnsClass)}>
                        {values.map((value) => {
                            const rawValue = String(value);
                            const isSelected = answer === rawValue;
                            const label = getLikertLabel(question, value);
                            return (
                                <button
                                    key={rawValue}
                                    type="button"
                                    disabled={readOnly}
                                    onClick={() => !readOnly && onAnswer(isSelected ? "" : rawValue)}
                                    className={cn(
                                        "flex min-h-16 flex-col items-center justify-center gap-1 p-2 rounded-xl border text-center transition-colors",
                                        isSelected
                                            ? "bg-indigo-500/15 border-indigo-500/40 ring-1 ring-indigo-500/40"
                                            : cn(surfaceClassName, "hover:bg-surface-dark"),
                                        readOnly && "cursor-default",
                                    )}
                                >
                                    <span className={cn("text-xs font-bold", isSelected ? "text-indigo-400" : "text-foreground")}>{value}</span>
                                    {label !== rawValue && (
                                        <span className={cn("text-[11px] font-semibold leading-snug", isSelected ? "text-white" : "text-foreground/85")}>{label}</span>
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
                                onChange={(event) => !readOnly && onJustification?.(event.target.value)}
                                readOnly={readOnly}
                                placeholder="Justifica tu respuesta..."
                                className={cn(
                                    "resize-none text-sm min-h-[72px]",
                                    surfaceClassName,
                                    readOnly && "cursor-default opacity-80",
                                    showJustificationWarning && "border-amber-500/50",
                                )}
                            />
                            {minLength > 0 && !readOnly && (
                                <p className={cn("text-[10px] text-right", showJustificationWarning ? "text-amber-400" : "text-text-muted/50")}>
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
                        onChange={(event) => !readOnly && onAnswer(event.target.value)}
                        readOnly={readOnly}
                        placeholder="Escribe tu respuesta..."
                        className={cn(
                            "resize-none text-sm min-h-[96px]",
                            surfaceClassName,
                            readOnly && "cursor-default opacity-80",
                            showMinLengthWarning && "border-amber-500/50",
                        )}
                    />
                    {minLength > 0 && !readOnly && (
                        <p className={cn("text-[10px] text-right", showMinLengthWarning ? "text-amber-400" : "text-text-muted/50")}>
                            {charCount}/{minLength} caracteres mínimos
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
