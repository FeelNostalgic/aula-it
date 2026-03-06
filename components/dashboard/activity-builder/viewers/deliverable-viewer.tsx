"use client";

import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { PencilRuler, ExternalLink, Send, CheckCircle2, Clock, Star, Link, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeliverableContent, ActivitySubmission, SubmissionStatus } from "@/types/activity";
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
};

export function DeliverableViewer({ content, stepId, activityId, initialSubmission, googleEmail: initialGoogleEmail }: DeliverableViewerProps) {
    const [submission, setSubmission] = useState<ActivitySubmission | null>(initialSubmission ?? null);
    const [url, setUrl] = useState(initialSubmission?.drive_file_url ?? "");
    const [isPending, startTransition] = useTransition();
    const [googleEmail, setGoogleEmail] = useState(initialGoogleEmail ?? null);

    const deliveryMode = content?.deliveryMode ?? "manual";
    const status: SubmissionStatus = submission?.status ?? "pending";
    const statusConfig = STATUS_CONFIG[status];
    const StatusIcon = statusConfig.icon;

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

                        <form onSubmit={handleSubmit} className="flex gap-3">
                            <Input
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://docs.google.com/..."
                                className="flex-1 bg-background border-border/50 text-sm"
                                disabled={isPending || status === "graded"}
                            />
                            <Button
                                type="submit"
                                disabled={isPending || !url || status === "graded"}
                                className="gap-2 shrink-0"
                            >
                                <Send className="size-4" />
                                {submission ? "Actualizar" : "Entregar"}
                            </Button>
                        </form>

                        {status === "graded" && (
                            <p className="text-xs text-text-muted">
                                Esta entrega ya ha sido corregida y no puede modificarse.
                            </p>
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
