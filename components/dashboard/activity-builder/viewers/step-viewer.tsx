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
import { FileText, MonitorPlay, CheckSquare, FolderDown, Download, ExternalLink, GraduationCap, CheckCircle2, XCircle, Circle, PencilRuler, Zap, Copy, AlignLeft, RefreshCw, Trophy, AlertCircle, ChevronRight, ChevronLeft, Clock, ArrowLeft, Plus, MessageSquare, Printer, ClipboardList, Shield } from "lucide-react";
import { useState, useEffect, useTransition, useMemo } from "react";
import { getQuizAttempts, submitQuizAttempt } from "@/app/activities/[id]/actions";
import { getBankQuestionsForStep } from "@/app/activities/[id]/edit/actions";
import { generateMarkdownPdf } from "@/app/actions/generate-pdf";
import { Textarea } from "@/components/ui/textarea";
import { animationRegistry } from "@/lib/animations/registry";
import { AnimationPlayer } from "@/components/animations/animation-player";
import { ArpAnimation } from "@/components/animations/arp-animation";

const animationMap: Record<string, React.ComponentType> = {
    arp: ArpAnimation,
};
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { ResourceIcon } from "../../resource-icon";
import { toSlidesDownloadUrl, toDriveDownloadUrl } from "@/lib/google-drive-urls";
import { selectQuestionsForAttempt } from "@/lib/quiz-pool-selection";

interface StepViewerProps {
    step: ActivityStepWithClientState;
    activityId?: string;
    submission?: ActivitySubmission;
    googleEmail?: string | null;
    userId?: string | null;
    studentName?: string | null;
    isPreview?: boolean;
}

