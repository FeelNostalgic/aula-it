"use client";

import { Input } from "@/components/ui/input";
import { getLikertRange } from "@/lib/quiz-core";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/types/activity";

type LikertQuestionConfigProps = {
    question: QuizQuestion;
    onUpdate: (updates: Partial<QuizQuestion>) => void;
    className?: string;
};

function buildLabelsForRange(question: QuizQuestion, nextMin: number, nextMax: number) {
    const current = getLikertRange(question);
    return Array.from({ length: nextMax - nextMin + 1 }, (_, index) => {
        const value = nextMin + index;
        return question.likertLabels?.[value - current.min] ?? "";
    });
}

export function LikertQuestionConfig({ question, onUpdate, className }: LikertQuestionConfigProps) {
    const { min, max, values } = getLikertRange(question);

    function updateRange(nextMin: number, nextMax: number) {
        const normalizedMin = Math.trunc(Math.min(nextMin, nextMax));
        const normalizedMax = Math.trunc(Math.max(nextMin, nextMax));
        onUpdate({
            likertMin: normalizedMin,
            likertMax: normalizedMax,
            likertScale: undefined,
            likertLabels: buildLabelsForRange(question, normalizedMin, normalizedMax),
        });
    }

    function updateLabel(value: number, label: string) {
        const nextLabels = [...(question.likertLabels ?? [])];
        nextLabels[value - min] = label;
        onUpdate({ likertLabels: nextLabels });
    }

    return (
        <div className={cn("pl-14 space-y-4", className)}>
            <div className="rounded-xl border border-border/30 bg-surface/30 p-4 space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Mínimo</label>
                        <Input
                            type="number"
                            step={1}
                            value={min}
                            onChange={(event) => updateRange(Number(event.target.value), max)}
                            className="h-8 w-20 bg-background/60 border-border/40 text-center text-xs font-mono"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Máximo</label>
                        <Input
                            type="number"
                            step={1}
                            value={max}
                            onChange={(event) => updateRange(min, Number(event.target.value))}
                            className="h-8 w-20 bg-background/60 border-border/40 text-center text-xs font-mono"
                        />
                    </div>
                    <p className="text-xs text-text-muted">
                        Likert se registra como respuesta, no suma puntos.
                    </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                    {values.map((value) => (
                        <div key={value} className="flex items-center gap-2">
                            <span className="w-8 shrink-0 rounded-md border border-border/40 bg-background/60 px-2 py-1 text-center text-[11px] font-black text-text-muted">
                                {value}
                            </span>
                            <Input
                                value={question.likertLabels?.[value - min] ?? ""}
                                onChange={(event) => updateLabel(value, event.target.value)}
                                placeholder={`Descripción del nivel ${value}`}
                                className="h-9 bg-background/60 border-border/40 text-sm font-medium text-foreground placeholder:text-text-muted/70"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
