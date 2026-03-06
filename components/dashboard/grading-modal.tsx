"use client";

import { useState, useEffect, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { gradeSubmission, StepSubmissionRow } from "@/app/dashboard/units/[id]/actions";
import { toast } from "sonner";
import { ExternalLink, FileText, User, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GradingModalProps {
    submission: StepSubmissionRow | null;
    open: boolean;
    onClose: () => void;
    onGraded: (submissionId: string, score: number | null, feedback: string | null, completed: boolean) => void;
}

export function GradingModal({ submission, open, onClose, onGraded }: GradingModalProps) {
    const [score, setScore] = useState<string>("");
    const [feedback, setFeedback] = useState<string>("");
    const [markComplete, setMarkComplete] = useState(false);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (submission) {
            setScore(submission.score !== null && submission.score !== undefined ? String(submission.score) : "");
            setFeedback(submission.feedback ?? "");
            setMarkComplete(submission.status === "graded");
        }
    }, [submission]);

    function handleSave() {
        if (!submission) return;
        const scoreNum = score.trim() !== "" ? parseInt(score, 10) : null;
        if (scoreNum !== null && (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10)) {
            toast.error("La nota debe estar entre 0 y 10.");
            return;
        }
        startTransition(async () => {
            const result = await gradeSubmission(submission.id, {
                score: scoreNum,
                feedback: feedback.trim() || null,
                markComplete,
            });
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Evaluación guardada.");
                onGraded(submission.id, scoreNum, feedback.trim() || null, markComplete);
                onClose();
            }
        });
    }

    const submittedDate = submission?.submitted_at
        ? new Date(submission.submitted_at).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : "—";

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
                <DialogHeader className="shrink-0 px-6 py-4 border-b border-border-strong">
                    <DialogTitle className="text-base font-bold flex items-center gap-2">
                        Evaluar entrega
                        {submission && (
                            <span className="text-text-muted font-normal">
                                — {submission.step_title}
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
                    {/* Left: Drive iframe */}
                    <ResizablePanel defaultSize={62} minSize={30}>
                        <div className="h-full flex flex-col bg-surface-dark">
                            {submission?.drive_file_url ? (
                                <>
                                    <div className="shrink-0 h-9 flex items-center justify-between px-4 border-b border-border-strong bg-surface">
                                        <span className="text-xs text-text-muted font-mono uppercase tracking-widest">Documento del alumno</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-xs gap-1 text-text-muted hover:text-foreground"
                                            onClick={() => window.open(submission.drive_file_url!, "_blank")}
                                        >
                                            <ExternalLink className="size-3" /> Abrir en Drive
                                        </Button>
                                    </div>
                                    <iframe
                                        src={submission.drive_file_url}
                                        className="flex-1 w-full border-none bg-white"
                                        title="Documento del alumno"
                                    />
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-12">
                                    <FileText className="size-12 text-text-muted/20" />
                                    <p className="text-sm text-text-muted">
                                        Este alumno no tiene un archivo de Drive asociado.
                                    </p>
                                    <p className="text-xs text-text-muted/50">
                                        Solo disponible en modo "Copia del profesor".
                                    </p>
                                </div>
                            )}
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="bg-border-subtle hover:bg-accent-blue transition-colors duration-200 w-1.5" />

                    {/* Right: grading form */}
                    <ResizablePanel defaultSize={38} minSize={28}>
                        <div className="h-full flex flex-col overflow-y-auto bg-surface">
                            <div className="p-6 space-y-6">
                                {/* Student info */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                                        <User className="size-4 text-text-muted" />
                                        {submission?.student_name || submission?.student_email || "—"}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-text-muted">
                                        <Calendar className="size-3.5" />
                                        Entregado: {submittedDate}
                                    </div>
                                </div>

                                <div className="border-t border-border-strong" />

                                {/* Score */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground">
                                        Nota (0–10)
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={10}
                                        step={1}
                                        value={score}
                                        onChange={(e) => setScore(e.target.value)}
                                        placeholder="Sin nota"
                                        className="bg-surface-dark border-border-strong w-32 font-mono text-lg text-center"
                                    />
                                    <p className="text-xs text-text-muted">Déjalo vacío para no asignar nota numérica.</p>
                                </div>

                                {/* Feedback */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground">
                                        Comentarios para el alumno
                                    </Label>
                                    <Textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        placeholder="Escribe tus observaciones aquí..."
                                        rows={6}
                                        className="bg-surface-dark border-border-strong resize-none text-sm"
                                    />
                                </div>

                                {/* Mark complete */}
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setMarkComplete(!markComplete)}
                                    onKeyDown={(e) => e.key === "Enter" && setMarkComplete(!markComplete)}
                                    className={cn(
                                        "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors select-none",
                                        markComplete
                                            ? "bg-emerald-500/10 border-emerald-500/30"
                                            : "bg-surface-dark border-border-strong hover:border-border-subtle"
                                    )}
                                >
                                    <div className={cn(
                                        "size-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors",
                                        markComplete ? "bg-emerald-500 border-emerald-500" : "border-border-strong"
                                    )}>
                                        {markComplete && <CheckCircle2 className="size-3 text-white" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Marcar como corregido</p>
                                        <p className="text-xs text-text-muted mt-0.5">
                                            Cambia el estado a "Corregido". El alumno verá que su entrega ha sido evaluada.
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1 border-border-strong"
                                        onClick={onClose}
                                        disabled={isPending}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        className="flex-1 bg-accent-blue hover:bg-accent-blue/90 text-white"
                                        onClick={handleSave}
                                        disabled={isPending}
                                    >
                                        {isPending ? "Guardando..." : "Guardar evaluación"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </DialogContent>
        </Dialog>
    );
}
