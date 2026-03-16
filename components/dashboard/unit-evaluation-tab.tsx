"use client";

import { useMemo, useEffect, useState, useTransition, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    FileText, CheckCircle2, Clock, Circle, ExternalLink, Copy, Lock, Send, PencilLine,
    ChevronDown, ChevronRight, Star, RotateCcw, BookOpen, Paperclip,
    LayoutGrid, ListFilter, Search, Users, FolderRoot, GraduationCap, ArrowRight
} from "lucide-react";
import { getStepIcon, getTabStepIcon } from "@/lib/constants/step-icons";
import { ActivityStepType } from "@/types/activity";
import {
    getUnitStepSubmissions,
    reopenSubmission,
    publishSubmissionGrade,
    publishAllGradesForStep,
    updateActivityWeight,
    updateStepWeight,
    StepSubmissionRow,
} from "@/app/dashboard/units/[id]/actions";
import { criteriaMaxPoints } from "@/types/activity";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GradingModal } from "@/components/dashboard/grading-modal";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Student = {
    id: string;
    student_id?: string;
    full_name?: string | null;
    email?: string | null;
    profiles?: {
        id: string;
        full_name: string | null;
        email: string;
    } | null;
};

type EvaluableStep = {
    id: string;
    title: string;
    type: string;
    grade_weight: number;
};