export function StepViewer({ step, activityId, submission, googleEmail, userId, studentName, isPreview }: StepViewerProps) {
    if (!step) return null;
    if (step.is_locked) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-surface-dark/20 rounded-2xl border border-white/5 text-center">
                <Shield className="size-12 text-amber-400/70 mb-4" />
                <p className="text-lg font-semibold text-foreground">Actividad bloqueada</p>
                <p className="text-sm text-text-muted mt-2">
                    Este paso aparece en la misión, pero todavía no está disponible para abrirlo.
                </p>
            </div>
        );
    }

    switch (step.type) {
        case 'theory':
            return <TheoryViewer content={step.content as TheoryContent} />;
        case 'quiz':
            return <QuizViewer content={step.content as QuizContent} userId={userId} studentName={studentName} stepId={step.id} activityId={activityId} submission={submission} isPreview={isPreview} isClosed={step.is_activity_closed ?? false} isLockdown={step.is_lockdown} />;
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
                        isPreview={isPreview}
                        isClosed={step.is_activity_closed ?? false}
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
                        isPreview={isPreview}
                        isClosed={step.is_activity_closed ?? false}
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
    const [isExporting, setIsExporting] = useState(false);

    const handleDownloadPdf = async () => {
        setIsExporting(true);
        try {
            const result = await generateMarkdownPdf(content?.markdown ?? '');
            if ('error' in result) {
                console.error('Error al generar PDF:', result.error);
                return;
            }
            const bytes = Uint8Array.from(atob(result.pdf), c => c.charCodeAt(0));
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error al exportar PDF:', err);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-end">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-text-muted hover:text-foreground"
                    onClick={handleDownloadPdf}
                    disabled={isExporting}
                >
                    <Printer className="size-4" />
                    {isExporting ? 'Generando...' : 'Descargar PDF'}
                </Button>
            </div>
            <div className="prose dark:prose-invert prose-blue max-w-none prose-pre:p-0 prose-pre:bg-transparent prose-code:bg-surface-dark prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none font-sans">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                >
                    {content?.markdown || "_Esta actividad no tiene contenido aún._"}
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
    studentName,
    stepId,
    activityId,
    submission,
    isPreview,
    isClosed,
    isLockdown,
}: {
    content: QuizContent;
    userId?: string | null;
    studentName?: string | null;
    stepId?: string;
    activityId?: string;
    submission?: ActivitySubmission;
    isPreview?: boolean;
    isClosed?: boolean;
    isLockdown?: boolean;
}) {
    const isGoogleFormMode = content?.quizMode === 'google_form' || (!content?.quizMode && !!content?.googleFormUrl);

    if (isGoogleFormMode && content?.googleFormUrl) {
        const studentId = studentName ?? (userId ? userId.slice(-8).toUpperCase() : null);
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

    return <BuiltinQuizViewer content={content} userId={userId} stepId={stepId} activityId={activityId} submission={submission} isPreview={isPreview} isClosed={isClosed} isLockdown={isLockdown} />;
}

function BuiltinQuizViewer({
    content,
    userId,
    stepId,
    activityId,
    submission,
    isPreview,
    isClosed,
    isLockdown,
}: {
    content: QuizContent;
    userId?: string | null;
    stepId?: string;
    activityId?: string;
    submission?: ActivitySubmission;
    isPreview?: boolean;
    isClosed?: boolean;
    isLockdown?: boolean;
}) {
    const [phase, setPhase] = useState<'answering' | 'result' | 'list'>('answering');
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
    const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
    const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
    const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(null);
    const [isPending, startTransition] = useTransition();
    const [showConfirm, setShowConfirm] = useState(false);
    const [loadingAttempts, setLoadingAttempts] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [bankQuestions, setBankQuestions] = useState<Record<string, any[]>>({});
    const [isExamActive, setIsExamActive] = useState(false);

    useEffect(() => {
        if (!stepId) { setLoadingAttempts(false); return; }
        // Reset all state immediately so the old quiz doesn't flash while loading the new one
        setPhase('answering');
        setSelectedAnswers({});
        setShortAnswers({});
        setAttempts([]);
        setLastAttempt(null);
        setCurrentPage(0);
        setBankQuestions({});
        setLoadingAttempts(true);
        Promise.all([
            getQuizAttempts(stepId),
            content?.bankSelections?.length ? getBankQuestionsForStep(stepId) : Promise.resolve({}),
        ]).then(([data, bq]) => {
            setAttempts(data);
            setBankQuestions(bq);
            const isLimited = content?.maxAttempts != null;

            // Lockdown: check if exam was active before F5/refresh
            if (isLockdown && localStorage.getItem(`exam-session:${stepId}`)) {
                try {
                    const raw = localStorage.getItem(`exam-draft:${stepId}`);
                    if (raw) {
                        const { selectedAnswers: sa, shortAnswers: sha } = JSON.parse(raw);
                        setSelectedAnswers(sa || {});
                        setShortAnswers(sha || {});
                    }
                } catch { /* corrupt draft, start fresh */ }
                setIsExamActive(true);
                setPhase('answering');
            } else if (isLimited || data.length > 0 || isLockdown) {
                setPhase('list');
            }
            setLoadingAttempts(false);
        });
    }, [stepId]);

    // Block browser navigation while exam is active
    useEffect(() => {
        if (!isExamActive) return;
        const prevent = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
        const preventBack = () => { window.history.pushState(null, '', window.location.href); };
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('beforeunload', prevent);
        window.addEventListener('popstate', preventBack);
        return () => {
            window.removeEventListener('beforeunload', prevent);
            window.removeEventListener('popstate', preventBack);
        };
    }, [isExamActive]);

    // Publish global exam flag so other tabs can detect an active exam
    useEffect(() => {
        if (isExamActive && stepId && activityId) {
            localStorage.setItem('aula-exam-active', JSON.stringify({
                stepId,
                activityId,
                url: window.location.href,
            }));
        } else {
            localStorage.removeItem('aula-exam-active');
        }
    }, [isExamActive, stepId, activityId]);

    // Auto-save answers to localStorage while exam is active
    useEffect(() => {
        if (!isExamActive || !stepId) return;
        localStorage.setItem(`exam-draft:${stepId}`, JSON.stringify({ selectedAnswers, shortAnswers }));
    }, [selectedAnswers, shortAnswers, isExamActive, stepId]);

    const displayQuestions = useMemo(() => {
        if (!content?.questions && !content?.bankSelections?.length) return [];
        // Apply bank selection when bankSelections are defined
        const selected = (content.bankSelections?.length && userId && stepId)
            ? selectQuestionsForAttempt(content, bankQuestions, userId, stepId, (attempts.length ?? 0) + 1)
            : content.questions;
        const qs = content.randomizeQuestions
            ? [...selected].sort(() => Math.random() - 0.5)
            : selected;
        if (content.randomizeOptions) {
            return qs.map(q => ({ ...q, options: [...q.options].sort(() => Math.random() - 0.5) }));
        }
        return qs;
    }, [content?.questions, content?.bankSelections, content?.randomizeQuestions, content?.randomizeOptions, userId, stepId, attempts.length, bankQuestions]);

    const maxAttempts = content?.maxAttempts;
    const attemptsDone = attempts.length;
    const attemptsExhausted = maxAttempts !== undefined && attemptsDone >= maxAttempts;

    // showCorrectAnswers=false hides score until the professor publishes the grade
    const gradesVisible = content.showCorrectAnswers !== false || submission?.status === 'published';

    const attemptsByDate = useMemo(
        () => [...attempts].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()),
        [attempts]
    );

    const bestAttemptId = useMemo(() => {
        if (attempts.length === 0) return null;
        return [...attempts].sort((a, b) => b.points_earned - a.points_earned)[0].id;
    }, [attempts]);

    const totalPoints = displayQuestions.reduce((s, q) => s + (q.points ?? 1), 0);

    const qpp = content?.questionsPerPage;
    const totalPages = qpp ? Math.ceil(displayQuestions.length / qpp) : 1;
    const paginatedQuestions = qpp ? displayQuestions.slice(currentPage * qpp, (currentPage + 1) * qpp) : displayQuestions;
    const isLastPage = currentPage >= totalPages - 1;

    function toggleOption(qId: string, optId: string, singleSelect: boolean) {
        setSelectedAnswers(prev => {
            const current = prev[qId] ?? [];
            if (singleSelect) {
                return { ...prev, [qId]: current.includes(optId) ? [] : [optId] };
            }
            return { ...prev, [qId]: current.includes(optId) ? current.filter(id => id !== optId) : [...current, optId] };
        });
    }

    function startExam() {
        if (stepId) {
            try {
                const raw = localStorage.getItem(`exam-draft:${stepId}`);
                if (raw) {
                    const { selectedAnswers: sa, shortAnswers: sha } = JSON.parse(raw);
                    setSelectedAnswers(sa || {});
                    setShortAnswers(sha || {});
                } else {
                    setSelectedAnswers({});
                    setShortAnswers({});
                }
            } catch {
                setSelectedAnswers({});
                setShortAnswers({});
            }
            // Persist session so F5 restores the exam
            localStorage.setItem(`exam-session:${stepId}`, '1');
        }
        setLastAttempt(null);
        setCurrentPage(0);
        setIsExamActive(true);
        setPhase('answering');
    }

    function handleSubmit() {
        if (!stepId || !activityId) return;
        startTransition(async () => {
            const result = await submitQuizAttempt(stepId, activityId, selectedAnswers, shortAnswers, content);
            if (result.error) {
                toast.error(result.error);
                return;
            }
            if (stepId) {
                localStorage.removeItem(`exam-draft:${stepId}`);
                localStorage.removeItem(`exam-session:${stepId}`);
            }
            localStorage.removeItem('aula-exam-active');
            setIsExamActive(false);
            const newAttempt = result.data!.attempt;
            setAttempts(prev => [...prev, newAttempt]);
            if (isLockdown || !gradesVisible) {
                setLastAttempt(null);
                setPhase('list');
            } else {
                setLastAttempt(newAttempt);
                setPhase('result');
            }
        });
    }

    function handleRetry() {
        setSelectedAnswers({});
        setShortAnswers({});
        setLastAttempt(null);
        setCurrentPage(0);
        setPhase('answering');
    }

    if ((!content?.questions || content.questions.length === 0) && !content?.bankSelections?.length) {
        return <p className="text-text-muted italic text-center">Este cuestionario no tiene preguntas aún.</p>;
    }

    if (loadingAttempts) {
        return (
            <div className="flex items-center justify-center py-20 text-text-muted gap-2 text-sm">
                <RefreshCw className="size-4 animate-spin" />
                Cargando...
            </div>
        );
    }

    // List phase — all previous attempts
    if (phase === 'list') {
        return (
            <div className="max-w-2xl mx-auto space-y-4 py-4">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h3 className="text-base font-bold text-foreground">Tus intentos</h3>
                        <p className="text-xs text-text-muted mt-0.5">
                            {attemptsDone} intento{attemptsDone !== 1 ? 's' : ''}{maxAttempts !== undefined ? ` de ${maxAttempts}` : ''}
                        </p>
                    </div>
                    {!attemptsExhausted && !isClosed && (
                        isLockdown ? (
                            <Button onClick={startExam} size="sm" className="gap-2 bg-destructive hover:bg-destructive/90 text-white">
                                <Shield className="size-3.5" />
                                Iniciar Examen
                            </Button>
                        ) : (
                            <Button onClick={handleRetry} size="sm" className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
                                <Plus className="size-3.5" />
                                Nuevo intento
                            </Button>
                        )
                    )}
                    {isClosed && (
                        <span className="text-xs text-red-400 font-medium flex items-center gap-1.5">
                            <AlertCircle className="size-3.5" /> Entregas cerradas
                        </span>
                    )}
                </div>

                {isLockdown && !attemptsExhausted && !isClosed && (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-destructive/8 border border-destructive/20 text-destructive text-xs">
                        <Shield className="size-3.5 shrink-0 mt-0.5" />
                        <span>Al iniciar el examen, la pantalla se bloqueará. No podrás salir hasta entregar. Tus respuestas se guardan automáticamente si hay algún problema de conexión.</span>
                    </div>
                )}

                <div className="space-y-2">
                    {attemptsByDate.map((attempt, idx) => {
                        const pct = attempt.points_total > 0
                            ? Math.round((attempt.points_earned / attempt.points_total) * 100)
                            : 0;
                        const passed = content.passingScore !== undefined ? pct >= content.passingScore : null;
                        const isBest = attempt.id === bestAttemptId && attempts.length > 1 && gradesVisible;
                        const date = new Date(attempt.completed_at);

                        return (
                            <button
                                key={attempt.id}
                                onClick={() => { setLastAttempt(attempt); setPhase('result'); }}
                                className="w-full flex items-center gap-4 p-4 bg-surface border border-white/5 rounded-xl hover:border-accent-blue/30 hover:bg-surface-light transition-all text-left group"
                            >
                                <span className="size-8 rounded-lg bg-surface-dark text-text-muted flex items-center justify-center text-sm font-bold shrink-0">
                                    {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-foreground">Intento {attempt.attempt_number}</span>
                                        {isBest && (
                                            <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-accent-blue/15 text-accent-blue">
                                                Mejor nota
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-text-muted">
                                        <Clock className="size-3" />
                                        <span>{date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} · {date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    {gradesVisible ? (
                                        <>
                                            <p className={cn(
                                                "text-base font-black font-mono",
                                                passed === true ? "text-emerald-400" : passed === false ? "text-red-400" : "text-foreground"
                                            )}>
                                                {attempt.points_total > 0 ? Number(((attempt.points_earned / attempt.points_total) * 10).toFixed(2)) : 0}/10
                                            </p>
                                            <p className="text-xs text-text-muted">{attempt.points_earned}/{attempt.points_total} pts</p>
                                        </>
                                    ) : (
                                        <p className="text-xs text-text-muted italic">Pendiente de revisión</p>
                                    )}
                                </div>
                                <ChevronRight className="size-4 text-text-muted/40 group-hover:text-text-muted transition-colors shrink-0" />
                            </button>
                        );
                    })}
                </div>

                {attemptsExhausted && (
                    <p className="text-xs text-text-muted text-center pt-2">
                        Has alcanzado el máximo de intentos ({maxAttempts}).
                    </p>
                )}
            </div>
        );
    }

    // Result phase
    if (phase === 'result' && lastAttempt) {
        const pct = lastAttempt.points_total > 0
            ? Math.round((lastAttempt.points_earned / lastAttempt.points_total) * 100)
            : 0;
        const passed = content.passingScore !== undefined ? pct >= content.passingScore : null;
        const effectiveQuestions = (lastAttempt as any).resolved_questions ?? content.questions;
        const hasShortAnswerQs = effectiveQuestions.some((q: any) => (q.type ?? 'multiple_choice') === 'short_answer');
        const isPublished = submission?.status === 'published';
        // Score visible only when: grades are visible AND (no short answers OR already published)
        const scoreVisible = gradesVisible && (!hasShortAnswerQs || isPublished);
        // "Pending" message: quiz has short answers, hasn't been published yet, and grades are meant to be visible
        const showPendingMsg = hasShortAnswerQs && !isPublished && content.showCorrectAnswers !== false;
        const newAttemptsLeft = maxAttempts !== undefined ? maxAttempts - attempts.length : null;

        return (
            <div className="max-w-2xl mx-auto space-y-6 py-4">
                {/* Score card */}
                {scoreVisible ? (
                    <div className={cn(
                        "p-8 rounded-2xl border text-center space-y-3",
                        passed === true ? "bg-emerald-500/10 border-emerald-500/30" :
                        passed === false ? "bg-red-500/10 border-red-500/30" :
                        "bg-surface border-border/50"
                    )}>
                        <Trophy className={cn("size-10 mx-auto", passed === true ? "text-emerald-400" : passed === false ? "text-red-400" : "text-accent-blue")} />
                        <p className="text-4xl font-black font-mono text-foreground">
                            {lastAttempt.points_total > 0 ? Number(((lastAttempt.points_earned / lastAttempt.points_total) * 10).toFixed(2)) : 0} <span className="text-text-muted text-2xl">/ 10</span>
                        </p>
                        <p className="text-lg font-bold text-text-muted">{lastAttempt.points_earned} / {lastAttempt.points_total} pts</p>
                        {passed !== null && (
                            <p className={cn("text-sm font-bold uppercase tracking-widest", passed ? "text-emerald-400" : "text-red-400")}>
                                {passed ? "✓ Superado" : "✗ No superado"} — mínimo {content.passingScore}%
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="p-8 rounded-2xl border bg-surface border-border/50 text-center space-y-3">
                        <Clock className="size-10 mx-auto text-text-muted/40" />
                        {showPendingMsg ? (
                            <>
                                <p className="text-base font-semibold text-foreground">Pendiente de publicación</p>
                                <div className="flex items-center gap-2 justify-center text-amber-400 text-sm">
                                    <AlertCircle className="size-4" />
                                    <span>Hay respuestas cortas pendientes de corrección por el profesor.</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-base font-semibold text-foreground">Entrega recibida</p>
                                <p className="text-sm text-text-muted">Las notas se publicarán cuando el profesor las haga visibles.</p>
                            </>
                        )}
                    </div>
                )}

                {/* Per-question review — visible if teacher enabled showCorrectAnswers OR if published */}
                {(content.showCorrectAnswers !== false || gradesVisible) && (
                    <div className="space-y-4">
                        {((lastAttempt as any).resolved_questions ?? content.questions).map((q: any, idx: number) => {
                            const qType = q.type ?? 'multiple_choice';
                            const studentOpts = lastAttempt.answers[q.id] ?? [];
                            const correctOpts = q.options.filter((o: any) => o.isCorrect).map((o: any) => o.id);
                            const isAutoGraded = qType !== 'short_answer';
                            const qPoints = q.points ?? 1;
                            const penalize = !!content.penalizeWrongAnswers;

                            // Compute per-question score (mirrors server formula)
                            let qScore: number | null = null;
                            if (isAutoGraded) {
                                if (!penalize) {
                                    const cs = studentOpts.filter(id => correctOpts.includes(id)).length;
                                    const ws = studentOpts.filter(id => !correctOpts.includes(id)).length;
                                    qScore = correctOpts.length > 0
                                        ? Math.max(0, Math.round(qPoints * ((cs - ws) / correctOpts.length) * 100) / 100)
                                        : 0;
                                } else if (correctOpts.length === 1) {
                                    if (studentOpts.length === 0) qScore = 0;
                                    else if (studentOpts[0] === correctOpts[0]) qScore = qPoints;
                                    else qScore = Math.round((-qPoints / 3) * 100) / 100;
                                } else {
                                    const cs = studentOpts.filter(id => correctOpts.includes(id)).length;
                                    const ws = studentOpts.filter(id => !correctOpts.includes(id)).length;
                                    qScore = Math.round((qPoints / correctOpts.length) * (cs - ws) * 100) / 100;
                                }
                            }

                            const borderClass = isAutoGraded
                                ? qScore! > 0 ? "bg-emerald-500/5 border-emerald-500/20"
                                : qScore! < 0 ? "bg-red-500/5 border-red-500/20"
                                : "bg-surface border-border/30"
                                : "bg-surface border-border/30";

                            return (
                                <div key={q.id} className={cn("p-6 rounded-xl border", borderClass)}>
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className="size-6 rounded-md bg-surface-dark text-text-muted flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                                        <p className="font-semibold text-foreground leading-tight flex-1">{q.text}</p>
                                        {isAutoGraded && qScore !== null ? (
                                            <span className={cn(
                                                "text-xs font-mono font-bold shrink-0",
                                                qScore > 0 ? "text-emerald-400" : qScore < 0 ? "text-red-400" : "text-text-muted"
                                            )}>
                                                {qScore > 0 ? "+" : ""}{qScore}/{qPoints} pts
                                            </span>
                                        ) : !isAutoGraded ? (() => {
                                            const manualScore = lastAttempt.short_answer_scores?.[q.id];
                                            return isPublished && manualScore !== undefined ? (
                                                <span className={cn(
                                                    "text-xs font-mono font-bold shrink-0",
                                                    manualScore > 0 ? "text-emerald-400" : "text-text-muted"
                                                )}>
                                                    {manualScore}/{qPoints} pts
                                                </span>
                                            ) : (
                                                <span className="text-xs font-mono text-text-muted shrink-0">?/{qPoints} pts</span>
                                            );
                                        })() : null}
                                    </div>

                                    {qType === 'short_answer' ? (
                                        <div className="pl-9 space-y-2">
                                            <p className="text-xs text-text-muted mb-1">Tu respuesta:</p>
                                            <p className="text-sm text-foreground italic bg-surface p-2 rounded-lg border border-border/30">
                                                {lastAttempt.short_answers[q.id] || <span className="text-text-muted">Sin respuesta</span>}
                                            </p>
                                            {gradesVisible && lastAttempt.short_answer_feedback?.[q.id] && (
                                                <div className="flex items-start gap-2 text-xs text-accent-blue bg-accent-blue/5 border border-accent-blue/20 rounded-lg p-2">
                                                    <MessageSquare className="size-3.5 shrink-0 mt-0.5" />
                                                    <span>{lastAttempt.short_answer_feedback[q.id]}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="pl-9 space-y-1.5">
                                            {q.options.map((opt: any) => {
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
                                        <div className="mt-3 text-xs text-text-muted italic border-l-2 border-accent-blue/30 pl-3 ml-9">
                                            {q.explanation}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 gap-3">
                    <Button onClick={() => setPhase('list')} variant="ghost" size="sm" className="gap-2 text-text-muted">
                        <ArrowLeft className="size-4" />
                        Volver a la lista
                    </Button>
                    {newAttemptsLeft === null || newAttemptsLeft > 0 ? (
                        <Button onClick={isLockdown ? () => setPhase('list') : handleRetry} variant="outline" className="gap-2">
                            <RefreshCw className="size-4" />
                            {isLockdown
                                ? (newAttemptsLeft !== null ? `Nuevo intento (${newAttemptsLeft} restantes)` : "Nuevo intento")
                                : (newAttemptsLeft !== null ? `Reintentar (${newAttemptsLeft} restantes)` : "Reintentar")
                            }
                        </Button>
                    ) : (
                        <p className="text-sm text-text-muted">Máximo de intentos alcanzado ({maxAttempts}).</p>
                    )}
                </div>
            </div>
        );
    }

    // Answering phase — shared content
    const answeringContent = (
        <div className="space-y-8">
            {/* Attempt counter — hidden in lockdown fullscreen (shown in header instead) */}
            {!isExamActive && (
                <div className="flex items-center justify-between">
                    {attempts.length > 0 && (
                        <Button onClick={() => setPhase('list')} variant="ghost" size="sm" className="gap-2 text-text-muted -ml-2">
                            <ArrowLeft className="size-4" />
                            Mis intentos
                        </Button>
                    )}
                    <p className="text-xs text-text-muted font-mono ml-auto">
                        Intento {attemptsDone + 1}{maxAttempts !== undefined ? ` de ${maxAttempts}` : ""} · {totalPoints} pts
                    </p>
                </div>
            )}

                {isClosed && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-sm font-medium">
                        <AlertCircle className="size-4 shrink-0" />
                        Las entregas de esta actividad están cerradas.
                    </div>
                )}

                {content.penalizeWrongAnswers && (
                    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-300 text-xs">
                        <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                        <span>Las respuestas incorrectas restan puntos. Opción única: −1/3 por fallo. Opción múltiple: cada respuesta incorrecta cancela una correcta. Dejar en blanco no penaliza.</span>
                    </div>
                )}

                {paginatedQuestions.map((q, idx) => {
                    const qType = q.type ?? 'multiple_choice';
                    const correctCount = q.options.filter(o => o.isCorrect).length;
                    const isSingleSelect = correctCount <= 1;
                    const globalIdx = qpp ? currentPage * qpp + idx : idx;

                    return (
                        <div key={q.id} className="p-8 bg-surface border border-white/5 rounded-2xl space-y-6 shadow-xl">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <span className="size-8 rounded-lg bg-accent-blue/10 text-accent-blue flex items-center justify-center text-sm font-bold shrink-0">
                                        {globalIdx + 1}
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

                {qpp && totalPages > 1 && (
                    <div className="flex items-center justify-between bg-surface border border-border/40 rounded-xl px-4 py-2.5">
                        <button
                            onClick={() => setCurrentPage(p => p - 1)}
                            disabled={currentPage === 0}
                            className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="size-3.5" /> Anterior
                        </button>
                        <span className="text-xs font-mono text-text-muted/70 bg-surface-dark border border-border/50 rounded-md px-2.5 py-1 tabular-nums">
                            {currentPage + 1} / {totalPages}
                        </span>
                        {!isLastPage ? (
                            <button
                                onClick={() => setCurrentPage(p => p + 1)}
                                className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-foreground transition-colors"
                            >
                                Siguiente <ChevronRight className="size-3.5" />
                            </button>
                        ) : (
                            <div className="w-16" />
                        )}
                    </div>
                )}

                {isLastPage && (
                    <div className="flex justify-center pt-8">
                        <Button
                            onClick={() => setShowConfirm(true)}
                            disabled={isPending || !stepId || !activityId || isPreview || isClosed}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 h-12 text-base font-bold rounded-full shadow-lg shadow-emerald-500/20"
                        >
                            {isPending ? "Enviando..." : isExamActive ? "Entregar Examen" : "Enviar Cuestionario"}
                        </Button>
                        {isPreview && (
                            <p className="text-xs text-amber-400/80 text-center mt-2">No disponible en vista previa</p>
                        )}
                    </div>
                )}
        </div>
    );

    const confirmDialog = (
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{isExamActive ? "¿Entregar examen?" : "¿Enviar cuestionario?"}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Una vez entregado, no podrás modificar tus respuestas.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                        {isPending ? "Enviando..." : "Entregar"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    // Lockdown fullscreen wrapper
    if (isExamActive) {
        return (
            <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
                <div className="shrink-0 flex items-center justify-between px-8 py-4 border-b border-border/50 bg-surface-dark">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
                            <Shield className="size-3.5 text-destructive" />
                            <span className="text-xs font-black text-destructive uppercase tracking-widest">Modo Examen</span>
                        </div>
                        <span className="text-sm text-text-muted font-mono">
                            Intento {attemptsDone + 1}{maxAttempts !== undefined ? ` de ${maxAttempts}` : ''} · {totalPoints} pts
                        </span>
                    </div>
                    <p className="text-[11px] text-text-muted/60 italic">No puedes salir hasta entregar el examen</p>
                </div>
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    <div className="max-w-2xl mx-auto">
                        {answeringContent}
                    </div>
                </div>
                {confirmDialog}
            </div>
        );
    }

    return (
        <>
            <div className="max-w-2xl mx-auto py-4">
                {answeringContent}
            </div>
            {confirmDialog}
        </>
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
    const visibleItems = content?.items.filter(item => item.isVisible !== false) ?? [];

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
                {visibleItems.length === 0 ? (
                    <div className="col-span-2 text-center p-12 border-2 border-dashed border-border/50 rounded-2xl bg-surface-dark/20 text-text-muted">
                        No hay archivos o enlaces disponibles.
                    </div>
                ) : (
                    visibleItems.map((item) => (
                        <div key={item.id} className="p-5 bg-surface border border-white/5 rounded-2xl flex items-center gap-4 group hover:border-accent-blue/30 transition-all hover:bg-surface-light shadow-sm">
                            <div className="size-12 shrink-0 group-hover:scale-110 transition-transform">
                                <ResourceIcon type={item.type} mimeType={item.mimeType} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-foreground truncate">{item.title}</h4>
                                <p className="text-xs text-text-muted truncate mt-0.5">{item.description}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {item.type === 'file' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-text-muted hover:text-foreground hover:bg-background h-9 w-9 rounded-full"
                                        title="Descargar"
                                        onClick={() => {
                                            const dlUrl = toDriveDownloadUrl(item.url ?? '') ?? item.url ?? '';
                                            const a = document.createElement('a');
                                            a.href = dlUrl;
                                            a.download = item.title || 'download';
                                            a.target = '_blank';
                                            a.rel = 'noopener noreferrer';
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                        }}
                                    >
                                        <Download className="size-4" />
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-text-muted hover:text-foreground hover:bg-background h-9 w-9 rounded-full"
                                    title={item.type === 'folder' ? 'Abrir carpeta' : 'Abrir'}
                                    onClick={() => window.open(item.url, '_blank')}
                                >
                                    <ExternalLink className="size-4" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
