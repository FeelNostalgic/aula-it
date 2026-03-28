"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import {
    Paperclip, CheckCircle2, Clock, Star, ExternalLink,
    Upload, X, AlertTriangle, CalendarClock, RefreshCw,
    FileText, Image, FileSpreadsheet, FileVideo, FileAudio,
    FileCode, FileArchive, File, ClipboardList, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileUploadContent, ActivitySubmission, SubmissionStatus, AllowedFileType, SubmissionFile, RubricCriteria, criteriaMaxPoints } from "@/types/activity";
import { submitFileUploadMulti } from "@/app/activities/[id]/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileUploadViewerProps {
    content: FileUploadContent;
    stepId: string;
    activityId: string;
    initialSubmission?: ActivitySubmission | null;
    dueDate?: string | null;
    isPreview?: boolean;
    isClosed?: boolean;
    groupName?: string | null;
    groupColor?: string | null;
}

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; icon: React.ElementType; className: string }> = {
    pending: { label: "Sin entregar", icon: Clock, className: "text-text-muted bg-surface border-white/10" },
    submitted: { label: "Entregado", icon: CheckCircle2, className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    graded: { label: "Corregido", icon: Star, className: "text-accent-blue bg-accent-blue/10 border-accent-blue/20" },
    published: { label: "Publicado", icon: Star, className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
};

const FILE_TYPE_LABELS: Record<AllowedFileType, string> = {
    pdf: "PDF",
    image: "Imagen",
    word: "Word",
    zip: "ZIP",
    pka: "PKA (Packet Tracer)",
    any: "Cualquier formato",
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

const ACCEPT_MAP: Record<AllowedFileType, string> = {
    pdf: ".pdf",
    image: ".jpg,.jpeg,.png,.gif,.webp,.svg",
    word: ".doc,.docx",
    zip: ".zip",
    pka: ".pka",
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

function getMimeIcon(mimeType: string | null): LucideIcon {
    if (!mimeType) return File;
    if (mimeType === "application/pdf") return FileText;
    if (mimeType.startsWith("image/")) return Image;
    if (
        mimeType === "application/vnd.ms-excel" ||
        mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        mimeType === "application/vnd.google-apps.spreadsheet"
    ) return FileSpreadsheet;
    if (
        mimeType === "application/msword" ||
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/vnd.google-apps.document"
    ) return FileText;
    if (mimeType.startsWith("video/")) return FileVideo;
    if (mimeType.startsWith("audio/")) return FileAudio;
    if (mimeType.startsWith("text/")) return FileCode;
    if (mimeType.includes("zip") || mimeType.includes("compressed") || mimeType.includes("tar")) return FileArchive;
    return File;
}

export function FileUploadViewer({ content, stepId, activityId, initialSubmission, dueDate, isPreview, isClosed, groupName, groupColor }: FileUploadViewerProps) {
    const [submission, setSubmission] = useState<ActivitySubmission | null>(initialSubmission ?? null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isPending, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounterRef = useRef<number>(0);

    useEffect(() => {
        setSubmission(initialSubmission ?? null);
        setSelectedFiles([]);
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [stepId]);

    const status: SubmissionStatus = submission?.status ?? "pending";
    const statusConfig = STATUS_CONFIG[status];
    const StatusIcon = statusConfig.icon;
    const isDeadlinePassed = dueDate ? new Date(dueDate) < new Date() : false;
    const isLocked = status === "graded" || isDeadlinePassed;

    const maxFiles = content?.maxFiles ?? 1;
    const maxSizeMb = content?.maxFileSizeMb ?? 10;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    const accept = buildAccept(content?.allowedTypes ?? []);

    function validateAndSetFiles(incoming: File[]) {
        const oversized = incoming.filter(f => f.size > maxSizeBytes);
        if (oversized.length) {
            toast.error(`${oversized.length === 1 ? "Un archivo supera" : `${oversized.length} archivos superan`} el tamaño máximo (${maxSizeMb} MB).`);
        }
        const valid = incoming.filter(f => f.size <= maxSizeBytes);
        if (!valid.length) return;
        setSelectedFiles(prev => {
            const merged = [...prev];
            for (const f of valid) {
                if (!merged.some(p => p.name === f.name && p.size === f.size)) merged.push(f);
            }
            if (merged.length > maxFiles) {
                toast.warning(`Máximo ${maxFiles} archivo${maxFiles === 1 ? "" : "s"}. Se han descartado los sobrantes.`);
                return merged.slice(0, maxFiles);
            }
            return merged;
        });
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        validateAndSetFiles(files);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        if (dragCounterRef.current === 1) setIsDragging(true);
    }

    function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current === 0) setIsDragging(false);
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) validateAndSetFiles(files);
    }

    async function handleUpload() {
        if (!selectedFiles.length) return;

        setUploading(true);
        try {
            const existingIds: string[] =
                submission?.files?.map(f => f.driveFileId) ??
                (submission?.drive_file_id ? [submission.drive_file_id] : []);

            const uploadResults = await Promise.all(
                selectedFiles.map(async (file, idx) => {
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("stepId", stepId);
                    if (idx === 0 && existingIds[0]) {
                        formData.append("existingDriveFileId", existingIds[0]);
                    }
                    const res = await fetch("/api/drive/upload", { method: "POST", body: formData });
                    const json = await res.json();
                    if (!res.ok || json.error) throw new Error(json.error ?? "Error al subir archivo");
                    return {
                        driveFileId: json.driveFileId,
                        driveFileUrl: json.driveFileUrl,
                        driveFileName: json.driveFileName,
                        driveMimeType: json.driveMimeType,
                    } as SubmissionFile;
                })
            );

            if (existingIds.length > 1) {
                await fetch("/api/drive/delete-bulk", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ driveFileIds: existingIds.slice(1), stepId }),
                });
            }

            startTransition(async () => {
                const result = await submitFileUploadMulti(stepId, activityId, uploadResults);
                if (result.error) {
                    toast.error(result.error);
                } else {
                    setSubmission(result.data ?? null);
                    setSelectedFiles([]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    toast.success(uploadResults.length === 1 ? "Archivo entregado correctamente." : `${uploadResults.length} archivos entregados correctamente.`);
                }
            });
        } catch (err: any) {
            toast.error(err.message ?? "Error al subir los archivos.");
        } finally {
            setUploading(false);
        }
    }

    async function handleDeleteSubmission() {
        const driveFileIds: string[] =
            submission?.files?.map(f => f.driveFileId) ??
            (submission?.drive_file_id ? [submission.drive_file_id] : []);

        if (!driveFileIds.length) return;

        setIsDeleting(true);
        try {
            const res = await fetch("/api/drive/delete-bulk", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ driveFileIds, stepId }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                toast.error(json.error ?? "Error al eliminar la entrega.");
            } else {
                setSubmission(null);
                setShowDeleteConfirm(false);
                toast.success("Entrega eliminada correctamente.");
            }
        } catch {
            toast.error("Error al eliminar la entrega.");
        } finally {
            setIsDeleting(false);
        }
    }

    const submittedFiles: Array<{ url: string; name: string | null; mimeType: string | null }> =
        submission?.files?.map(f => ({
            url: f.driveFileUrl,
            name: f.driveFileName,
            mimeType: f.driveMimeType,
        })) ??
        (submission?.drive_file_url ? [{
            url: submission.drive_file_url,
            name: submission.drive_file_name,
            mimeType: submission.drive_mime_type,
        }] : []);

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

            {/* Group badge */}
            {groupName && (
                <div
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium border"
                    style={groupColor ? {
                        backgroundColor: `${groupColor}18`,
                        borderColor: `${groupColor}40`,
                        color: groupColor,
                    } : { backgroundColor: "rgb(99 102 241 / 0.1)", borderColor: "rgb(99 102 241 / 0.2)", color: "rgb(129 140 248)" }}
                >
                    <Users className="size-4 shrink-0" />
                    Entrega grupal — <span className="font-bold">{groupName}</span>
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

            {/* Rubric */}
            {content?.rubric && content.rubric.length > 0 && (
                <RubricDisplay rubric={content.rubric} selectedScores={submission?.rubric_scores} isPublished={submission?.status === 'published'} />
            )}

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

                {/* Already submitted files */}
                {submittedFiles.length > 0 && (
                    <div className="space-y-2">
                        {submittedFiles.map((sf, idx) => {
                            const MimeIcon = getMimeIcon(sf.mimeType);
                            return (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-surface border border-white/10 rounded-xl">
                                    <MimeIcon className="size-7 text-text-muted shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {sf.name ?? "Archivo entregado"}
                                        </p>
                                        <a
                                            href={sf.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-accent-blue hover:underline flex items-center gap-1 mt-0.5"
                                        >
                                            <ExternalLink className="size-3 shrink-0" />
                                            Ver en Drive
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                        {!isLocked && (
                            <div className="flex items-center gap-1 justify-end">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs text-text-muted hover:text-foreground gap-1.5"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <RefreshCw className="size-3.5" />
                                    Cambiar
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs text-text-muted hover:text-red-400 gap-1.5"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    <X className="size-3.5" />
                                    Eliminar
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar entrega?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Se eliminará{submittedFiles.length > 1 ? `n los ${submittedFiles.length} archivos` : " el archivo"} de Google Drive y el registro de entrega. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteSubmission}
                                disabled={isDeleting}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {isDeleting ? <><RefreshCw className="size-3.5 animate-spin mr-1.5" />Eliminando...</> : "Eliminar"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {isClosed && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-sm font-medium">
                        <AlertTriangle className="size-4 shrink-0" />
                        Entrega cerrada. El profesor ha cerrado las entregas de esta actividad.
                    </div>
                )}

                {!isLocked && !isClosed && (
                    <>
                        {/* Drag & drop zone */}
                        <div
                            className={cn(
                                "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                                isPreview
                                    ? "border-border/30 opacity-60 cursor-not-allowed"
                                    : "cursor-pointer",
                                !isPreview && isDragging
                                    ? "border-amber-400 bg-amber-400/10"
                                    : !isPreview && selectedFiles.length
                                        ? "border-amber-400/40 bg-amber-400/5"
                                        : !isPreview && "border-border/50 hover:border-amber-400/30 hover:bg-amber-400/5"
                            )}
                            onClick={() => !isPreview && !selectedFiles.length && fileInputRef.current?.click()}
                            onDragEnter={!isPreview ? handleDragEnter : undefined}
                            onDragOver={!isPreview ? handleDragOver : undefined}
                            onDragLeave={!isPreview ? handleDragLeave : undefined}
                            onDrop={!isPreview ? handleDrop : undefined}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={accept}
                                multiple={maxFiles > 1}
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            {isDragging ? (
                                <div>
                                    <Upload className="size-8 text-amber-400 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-amber-400">Suelta aquí</p>
                                </div>
                            ) : selectedFiles.length > 0 ? (
                                <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                    {selectedFiles.map((file, idx) => (
                                        <div key={`${file.name}-${idx}`} className="flex items-center gap-3 text-left">
                                            <Paperclip className="size-4 text-amber-400 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                                                <p className="text-xs text-text-muted">{formatBytes(file.size)}</p>
                                            </div>
                                            <button
                                                className="text-text-muted hover:text-red-400 transition-colors shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                                                }}
                                            >
                                                <X className="size-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {maxFiles > selectedFiles.length && (
                                        <button
                                            className="w-full text-xs text-text-muted hover:text-foreground pt-2 border-t border-white/5 transition-colors"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            + Añadir otro archivo ({selectedFiles.length}/{maxFiles})
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <Paperclip className="size-8 text-text-muted/30 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-foreground mb-1">
                                        {submission ? "Cambiar entrega" : "Seleccionar archivo"}
                                    </p>
                                    <p className="text-xs text-text-muted">
                                        Arrastra aquí o haz clic · Máx. {maxSizeMb} MB
                                        {maxFiles > 1 ? ` · Hasta ${maxFiles} archivos` : ""}
                                    </p>
                                    {content?.allowedTypes?.length > 0 && !content.allowedTypes.includes('any') && (
                                        <p className="text-xs text-text-muted/60 mt-1">
                                            Formatos: {content.allowedTypes.map(t => FILE_TYPE_LABELS[t]).join(', ')}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={handleUpload}
                            disabled={!selectedFiles.length || uploading || isPending || isPreview}
                            className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {uploading || isPending
                                ? <><RefreshCw className="size-4 animate-spin" /> Subiendo...</>
                                : <><Upload className="size-4" /> {submission ? "Actualizar entrega" : "Subir entrega"}</>
                            }
                        </Button>
                    </>
                )}

                {isPreview && (
                    <p className="text-xs text-amber-400/80">No disponible en vista previa</p>
                )}
                {status === "graded" && (
                    <p className="text-xs text-text-muted">Esta entrega ya ha sido corregida y no puede modificarse.</p>
                )}
            </div>
        </div>
    );
}
