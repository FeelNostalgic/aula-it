"use client";

import { useMemo, useEffect, useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    FileText, CheckCircle2, Clock, Circle, ExternalLink, Copy, Lock, Send, PencilLine,
    ChevronDown, ChevronRight, Star, RotateCcw, BookOpen, Paperclip
} from "lucide-react";
import { getStepIcon, getTabStepIcon } from "@/lib/constants/step-icons";
import { ActivityStepType } from "@/types/activity";
import {
    getUnitStepSubmissions,
    reopenSubmission,
    publishSubmissionGrade,
    publishAllGradesForStep,
    updateActivityWeight,
    StepSubmissionRow,
} from "@/app/dashboard/units/[id]/actions";
import { criteriaMaxPoints } from "@/types/activity";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GradingModal } from "@/components/dashboard/grading-modal";

type Student = {
    id: string;
    student_id?: string;       // present when coming from enrollment shape
    full_name?: string | null; // present when coming from flat profile shape (page.tsx)
    email?: string | null;
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
    grade_weight?: number;
};

type Submission = {
    id: string;
    activity_id: string;
    student_id: string;
    status: string;
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
    const sortedActivities = useMemo(
        () => [...activities].sort((a, b) => a.order_index - b.order_index),
        [activities]
    );

    const enrolledStudents = useMemo(
        () => students.map(s => ({
            // page.tsx passes flat profiles { id, full_name }; some contexts pass { student_id, profiles }
            student_id: s.student_id ?? s.id,
            name: s.profiles?.full_name ?? s.profiles?.email ?? s.full_name ?? s.email ?? "Sin nombre",
        })),
        [students]
    );

    const [stepSubmissions, setStepSubmissions] = useState<StepSubmissionRow[]>([]);
    const [loadingStepSubs, setLoadingStepSubs] = useState(false);

    useEffect(() => {
        const ids = activityIds ?? activities.map(a => a.id);
        if (ids.length === 0) return;
        setLoadingStepSubs(true);
        getUnitStepSubmissions(ids, enrolledStudents)
            .then(result => {
                if (result.error) console.error("[StepSubmissions]", result.error);
                if (result.data) setStepSubmissions(result.data);
                setLoadingStepSubs(false);
            })
            .catch(err => {
                console.error("[StepSubmissions] unexpected error:", err);
                setLoadingStepSubs(false);
            });
    }, [activityIds, activities, enrolledStudents]);

    return (
        <div className="space-y-6">
            <div className="mb-4">
                <h2 className="text-xl font-bold text-foreground">Evaluación de la Unidad</h2>
                <p className="text-sm text-text-muted mt-1">
                    Revisa el progreso de tus alumnos y evalúa sus entregas directamente.
                </p>
            </div>

            <Tabs defaultValue="entregas" className="space-y-6">
                <TabsList className="bg-surface border border-border-strong rounded-xl p-1 w-fit">
                    <TabsTrigger
                        value="entregas"
                        className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md"
                    >
                        <FileText className="mr-2 size-3.5" />
                        Entregas
                    </TabsTrigger>
                    <TabsTrigger
                        value="notas"
                        className="font-mono text-[10px] font-bold tracking-widest uppercase px-5 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-md"
                    >
                        <BookOpen className="mr-2 size-3.5" />
                        Notas por alumno
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="entregas">
                    <StepSubmissionsSection
                        stepSubmissions={stepSubmissions}
                        loading={loadingStepSubs}
                        activities={sortedActivities}
                        onSubmissionsChange={setStepSubmissions}
                    />
                </TabsContent>

                <TabsContent value="notas">
                    <StudentGradesSection
                        students={enrolledStudents}
                        activities={sortedActivities}
                        stepSubmissions={stepSubmissions}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ---------------------------------------------------------------
// Step Submissions section ("Entregas")
// ---------------------------------------------------------------

type StepSubmissionsSectionProps = {
    stepSubmissions: StepSubmissionRow[];
    loading: boolean;
    activities: Activity[];
    onSubmissionsChange: (rows: StepSubmissionRow[]) => void;
};

function StepSubmissionsSection({ stepSubmissions, loading, activities, onSubmissionsChange }: StepSubmissionsSectionProps) {
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
    // Navigation state: the ordered list of gradeable rows for a step + current index
    const [gradingState, setGradingState] = useState<{ rows: StepSubmissionRow[]; index: number } | null>(null);
    const gradingSubmission = gradingState ? gradingState.rows[gradingState.index] : null;
    const [localSubmissions, setLocalSubmissions] = useState<StepSubmissionRow[]>(stepSubmissions);

    useEffect(() => {
        setLocalSubmissions(stepSubmissions);
    }, [stepSubmissions]);

    function updateLocal(updated: StepSubmissionRow[]) {
        setLocalSubmissions(updated);
        onSubmissionsChange(updated);
    }

    const grouped = useMemo(() => {
        const map: Record<string, {
            activityTitle: string;
            byStep: Record<string, {
                stepTitle: string;
                deliveryMode: "manual" | "teacher_copy" | undefined;
                rows: StepSubmissionRow[];
            }>;
        }> = {};
        for (const row of localSubmissions) {
            if (!map[row.activity_id]) {
                map[row.activity_id] = { activityTitle: row.activity_title, byStep: {} };
            }
            if (!map[row.activity_id].byStep[row.step_id]) {
                map[row.activity_id].byStep[row.step_id] = {
                    stepTitle: row.step_title,
                    deliveryMode: row.delivery_mode,
                    rows: [],
                };
            }
            map[row.activity_id].byStep[row.step_id].rows.push(row);
        }
        return map;
    }, [localSubmissions]);

    const activityIds = Object.keys(grouped);

    // Auto-select first activity when data loads; keep selection if still valid
    useEffect(() => {
        if (activityIds.length === 0) { setSelectedActivityId(null); return; }
        setSelectedActivityId(prev => (prev && activityIds.includes(prev)) ? prev : activityIds[0]);
    }, [activityIds.join(",")]);

    const selectedGroup = selectedActivityId ? grouped[selectedActivityId] : null;
    const stepIds = selectedGroup ? Object.keys(selectedGroup.byStep) : [];

    // Step selector state — resets when activity changes
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    useEffect(() => {
        if (stepIds.length === 0) { setSelectedStepId(null); return; }
        setSelectedStepId(prev => (prev && stepIds.includes(prev)) ? prev : stepIds[0]);
    }, [stepIds.join(",")]);

    const selectedStepGroup = (selectedGroup && selectedStepId) ? selectedGroup.byStep[selectedStepId] : null;

    return (
        <>
            <div className="space-y-4">
                <p className="text-sm text-text-muted">
                    Entregas de todos los alumnos matriculados para cada paso evaluable.
                </p>

                {loading ? (
                    <div className="text-sm text-text-muted animate-pulse">Cargando entregas...</div>
                ) : activityIds.length === 0 ? (
                    <div className="bg-surface-dark border border-dashed border-border-strong rounded-2xl flex flex-col items-center justify-center py-10 px-4 text-center">
                        <FileText className="size-8 text-text-muted/30 mb-3" />
                        <p className="text-sm font-medium text-foreground">Sin pasos evaluables aún</p>
                        <p className="text-xs text-text-muted mt-1 max-w-xs">
                            Aparecerán aquí los pasos de tipo Entregable, Archivo o Quiz.
                        </p>
                    </div>
                ) : null}

                {/* Level 1: Reto selector */}
                {activityIds.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        {activityIds.map((activityId, i) => {
                            const group = grouped[activityId];
                            const isSelected = selectedActivityId === activityId;
                            const submitted = Object.values(group.byStep).reduce(
                                (acc, s) => acc + s.rows.filter(r => !r.synthetic).length, 0
                            );
                            const totalSlots = Object.values(group.byStep)[0]?.rows.length ?? 0;
                            const activity = activities.find(a => a.id === activityId);
                            return (
                                <button
                                    key={activityId}
                                    onClick={() => setSelectedActivityId(activityId)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors",
                                        isSelected
                                            ? "bg-accent-blue/10 border-accent-blue/40 text-accent-blue"
                                            : "bg-surface border-border-strong text-text-muted hover:text-foreground hover:border-border-subtle"
                                    )}
                                >
                                    {getStepIcon(activity?.type as ActivityStepType ?? 'theory')}
                                    <span className="font-mono text-xs">R{i + 1}</span>
                                    <span className="text-xs font-medium truncate max-w-[140px]">{group.activityTitle}</span>
                                    <span className={cn(
                                        "text-[10px] font-mono px-1.5 py-0.5 rounded-full border shrink-0",
                                        submitted > 0
                                            ? "text-accent-blue bg-accent-blue/10 border-accent-blue/20"
                                            : "text-text-muted bg-surface-dark border-border-strong"
                                    )}>
                                        {submitted}/{totalSlots}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Level 2: Paso selector — only shown when the reto has multiple steps */}
                {selectedGroup && stepIds.length > 1 && (
                    <div className="flex gap-2 flex-wrap pl-1 border-l-2 border-border-strong ml-1">
                        {stepIds.map((stepId) => {
                            const stepGroup = selectedGroup.byStep[stepId];
                            const isSelected = selectedStepId === stepId;
                            const submitted = stepGroup.rows.filter(r => !r.synthetic).length;
                            const total = stepGroup.rows.length;
                            return (
                                <button
                                    key={stepId}
                                    onClick={() => setSelectedStepId(stepId)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
                                        isSelected
                                            ? "bg-purple-500/10 border-purple-500/40 text-purple-300"
                                            : "bg-surface border-border-strong text-text-muted hover:text-foreground hover:border-border-subtle"
                                    )}
                                >
                                    {getTabStepIcon(stepGroup.rows[0]?.step_type)}
                                    <span className="truncate max-w-[160px]">{stepGroup.stepTitle}</span>
                                    <span className={cn(
                                        "text-[10px] font-mono px-1.5 py-0.5 rounded-full border shrink-0",
                                        submitted > 0
                                            ? "text-purple-300 bg-purple-500/10 border-purple-500/20"
                                            : "text-text-muted bg-surface-dark border-border-strong"
                                    )}>
                                        {submitted}/{total}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Selected step content */}
                {selectedStepGroup && selectedStepId && selectedActivityId && (
                    <div className="border border-border-strong rounded-2xl overflow-hidden bg-surface-dark">
                        <div className="px-5 py-3 border-b border-border-strong bg-surface flex items-center justify-between gap-3 flex-wrap">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                {getStepIcon(selectedStepGroup.rows[0]?.step_type ?? 'theory')}
                                {selectedStepGroup.stepTitle}
                                {selectedStepGroup.deliveryMode === "teacher_copy" ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue uppercase tracking-widest flex items-center gap-1">
                                        <Copy className="size-2.5" /> Copia del profesor
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-dark border border-border-strong text-text-muted uppercase tracking-widest">
                                        Manual
                                    </span>
                                )}
                            </h4>
                            <div className="flex items-center gap-2">
                                {selectedStepGroup.deliveryMode === "teacher_copy" && (
                                    <DistributeButton stepId={selectedStepId} activityId={selectedActivityId} />
                                )}
                                <LockButton stepId={selectedStepId} />
                                <PublishAllButton
                                    stepId={selectedStepId}
                                    rows={selectedStepGroup.rows}
                                    onPublished={(publishedAt) => {
                                        updateLocal(localSubmissions.map(s =>
                                            s.step_id === selectedStepId && s.status === "graded"
                                                ? { ...s, status: "published", published_at: publishedAt }
                                                : s
                                        ));
                                    }}
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto px-5 py-3">
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
                                    {selectedStepGroup.rows.map((row, rowIdx) => (
                                        <SubmissionRow
                                            key={row.id}
                                            row={row}
                                            onGrade={() => setGradingState({ rows: selectedStepGroup.rows, index: rowIdx })}
                                            onReopen={() => {
                                                updateLocal(localSubmissions.map(s =>
                                                    s.id === row.id
                                                        ? { ...s, status: "submitted", graded_at: null, published_at: null }
                                                        : s
                                                ));
                                            }}
                                            onPublish={(publishedAt) => {
                                                updateLocal(localSubmissions.map(s =>
                                                    s.id === row.id
                                                        ? { ...s, status: "published", published_at: publishedAt }
                                                        : s
                                                ));
                                            }}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <GradingModal
                submission={gradingSubmission}
                rubric={gradingSubmission?.step_rubric}
                open={!!gradingSubmission}
                onClose={() => setGradingState(null)}
                hasPrev={!!gradingState && gradingState.index > 0}
                hasNext={!!gradingState && gradingState.index < gradingState.rows.length - 1}
                onPrev={() => setGradingState(s => s ? { ...s, index: s.index - 1 } : s)}
                onNext={() => setGradingState(s => s ? { ...s, index: s.index + 1 } : s)}
                onGraded={(id, score, feedback, completed, gradingMode) => {
                    updateLocal(localSubmissions.map(s =>
                        s.id === id
                            ? { ...s, score, feedback, status: "graded", graded_at: new Date().toISOString(), grading_mode: gradingMode }
                            : s
                    ));
                }}
            />
        </>
    );
}

// ---------------------------------------------------------------
// Individual submission row with actions
// ---------------------------------------------------------------

function SubmissionRow({
    row,
    onGrade,
    onReopen,
    onPublish,
}: {
    row: StepSubmissionRow;
    onGrade: () => void;
    onReopen: () => void;
    onPublish: (publishedAt: string) => void;
}) {
    const [isPendingReopen, startReopen] = useTransition();
    const [isPendingPublish, startPublish] = useTransition();

    function handleReopen() {
        startReopen(async () => {
            const res = await reopenSubmission(row.id);
            if (res.error) toast.error(res.error);
            else { toast.success("Entrega reabierta"); onReopen(); }
        });
    }

    function handlePublish() {
        startPublish(async () => {
            const res = await publishSubmissionGrade(row.id);
            if (res.error) toast.error(res.error);
            else { toast.success("Nota publicada"); onPublish(new Date().toISOString()); }
        });
    }

    const canReopen = row.status === "graded" || row.status === "published";
    const canPublish = row.status === "graded" && !row.published_at && !row.synthetic;
    const canGrade = !row.synthetic;

    return (
        <tr className="hover:bg-surface/50 transition-colors">
            <td className="py-2 pr-4 font-medium text-foreground">
                {row.student_name || row.student_email}
            </td>
            <td className="py-2 pr-4">
                <SubmissionFileLinks row={row} />
            </td>
            <td className="py-2 pr-4">
                <SubmissionStatusBadge status={row.status} publishedAt={row.published_at} />
            </td>
            <td className="py-2 pr-4 text-xs font-mono font-bold">
                <ScoreDisplay row={row} />
            </td>
            <td className="py-2 pr-4 text-xs text-text-muted">
                {row.submitted_at
                    ? new Date(row.submitted_at).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                    })
                    : "—"}
            </td>
            <td className="py-2">
                <div className="flex items-center gap-1.5">
                    {canGrade && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs gap-1 border-accent-blue/30 text-accent-blue hover:bg-accent-blue/10"
                            onClick={onGrade}
                        >
                            <PencilLine className="size-3" /> Evaluar
                        </Button>
                    )}
                    {canReopen && !row.synthetic && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                            onClick={handleReopen}
                            disabled={isPendingReopen}
                        >
                            <RotateCcw className="size-3" /> Reabrir
                        </Button>
                    )}
                    {canPublish && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            onClick={handlePublish}
                            disabled={isPendingPublish}
                        >
                            <Star className="size-3" /> Publicar
                        </Button>
                    )}
                </div>
            </td>
        </tr>
    );
}

// ---------------------------------------------------------------
// Student Grades section ("Notas por alumno")
// ---------------------------------------------------------------

type StudentGradesSectionProps = {
    students: { student_id: string; name: string }[];
    activities: Activity[];
    stepSubmissions: StepSubmissionRow[];
};

function StudentGradesSection({ students, activities, stepSubmissions }: StudentGradesSectionProps) {
    const [weights, setWeights] = useState<Record<string, number>>(() =>
        Object.fromEntries(activities.map(a => [a.id, a.grade_weight ?? 1.0]))
    );

    // Sync when activities prop changes (e.g. after reload)
    useEffect(() => {
        setWeights(Object.fromEntries(activities.map(a => [a.id, a.grade_weight ?? 1.0])));
    }, [activities]);

    // Compute normalized grade (0–10) for a student in an activity
    const computeGrade = (studentId: string, activityId: string): number | null => {
        const rows = stepSubmissions.filter(
            r => r.student_id === studentId && r.activity_id === activityId && !r.synthetic
        );
        if (rows.length === 0) return null;

        const graded = rows.filter(r => r.status === "graded" || r.status === "published");
        if (graded.length === 0) return null;

        // Pick the latest graded row
        const row = graded[0];

        if (row.grading_mode === "complete") return 10;
        if (row.grading_mode === "rubric" && row.rubric_scores) {
            const total = Object.values(row.rubric_scores).reduce((a, b) => a + b, 0);
            const max = row.step_rubric.reduce((a, c) => a + criteriaMaxPoints(c), 0);
            if (max === 0) return null;
            return Math.round((total / max) * 100) / 10; // 0–10
        }
        if (row.score !== null && row.score !== undefined) {
            return row.score; // assumed 0–10
        }
        return null;
    };

    const computeTotal = (studentId: string): number | null => {
        let weightedSum = 0;
        let weightSum = 0;
        for (const activity of activities) {
            const grade = computeGrade(studentId, activity.id);
            if (grade !== null) {
                const w = weights[activity.id] ?? 1.0;
                weightedSum += grade * w;
                weightSum += w;
            }
        }
        if (weightSum === 0) return null;
        return Math.round((weightedSum / weightSum) * 10) / 10;
    };

    if (students.length === 0) {
        return (
            <div className="bg-surface-dark border border-dashed border-border-strong rounded-2xl flex flex-col items-center justify-center py-12 px-4 text-center">
                <h3 className="text-lg font-bold text-foreground mb-2">No hay alumnos matriculados</h3>
                <p className="text-text-muted text-sm max-w-sm">
                    Ve a la configuración del Módulo para matricular alumnos.
                </p>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="bg-surface-dark border border-dashed border-border-strong rounded-2xl flex flex-col items-center justify-center py-12 px-4 text-center">
                <h3 className="text-lg font-bold text-foreground mb-2">No hay retos creados</h3>
                <p className="text-text-muted text-sm max-w-sm">
                    Crea actividades en la pestaña "Retos" para poder ver notas.
                </p>
            </div>
        );
    }

    return (
        <div className="border border-border-strong rounded-2xl overflow-hidden bg-surface-dark">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-text-muted uppercase bg-surface border-b border-border-strong">
                        <tr>
                            <th className="px-6 py-4 font-bold">Alumno</th>
                            {activities.map((activity, i) => (
                                <th key={activity.id} className="px-4 py-4 font-bold text-center min-w-[110px]">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="flex items-center gap-1.5" title={activity.title}>
                                            {getStepIcon(activity.type as ActivityStepType ?? 'theory')}
                                            <span>R{i + 1}</span>
                                        </div>
                                        <WeightInput
                                            activityId={activity.id}
                                            value={weights[activity.id] ?? 1.0}
                                            onChange={(v) => setWeights(prev => ({ ...prev, [activity.id]: v }))}
                                        />
                                    </div>
                                </th>
                            ))}
                            <th className="px-4 py-4 font-bold text-center min-w-[80px]">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student) => {
                            const total = computeTotal(student.student_id);
                            return (
                                <tr
                                    key={student.student_id}
                                    className="border-b border-border-subtle hover:bg-surface/50 transition-colors last:border-0"
                                >
                                    <td className="px-6 py-3 font-medium text-foreground">{student.name}</td>
                                    {activities.map((activity) => {
                                        const grade = computeGrade(student.student_id, activity.id);
                                        return (
                                            <td key={activity.id} className="px-4 py-3 text-center font-mono text-xs">
                                                {grade !== null ? (
                                                    <span className="text-accent-blue font-bold">{grade.toFixed(1)}</span>
                                                ) : (
                                                    <span className="text-text-muted">—</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-3 text-center">
                                        {total !== null ? (
                                            <span className={cn(
                                                "font-mono text-sm font-bold",
                                                total >= 5 ? "text-emerald-400" : "text-red-400"
                                            )}>
                                                {total.toFixed(1)}
                                            </span>
                                        ) : (
                                            <span className="text-text-muted text-xs">—</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Inline weight editor
function WeightInput({
    activityId,
    value,
    onChange,
}: {
    activityId: string;
    value: number;
    onChange: (v: number) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(String(value));
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);

    function handleBlur() {
        const parsed = parseFloat(draft);
        if (!isNaN(parsed) && parsed > 0) {
            onChange(parsed);
            updateActivityWeight(activityId, parsed).catch(() => {
                toast.error("No se pudo guardar el peso");
            });
        } else {
            setDraft(String(value));
        }
        setEditing(false);
    }

    if (editing) {
        return (
            <input
                ref={inputRef}
                type="number"
                min="0.1"
                step="0.1"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={e => { if (e.key === "Enter") handleBlur(); if (e.key === "Escape") { setDraft(String(value)); setEditing(false); } }}
                className="w-14 text-center text-[10px] bg-surface border border-accent-blue/50 rounded px-1 py-0.5 font-mono text-accent-blue outline-none"
            />
        );
    }

    return (
        <button
            onClick={() => { setDraft(String(value)); setEditing(true); }}
            className="text-[10px] font-mono text-text-muted hover:text-accent-blue transition-colors px-1.5 py-0.5 rounded border border-transparent hover:border-accent-blue/30"
            title="Editar ponderación"
        >
            w:{value}
        </button>
    );
}

// ---------------------------------------------------------------
// Shared UI helpers
// ---------------------------------------------------------------

function SubmissionFileLinks({ row }: { row: StepSubmissionRow }) {
    const files = row.files && row.files.length > 0
        ? row.files
        : row.drive_file_url
            ? [{ driveFileId: row.drive_file_id ?? "", driveFileUrl: row.drive_file_url, driveFileName: row.drive_file_url, driveMimeType: "application/pdf" }]
            : [];

    if (files.length === 0) return <span className="text-text-muted text-xs">—</span>;

    if (files.length === 1) {
        const f = files[0];
        const name = f.driveFileName && f.driveFileName !== f.driveFileUrl ? f.driveFileName : "Archivo";
        return (
            <a href={f.driveFileUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-accent-blue hover:underline max-w-[200px]">
                <ExternalLink className="size-3.5 shrink-0" />
                <span className="truncate text-xs">{name}</span>
            </a>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            {files.map((f, i) => (
                <a key={f.driveFileId || i} href={f.driveFileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-accent-blue hover:underline max-w-[200px]">
                    <Paperclip className="size-3 shrink-0" />
                    <span className="truncate text-xs">{f.driveFileName || `Archivo ${i + 1}`}</span>
                </a>
            ))}
        </div>
    );
}

function SubmissionStatusBadge({ status, publishedAt }: { status: string; publishedAt?: string | null }) {
    const isPublished = status === "published" || !!publishedAt;

    const config = isPublished
        ? { label: "Publicado", icon: Star, className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" }
        : ({
            submitted: { label: "Entregado", icon: CheckCircle2, className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
            graded: { label: "Corregido", icon: Star, className: "text-accent-blue bg-accent-blue/10 border-accent-blue/20" },
            pending: { label: "Sin entregar", icon: Clock, className: "text-text-muted bg-surface border-white/10" },
        }[status] ?? { label: status, icon: Circle, className: "text-text-muted bg-surface border-white/10" });

    const Icon = config.icon;
    return (
        <span className={cn("flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border w-fit", config.className)}>
            <Icon className="size-3" />
            {config.label}
        </span>
    );
}

function ScoreDisplay({ row }: { row: StepSubmissionRow }) {
    if (row.grading_mode === "complete") {
        return <span className="text-emerald-400">✓</span>;
    }
    if (row.grading_mode === "rubric" && row.rubric_scores) {
        const total = Object.values(row.rubric_scores).reduce((a, b) => a + b, 0);
        const max = row.step_rubric.reduce((a, c) => a + criteriaMaxPoints(c), 0);
        return <span className="text-accent-blue">{total}/{max}</span>;
    }
    if (row.score !== null && row.score !== undefined) {
        const display = parseFloat(String(row.score));
        return <span className="text-accent-blue">{isNaN(display) ? row.score : display}/10</span>;
    }
    return <span className="text-text-muted">—</span>;
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

function PublishAllButton({
    stepId,
    rows,
    onPublished,
}: {
    stepId: string;
    rows: StepSubmissionRow[];
    onPublished: (publishedAt: string) => void;
}) {
    const [isPending, startTransition] = useTransition();
    const gradedCount = rows.filter(r => r.status === "graded" && !r.published_at && !r.synthetic).length;

    if (gradedCount === 0) return null;

    function handlePublishAll() {
        startTransition(async () => {
            const res = await publishAllGradesForStep(stepId);
            if (res.error) toast.error(res.error);
            else {
                toast.success(`${res.count} notas publicadas`);
                onPublished(new Date().toISOString());
            }
        });
    }

    return (
        <Button
            size="sm"
            variant="outline"
            onClick={handlePublishAll}
            disabled={isPending}
            className="h-7 text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
        >
            <Star className="size-3" />
            {isPending ? "Publicando..." : `Publicar todas (${gradedCount})`}
        </Button>
    );
}
