"use client";

import { ActivityStepWithClientState, TheoryContent, QuizContent, PresentationContent, ResourceContent, DeliverableContent, AnimationContent, FileUploadContent, ActivitySubmission, QuizAttempt } from "@/types/activity";
import { DeliverableViewer } from "./deliverable-viewer";
import { FileUploadViewer } from "./file-upload-viewer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { FileText, MonitorPlay, CheckSquare, FolderDown, Download, ExternalLink, GraduationCap, CheckCircle2, XCircle, Circle, PencilRuler, Zap, Copy, AlignLeft, RefreshCw, Trophy, AlertCircle } from "lucide-react";
import { useState, useEffect, useTransition, useMemo } from "react";
import { getQuizAttempts, submitQuizAttempt } from "@/app/activities/[id]/actions";
import { Textarea } from "@/components/ui/textarea";
import { animationRegistry } from "@/lib/animations/registry";
import { AnimationPlayer } from "@/components/animations/animation-player";
import { ArpAnimation } from "@/components/animations/arp-animation";

const animationMap: Record<string, React.ComponentType> = {
    arp: ArpAnimation,
};
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResourceIcon } from "../../resource-icon";
import { toSlidesDownloadUrl } from "@/lib/google-drive-urls";

interface StepViewerProps {
    step: ActivityStepWithClientState;
    activityId?: string;
    submission?: ActivitySubmission;
    googleEmail?: string | null;
    userId?: string | null;
}

export function StepViewer({ step, activityId, submission, googleEmail, userId }: StepViewerProps) {
    if (!step) return null;

    switch (step.type) {
        case 'theory':
            return <TheoryViewer content={step.content as TheoryContent} />;
        case 'quiz':
            return <QuizViewer content={step.content as QuizContent} userId={userId} stepId={step.id} activityId={activityId} submission={submission} />;
        case 'presentation':
            return <PresentationViewer content={step.content as PresentationContent} />;
        case 'resource':
            return <ResourceViewer content={step.content as ResourceContent} />;
        case 'deliverable':
            if (activityId) {
                return (
                    <DeliverableViewer
                        content={step.content as DeliverableContent}
                        stepId={step.id}
                        activityId={activityId}
                        initialSubmission={submission}
                        googleEmail={googleEmail}
                        dueDate={step.due_date}
                    />
                );
            }
            return <DeliverableViewerBasic content={step.content as DeliverableContent} />;
        case 'file_upload':
            if (activityId) {
                return (
                    <FileUploadViewer
                        content={step.content as FileUploadContent}
                        stepId={step.id}
                        activityId={activityId}
                        initialSubmission={submission}
                        dueDate={step.due_date}
                    />
                );
            }
            return null;
        case 'animation':
            return <AnimationViewer content={step.content as AnimationContent} />;
        default:
            return (
                <div className="flex flex-col items-center justify-center p-12 bg-surface-dark/20 rounded-2xl border border-white/5">
                    <GraduationCap className="size-12 text-text-muted/20 mb-4" />
                    <p className="text-text-muted font-mono text-sm uppercase tracking-widest">Contenido no soportado en esta versión</p>
                </div>
            );
    }
}

function TheoryViewer({ content }: { content: TheoryContent }) {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="prose dark:prose-invert prose-blue max-w-none prose-pre:p-0 prose-pre:bg-transparent prose-code:bg-surface-dark prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none font-sans">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                >
                    {content?.markdown || "_Este paso no tiene contenido aún._"}
                </ReactMarkdown>
            </div>
        </div>
    );
}

