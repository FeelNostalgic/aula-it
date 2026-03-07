"use client";

import { useState, useRef, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import {
    Paperclip, CheckCircle2, Clock, Star, ExternalLink,
    Upload, X, AlertTriangle, CalendarClock, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUploadContent, ActivitySubmission, SubmissionStatus, AllowedFileType } from "@/types/activity";
import { submitFileUpload } from "@/app/activities/[id]/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileUploadViewerProps {
    content: FileUploadContent;
    stepId: string;
    activityId: string;
    initialSubmission?: ActivitySubmission | null;
    dueDate?: string | null;
}

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; icon: React.ElementType; className: string }> = {
    pending: { label: "Sin entregar", icon: Clock, className: "text-text-muted bg-surface border-white/10" },
    submitted: { label: "Entregado", icon: CheckCircle2, className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    graded: { label: "Corregido", icon: Star, className: "text-accent-blue bg-accent-blue/10 border-accent-blue/20" },
};

const ACCEPT_MAP: Record<AllowedFileType, string> = {
    pdf: ".pdf",
    image: ".jpg,.jpeg,.png,.gif,.webp,.svg",
    word: ".doc,.docx",
    any: "*",
};

function buildAccept(allowedTypes: AllowedFileType[]): string {
    if (!allowedTypes?.length || allowedTypes.includes("any")) return "*";
    return allowedTypes.map(t => ACCEPT_MAP[t]).join(",");
}

function formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadViewer({ content, stepId, activityId, initialSubmission, dueDate }: FileUploadViewerProps) {
    const [submission, setSubmission] = useState<ActivitySubmission | null>(initialSubmission ?? null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const status: SubmissionStatus = submission?.status ?? "pending";
    const statusConfig = STATUS_CONFIG[status];
    const StatusIcon = statusConfig.icon;
    const isDeadlinePassed = dueDate ? new Date(dueDate) < new Date() : false;
    const isLocked = status === "graded" || isDeadlinePassed;

    const maxSizeMb = content?.maxFileSizeMb ?? 10;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    const accept = buildAccept(content?.allowedTypes ?? []);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        if (!file) return;

        if (file.size > maxSizeBytes) {
            toast.error(`El archivo supera el tamaño máximo (${maxSizeMb} MB).`);
            return;
        }
        setSelectedFile(file);
    }

    async function handleUpload() {
        if (!selectedFile) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("stepId", stepId);

            const res = await fetch("/api/drive/upload", {
                method: "POST",
                body: formData,
            });
            const json = await res.json();

            if (!res.ok || json.error) {
                toast.error(json.error ?? "Error al subir el archivo.");
                return;
            }

            startTransition(async () => {
                const result = await submitFileUpload(stepId, activityId, json.driveFileUrl, json.driveFileId);
                if (result.error) {
                    toast.error(result.error);
                } else {
                    setSubmission(result.data ?? null);
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    toast.success("Archivo entregado correctamente.");
                }
            });
        } catch {
            toast.error("Error al subir el archivo.");
        } finally {
            setUploading(false);
        }
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
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 uppercase tracking-widest">
                    <Paperclip className="size-4" /> Instrucciones de la Entrega
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

            {/* Upload zone */}
            <div className="p-6 bg-surface-dark border border-white/5 rounded-2xl space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-widest">
                        <Upload className="size-4" /> Tu Entrega
                    </h3>
                    <span className={cn(
                        "flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border",
                        statusConfig.className
                    )}>
                        <StatusIcon className="size-3.5" />
                        {statusConfig.label}
                    </span>
                </div>

                {/* Already submitted file link */}
                {submission?.drive_file_url && (
                    <a
                        href={submission.drive_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-accent-blue hover:underline truncate"
                    >
                        <ExternalLink className="size-3.5 shrink-0" />
                        <span className="truncate">Ver archivo entregado en Drive</span>
                    </a>
                )}

                {!isLocked && (
                    <>
                        {/* File input zone */}
                        <div
                            className={cn(
                                "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                                selectedFile
                                    ? "border-amber-400/40 bg-amber-400/5"
                                    : "border-border/50 hover:border-amber-400/30 hover:bg-amber-400/5"
                            )}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={accept}
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            {selectedFile ? (
                                <div className="flex items-center justify-center gap-3">
                                    <Paperclip className="size-5 text-amber-400 shrink-0" />
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-foreground truncate max-w-xs">{selectedFile.name}</p>
                                        <p className="text-xs text-text-muted">{formatBytes(selectedFile.size)}</p>
                                    </div>
                                    <button
                                        className="ml-2 text-text-muted hover:text-foreground"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                    >
                                        <X className="size-4" />
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <Paperclip className="size-8 text-text-muted/30 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-foreground mb-1">
                                        {submission ? "Cambiar entrega" : "Seleccionar archivo"}
                                    </p>
                                    <p className="text-xs text-text-muted">
                                        Máx. {maxSizeMb} MB
                                    </p>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={handleUpload}
                            disabled={!selectedFile || uploading || isPending}
                            className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {uploading || isPending
                                ? <><RefreshCw className="size-4 animate-spin" /> Subiendo...</>
                                : <><Upload className="size-4" /> {submission ? "Actualizar entrega" : "Subir entrega"}</>
                            }
                        </Button>
                    </>
                )}

                {status === "graded" && (
                    <p className="text-xs text-text-muted">Esta entrega ya ha sido corregida y no puede modificarse.</p>
                )}
            </div>
        </div>
    );
}
