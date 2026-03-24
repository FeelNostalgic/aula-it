"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { PencilRuler, ExternalLink, Send, CheckCircle2, Clock, Star, Link, Copy, CalendarClock, AlertTriangle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeliverableContent, ActivitySubmission, SubmissionStatus, RubricCriteria, criteriaMaxPoints } from "@/types/activity";
import { submitDeliverable } from "@/app/activities/[id]/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GoogleEmailPrompt } from "@/components/dashboard/google-email-prompt";

interface DeliverableViewerProps {
    content: DeliverableContent;
    stepId: string;
    activityId: string;
    initialSubmission?: ActivitySubmission | null;
    googleEmail?: string | null;
    dueDate?: string | null;
    isPreview?: boolean;
    isClosed?: boolean;
}

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; icon: React.ElementType; className: string }> = {
    pending: {
        label: "Sin entregar",
        icon: Clock,
        className: "text-text-muted bg-surface border-white/10",
    },
    submitted: {
        label: "Entregado",
        icon: CheckCircle2,
        className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    graded: {
        label: "Corregido",
        icon: Star,
        className: "text-accent-blue bg-accent-blue/10 border-accent-blue/20",
    },
    published: {
        label: "Publicado",
        icon: Star,
        className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
};

function RubricDisplay({ rubric, selectedScores, isPublished }: { rubric: RubricCriteria[]; selectedScores?: Record<string, number> | null; isPublished?: boolean }) {
    if (!rubric?.length) return null;
    const rubricTotal = Object.values(selectedScores ?? {}).reduce((sum, points) => sum + points, 0);
    const rubricMax = rubric.reduce((sum, criterion) => sum + criteriaMaxPoints(criterion), 0);
    const normalized = rubricMax > 0 ? Math.round(((rubricTotal / rubricMax) * 10) * 100) / 100 : 0;
    return (
        <div className="p-6 bg-surface-dark border border-white/5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                <ClipboardList className="size-4" /> Criterios de evaluación
            </h3>
            {isPublished && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Nota total</span>
                    <span className="text-lg font-black font-mono text-emerald-400">{normalized} / 10</span>
                </div>
            )}
            <div className="space-y-5">
                {rubric.map(criteria => (
                    <div key={criteria.id} className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">{criteria.name}</p>
                        {criteria.description && <p className="text-xs text-text-muted">{criteria.description}</p>}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {criteria.levels.map(level => {
                                const isSelected = isPublished && selectedScores && selectedScores[criteria.id] === level.points;
                                return (
                                    <div key={level.id} className={cn(
                                        "p-2.5 border rounded-xl",
                                        isSelected
                                            ? "bg-emerald-500/15 border-emerald-500/40"
                                            : "bg-surface border-border/50"
                                    )}>
                                        <div className="flex items-center justify-between gap-1">
                                            <p className={cn("text-xs font-bold", isSelected ? "text-emerald-400" : "text-foreground")}>{level.label}</p>
                                            {isSelected && <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />}
                                        </div>
                                        <p className={cn("text-[10px] font-mono", isSelected ? "text-emerald-400" : "text-accent-blue")}>{level.points} pts</p>
                                        {level.description && <p className="text-[10px] text-text-muted mt-1 leading-snug">{level.description}</p>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DeliverableViewer({ content, stepId, activityId, initialSubmission, googleEmail: initialGoogleEmail, dueDate, isPreview, isClosed }: DeliverableViewerProps) {
    const [submission, setSubmission] = useState<ActivitySubmission | null>(initialSubmission ?? null);
    const [url, setUrl] = useState(initialSubmission?.drive_file_url ?? "");
    const [isPending, startTransition] = useTransition();
    const [googleEmail, setGoogleEmail] = useState(initialGoogleEmail ?? null);

    const deliveryMode = content?.deliveryMode ?? "manual";
    const status: SubmissionStatus = submission?.status ?? "pending";
    const statusConfig = STATUS_CONFIG[status];
    const StatusIcon = statusConfig.icon;
    const isDeadlinePassed = dueDate ? new Date(dueDate) < new Date() : false;

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        startTransition(async () => {
            const result = await submitDeliverable(stepId, url, activityId);
            if (result.error) {
                toast.error(result.error);
            } else {
                setSubmission(result.data ?? null);
                toast.success("Entrega registrada correctamente.");
            }
        });
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Deadline badge */}
            {dueDate && (
                <div className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium",
                    isDeadlinePassed
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                )}>
                    {isDeadlinePassed
                        ? <AlertTriangle className="size-4 shrink-0" />
                        : <CalendarClock className="size-4 shrink-0" />
                    }
                    {isDeadlinePassed
                        ? "Plazo cerrado — ya no se aceptan entregas."
                        : `Fecha límite: ${new Date(dueDate).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}`
                    }
                </div>
            )}

            {/* Instructions */}
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

            {/* Rubric */}
            {content?.rubric && content.rubric.length > 0 && (
                <RubricDisplay rubric={content.rubric} selectedScores={submission?.rubric_scores} isPublished={submission?.status === 'published'} />
            )}

            {/* TEACHER COPY mode */}
            {deliveryMode === "teacher_copy" ? (
                <TeacherCopySection
                    submission={submission}
                    status={status}
                    statusConfig={statusConfig}
                    StatusIcon={StatusIcon}
                    googleEmail={googleEmail}
                    onGoogleEmailSaved={setGoogleEmail}
                />
            ) : (
                <>
                    {/* MANUAL mode: Template + submission form */}
                    {content?.templateUrl && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-lg font-bold">Plantilla de Trabajo</h4>
                                <Button
                                    onClick={() => window.open(content.templateUrl, "_blank")}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                >
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

                    <div className="p-6 bg-surface-dark border border-white/5 rounded-2xl space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-widest">
                                <Link className="size-4" /> Tu Entrega
                            </h3>
                            <span
                                className={cn(
                                    "flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border",
                                    statusConfig.className
                                )}
                            >
                                <StatusIcon className="size-3.5" />
                                {statusConfig.label}
                            </span>
                        </div>

                        {submission?.drive_file_url && (
                            <a
                                href={submission.drive_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-accent-blue hover:underline truncate"
                            >
                                <ExternalLink className="size-3.5 shrink-0" />
                                <span className="truncate">{submission.drive_file_url}</span>
                            </a>
                        )}

                        {isClosed ? (
                            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-sm font-medium">
                                <AlertTriangle className="size-4 shrink-0" />
                                Entrega cerrada. El profesor ha cerrado las entregas de esta actividad.
                            </div>
                        ) : (
                            <>
                                <form onSubmit={handleSubmit} className="flex gap-3">
                                    <Input
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://docs.google.com/..."
                                        className="flex-1 bg-background border-border/50 text-sm"
                                        disabled={isPending || status === "graded" || isDeadlinePassed || isPreview}
                                    />
                                    <Button
                                        type="submit"
                                        disabled={isPending || !url || status === "graded" || isDeadlinePassed || isPreview}
                                        className="gap-2 shrink-0"
                                    >
                                        <Send className="size-4" />
                                        {submission ? "Actualizar" : "Entregar"}
                                    </Button>
                                </form>

                                {isPreview && (
                                    <p className="text-xs text-amber-400/80">No disponible en vista previa</p>
                                )}
                                {status === "graded" && (
                                    <p className="text-xs text-text-muted">
                                        Esta entrega ya ha sido corregida y no puede modificarse.
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ---------------------------------------------------------------

type TeacherCopySectionProps = {
    submission: ActivitySubmission | null;
    status: SubmissionStatus;
    statusConfig: { label: string; icon: React.ElementType; className: string };
    StatusIcon: React.ElementType;
    googleEmail: string | null;
    onGoogleEmailSaved: (email: string) => void;
};

function TeacherCopySection({
    submission,
    status,
    statusConfig,
    StatusIcon,
    googleEmail,
    onGoogleEmailSaved,
}: TeacherCopySectionProps) {
    const hasCopy = !!submission?.drive_file_url;

    return (
        <div className="space-y-4">
            {/* Google email prompt if missing */}
            {!googleEmail && !hasCopy && (
                <GoogleEmailPrompt onSaved={onGoogleEmailSaved} />
            )}

            {/* Badge + mode indicator */}
            <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold flex items-center gap-2">
                    <Copy className="size-4 text-accent-blue" />
                    Tu Copia de Trabajo
                </h4>
                <span
                    className={cn(
                        "flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border",
                        statusConfig.className
                    )}
                >
                    <StatusIcon className="size-3.5" />
                    {statusConfig.label}
                </span>
            </div>

            {hasCopy ? (
                <>
                    <div className="flex justify-end">
                        <Button
                            onClick={() => window.open(submission!.drive_file_url!, "_blank")}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                        >
                            <ExternalLink className="size-4" /> Abrir en nueva pestaña
                        </Button>
                    </div>
                    <div className="aspect-4/3 w-full rounded-2xl overflow-hidden border border-border bg-white shadow-2xl">
                        <iframe
                            src={submission!.drive_file_url!}
                            className="w-full h-full"
                            title="Tu copia de trabajo"
                        />
                    </div>
                    {status === "graded" && (
                        <p className="text-xs text-text-muted text-center">
                            Las entregas han sido cerradas. Tu copia está en modo lectura.
                        </p>
                    )}
                </>
            ) : (
                <div className="p-8 bg-surface-dark border border-dashed border-border-strong rounded-2xl flex flex-col items-center justify-center text-center gap-3">
                    <Copy className="size-8 text-text-muted/30" />
                    <p className="text-sm font-medium text-foreground">Tu copia aún no está lista</p>
                    <p className="text-xs text-text-muted max-w-xs">
                        El profesor distribuirá una copia personal de la plantilla cuando comience la actividad.
                    </p>
                </div>
            )}
        </div>
    );
}