type Activity = {
    id: string;
    title: string;
    type: string;
    xp: number;
    order_index: number;
    grade_weight?: number;
    evaluableSteps?: EvaluableStep[];
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

export function UnitEvaluationTab({ unitId, students, activities, submissions, activityIds }: UnitEvaluationTabProps) {
    const [viewMode, setViewMode] = useState<'correction' | 'global'>('correction');
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Auto-collapse sidebar in global mode
    useEffect(() => {
        if (viewMode === 'global') setIsSidebarOpen(false);
        else if (viewMode === 'correction' && selectedStepId) setIsSidebarOpen(true);
    }, [viewMode, selectedStepId]);

    const sortedActivities = useMemo(
        () => [...activities].sort((a, b) => a.order_index - b.order_index),
        [activities]
    );

    const enrolledStudents = useMemo(
        () => students.map(s => ({
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

    const grouped = useMemo(() => {
        const map: Record<string, {
            activityTitle: string;
            activityType: string;
            activityLogoUrl: string | null;
            byStep: Record<string, {
                stepTitle: string;
                stepType: ActivityStepType;
                deliveryMode: "manual" | "teacher_copy" | undefined;
                rows: StepSubmissionRow[];
            }>;
        }> = {};
        for (const row of stepSubmissions) {
            if (!map[row.activity_id]) {
                const act = activities.find(a => a.id === row.activity_id);
                map[row.activity_id] = {
                    activityTitle: row.activity_title,
                    activityType: act?.type || 'challenge',
                    activityLogoUrl: (act as any)?.logo_url ?? null,
                    byStep: {}
                };
            }
            if (!map[row.activity_id].byStep[row.step_id]) {
                map[row.activity_id].byStep[row.step_id] = {
                    stepTitle: row.step_title,
                    stepType: row.step_type,
                    deliveryMode: row.delivery_mode,
                    rows: [],
                };
            }
            map[row.activity_id].byStep[row.step_id].rows.push(row);
        }
        return map;
    }, [stepSubmissions, activities]);

    const activityIdsList = Object.keys(grouped);

    // Initial selection
    useEffect(() => {
        if (!selectedActivityId && activityIdsList.length > 0) {
            const firstActId = activityIdsList[0];
            setSelectedActivityId(firstActId);
            const firstStepId = Object.keys(grouped[firstActId].byStep)[0];
            setSelectedStepId(firstStepId);
        }
    }, [activityIdsList, grouped, selectedActivityId]);

    const handleSelectStep = (actId: string, stepId: string) => {
        setSelectedActivityId(actId);
        setSelectedStepId(stepId);
        setViewMode('correction');
    };

    return (
        <div className="flex h-full bg-background overflow-hidden border border-border-strong rounded-3xl shadow-2xl relative">
            
            {/* Sidebar: Navigation Tree */}
            <AnimatePresence initial={false}>
                {isSidebarOpen && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 300, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                        className="border-r border-border-strong bg-surface/30 flex flex-col overflow-hidden shrink-0"
                    >
                        <div className="p-5 border-b border-border-strong flex items-center justify-between bg-surface/50">
                            <div className="flex items-center gap-2">
                                <FolderRoot className="size-4 text-accent-blue" />
                                <h3 className="text-[10px] font-black text-foreground uppercase tracking-widest">Estructura</h3>
                            </div>
                            <Badge variant="outline" className="bg-accent-blue/5 border-accent-blue/20 text-accent-blue font-mono text-[9px] px-1.5 py-0">
                                {activityIdsList.length} RETOS
                            </Badge>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                            <div className="space-y-2">
                                {activityIdsList.map((actId, idx) => (
                                    <ChallengeAccordion
                                        key={actId}
                                        id={actId}
                                        index={idx}
                                        data={grouped[actId]}
                                        selectedStepId={selectedStepId}
                                        onSelectStep={handleSelectStep}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-hidden relative bg-surface/10">
                {/* Header / Mode Toggle */}
                <header className="h-14 border-b border-border-strong bg-surface/50 flex items-center justify-between px-6 shrink-0 backdrop-blur-md z-20">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="size-8 flex items-center justify-center rounded-xl hover:bg-white/5 transition-all border border-border-subtle shadow-sm active:scale-95"
                        >
                            <ListFilter className={cn("size-3.5 transition-transform duration-300", isSidebarOpen ? "" : "rotate-180")} />
                        </button>
                        
                        <div className="h-6 w-px bg-border-strong mx-1" />

                        <nav className="flex bg-surface-dark/50 border border-border-strong p-1 rounded-xl shadow-inner">
                            <button
                                onClick={() => setViewMode('correction')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                                    viewMode === 'correction' 
                                        ? "bg-accent-blue text-white shadow-lg shadow-accent-blue/20" 
                                        : "text-text-muted hover:text-foreground"
                                )}
                            >
                                <PencilLine className="size-3" />
                                Corrección
                            </button>
                            <button
                                onClick={() => setViewMode('global')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                                    viewMode === 'global' 
                                        ? "bg-accent-blue text-white shadow-lg shadow-accent-blue/20" 
                                        : "text-text-muted hover:text-foreground"
                                )}
                            >
                                <GraduationCap className="size-3" />
                                Libro de Notas
                            </button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        {loadingStepSubs && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-accent-blue/60 animate-pulse">
                                <div className="size-1.5 rounded-full bg-accent-blue" />
                                Sincronizando datos...
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-text-muted/50 px-3 py-1.5 border border-border-subtle rounded-xl bg-surface/50 shadow-sm">
                            <Users className="size-3 opacity-50" />
                            {enrolledStudents.length} ALUMNOS
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto relative custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {viewMode === 'correction' ? (
                            <motion.div
                                key="correction-view"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="h-full p-6"
                            >
                                {selectedStepId && selectedActivityId && grouped[selectedActivityId] ? (
                                    <CorrectionDetail 
                                        stepId={selectedStepId}
                                        activityId={selectedActivityId}
                                        stepData={grouped[selectedActivityId].byStep[selectedStepId]}
                                        onSubmissionsChange={setStepSubmissions}
                                        allSubmissions={stepSubmissions}
                                    />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                        <div className="size-20 rounded-[2rem] bg-surface border border-border-strong flex items-center justify-center mb-6 shadow-xl">
                                            <ArrowRight className="size-8 text-text-muted/20" />
                                        </div>
                                        <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Navega para comenzar</h3>
                                        <p className="text-xs text-text-muted max-w-[240px] mt-2 font-medium leading-relaxed">Selecciona un reto y una actividad evaluable en el panel lateral para ver las entregas.</p>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="global-view"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="h-full p-6"
                            >
                                <StudentGradesSection 
                                    students={enrolledStudents}
                                    activities={sortedActivities}
                                    stepSubmissions={stepSubmissions}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}

// --- SUB-COMPONENTS ---

function ChallengeAccordion({ id, index, data, selectedStepId, onSelectStep }: { 
    id: string, index: number, data: any, selectedStepId: string | null, onSelectStep: (actId: string, stepId: string) => void 
}) {
    const [isOpen, setIsOpen] = useState(true);
    const stepIds = Object.keys(data.byStep);
    
    const stats = useMemo(() => {
        let pending = 0;
        let total = 0;
        stepIds.forEach(sid => {
            const rows = data.byStep[sid].rows;
            pending += rows.filter((r: any) => r.status === 'submitted' && !r.synthetic).length;
            total += rows.length;
        });
        return { pending, total };
    }, [data, stepIds]);

    return (
        <div className="space-y-1">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-2xl border transition-all text-left group",
                    isOpen 
                        ? "bg-surface border-border-strong shadow-md shadow-black/5" 
                        : "bg-transparent border-transparent hover:bg-white/5"
                )}
            >
                <div className={cn(
                    "size-8 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 overflow-hidden",
                    isOpen
                        ? "bg-accent-blue/10 border-accent-blue/20 text-accent-blue shadow-inner"
                        : "bg-surface-dark border-border-strong text-text-muted group-hover:text-foreground group-hover:border-border-subtle"
                )}>
                    {data.activityLogoUrl
                        ? <img src={data.activityLogoUrl} alt={data.activityTitle} className="size-full object-cover" />
                        : getActivityTypeIcon(data.activityType)}
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-text-muted/40 font-mono">R{index + 1}</span>
                        <h4 className="text-[11px] font-bold text-foreground truncate uppercase tracking-tight">{data.activityTitle}</h4>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {stats.pending > 0 && (
                        <div className="flex items-center gap-1 bg-accent-blue/10 px-1.5 py-0.5 rounded-lg border border-accent-blue/20">
                            <span className="text-[9px] font-black text-accent-blue">{stats.pending}</span>
                            <div className="w-px h-2 bg-accent-blue/20" />
                            <span className="text-[9px] font-black text-accent-blue/40">{stats.total}</span>
                        </div>
                    )}
                    <ChevronDown className={cn("size-3 text-text-muted/40 transition-transform duration-300", isOpen ? "" : "-rotate-90")} />
                </div>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="pl-6 pr-1 py-1 space-y-0.5">
                            {stepIds.map((stepId) => {
                                const step = data.byStep[stepId];
                                const isSelected = selectedStepId === stepId;
                                const stepPending = step.rows.filter((r: any) => r.status === 'submitted' && !r.synthetic).length;
                                const stepTotal = step.rows.length;
                                
                                return (
                                    <button
                                        key={stepId}
                                        onClick={() => onSelectStep(id, stepId)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left relative group/item",
                                            isSelected 
                                                ? "bg-accent-blue/10 text-accent-blue shadow-inner" 
                                                : "text-text-muted hover:text-foreground hover:bg-white/5"
                                        )}
                                    >
                                        {isSelected && (
                                            <motion.div 
                                                layoutId="active-step-indicator"
                                                className="absolute left-0 w-0.5 h-3 bg-accent-blue rounded-full" 
                                            />
                                        )}
                                        <div className={cn(
                                            "size-5 rounded-lg flex items-center justify-center border transition-colors",
                                            isSelected ? "border-accent-blue/20 bg-accent-blue/5" : "border-border-strong bg-surface-dark group-hover/item:border-border-subtle"
                                        )}>
                                            {getTabStepIcon(step.stepType)}
                                        </div>
                                        <span className="text-[10px] font-bold truncate flex-1 uppercase tracking-tight">{step.stepTitle}</span>
                                        {stepPending > 0 ? (
                                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-accent-blue text-white shadow-sm">{stepPending}</span>
                                        ) : (
                                            <span className="text-[9px] font-black text-text-muted/20">{stepTotal}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function CorrectionDetail({ stepId, activityId, stepData, onSubmissionsChange, allSubmissions }: {
    stepId: string, activityId: string, stepData: any, onSubmissionsChange: (rows: StepSubmissionRow[]) => void, allSubmissions: StepSubmissionRow[]
}) {
    const [gradingState, setGradingState] = useState<{ rows: StepSubmissionRow[]; index: number } | null>(null);
    const gradingSubmission = gradingState ? gradingState.rows[gradingState.index] : null;

    const stats = useMemo(() => {
        const rows = stepData.rows;
        const total = rows.length;
        const pending = rows.filter((r: any) => r.status === 'submitted' && !r.synthetic).length;
        const graded = rows.filter((r: any) => (r.status === 'graded' || r.status === 'published') && !r.synthetic).length;
        const published = rows.filter((r: any) => r.status === 'published' && !r.synthetic).length;
        return { total, pending, graded, published };
    }, [stepData]);

    return (
        <div className="flex flex-col h-full gap-6">
            {/* Header: Activity Info & Quick Actions */}
            <div className="flex items-center justify-between bg-surface border border-border-strong p-6 rounded-[2rem] shadow-xl shadow-black/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                    {getStepIcon(stepData.stepType)}
                </div>

                <div className="flex items-center gap-6 relative z-10">
                    <div className="size-14 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue shadow-inner">
                        {getStepIcon(stepData.stepType)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[9px] font-black text-accent-blue uppercase tracking-[0.2em]">Actividad Evaluable</span>
                            <div className="size-1 rounded-full bg-border-strong mx-1" />
                            <Badge variant="outline" className="text-[8px] h-4 bg-surface-dark border-border-strong text-text-muted uppercase font-black px-1.5 py-0">
                                {stepData.deliveryMode === 'teacher_copy' ? 'Template' : 'Manual'}
                            </Badge>
                        </div>
                        <h2 className="text-2xl font-black text-foreground uppercase tracking-tighter leading-none">{stepData.stepTitle}</h2>
                        
                        <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold text-text-muted uppercase">Progreso:</span>
                                <div className="w-24 h-1.5 bg-surface-dark rounded-full overflow-hidden border border-border-strong">
                                    <div 
                                        className="h-full bg-accent-blue transition-all duration-500" 
                                        style={{ width: `${(stats.graded / (stats.total || 1)) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[9px] font-black text-foreground font-mono">{stats.graded}/{stats.total}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 relative z-10">
                    {stepData.deliveryMode === "teacher_copy" && (
                        <DistributeButton stepId={stepId} activityId={activityId} />
                    )}
                    <LockButton stepId={stepId} />
                    <PublishAllButton
                        stepId={stepId}
                        rows={stepData.rows}
                        onPublished={(publishedAt) => {
                            onSubmissionsChange(allSubmissions.map(s =>
                                s.step_id === stepId && s.status === "graded"
                                    ? { ...s, status: "published", published_at: publishedAt }
                                    : s
                            ));
                        }}
                    />
                </div>
            </div>

            {/* Submissions Table */}
            <div className="flex-1 min-h-0 bg-surface border border-border-strong rounded-[2rem] overflow-hidden flex flex-col shadow-xl shadow-black/5">
                <div className="overflow-auto custom-scrollbar flex-1 rounded-[2rem]">
                    <table className="w-full text-sm text-left border-collapse table-fixed">
                        <thead>
                            <tr className="text-[9px] text-text-muted font-black uppercase tracking-widest bg-surface-dark/50 border-b border-border-strong sticky top-0 z-10">
                                <th className="px-6 py-4 w-[280px]">Alumno</th>
                                <th className="px-6 py-4 w-[200px]">Entregable</th>
                                <th className="px-6 py-4 w-[140px]">Estado</th>
                                <th className="px-6 py-4 w-[100px]">Nota</th>
                                <th className="px-6 py-4 w-[160px]">Actividad</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle/50">
                            {stepData.rows.map((row: any, rowIdx: number) => (
                                <SubmissionRow
                                    key={row.id}
                                    row={row}
                                    onGrade={() => setGradingState({ rows: stepData.rows, index: rowIdx })}
                                    onReopen={() => {
                                        onSubmissionsChange(allSubmissions.map(s =>
                                            s.id === row.id
                                                ? { ...s, status: "submitted", graded_at: null, published_at: null }
                                                : s
                                        ));
                                    }}
                                    onPublish={(publishedAt) => {
                                        onSubmissionsChange(allSubmissions.map(s =>
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
                    onSubmissionsChange(allSubmissions.map(s =>
                        s.id === id
                            ? { ...s, score, feedback, status: "graded", graded_at: new Date().toISOString(), grading_mode: gradingMode }
                            : s
                    ));
                }}
            />
        </div>
    );
}

function SubmissionRow({ row, onGrade, onReopen, onPublish }: {
    row: StepSubmissionRow; onGrade: () => void; onReopen: () => void; onPublish: (publishedAt: string) => void;
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
        <tr className="hover:bg-accent-blue/[0.02] group transition-all duration-200">
            <td className="px-6 py-3">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-surface-dark border border-border-strong flex items-center justify-center text-[10px] font-black text-text-muted group-hover:text-accent-blue group-hover:border-accent-blue/30 transition-all shadow-inner">
                        {(row.student_name || row.student_email || "??").substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-foreground truncate uppercase tracking-tight">{row.student_name || "Sin nombre"}</span>
                        <span className="text-[9px] text-text-muted/50 font-mono tracking-tighter truncate">{row.student_email}</span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-3">
                <SubmissionFileLinks row={row} />
            </td>
            <td className="px-6 py-3">
                <SubmissionStatusBadge status={row.status} publishedAt={row.published_at} />
            </td>
            <td className="px-6 py-3">
                <ScoreDisplay row={row} />
            </td>
            <td className="px-6 py-3">
                <div className="flex items-center gap-2 text-text-muted/60">
                    <Clock className="size-3 opacity-30" />
                    <span className="text-[10px] font-mono tracking-tighter">
                        {row.submitted_at
                            ? new Date(row.submitted_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                            : "—"}
                    </span>
                </div>
            </td>
            <td className="px-6 py-3 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canGrade && (
                        <Button
                            size="sm"
                            className="h-8 text-[9px] font-black uppercase gap-2 bg-accent-blue hover:bg-accent-blue/90 text-white border-none shadow-lg shadow-accent-blue/20 px-3 rounded-lg"
                            onClick={onGrade}
                        >
                            <PencilLine className="size-3" /> Evaluar
                        </Button>
                    )}
                    {canReopen && !row.synthetic && (
                        <Button
                            size="icon"
                            variant="outline"
                            className="size-8 border-amber-500/20 text-amber-500/60 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all"
                            onClick={handleReopen}
                            disabled={isPendingReopen}
                            title="Reabrir entrega"
                        >
                            <RotateCcw className="size-3.5" />
                        </Button>
                    )}
                    {canPublish && (
                        <Button
                            size="icon"
                            variant="outline"
                            className="size-8 border-emerald-500/20 text-emerald-500/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                            onClick={handlePublish}
                            disabled={isPendingPublish}
                            title="Publicar nota"
                        >
                            <Star className="size-3.5" />
                        </Button>
                    )}
                </div>
            </td>
        </tr>
    );
}

function StudentGradesSection({ students, activities, stepSubmissions }: {
    students: { student_id: string; name: string }[], activities: Activity[], stepSubmissions: StepSubmissionRow[]
}) {
    const [weights, setWeights] = useState<Record<string, number>>(() =>
        Object.fromEntries(activities.map(a => [a.id, a.grade_weight ?? 1.0]))
    );
    const [stepWeights, setStepWeights] = useState<Record<string, number>>(() => {
        const map: Record<string, number> = {};
        activities.forEach(a => {
            (a.evaluableSteps ?? []).forEach(s => { map[s.id] = s.grade_weight; });
        });
        return map;
    });

    useEffect(() => {
        setWeights(Object.fromEntries(activities.map(a => [a.id, a.grade_weight ?? 1.0])));
        const map: Record<string, number> = {};
        activities.forEach(a => {
            (a.evaluableSteps ?? []).forEach(s => { map[s.id] = s.grade_weight; });
        });
        setStepWeights(map);
    }, [activities]);

    // Activities that have at least one evaluable step
    const activitiesWithSteps = useMemo(() =>
        activities
            .filter(a => (a.evaluableSteps ?? []).length > 0)
            .map(a => ({ ...a, evaluableSteps: a.evaluableSteps! })),
        [activities]
    );

    const computeStepGrade = (studentId: string, stepId: string): { grade: number | null; status: 'graded' | 'submitted' | 'none' } => {
        const row = stepSubmissions.find(r => r.student_id === studentId && r.step_id === stepId && !r.synthetic);
        if (!row) return { grade: null, status: 'none' };
        if (row.status === 'submitted') return { grade: null, status: 'submitted' };
        if (row.status !== 'graded' && row.status !== 'published') return { grade: null, status: 'none' };
        if (row.grading_mode === 'complete') return { grade: 10, status: 'graded' };
        if (row.grading_mode === 'rubric' && row.rubric_scores) {
            const total = Object.values(row.rubric_scores).reduce((a, b) => a + b, 0);
            const max = row.step_rubric.reduce((a, c) => a + criteriaMaxPoints(c), 0);
            if (max === 0) return { grade: null, status: 'graded' };
            return { grade: Math.round((total / max) * 100) / 10, status: 'graded' };
        }
        const score = row.score !== null && row.score !== undefined ? row.score : null;
        return { grade: score, status: score !== null ? 'graded' : 'none' };
    };

    const computeRetoGrade = (studentId: string, activity: typeof activitiesWithSteps[number]): number | null => {
        let weightedSum = 0; let weightSum = 0;
        for (const step of activity.evaluableSteps) {
            const { grade } = computeStepGrade(studentId, step.id);
            if (grade !== null) {
                const w = stepWeights[step.id] ?? 1.0;
                weightedSum += grade * w;
                weightSum += w;
            }
        }
        return weightSum === 0 ? null : Math.round((weightedSum / weightSum) * 10) / 10;
    };

    const computeTotal = (studentId: string): number | null => {
        let weightedSum = 0; let weightSum = 0;
        for (const activity of activitiesWithSteps) {
            const grade = computeRetoGrade(studentId, activity);
            if (grade !== null) {
                const w = weights[activity.id] ?? 1.0;
                weightedSum += grade * w;
                weightSum += w;
            }
        }
        return weightSum === 0 ? null : Math.round((weightedSum / weightSum) * 10) / 10;
    };

    return (
        <div className="flex flex-col h-full gap-6">
            {/* Header */}
            <div className="flex items-center justify-between bg-surface border border-border-strong p-6 rounded-[2rem] shadow-xl shadow-black/5">
                <div className="flex items-center gap-6">
                    <div className="size-14 rounded-2xl bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center text-accent-amber shadow-inner">
                        <BookOpen className="size-7" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-foreground uppercase tracking-tighter leading-none">Libro de Notas Global</h2>
                        <p className="text-[10px] text-text-muted font-black uppercase tracking-[0.2em] mt-2 opacity-60">Vista consolidada de rendimientos y pesos</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="h-10 text-[10px] font-black uppercase border-border-strong hover:bg-white/5 px-6 rounded-xl">
                        Exportar Reporte
                    </Button>
                </div>
            </div>

            {/* Matrix Table */}
            <div className="flex-1 bg-surface border border-border-strong rounded-[2rem] overflow-hidden flex flex-col shadow-xl shadow-black/5">
                <div className="overflow-auto custom-scrollbar flex-1">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-surface-dark/50 border-b border-border-strong sticky top-0 z-20 backdrop-blur-md">
                            {/* Row 1: Reto group headers */}
                            <tr className="text-[9px] text-text-muted font-black uppercase tracking-widest">
                                <th rowSpan={2} className="px-8 py-5 border-r border-border-strong min-w-[240px] w-[240px] align-middle">Alumno</th>
                                {activitiesWithSteps.map((activity, i) => (
                                    <th key={activity.id} colSpan={activity.evaluableSteps.length}
                                        className="px-4 py-3 text-center border-r border-border-strong/50 bg-surface/30 border-b border-border-strong/30">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="flex items-center gap-2" title={activity.title}>
                                                <span className="opacity-30 font-mono">R{i + 1}</span>
                                                <span className="truncate max-w-[160px] text-foreground uppercase tracking-tight">{activity.title}</span>
                                            </div>
                                            <WeightInput
                                                activityId={activity.id}
                                                value={weights[activity.id] ?? 1.0}
                                                onChange={(v) => setWeights(prev => ({ ...prev, [activity.id]: v }))}
                                            />
                                        </div>
                                    </th>
                                ))}
                                <th rowSpan={2} className="px-6 py-5 text-center bg-accent-blue/5 min-w-[100px] w-[100px] align-middle">Promedio</th>
                            </tr>
                            {/* Row 2: Step sub-headers */}
                            <tr className="text-[9px] text-text-muted/60 font-bold uppercase tracking-widest">
                                {activitiesWithSteps.flatMap(activity =>
                                    activity.evaluableSteps.map(step => (
                                        <th key={step.id} className="px-3 py-2.5 text-center border-r border-border-strong/30 min-w-[110px] bg-surface-dark/20">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className="truncate max-w-[90px] text-[8px] text-text-muted/50 font-black uppercase tracking-widest">{step.title}</span>
                                                <StepWeightInput
                                                    stepId={step.id}
                                                    value={stepWeights[step.id] ?? 1.0}
                                                    onChange={(v) => setStepWeights(prev => ({ ...prev, [step.id]: v }))}
                                                />
                                            </div>
                                        </th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle/50">
                            {students.map((student) => {
                                const total = computeTotal(student.student_id);
                                return (
                                    <tr key={student.student_id} className="hover:bg-accent-blue/[0.02] transition-colors group">
                                        <td className="px-8 py-3 font-bold text-foreground border-r border-border-strong/50 uppercase tracking-tight text-[11px] bg-surface/50 whitespace-nowrap">{student.name}</td>
                                        {activitiesWithSteps.flatMap(activity =>
                                            activity.evaluableSteps.map(step => {
                                                const { grade, status } = computeStepGrade(student.student_id, step.id);
                                                return (
                                                    <td key={step.id} className="px-3 py-3 text-center border-r border-border-strong/20 group-hover:bg-white/[0.01]">
                                                        {status === 'graded' && grade !== null && (
                                                            <span className="font-mono text-[11px] font-black text-emerald-400 tabular-nums">{grade.toFixed(1)}</span>
                                                        )}
                                                        {status === 'submitted' && (
                                                            <span className="font-mono text-[13px] font-black text-amber-400">!</span>
                                                        )}
                                                        {status === 'none' && (
                                                            <span className="text-text-muted/20 font-mono text-[11px]">−</span>
                                                        )}
                                                    </td>
                                                );
                                            })
                                        )}
                                        <td className="px-6 py-3 text-center bg-accent-blue/[0.03] group-hover:bg-accent-blue/[0.05] transition-colors">
                                            {total !== null ? (
                                                <div className={cn(
                                                    "inline-flex items-center justify-center size-9 rounded-2xl font-mono text-xs font-black border tabular-nums shadow-sm",
                                                    total >= 5
                                                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                                        : "text-red-400 bg-red-500/10 border-red-500/20"
                                                )}>
                                                    {total.toFixed(1)}
                                                </div>
                                            ) : <span className="text-text-muted/20 font-mono text-[10px]">——</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}


function getActivityTypeIcon(type: string) {
    switch (type) {
        case 'theory':    return <FileText className="size-4 text-accent-blue" />;
        case 'quiz':      return <CheckCircle2 className="size-4 text-accent-orange" />;
        case 'project':   return <Star className="size-4 text-purple-400" />;
        default:          return <BookOpen className="size-4 text-text-muted" />;
    }
}

// --- SHARED UI HELPERS (Unchanged logic, updated styles) ---

function WeightInput({ activityId, value, onChange }: { activityId: string; value: number; onChange: (v: number) => void; }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(String(value));
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
    function handleBlur() {
        const parsed = parseFloat(draft);
        if (!isNaN(parsed) && parsed > 0) {
            onChange(parsed);
            updateActivityWeight(activityId, parsed).catch(() => toast.error("No se pudo guardar el peso"));
        } else setDraft(String(value));
        setEditing(false);
    }
    if (editing) return (
        <input ref={inputRef} type="number" min="0.1" step="0.1" value={draft}
            onChange={e => setDraft(e.target.value)} onBlur={handleBlur}
            onKeyDown={e => { if (e.key === "Enter") handleBlur(); if (e.key === "Escape") { setDraft(String(value)); setEditing(false); } }}
            className="w-14 text-center text-[10px] bg-background border border-accent-blue/50 rounded-lg px-1 py-1 font-mono text-accent-blue outline-none"
        />
    );
    return (
        <button onClick={() => { setDraft(String(value)); setEditing(true); }}
            className="text-[9px] font-black font-mono text-text-muted/40 hover:text-accent-blue transition-all px-2 py-1 rounded-lg border border-border-strong hover:border-accent-blue/30 bg-surface-dark"
        >
            PESO: {value}
        </button>
    );
}

function StepWeightInput({ stepId, value, onChange }: { stepId: string; value: number; onChange: (v: number) => void; }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(String(value));
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
    function handleBlur() {
        const parsed = parseFloat(draft);
        if (!isNaN(parsed) && parsed > 0) {
            onChange(parsed);
            updateStepWeight(stepId, parsed).catch(() => toast.error("No se pudo guardar el peso del paso"));
        } else setDraft(String(value));
        setEditing(false);
    }
    if (editing) return (
        <input ref={inputRef} type="number" min="0.1" step="0.1" value={draft}
            onChange={e => setDraft(e.target.value)} onBlur={handleBlur}
            onKeyDown={e => { if (e.key === "Enter") handleBlur(); if (e.key === "Escape") { setDraft(String(value)); setEditing(false); } }}
            className="w-12 text-center text-[9px] bg-background border border-accent-amber/50 rounded-lg px-1 py-0.5 font-mono text-accent-amber outline-none"
        />
    );
    return (
        <button onClick={() => { setDraft(String(value)); setEditing(true); }}
            className="text-[8px] font-black font-mono text-text-muted/30 hover:text-accent-amber transition-all px-1.5 py-0.5 rounded-md border border-border-strong hover:border-accent-amber/30 bg-surface-dark"
        >
            P: {value}
        </button>
    );
}

function SubmissionFileLinks({ row }: { row: StepSubmissionRow }) {
    const files = row.files && row.files.length > 0 ? row.files : row.drive_file_url ? [{ driveFileId: row.drive_file_id ?? "", driveFileUrl: row.drive_file_url, driveFileName: row.drive_file_url, driveMimeType: "application/pdf" }] : [];
    if (files.length === 0) return <span className="text-text-muted/30 text-[10px] uppercase font-bold tracking-tighter">Sin entrega</span>;
    return (
        <div className="flex flex-col gap-1.5">
            {files.map((f, i) => (
                <a key={f.driveFileId || i} href={f.driveFileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-accent-blue hover:text-white transition-colors group/link max-w-[180px]">
                    <div className="size-6 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center shrink-0 group-hover/link:bg-accent-blue group-hover/link:text-white transition-all">
                        {files.length > 1 ? <Paperclip className="size-3" /> : <ExternalLink className="size-3" />}
                    </div>
                    <span className="truncate text-[11px] font-bold tracking-tight">{f.driveFileName || "Archivo"}</span>
                </a>
            ))}
        </div>
    );
}

function SubmissionStatusBadge({ status, publishedAt }: { status: string; publishedAt?: string | null }) {
    const isPublished = status === "published" || !!publishedAt;
    const config = isPublished
        ? { label: "Publicado", icon: Star, className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]" }
        : ({
            submitted: { label: "Entregado", icon: CheckCircle2, className: "text-accent-blue bg-accent-blue/10 border-accent-blue/20" },
            graded: { label: "Corregido", icon: Star, className: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
            pending: { label: "Pendiente", icon: Clock, className: "text-text-muted/40 bg-surface-dark border-border-strong" },
        }[status] ?? { label: status, icon: Circle, className: "text-text-muted bg-surface border-white/10" });
    const Icon = config.icon;
    return (
        <span className={cn("flex items-center gap-2 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border w-fit transition-all", config.className)}>
            <Icon className="size-3" />
            {config.label}
        </span>
    );
}

function ScoreDisplay({ row }: { row: StepSubmissionRow }) {
    if (row.grading_mode === "complete") return <div className="size-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">✓</div>;
    if (row.grading_mode === "rubric" && row.rubric_scores) {
        const total = Object.values(row.rubric_scores).reduce((a, b) => a + b, 0);
        const max = row.step_rubric.reduce((a, c) => a + criteriaMaxPoints(c), 0);
        return <div className="px-2 py-1 rounded-lg bg-accent-blue/5 border border-accent-blue/10 text-accent-blue font-mono text-[10px] font-black">{total}/{max}</div>;
    }
    if (row.score !== null && row.score !== undefined) {
        return <div className="px-2 py-1 rounded-lg bg-accent-blue/5 border border-accent-blue/10 text-accent-blue font-mono text-[10px] font-black">{row.score}/10</div>;
    }
    return <span className="text-text-muted/20 font-mono text-[10px]">--</span>;
}

function DistributeButton({ stepId, activityId }: { stepId: string; activityId: string }) {
    const [isPending, startTransition] = useTransition();
    function handleDistribute() {
        startTransition(async () => {
            try {
                const res = await fetch("/api/drive/copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stepId, activityId }) });
                const data = await res.json();
                if (!res.ok) toast.error(data.error ?? "Error");
                else toast.success(`Distribuido: ${data.copied} copias.`);
            } catch { toast.error("Error de red"); }
        });
    }
    return (
        <Button size="sm" variant="outline" onClick={handleDistribute} disabled={isPending}
            className="h-9 text-[10px] font-black uppercase gap-2 border-border-strong hover:bg-white/5"
        >
            <Send className="size-3.5" /> {isPending ? "..." : "Distribuir"}
        </Button>
    );
}

function LockButton({ stepId }: { stepId: string }) {
    const [isPending, startTransition] = useTransition();
    function handleLock() {
        startTransition(async () => {
            try {
                const res = await fetch("/api/drive/lock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stepId }) });
                const data = await res.json();
                if (!res.ok) toast.error(data.error);
                else toast.success("Cerrado");
            } catch { toast.error("Error"); }
        });
    }
    return (
        <Button size="sm" variant="outline" onClick={handleLock} disabled={isPending}
            className="h-9 text-[10px] font-black uppercase gap-2 border-border-strong hover:bg-white/5"
        >
            <Lock className="size-3.5" /> {isPending ? "..." : "Cerrar"}
        </Button>
    );
}

function PublishAllButton({ stepId, rows, onPublished }: { stepId: string; rows: StepSubmissionRow[]; onPublished: (publishedAt: string) => void; }) {
    const [isPending, startTransition] = useTransition();
    const gradedCount = rows.filter(r => r.status === "graded" && !r.published_at && !r.synthetic).length;
    if (gradedCount === 0) return null;
    function handlePublishAll() {
        startTransition(async () => {
            const res = await publishAllGradesForStep(stepId);
            if (res.error) toast.error(res.error);
            else { toast.success("Publicadas"); onPublished(new Date().toISOString()); }
        });
    }
    return (
        <Button size="sm" variant="outline" onClick={handlePublishAll} disabled={isPending}
            className="h-9 text-[10px] font-black uppercase gap-2 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
        >
            <Star className="size-3.5" /> {isPending ? "..." : `Publicar (${gradedCount})`}
        </Button>
    );
}
