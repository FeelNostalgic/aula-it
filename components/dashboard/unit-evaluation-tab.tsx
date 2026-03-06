"use client";

import { useMemo, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle2, Clock, Circle, ArrowUpRight, Star, ChevronDown, ChevronRight, ExternalLink, Copy, Lock, Send, PencilLine } from "lucide-react";
import Link from "next/link";
import { getUnitStepSubmissions, StepSubmissionRow } from "@/app/dashboard/units/[id]/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GradingModal } from "@/components/dashboard/grading-modal";

type Student = {
    id: string;
    student_id: string; // The auth.users id
    profiles?: {
        id: string;
        full_name: string | null;
        email: string;
    } | null;
};

type Activity = {
    id: string;
    title: string;
    type: string;
    xp: number;
    order_index: number;
};

type Submission = {
    id: string;
    activity_id: string;
    student_id: string;
    status: string; // "not_started" | "pending" | "completed"
    submission_url?: string | null;
    grade?: number | null;
};

interface UnitEvaluationTabProps {
    unitId: string;
    students: Student[];
    activities: Activity[];
    submissions: Submission[];
    activityIds?: string[];
}

export function UnitEvaluationTab({ students, activities, submissions, activityIds }: UnitEvaluationTabProps) {
    // Sort activities by order_index to display them as columns
    const sortedActivities = useMemo(() => {
        return [...activities].sort((a, b) => a.order_index - b.order_index);
    }, [activities]);

    const [stepSubmissions, setStepSubmissions] = useState<StepSubmissionRow[]>([]);
    const [loadingStepSubs, setLoadingStepSubs] = useState(false);

    useEffect(() => {
        const ids = activityIds ?? activities.map(a => a.id);
        if (ids.length === 0) return;
        setLoadingStepSubs(true);
        getUnitStepSubmissions(ids).then(result => {
            if (result.error) console.error('[StepSubmissions]', result.error);
            if (result.data) setStepSubmissions(result.data);
            setLoadingStepSubs(false);
        }).catch(err => {
            console.error('[StepSubmissions] unexpected error:', err);
            setLoadingStepSubs(false);
        });
    }, [activityIds, activities]);

    // Create a map to quickly look up a student's submission for a specific activity
    const getSubmission = (studentId: string, activityId: string) => {
        return submissions.find(s => s.student_id === studentId && s.activity_id === activityId);
    };

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case "completed":
                return <CheckCircle2 className="size-5 text-accent-green" />;
            case "pending":
                return <Clock className="size-5 text-accent-orange" />;
            case "not_started":
            default:
                return <Circle className="size-5 text-text-muted opacity-50" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">Evaluación de la Unidad</h2>
                <p className="text-sm text-text-muted mt-1">
                    Revisa el progreso de tus alumnos y evalúa sus entregas directamente.
                </p>

                {/* Status Legend */}
                <div className="flex items-center gap-6 mt-4 p-3 bg-surface-dark border border-border-strong rounded-lg w-fit">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-accent-green" />
                        <span className="text-sm font-medium text-foreground">Completado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="size-4 text-accent-orange" />
                        <span className="text-sm font-medium text-foreground">Pendiente revisar</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Circle className="size-4 text-text-muted opacity-50" />
                        <span className="text-sm font-medium text-foreground">No iniciado</span>
                    </div>
                </div>
            </div>

            {students.length === 0 ? (
                <div className="bg-surface-dark border border-dashed border-border-strong rounded-2xl flex flex-col items-center justify-center py-12 px-4 text-center">
                    <h3 className="text-lg font-bold text-foreground mb-2">No hay alumnos matriculados</h3>
                    <p className="text-text-muted text-sm max-w-sm">
                        Ve a la configuración del Módulo para matricular alumnos y poder evaluar su progreso.
                    </p>
                </div>
            ) : sortedActivities.length === 0 ? (
                <div className="bg-surface-dark border border-dashed border-border-strong rounded-2xl flex flex-col items-center justify-center py-12 px-4 text-center">
                    <h3 className="text-lg font-bold text-foreground mb-2">No hay retos creados</h3>
                    <p className="text-text-muted text-sm max-w-sm">
                        Crea actividades en la pestaña "Retos" para poder evaluar a los alumnos.
                    </p>
                </div>
            ) : (
                <div className="border border-border-strong rounded-2xl overflow-hidden bg-surface-dark">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-text-muted uppercase bg-surface border-b border-border-strong">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Alumno</th>
                                    {sortedActivities.map((activity, index) => (
                                        <th key={activity.id} className="px-6 py-4 font-bold text-center min-w-[120px]">
                                            <div className="flex flex-col items-center gap-1" title={activity.title}>
                                                <span className="truncate w-full block text-center">R{index + 1}</span>
                                                <span className="text-[10px] text-text-muted font-normal lowercase max-w-full truncate">{activity.xp} XP</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => {
                                    const profile = student.profiles;
                                    const studentName = profile?.full_name || profile?.email || "Usuario Desconocido";

                                    return (
                                        <tr
                                            key={student.id}
                                            className="border-b border-border-subtle hover:bg-surface/50 transition-colors last:border-0"
                                        >
                                            <td className="px-6 py-4 font-medium text-foreground">
                                                {studentName}
                                            </td>

                                            {sortedActivities.map((activity) => {
                                                const submission = getSubmission(student.student_id, activity.id);
                                                const status = submission?.status || "not_started";

                                                return (
                                                    <td key={activity.id} className="px-6 py-4">
                                                        <div className="flex justify-center items-center">
                                                            {status === "pending" && submission?.submission_url ? (
                                                                <Link
                                                                    href={submission.submission_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="group relative"
                                                                >
                                                                    {getStatusIcon(status)}
                                                                    <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-accent-blue text-surface-dark p-0.5 rounded-full">
                                                                        <ArrowUpRight className="size-2.5" />
                                                                    </div>
                                                                </Link>
                                                            ) : (
                                                                getStatusIcon(status)
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Step-level submissions section */}
            <StepSubmissionsSection
                stepSubmissions={stepSubmissions}
                loading={loadingStepSubs}
                activities={sortedActivities}
            />
        </div>
    );
}

// ---------------------------------------------------------------
// Step Submissions section
// ---------------------------------------------------------------

type StepSubmissionsSectionProps = {
    stepSubmissions: StepSubmissionRow[];
    loading: boolean;
    activities: Activity[];
};

function StepSubmissionsSection({ stepSubmissions, loading, activities }: StepSubmissionsSectionProps) {
    const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
    const [gradingSubmission, setGradingSubmission] = useState<StepSubmissionRow | null>(null);
    const [localSubmissions, setLocalSubmissions] = useState<StepSubmissionRow[]>(stepSubmissions);

    useEffect(() => {
        setLocalSubmissions(stepSubmissions);
    }, [stepSubmissions]);

    const grouped = useMemo(() => {
        const map: Record<string, { activityTitle: string; byStep: Record<string, { stepTitle: string; deliveryMode: 'manual' | 'teacher_copy' | undefined; rows: StepSubmissionRow[] }> }> = {};
        for (const row of localSubmissions) {
            if (!map[row.activity_id]) {
                map[row.activity_id] = { activityTitle: row.activity_title, byStep: {} };
            }
            if (!map[row.activity_id].byStep[row.step_id]) {
                map[row.activity_id].byStep[row.step_id] = { stepTitle: row.step_title, deliveryMode: row.delivery_mode, rows: [] };
            }
            map[row.activity_id].byStep[row.step_id].rows.push(row);
        }
        return map;
    }, [localSubmissions]);

    const activityIds = Object.keys(grouped);

    return (
        <>
        <div className="space-y-4 pt-4 border-t border-border-strong">
            <h2 className="text-xl font-bold text-foreground">Entregas por Paso</h2>
            <p className="text-sm text-text-muted">
                Detalle de las entregas de los alumnos para cada paso de tipo "Entregable".
            </p>

            {loading ? (
                <div className="text-sm text-text-muted animate-pulse">Cargando entregas...</div>
            ) : activityIds.length === 0 ? (
                <div className="bg-surface-dark border border-dashed border-border-strong rounded-2xl flex flex-col items-center justify-center py-10 px-4 text-center">
                    <FileText className="size-8 text-text-muted/30 mb-3" />
                    <p className="text-sm font-medium text-foreground">Sin entregas aún</p>
                    <p className="text-xs text-text-muted mt-1 max-w-xs">
                        Aparecerán aquí cuando los alumnos envíen el enlace de su trabajo en los pasos de tipo "Entregable".
                    </p>
                </div>
            ) : null}

            <div className="space-y-3">
                {activityIds.map((activityId) => {
                    const group = grouped[activityId];
                    const isExpanded = expandedActivity === activityId;
                    const totalSubmissions = Object.values(group.byStep).reduce((acc, s) => acc + s.rows.length, 0);

                    return (
                        <div key={activityId} className="border border-border-strong rounded-2xl overflow-hidden">
                            <button
                                className="w-full flex items-center justify-between px-5 py-4 bg-surface hover:bg-surface-dark transition-colors text-left"
                                onClick={() => setExpandedActivity(isExpanded ? null : activityId)}
                            >
                                <div className="flex items-center gap-3">
                                    {isExpanded ? <ChevronDown className="size-4 text-text-muted" /> : <ChevronRight className="size-4 text-text-muted" />}
                                    <span className="font-bold text-foreground">{group.activityTitle}</span>
                                    <span className="text-xs text-text-muted bg-surface-dark px-2 py-0.5 rounded-full border border-border-strong">
                                        {totalSubmissions} entregas
                                    </span>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="divide-y divide-border-strong">
                                    {Object.entries(group.byStep).map(([stepId, stepGroup]) => (
                                        <div key={stepId} className="px-5 py-4 space-y-3 bg-surface-dark">
                                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                    <FileText className="size-4 text-purple-400" />
                                                    {stepGroup.stepTitle}
                                                    {stepGroup.deliveryMode === 'teacher_copy' ? (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue uppercase tracking-widest flex items-center gap-1">
                                                            <Copy className="size-2.5" /> Copia del profesor
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface border border-border-strong text-text-muted uppercase tracking-widest">
                                                            Manual
                                                        </span>
                                                    )}
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    {stepGroup.deliveryMode === 'teacher_copy' && (
                                                        <DistributeButton stepId={stepId} activityId={activityId} />
                                                    )}
                                                    <LockButton stepId={stepId} />
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead>
                                                        <tr className="text-xs text-text-muted uppercase">
                                                            <th className="pb-2 pr-4 font-bold">Alumno</th>
                                                            <th className="pb-2 pr-4 font-bold">Enlace</th>
                                                            <th className="pb-2 pr-4 font-bold">Estado</th>
                                                            <th className="pb-2 pr-4 font-bold">Nota</th>
                                                            <th className="pb-2 pr-4 font-bold">Fecha</th>
                                                            <th className="pb-2 font-bold"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border-subtle">
                                                        {stepGroup.rows.map((row) => (
                                                            <tr key={row.id} className="hover:bg-surface/50 transition-colors">
                                                                <td className="py-2 pr-4 font-medium text-foreground">
                                                                    {row.student_name || row.student_email}
                                                                </td>
                                                                <td className="py-2 pr-4">
                                                                    {row.drive_file_url ? (
                                                                        <a
                                                                            href={row.drive_file_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center gap-1.5 text-accent-blue hover:underline max-w-[200px] truncate"
                                                                        >
                                                                            <ExternalLink className="size-3.5 shrink-0" />
                                                                            <span className="truncate text-xs">{row.drive_file_url}</span>
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-text-muted text-xs">—</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-2 pr-4">
                                                                    <SubmissionStatusBadge status={row.status} />
                                                                </td>
                                                                <td className="py-2 pr-4 text-xs font-mono font-bold">
                                                                    {row.score !== null && row.score !== undefined
                                                                        ? <span className="text-accent-blue">{row.score}/10</span>
                                                                        : <span className="text-text-muted">—</span>
                                                                    }
                                                                </td>
                                                                <td className="py-2 pr-4 text-xs text-text-muted">
                                                                    {row.submitted_at
                                                                        ? new Date(row.submitted_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                                                                        : "—"}
                                                                </td>
                                                                <td className="py-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-6 text-xs gap-1 border-accent-blue/30 text-accent-blue hover:bg-accent-blue/10"
                                                                        onClick={() => setGradingSubmission(row)}
                                                                    >
                                                                        <PencilLine className="size-3" /> Evaluar
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

            <GradingModal
                submission={gradingSubmission}
                open={!!gradingSubmission}
                onClose={() => setGradingSubmission(null)}
                onGraded={(id, score, feedback, completed) => {
                    setLocalSubmissions(prev => prev.map(s =>
                        s.id === id
                            ? { ...s, score, feedback, status: completed ? "graded" : s.status, graded_at: completed ? new Date().toISOString() : s.graded_at }
                            : s
                    ));
                }}
            />
        </>
    );
}

function SubmissionStatusBadge({ status }: { status: string }) {
    const config = {
        submitted: { label: "Entregado", icon: CheckCircle2, className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
        graded: { label: "Corregido", icon: Star, className: "text-accent-blue bg-accent-blue/10 border-accent-blue/20" },
        pending: { label: "Sin entregar", icon: Clock, className: "text-text-muted bg-surface border-white/10" },
    }[status] ?? { label: status, icon: Circle, className: "text-text-muted bg-surface border-white/10" };

    const Icon = config.icon;
    return (
        <span className={cn("flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border w-fit", config.className)}>
            <Icon className="size-3" />
            {config.label}
        </span>
    );
}

function DistributeButton({ stepId, activityId }: { stepId: string; activityId: string }) {
    const [isPending, startTransition] = useTransition();

    function handleDistribute() {
        startTransition(async () => {
            try {
                const res = await fetch("/api/drive/copy", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ stepId, activityId }),
                });
                const data = await res.json();
                if (!res.ok) {
                    toast.error(data.error ?? "Error al distribuir plantilla");
                } else {
                    const msg = `Distribuido: ${data.copied} copias. Saltados: ${data.skipped} (sin email de Google).`;
                    if (data.errors?.length) {
                        toast.warning(`${msg} Errores: ${data.errors.join(", ")}`);
                    } else {
                        toast.success(msg);
                    }
                }
            } catch {
                toast.error("Error de red al distribuir plantilla.");
            }
        });
    }

    return (
        <Button
            size="sm"
            variant="outline"
            onClick={handleDistribute}
            disabled={isPending}
            className="h-7 text-xs gap-1.5 border-accent-blue/30 text-accent-blue hover:bg-accent-blue/10"
        >
            <Send className="size-3" />
            {isPending ? "Distribuyendo..." : "Distribuir plantilla"}
        </Button>
    );
}

function LockButton({ stepId }: { stepId: string }) {
    const [isPending, startTransition] = useTransition();

    function handleLock() {
        startTransition(async () => {
            try {
                const res = await fetch("/api/drive/lock", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ stepId }),
                });
                const data = await res.json();
                if (!res.ok) {
                    toast.error(data.error ?? "Error al cerrar entregas");
                } else {
                    const msg = `Archivo bloqueado. El alumno ya no puede editar. (${data.locked} archivos)`;
                    if (data.errors?.length) {
                        toast.warning(`${msg} Errores: ${data.errors.join(", ")}`);
                    } else {
                        toast.success(msg);
                    }
                }
            } catch {
                toast.error("Error de red al cerrar entregas.");
            }
        });
    }

    return (
        <Button
            size="sm"
            variant="outline"
            onClick={handleLock}
            disabled={isPending}
            className="h-7 text-xs gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
            <Lock className="size-3" />
            {isPending ? "Cerrando..." : "Cerrar entregas"}
        </Button>
    );
}
