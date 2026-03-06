"use client";

import { useState, useEffect, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { gradeSubmission, StepSubmissionRow } from "@/app/dashboard/units/[id]/actions";
import { RubricCriteria } from "@/types/activity";
import { toast } from "sonner";
import { ExternalLink, FileText, User, Calendar, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type GradingMode = 'score' | 'rubric' | 'complete';

interface GradingModalProps {
    submission: StepSubmissionRow | null;
    rubric?: RubricCriteria[];
    open: boolean;
    onClose: () => void;
    onGraded: (
        submissionId: string,
        score: number | null,
        feedback: string | null,
        completed: boolean,
        gradingMode: GradingMode
    ) => void;
}

export function GradingModal({ submission, rubric, open, onClose, onGraded }: GradingModalProps) {
    const [gradingMode, setGradingMode] = useState<GradingMode>('score');
    const [score, setScore] = useState<string>("");
    const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
    const [feedback, setFeedback] = useState<string>("");
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (submission) {
            setScore(submission.score !== null && submission.score !== undefined ? String(submission.score) : "");
            setFeedback(submission.feedback ?? "");
            setRubricScores(submission.rubric_scores ?? {});
            // Determine initial mode
            if (submission.grading_mode) {
                setGradingMode(submission.grading_mode);
            } else {
                setGradingMode(rubric?.length ? 'rubric' : 'score');
            }
        }
    }, [submission, rubric]);

    const rubricTotal = (rubric ?? []).reduce((sum, c) => sum + (rubricScores[c.id] ?? 0), 0);
    const rubricMax = (rubric ?? []).reduce((sum, c) => sum + c.maxPoints, 0);

    function handleSave() {
        if (!submission) return;

        if (gradingMode === 'score') {
            const scoreNum = score.trim() !== "" ? parseInt(score, 10) : null;
            if (scoreNum !== null && (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10)) {
                toast.error("La nota debe estar entre 0 y 10.");
                return;
            }
            startTransition(async () => {
                const result = await gradeSubmission(submission.id, {
                    gradingMode: 'score',
                    score: scoreNum,
                    feedback: feedback.trim() || null,
                });
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success("Evaluación guardada.");
                    onGraded(submission.id, scoreNum, feedback.trim() || null, true, 'score');
                    onClose();
                }
            });
        } else if (gradingMode === 'rubric') {
            startTransition(async () => {
                const result = await gradeSubmission(submission.id, {
                    gradingMode: 'rubric',
                    rubricScores,
                    feedback: feedback.trim() || null,
                });
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success("Evaluación guardada.");
                    onGraded(submission.id, null, feedback.trim() || null, true, 'rubric');
                    onClose();
                }
            });
        } else {
            startTransition(async () => {
                const result = await gradeSubmission(submission.id, {
                    gradingMode: 'complete',
                    feedback: feedback.trim() || null,
                });
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success("Entrega marcada como completada.");
                    onGraded(submission.id, null, feedback.trim() || null, true, 'complete');
                    onClose();
                }
            });
        }
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

    const hasRubric = !!(rubric?.length);

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

                                {/* Mode selector */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-text-muted uppercase tracking-widest">Modo de evaluación</Label>
                                    <div className="flex gap-1.5">
                                        {(["score", "rubric", "complete"] as GradingMode[]).map((mode) => {
                                            const labels: Record<GradingMode, string> = {
                                                score: "Nota",
                                                rubric: "Rúbrica",
                                                complete: "Completado",
                                            };
                                            const isDisabled = mode === 'rubric' && !hasRubric;
                                            return (
                                                <button
                                                    key={mode}
                                                    onClick={() => !isDisabled && setGradingMode(mode)}
                                                    title={isDisabled ? "Define una rúbrica en el editor del paso" : undefined}
                                                    disabled={isDisabled}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                                                        gradingMode === mode
                                                            ? "bg-accent-blue/10 border-accent-blue/40 text-accent-blue"
                                                            : "bg-surface-dark border-border-strong text-text-muted hover:text-foreground hover:border-border-subtle",
                                                        isDisabled && "opacity-40 cursor-not-allowed hover:text-text-muted hover:border-border-strong"
                                                    )}
                                                >
                                                    {labels[mode]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Mode content */}
                                {gradingMode === 'score' && (
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
                                )}

                                {gradingMode === 'rubric' && (
                                    <div className="space-y-3">
                                        {hasRubric ? (
                                            <>
                                                <div className="space-y-2">
                                                    {rubric!.map((criterion) => (
                                                        <div key={criterion.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-dark border border-border-strong">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-foreground truncate">{criterion.name || "Sin nombre"}</p>
                                                                {criterion.description && (
                                                                    <p className="text-xs text-text-muted mt-0.5">{criterion.description}</p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    max={criterion.maxPoints}
                                                                    value={rubricScores[criterion.id] ?? ""}
                                                                    onChange={(e) => setRubricScores(prev => ({
                                                                        ...prev,
                                                                        [criterion.id]: Math.min(criterion.maxPoints, Math.max(0, parseInt(e.target.value) || 0))
                                                                    }))}
                                                                    placeholder="0"
                                                                    className="w-16 h-8 bg-surface border-border-strong font-mono text-sm text-center"
                                                                />
                                                                <span className="text-xs text-text-muted font-mono whitespace-nowrap">/ {criterion.maxPoints}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex items-center justify-between px-3 py-2 bg-accent-blue/5 border border-accent-blue/20 rounded-xl">
                                                    <span className="text-sm font-bold text-foreground">Total</span>
                                                    <span className="text-sm font-bold font-mono text-accent-blue">{rubricTotal} / {rubricMax} pts</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                                <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                                                <p className="text-sm text-amber-200">
                                                    Sin rúbrica configurada. Ve al editor del paso y añade criterios.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {gradingMode === 'complete' && (
                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                        <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                                        <p className="text-sm text-emerald-200">
                                            Esta entrega se marcará como completada sin nota numérica.
                                        </p>
                                    </div>
                                )}

                                {/* Feedback */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground">
                                        Comentarios para el alumno
                                    </Label>
                                    <Textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        placeholder="Escribe tus observaciones aquí..."
                                        rows={5}
                                        className="bg-surface-dark border-border-strong resize-none text-sm"
                                    />
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