function DeliverableViewerBasic({ content }: { content: DeliverableContent }) {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="p-6 bg-surface-dark border border-white/5 rounded-2xl space-y-4">
                <h3 className="text-sm font-bold text-accent-blue flex items-center gap-2 uppercase tracking-widest">
                    <PencilRuler className="size-4" /> Instrucciones de la Entrega
                </h3>
                <div className="prose dark:prose-invert prose-sm max-w-none text-text-muted prose-pre:p-0 prose-code:bg-surface-dark prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none font-sans">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                    >
                        {content?.instructionsMarkdown || "_No hay instrucciones detalladas para esta entrega._"}
                    </ReactMarkdown>
                </div>
            </div>

            {content?.templateUrl && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold">Plantilla de Trabajo</h4>
                        <Button onClick={() => window.open(content.templateUrl, '_blank')} variant="outline" size="sm" className="gap-2">
                            <ExternalLink className="size-4" /> Abrir en nueva pestaña
                        </Button>
                    </div>
                    <div className="aspect-4/3 w-full rounded-2xl overflow-hidden border border-border bg-white shadow-2xl">
                        <iframe
                            src={content.templateUrl}
                            className="w-full h-full"
                            title="Plantilla"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function AnimationViewer({ content }: { content: AnimationContent }) {
    // Local animation takes priority over iframe
    if (content?.animationSlug) {
        const meta = animationRegistry.find(a => a.slug === content.animationSlug);
        const AnimationComponent = animationMap[content.animationSlug];
        if (meta && AnimationComponent) {
            return (
                <div className="w-full h-full flex flex-col">
                    <AnimationPlayer steps={meta.steps} title={meta.title}>
                        <AnimationComponent />
                    </AnimationPlayer>
                </div>
            );
        }
    }

    // Fallback: external iframe
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border shadow-2xl bg-surface-dark flex items-center justify-center relative group">
                {content?.componentUrl ? (
                    <iframe
                        src={content.componentUrl}
                        width="100%"
                        height="100%"
                        allowFullScreen
                        className="border-none"
                        title="Interactiva"
                    />
                ) : (
                    <div className="text-center p-12">
                        <Zap className="size-16 text-text-muted/20 mx-auto mb-4" />
                        <p className="text-text-muted uppercase tracking-widest text-xs font-mono">No hay contenido interactivo configurado</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function QuizViewer({
    content,
    userId,
    stepId,
    activityId,
    submission,
}: {
    content: QuizContent;
    userId?: string | null;
    stepId?: string;
    activityId?: string;
    submission?: ActivitySubmission;
}) {
    const isGoogleFormMode = content?.quizMode === 'google_form' || (!content?.quizMode && !!content?.googleFormUrl);

    if (isGoogleFormMode && content?.googleFormUrl) {
        const studentId = userId ? `${userId.slice(-8).toUpperCase()}` : null;
        return (
            <div className="w-full h-screen min-h-[600px] flex flex-col gap-4">
                {studentId && (
                    <div className="flex items-center gap-4 p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-xl">
                        <div className="flex-1">
                            <p className="text-xs text-text-muted uppercase tracking-widest font-mono mb-1">
                                Tu ID de alumno — Introdúcelo en el formulario
                            </p>
                            <p className="text-lg font-black font-mono text-foreground tracking-widest">{studentId}</p>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2 shrink-0"
                            onClick={() => { navigator.clipboard.writeText(studentId); toast.success("ID copiado al portapapeles"); }}>
                            <Copy className="size-3.5" /> Copiar
                        </Button>
                    </div>
                )}
                <div className="bg-surface p-4 rounded-xl border border-border/50 flex items-center justify-between">
                    <span className="text-xs text-text-muted flex items-center gap-2">
                        <CheckSquare className="size-3" /> Cuestionario via Google Forms
                    </span>
                    <Button onClick={() => window.open(content.googleFormUrl, '_blank')} variant="outline" size="sm" className="gap-2 h-7 text-xs">
                        <ExternalLink className="size-3" /> Abrir en ventana completa
                    </Button>
                </div>
                <iframe src={content.googleFormUrl} className="flex-1 w-full border border-border/50 rounded-2xl shadow-2xl bg-white" title="Quiz" />
            </div>
        );
    }

    return <BuiltinQuizViewer content={content} userId={userId} stepId={stepId} activityId={activityId} submission={submission} />;
}

function BuiltinQuizViewer({
    content,
    stepId,
    activityId,
    submission,
}: {
    content: QuizContent;
    userId?: string | null;
    stepId?: string;
    activityId?: string;
    submission?: ActivitySubmission;
}) {
    const [phase, setPhase] = useState<'answering' | 'result'>('answering');
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
    const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
    const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
    const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (!stepId) return;
        getQuizAttempts(stepId).then(setAttempts);
    }, [stepId]);

    // If student already has a graded/submitted status from a previous session, show result
    useEffect(() => {
        if (submission && (submission.status === 'graded' || submission.status === 'submitted') && attempts.length > 0) {
            const best = [...attempts].sort((a, b) => b.points_earned - a.points_earned)[0];
            setLastAttempt(best);
            setPhase('result');
        }
    }, [submission, attempts]);

    const displayQuestions = useMemo(() => {
        if (!content?.questions) return [];
        const qs = content.randomizeQuestions
            ? [...content.questions].sort(() => Math.random() - 0.5)
            : content.questions;
        if (content.randomizeOptions) {
            return qs.map(q => ({ ...q, options: [...q.options].sort(() => Math.random() - 0.5) }));
        }
        return qs;
    }, [content?.questions, content?.randomizeQuestions, content?.randomizeOptions]);

    const maxAttempts = content?.maxAttempts;
    const attemptsDone = attempts.length;
    const attemptsExhausted = maxAttempts !== undefined && attemptsDone >= maxAttempts;

    const totalPoints = (content?.questions ?? []).reduce((s, q) => s + (q.points ?? 1), 0);

    function toggleOption(qId: string, optId: string, singleSelect: boolean) {
        setSelectedAnswers(prev => {
            const current = prev[qId] ?? [];
            if (singleSelect) {
                return { ...prev, [qId]: current.includes(optId) ? [] : [optId] };
            }
            return { ...prev, [qId]: current.includes(optId) ? current.filter(id => id !== optId) : [...current, optId] };
        });
    }

    function handleSubmit() {
        if (!stepId || !activityId) return;
        startTransition(async () => {
            const result = await submitQuizAttempt(stepId, activityId, selectedAnswers, shortAnswers, content);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            const newAttempt = result.data!.attempt;
            setAttempts(prev => [...prev, newAttempt]);
            setLastAttempt(newAttempt);
            setPhase('result');
        });
    }

    function handleRetry() {
        setSelectedAnswers({});
        setShortAnswers({});
        setLastAttempt(null);
        setPhase('answering');
    }

    if (!content?.questions || content.questions.length === 0) {
        return <p className="text-text-muted italic text-center">Este cuestionario no tiene preguntas aún.</p>;
    }

    // Result phase
    if (phase === 'result' && lastAttempt) {
        const pct = lastAttempt.points_total > 0
            ? Math.round((lastAttempt.points_earned / lastAttempt.points_total) * 100)
            : 0;
        const passed = content.passingScore !== undefined ? pct >= content.passingScore : null;
        const hasShortAnswer = content.questions.some(q => (q.type ?? 'multiple_choice') === 'short_answer');
        const newAttemptsLeft = maxAttempts !== undefined ? maxAttempts - attempts.length : null;

        return (
            <div className="max-w-2xl mx-auto space-y-6 py-4">
                {/* Score card */}
                <div className={cn(
                    "p-8 rounded-2xl border text-center space-y-3",
                    passed === true ? "bg-emerald-500/10 border-emerald-500/30" :
                    passed === false ? "bg-red-500/10 border-red-500/30" :
                    "bg-surface border-border/50"
                )}>
                    <Trophy className={cn("size-10 mx-auto", passed === true ? "text-emerald-400" : passed === false ? "text-red-400" : "text-accent-blue")} />
                    <p className="text-4xl font-black font-mono text-foreground">
                        {lastAttempt.points_earned} <span className="text-text-muted text-2xl">/ {lastAttempt.points_total} pts</span>
                    </p>
                    <p className="text-lg font-bold text-text-muted">{pct}%</p>
                    {passed !== null && (
                        <p className={cn("text-sm font-bold uppercase tracking-widest", passed ? "text-emerald-400" : "text-red-400")}>
                            {passed ? "✓ Superado" : "✗ No superado"} — mínimo {content.passingScore}%
                        </p>
                    )}
                    {hasShortAnswer && (
                        <div className="flex items-center gap-2 justify-center text-amber-400 text-sm">
                            <AlertCircle className="size-4" />
                            <span>Hay respuestas cortas pendientes de corrección por el profesor.</span>
                        </div>
                    )}
                </div>

                {/* Per-question review */}
                {content.showCorrectAnswers && (
                    <div className="space-y-4">
                        {content.questions.map((q, idx) => {
                            const qType = q.type ?? 'multiple_choice';
                            const studentOpts = lastAttempt.answers[q.id] ?? [];
                            const correctOpts = q.options.filter(o => o.isCorrect).map(o => o.id);
                            const isAutoGraded = qType !== 'short_answer';
                            const isCorrect = isAutoGraded && JSON.stringify([...studentOpts].sort()) === JSON.stringify([...correctOpts].sort());

                            return (
                                <div key={q.id} className={cn(
                                    "p-6 rounded-xl border",
                                    isAutoGraded
                                        ? isCorrect ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
                                        : "bg-surface border-border/30"
                                )}>
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className="size-6 rounded-md bg-surface-dark text-text-muted flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                                        <p className="font-semibold text-foreground leading-tight">{q.text}</p>
                                        {isAutoGraded && (
                                            isCorrect
                                                ? <CheckCircle2 className="size-4 text-emerald-400 shrink-0 ml-auto" />
                                                : <XCircle className="size-4 text-red-400 shrink-0 ml-auto" />
                                        )}
                                    </div>

                                    {qType === 'short_answer' ? (
                                        <div className="pl-9">
                                            <p className="text-xs text-text-muted mb-1">Tu respuesta:</p>
                                            <p className="text-sm text-foreground italic bg-surface p-2 rounded-lg border border-border/30">
                                                {lastAttempt.short_answers[q.id] || <span className="text-text-muted">Sin respuesta</span>}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="pl-9 space-y-1.5">
                                            {q.options.map(opt => {
                                                const studentSelected = studentOpts.includes(opt.id);
                                                const isCorrectOpt = opt.isCorrect;
                                                return (
                                                    <div key={opt.id} className={cn(
                                                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                                                        isCorrectOpt ? "bg-emerald-500/10 text-emerald-300" :
                                                        studentSelected ? "bg-red-500/10 text-red-300" : "text-text-muted"
                                                    )}>
                                                        {isCorrectOpt ? <CheckCircle2 className="size-3.5 shrink-0" /> :
                                                         studentSelected ? <XCircle className="size-3.5 shrink-0" /> :
                                                         <Circle className="size-3.5 shrink-0 opacity-30" />}
                                                        <span>{opt.text}</span>
                                                        {studentSelected && <span className="ml-auto text-[10px] opacity-60">tu respuesta</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {q.explanation && (
                                        <div className="mt-3 pl-9 text-xs text-text-muted italic border-l-2 border-accent-blue/30 pl-3 ml-9">
                                            {q.explanation}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Retry */}
                <div className="flex justify-center pt-2">
                    {newAttemptsLeft === null || newAttemptsLeft > 0 ? (
                        <Button onClick={handleRetry} variant="outline" className="gap-2">
                            <RefreshCw className="size-4" />
                            {newAttemptsLeft !== null ? `Intentar de nuevo (${newAttemptsLeft} restantes)` : "Intentar de nuevo"}
                        </Button>
                    ) : (
                        <p className="text-sm text-text-muted">Has alcanzado el máximo de intentos ({maxAttempts}).</p>
                    )}
                </div>
            </div>
        );
    }

    // Answering phase
    if (attemptsExhausted) {
        return (
            <div className="max-w-2xl mx-auto py-12 text-center space-y-3">
                <p className="text-text-muted">Has alcanzado el máximo de intentos ({maxAttempts}).</p>
                {submission?.score !== null && submission?.score !== undefined && (
                    <p className="text-foreground font-bold text-2xl font-mono">{submission.score}/10</p>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 py-4">
            {/* Attempt counter */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-text-muted font-mono">
                    Intento {attemptsDone + 1}{maxAttempts !== undefined ? ` de ${maxAttempts}` : ""}
                </p>
                <p className="text-xs text-text-muted font-mono">{totalPoints} pts en total</p>
            </div>

            {displayQuestions.map((q, idx) => {
                const qType = q.type ?? 'multiple_choice';
                const correctCount = q.options.filter(o => o.isCorrect).length;
                const isSingleSelect = correctCount <= 1;

                return (
                    <div key={q.id} className="p-8 bg-surface border border-white/5 rounded-2xl space-y-6 shadow-xl">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                                <span className="size-8 rounded-lg bg-accent-blue/10 text-accent-blue flex items-center justify-center text-sm font-bold shrink-0">
                                    {idx + 1}
                                </span>
                                <h3 className="text-xl font-bold text-foreground leading-tight mt-0.5">{q.text}</h3>
                            </div>
                            <span className="text-xs font-mono text-text-muted shrink-0 mt-1">{q.points ?? 1} pt{(q.points ?? 1) !== 1 ? 's' : ''}</span>
                        </div>

                        {qType === 'short_answer' ? (
                            <div className="pl-12">
                                <Textarea
                                    value={shortAnswers[q.id] ?? ""}
                                    onChange={(e) => setShortAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    placeholder="Escribe tu respuesta..."
                                    rows={3}
                                    className="bg-background/50 border-border/50 resize-none text-sm"
                                />
                                <p className="text-xs text-text-muted mt-1.5 flex items-center gap-1">
                                    <AlignLeft className="size-3" /> Respuesta libre — el profesor la revisará
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 pl-12">
                                {!isSingleSelect && (
                                    <p className="text-xs text-text-muted -mt-3">Selecciona todas las correctas</p>
                                )}
                                {q.options.map((opt) => {
                                    const isSelected = (selectedAnswers[q.id] ?? []).includes(opt.id);
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => toggleOption(q.id, opt.id, isSingleSelect)}
                                            className={cn(
                                                "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                                                isSelected
                                                    ? "bg-accent-blue/10 border-accent-blue/50 text-foreground"
                                                    : "bg-background border-border/50 hover:bg-surface-light hover:border-accent-blue/30 text-foreground"
                                            )}
                                        >
                                            {isSelected
                                                ? <CheckCircle2 className="size-5 text-accent-blue shrink-0" />
                                                : <Circle className="size-5 text-text-muted/40 shrink-0" />
                                            }
                                            <span className="font-medium">{opt.text}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}

            <div className="flex justify-center pt-8">
                <Button
                    onClick={handleSubmit}
                    disabled={isPending || !stepId || !activityId}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 h-12 text-base font-bold rounded-full shadow-lg shadow-emerald-500/20"
                >
                    {isPending ? "Enviando..." : "Enviar Cuestionario"}
                </Button>
            </div>
        </div>
    );
}

function PresentationViewer({ content }: { content: PresentationContent }) {
    return (
        <div className="w-full flex flex-col gap-8">
            {content?.slidesUrl && (() => {
                const downloadUrl = toSlidesDownloadUrl(content.slidesUrl);
                return (
                    <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold">Presentación</h4>
                        <div className="flex gap-2">
                            {downloadUrl && (
                                <Button onClick={() => window.open(downloadUrl, '_blank')} variant="outline" size="sm" className="gap-2">
                                    <Download className="size-4" /> Descargar
                                </Button>
                            )}
                            <Button onClick={() => window.open(content.slidesUrl, '_blank')} variant="ghost" size="sm" className="gap-2">
                                <ExternalLink className="size-4" /> Abrir en nueva pestaña
                            </Button>
                        </div>
                    </div>
                );
            })()}
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border shadow-2xl bg-surface-dark flex items-center justify-center relative">
                {content?.slidesUrl ? (
                    <iframe
                        src={content.slidesUrl}
                        width="100%"
                        height="100%"
                        allowFullScreen
                        className="border-none"
                        title="Presentation"
                    />
                ) : (
                    <div className="text-center p-12">
                        <MonitorPlay className="size-16 text-text-muted/20 mx-auto mb-4" />
                        <p className="text-text-muted uppercase tracking-widest text-xs font-mono">No hay presentación configurada</p>
                    </div>
                )}
            </div>

            {content?.notes && (
                <div className="p-8 bg-surface-dark border border-white/5 rounded-2xl space-y-4 max-w-4xl mx-auto w-full">
                    <h4 className="text-sm font-bold text-accent-blue flex items-center gap-2 uppercase tracking-widest">
                        <FileText className="size-4" /> Notas de la Presentación
                    </h4>
                    <div className="prose prose-invert prose-sm max-w-none text-text-muted">
                        {content.notes}
                    </div>
                </div>
            )}
        </div>
    );
}

function ResourceViewer({ content }: { content: ResourceContent }) {
    return (
        <div className="max-w-4xl mx-auto space-y-12">
            {content?.markdownHeader && (
                <div className="prose dark:prose-invert prose-blue max-w-none prose-pre:p-0 prose-code:bg-surface-dark prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none font-sans">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                    >
                        {content.markdownHeader}
                    </ReactMarkdown>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {content?.items.length === 0 ? (
                    <div className="col-span-2 text-center p-12 border-2 border-dashed border-border/50 rounded-2xl bg-surface-dark/20 text-text-muted">
                        No hay archivos o enlaces disponibles.
                    </div>
                ) : (
                    content.items.map((item) => (
                        <div key={item.id} className="p-5 bg-surface border border-white/5 rounded-2xl flex items-center gap-4 group hover:border-accent-blue/30 transition-all hover:bg-surface-light shadow-sm">
                            <div className="size-12 shrink-0 group-hover:scale-110 transition-transform">
                                <ResourceIcon type={item.type} mimeType={item.mimeType} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-foreground truncate">{item.title}</h4>
                                <p className="text-xs text-text-muted truncate mt-0.5">{item.description}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 text-text-muted hover:text-foreground hover:bg-background h-10 w-10 rounded-full"
                                onClick={() => window.open(item.url, '_blank')}
                            >
                                {item.type === 'file' ? <Download className="size-5" /> : <ExternalLink className="size-5" />}
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
