"use client";

import { useMemo, useEffect, useState, useTransition, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    FileText, CheckCircle2, Clock, Circle, ExternalLink, Copy, Lock, Send, PencilLine,
    ChevronDown, Star, Undo2, BookOpen, Paperclip, CalendarPlus,
    LayoutGrid, ListFilter, Search, Users, FolderRoot, GraduationCap, ArrowRight,
    ArrowUp, ArrowDown, ArrowUpDown, Download
} from "lucide-react";
import {
    useReactTable, getCoreRowModel, getSortedRowModel, flexRender,
    type ColumnDef, type SortingState, type RowSelectionState, type Column,
} from "@tanstack/react-table";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { getStepIcon, getTabStepIcon } from "@/lib/constants/step-icons";
import { ActivityStepType } from "@/types/activity";
import {
    getUnitStepSubmissions,
    reopenSubmission,
    publishSubmissionGrade,
    publishAllGradesForStep,
    updateActivityWeight,
    updateStepWeight,
    bulkPublishSubmissions,
    bulkReopenSubmissions,
    createDeadlineExtension,
    bulkCreateDeadlineExtensions,
    StepSubmissionRow,
} from "@/app/dashboard/units/[id]/actions";
import { criteriaMaxPoints } from "@/types/activity";
import { cn } from "@/lib/utils";
import { updateStepLock } from "@/app/activities/[id]/edit/actions";
import { exportGradesAsCSV } from "@/lib/export-grades";
import { toast } from "sonner";
import { GradingModal } from "@/components/dashboard/grading-modal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

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

    const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(() => {
        if (typeof window === 'undefined') return {};
        try {
            const saved = localStorage.getItem(`aula-it:evaluation:${unitId}:sidebar`);
            return saved ? (JSON.parse(saved).openAccordions ?? {}) : {};
        } catch { return {}; }
    });
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = localStorage.getItem(`aula-it:evaluation:${unitId}:sidebar`);
            return saved ? (JSON.parse(saved).selectedActivityId ?? null) : null;
        } catch { return null; }
    });
    const [selectedStepId, setSelectedStepId] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = localStorage.getItem(`aula-it:evaluation:${unitId}:sidebar`);
            return saved ? (JSON.parse(saved).selectedStepId ?? null) : null;
        } catch { return null; }
    });
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Persist sidebar state
    useEffect(() => {
        try {
            localStorage.setItem(`aula-it:evaluation:${unitId}:sidebar`, JSON.stringify({
                openAccordions, selectedActivityId, selectedStepId,
            }));
        } catch {}
    }, [unitId, openAccordions, selectedActivityId, selectedStepId]);

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
                isLocked: boolean;
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
                    isLocked: row.step_is_locked ?? false,
                    rows: [],
                };
            }
            map[row.activity_id].byStep[row.step_id].rows.push(row);
        }
        return map;
    }, [stepSubmissions, activities]);

    const activityIdsList = useMemo(() => {
        const ids = Object.keys(grouped);
        return ids.sort((a, b) => {
            const actA = activities.find(act => act.id === a);
            const actB = activities.find(act => act.id === b);
            return (actA?.order_index ?? 0) - (actB?.order_index ?? 0);
        });
    }, [grouped, activities]);

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
                                        isOpen={openAccordions[actId] !== false}
                                        onToggle={() => setOpenAccordions(prev => ({ ...prev, [actId]: !(prev[actId] !== false) }))}
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
                                    unitId={unitId}
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

function ChallengeAccordion({ id, index, data, selectedStepId, onSelectStep, isOpen, onToggle }: {
    id: string, index: number, data: any, selectedStepId: string | null, onSelectStep: (actId: string, stepId: string) => void,
    isOpen: boolean, onToggle: () => void
}) {
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
                onClick={onToggle}
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

function SortableHeader({ column, label }: { column: Column<StepSubmissionRow, unknown>; label: string }) {
    return (
        <button className="flex items-center gap-1 cursor-pointer select-none uppercase tracking-wider text-[11px] font-mono font-medium" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            {label}
            {column.getIsSorted() === "asc" ? <ArrowUp className="size-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3 opacity-40" />}
        </button>
    );
}

function CorrectionDetail({ stepId, activityId, stepData, onSubmissionsChange, allSubmissions }: {
    stepId: string, activityId: string, stepData: any, onSubmissionsChange: (rows: StepSubmissionRow[]) => void, allSubmissions: StepSubmissionRow[]
}) {
    const [gradingState, setGradingState] = useState<{ rows: StepSubmissionRow[]; index: number } | null>(null);
    const gradingSubmission = gradingState ? gradingState.rows[gradingState.index] : null;
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [extensionDialog, setExtensionDialog] = useState<{ open: boolean; studentIds: string[]; studentNames: string[] }>({ open: false, studentIds: [], studentNames: [] });

    const stats = useMemo(() => {
        const rows = stepData.rows;
        const total = rows.length;
        const pending = rows.filter((r: any) => r.status === 'submitted' && !r.synthetic).length;
        const graded = rows.filter((r: any) => (r.status === 'graded' || r.status === 'published') && !r.synthetic).length;
        const published = rows.filter((r: any) => r.status === 'published' && !r.synthetic).length;
        return { total, pending, graded, published };
    }, [stepData]);

    const columns: ColumnDef<StepSubmissionRow>[] = useMemo(() => [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                    onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                    aria-label="Seleccionar todos"
                    className="border-border-strong"
                />
            ),
            cell: ({ row }) => row.original.synthetic ? null : (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(v) => row.toggleSelected(!!v)}
                    aria-label={`Seleccionar ${row.original.student_name}`}
                    className="border-border-strong"
                />
            ),
            enableSorting: false,
            size: 48,
        },
        {
            accessorKey: "student_name",
            header: ({ column }) => <SortableHeader column={column} label="Alumno" />,
            cell: ({ row }) => {
                const r = row.original;
                return (
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-xl bg-surface-dark border border-border-strong flex items-center justify-center text-[10px] font-black text-text-muted group-hover:text-accent-blue group-hover:border-accent-blue/30 transition-all shadow-inner shrink-0">
                            {(r.student_name || r.student_email || "??").substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[14px] font-bold text-foreground truncate uppercase tracking-tight font-mono">{r.student_name || "Sin nombre"}</span>
                           {/* <span className="text-[9px] text-text-muted/50 font-mono tracking-tighter truncate">{r.student_email}</span> */}
                        </div>
                    </div>
                );
            },
            size: 260,
        },
        {
            id: "files",
            header: () => <span className="uppercase text-[11px] font-mono font-medium tracking-wider">Entregable</span>,
            cell: ({ row }) => <SubmissionFileLinks row={row.original} />,
            enableSorting: false,
            size: 180,
        },
        {
            accessorKey: "status",
            header: ({ column }) => <SortableHeader column={column} label="Estado" />,
            cell: ({ row }) => <SubmissionStatusBadge status={row.original.status} publishedAt={row.original.published_at} />,
            size: 140,
        },
        {
            accessorKey: "score",
            header: ({ column }) => <SortableHeader column={column} label="Nota" />,
            cell: ({ row }) => <ScoreDisplay row={row.original} />,
            size: 100,
            sortingFn: (rowA, rowB) => (rowA.original.score ?? -1) - (rowB.original.score ?? -1),
        },
        {
            accessorKey: "submitted_at",
            header: ({ column }) => <SortableHeader column={column} label="Fecha" />,
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-text-muted/60">
                    <Clock className="size-3 opacity-30" />
                    <span className="text-[12px] font-mono tracking-tighter">
                        {row.original.submitted_at
                            ? new Date(row.original.submitted_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                            : "—"}
                    </span>
                </div>
            ),
            size: 160,
        },
        {
            id: "actions",
            header: () => <span className="text-right block uppercase text-[11px] font-mono font-medium tracking-wider">Acciones</span>,
            cell: ({ row, table }) => <SubmissionActions row={row.original} table={table} onGrade={() => {
                const rows = table.getSortedRowModel().rows.map(r => r.original);
                const idx = rows.findIndex(r => r.id === row.original.id);
                setGradingState({ rows, index: idx >= 0 ? idx : 0 });
            }} onReopen={() => {
                onSubmissionsChange(allSubmissions.map(s =>
                    s.id === row.original.id ? { ...s, status: "submitted", graded_at: null, published_at: null } : s
                ));
            }} onExtendDeadline={() => {
                setExtensionDialog({ open: true, studentIds: [row.original.student_id], studentNames: [row.original.student_name || "Sin nombre"] });
            }} onPublish={(publishedAt) => {
                onSubmissionsChange(allSubmissions.map(s =>
                    s.id === row.original.id ? { ...s, status: "published", published_at: publishedAt } : s
                ));
            }} />,
            enableSorting: false,
        },
    ], [allSubmissions, onSubmissionsChange]);

    const table = useReactTable({
        data: stepData.rows as StepSubmissionRow[],
        columns,
        state: { sorting, rowSelection },
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableRowSelection: (row) => !row.original.synthetic,
        getRowId: (row) => row.id,
    });

    const selectedRows = table.getSelectedRowModel().rows.map(r => r.original);
    const selectedIdSet = new Set(selectedRows.map(r => r.id));

    return (
        <div className="flex flex-col h-full gap-6">
            {/* Header: Activity Info & Quick Actions */}
            <div className="flex items-center justify-between bg-surface border border-border-strong p-4 rounded-2xl shadow-xl shadow-black/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                    {getStepIcon(stepData.stepType)}
                </div>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="size-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue shadow-inner shrink-0">
                        {getStepIcon(stepData.stepType)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black text-accent-blue uppercase tracking-[0.2em]">Actividad Evaluable</span>
                            <div className="size-1 rounded-full bg-border-strong mx-1" />
                            <Badge variant="outline" className="text-[8px] h-4 bg-surface-dark border-border-strong text-text-muted uppercase font-black px-1.5 py-0">
                                {stepData.deliveryMode === 'teacher_copy' ? 'Template' : 'Manual'}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-black text-foreground uppercase tracking-tighter leading-none">{stepData.stepTitle}</h2>
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
                    <LockButton stepId={stepId} deliveryMode={stepData.deliveryMode} initialLocked={stepData.isLocked} />
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

            {/* Bulk action bar */}
            {selectedRows.length > 0 && (
                <BulkActionBar
                    selectedIds={selectedIdSet}
                    rows={selectedRows}
                    onClear={() => table.resetRowSelection()}
                    onSubmissionsChange={onSubmissionsChange}
                    allSubmissions={allSubmissions}
                    onExtendDeadline={() => {
                        setExtensionDialog({
                            open: true,
                            studentIds: selectedRows.map(r => r.student_id),
                            studentNames: selectedRows.map(r => r.student_name || "Sin nombre"),
                        });
                    }}
                />
            )}

            {/* Submissions Table */}
            <div className="flex-1 min-h-0 bg-surface border border-border-strong rounded-[2rem] overflow-hidden flex flex-col shadow-xl shadow-black/5">
                <div className="overflow-auto custom-scrollbar flex-1 rounded-[2rem]">
                    <Table className="table-fixed">
                        <TableHeader className="sticky top-0 z-10">
                            {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id} className="bg-surface-dark/50 border-b border-border-strong hover:bg-surface-dark/50">
                                    {headerGroup.headers.map(header => (
                                        <TableHead key={header.id} style={{ width: header.getSize() }}>
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows.map(row => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() ? "selected" : undefined}
                                    className={cn("group", row.getIsSelected() ? "bg-accent-blue/4" : "")}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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

            <DeadlineExtensionDialog
                open={extensionDialog.open}
                onOpenChange={(open) => setExtensionDialog(prev => ({ ...prev, open }))}
                stepId={stepId}
                studentIds={extensionDialog.studentIds}
                studentNames={extensionDialog.studentNames}
                onExtended={() => {
                    // Refresh would be ideal but for now just close
                    table.resetRowSelection();
                }}
            />
        </div>
    );
}

function BulkActionBar({ selectedIds, rows, onClear, onSubmissionsChange, allSubmissions, onExtendDeadline }: {
    selectedIds: Set<string>; rows: StepSubmissionRow[];
    onClear: () => void; onSubmissionsChange: (rows: StepSubmissionRow[]) => void; allSubmissions: StepSubmissionRow[];
    onExtendDeadline?: () => void;
}) {
    const [isPendingPublish, startPublish] = useTransition();
    const [isPendingReopen, startReopen] = useTransition();

    const gradedSelected = rows.filter(r => r.status === 'graded' && !r.published_at && !r.synthetic);

    function handleBulkPublish() {
        startPublish(async () => {
            const ids = gradedSelected.map(r => r.id);
            const res = await bulkPublishSubmissions(ids);
            if (res.error) toast.error(res.error);
            else {
                toast.success(`${ids.length} notas publicadas`);
                const now = new Date().toISOString();
                onSubmissionsChange(allSubmissions.map(s => ids.includes(s.id) ? { ...s, status: 'published', published_at: now } : s));
                onClear();
            }
        });
    }

    function handleBulkReopen() {
        startReopen(async () => {
            const ids = rows.filter(r => !r.synthetic && (r.status === 'graded' || r.status === 'published')).map(r => r.id);
            if (ids.length === 0) { toast.error("Ninguna entrega seleccionada se puede deshacer"); return; }
            const res = await bulkReopenSubmissions(ids);
            if (res.error) toast.error(res.error);
            else {
                toast.success(`${ids.length} correcciones deshechas`);
                onSubmissionsChange(allSubmissions.map(s => ids.includes(s.id) ? { ...s, status: 'submitted', graded_at: null, published_at: null } : s));
                onClear();
            }
        });
    }

    return (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-accent-blue/5 border border-accent-blue/20 rounded-2xl text-[10px] font-black uppercase tracking-widest">
            <span className="text-accent-blue">{selectedIds.size} seleccionados</span>
            <div className="h-4 w-px bg-accent-blue/20" />
            {gradedSelected.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleBulkPublish} disabled={isPendingPublish}
                    className="h-7 text-[9px] font-black uppercase gap-1.5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10">
                    <Star className="size-3" /> Publicar notas ({gradedSelected.length})
                </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleBulkReopen} disabled={isPendingReopen}
                className="h-7 text-[9px] font-black uppercase gap-1.5 border-amber-500/20 text-amber-500 hover:bg-amber-500/10">
                <Undo2 className="size-3" /> Deshacer corrección
            </Button>
            {onExtendDeadline && (
                <Button size="sm" variant="outline" onClick={onExtendDeadline}
                    className="h-7 text-[9px] font-black uppercase gap-1.5 border-accent-blue/20 text-accent-blue hover:bg-accent-blue/10">
                    <CalendarPlus className="size-3" /> Reabrir entregas
                </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClear}
                className="h-7 text-[9px] font-black uppercase text-text-muted hover:text-foreground ml-auto">
                Deseleccionar
            </Button>
        </div>
    );
}

function SubmissionActions({ row, table, onGrade, onReopen, onExtendDeadline, onPublish }: {
    row: StepSubmissionRow; table: any; onGrade: () => void; onReopen: () => void; onExtendDeadline: () => void; onPublish: (publishedAt: string) => void;
}) {
    const [isPendingReopen, startReopen] = useTransition();
    const [isPendingPublish, startPublish] = useTransition();

    function handleReopen() {
        startReopen(async () => {
            const res = await reopenSubmission(row.id);
            if (res.error) {
                toast.error(res.error);
            } else {
                if (res.warning === 'deadline_passed') {
                    toast.warning("Corrección deshecha. El plazo ha vencido — el alumno no podrá re-entregar hasta que se extienda.");
                } else if (res.warning === 'step_locked') {
                    toast.warning("Corrección deshecha. Las entregas están cerradas — desbloquea el paso primero.");
                } else {
                    toast.success("Corrección deshecha");
                }
                onReopen();
            }
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
                    title="Deshacer corrección"
                >
                    <Undo2 className="size-3.5" />
                </Button>
            )}
            {!row.synthetic && (
                <Button
                    size="icon"
                    variant="outline"
                    className="size-8 border-accent-blue/20 text-accent-blue/60 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-all"
                    onClick={onExtendDeadline}
                    title="Reabrir entrega"
                >
                    <CalendarPlus className="size-3.5" />
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
    );
}

const DEADLINE_PRESETS = [
    { label: "1 hora", hours: 1 },
    { label: "6 horas", hours: 6 },
    { label: "24 horas", hours: 24 },
    { label: "48 horas", hours: 48 },
    { label: "1 semana", hours: 168 },
] as const;

function DeadlineExtensionDialog({ open, onOpenChange, stepId, studentIds, studentNames, onExtended }: {
    open: boolean; onOpenChange: (open: boolean) => void;
    stepId: string; studentIds: string[]; studentNames: string[];
    onExtended: () => void;
}) {
    const [selectedPreset, setSelectedPreset] = useState<number | null>(24);
    const [customDate, setCustomDate] = useState("");
    const [isPending, startTransition] = useTransition();

    const computedDate = useMemo(() => {
        if (selectedPreset !== null) {
            const d = new Date();
            d.setHours(d.getHours() + selectedPreset);
            return d;
        }
        if (customDate) return new Date(customDate);
        return null;
    }, [selectedPreset, customDate]);

    function handleSubmit() {
        if (!computedDate) return;
        const iso = computedDate.toISOString();
        startTransition(async () => {
            const res = studentIds.length === 1
                ? await createDeadlineExtension(stepId, studentIds[0], iso)
                : await bulkCreateDeadlineExtensions(stepId, studentIds, iso);
            if (res.error) toast.error(res.error);
            else {
                toast.success(`Plazo extendido hasta ${computedDate.toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`);
                onExtended();
                onOpenChange(false);
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-surface border-border-strong">
                <DialogHeader>
                    <DialogTitle className="text-base font-black uppercase tracking-tight">Extender plazo de entrega</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="text-[11px] text-text-muted">
                        {studentNames.length === 1
                            ? <span>Aplicar a: <span className="font-bold text-foreground">{studentNames[0]}</span></span>
                            : <span>Aplicar a: <span className="font-bold text-foreground">{studentNames.length} alumnos</span></span>
                        }
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {DEADLINE_PRESETS.map(p => (
                            <button
                                key={p.hours}
                                onClick={() => { setSelectedPreset(p.hours); setCustomDate(""); }}
                                className={cn(
                                    "px-3 py-2 rounded-xl border text-[11px] font-bold transition-all",
                                    selectedPreset === p.hours
                                        ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                        : "bg-surface-dark border-border-strong text-text-muted hover:text-foreground hover:border-border-strong/80"
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                        <button
                            onClick={() => { setSelectedPreset(null); }}
                            className={cn(
                                "px-3 py-2 rounded-xl border text-[11px] font-bold transition-all",
                                selectedPreset === null
                                    ? "bg-accent-blue/10 border-accent-blue/30 text-accent-blue"
                                    : "bg-surface-dark border-border-strong text-text-muted hover:text-foreground hover:border-border-strong/80"
                            )}
                        >
                            Personalizado
                        </button>
                    </div>
                    {selectedPreset === null && (
                        <Input
                            type="datetime-local"
                            value={customDate}
                            onChange={(e) => setCustomDate(e.target.value)}
                            className="bg-surface-dark border-border-strong text-xs"
                        />
                    )}
                    {computedDate && (
                        <div className="text-[10px] text-text-muted flex items-center gap-2">
                            <Clock className="size-3" />
                            Nuevo plazo: <span className="font-bold text-foreground">{computedDate.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-[10px] font-black uppercase">
                            Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSubmit} disabled={isPending || !computedDate}
                            className="text-[10px] font-black uppercase bg-accent-blue hover:bg-accent-blue/90 text-white gap-1.5">
                            <CalendarPlus className="size-3" />
                            {isPending ? "Extendiendo..." : "Extender plazo"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function StudentGradesSection({ unitId, students, activities, stepSubmissions }: {
    unitId: string, students: { student_id: string; name: string }[], activities: Activity[], stepSubmissions: StepSubmissionRow[]
}) {
    // Normalize legacy weights (all 1.0) to equal percentages on first load only.
    // If values already look like percentages (sum near 100), use them as-is.
    const initPercentages = (entries: { id: string; weight: number }[]): Record<string, number> => {
        if (entries.length === 0) return {};
        const sum = entries.reduce((a, e) => a + e.weight, 0);
        // Already percentages (sum ≈ 100) — use raw values rounded
        if (Math.abs(sum - 100) < 1) {
            return Object.fromEntries(entries.map(e => [e.id, Math.round(e.weight)]));
        }
        // Legacy weights (all equal, typically 1.0) — distribute equally
        const allEqual = entries.every(e => e.weight === entries[0].weight);
        if (allEqual || sum === 0) {
            const pct = Math.round(100 / entries.length);
            return Object.fromEntries(entries.map((e, i) => [e.id, i === entries.length - 1 ? 100 - pct * (entries.length - 1) : pct]));
        }
        // Mixed legacy — normalize proportionally
        const result: Record<string, number> = {};
        let assigned = 0;
        entries.forEach((e, i) => {
            if (i === entries.length - 1) {
                result[e.id] = 100 - assigned;
            } else {
                const pct = Math.round((e.weight / sum) * 100);
                result[e.id] = pct;
                assigned += pct;
            }
        });
        return result;
    };

    const [weights, setWeights] = useState<Record<string, number>>(() => {
        const activitiesWithEval = activities.filter(a => (a.evaluableSteps ?? []).length > 0);
        return initPercentages(activitiesWithEval.map(a => ({ id: a.id, weight: a.grade_weight ?? 1.0 })));
    });
    const [stepWeights, setStepWeights] = useState<Record<string, number>>(() => {
        const map: Record<string, number> = {};
        activities.forEach(a => {
            const steps = (a.evaluableSteps ?? []);
            if (steps.length === 0) return;
            Object.assign(map, initPercentages(steps.map(s => ({ id: s.id, weight: s.grade_weight }))));
        });
        return map;
    });

    // Only sync new activities/steps added after mount — never re-normalize existing values
    useEffect(() => {
        setWeights(prev => {
            const activitiesWithEval = activities.filter(a => (a.evaluableSteps ?? []).length > 0);
            const existingIds = new Set(Object.keys(prev));
            const newOnes = activitiesWithEval.filter(a => !existingIds.has(a.id));
            // Remove deleted activities
            const currentIds = new Set(activitiesWithEval.map(a => a.id));
            const cleaned: Record<string, number> = {};
            for (const [id, v] of Object.entries(prev)) { if (currentIds.has(id)) cleaned[id] = v; }
            if (newOnes.length === 0) return cleaned;
            // Give new activities an equal share
            const perNew = Math.round(100 / (Object.keys(cleaned).length + newOnes.length));
            newOnes.forEach(a => { cleaned[a.id] = perNew; });
            return cleaned;
        });
        setStepWeights(prev => {
            const updated = { ...prev };
            const allCurrentStepIds = new Set<string>();
            activities.forEach(a => {
                const steps = (a.evaluableSteps ?? []);
                steps.forEach(s => allCurrentStepIds.add(s.id));
                const newSteps = steps.filter(s => !(s.id in updated));
                if (newSteps.length > 0) {
                    const perNew = Math.round(100 / steps.length);
                    newSteps.forEach(s => { updated[s.id] = perNew; });
                }
            });
            // Remove deleted steps
            for (const id of Object.keys(updated)) { if (!allCurrentStepIds.has(id)) delete updated[id]; }
            return updated;
        });
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
        <div className="flex flex-col h-full gap-4">
            {/* Header — compact */}
            <div className="flex items-center justify-between bg-surface border border-border-strong p-4 rounded-2xl shadow-xl shadow-black/5">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-xl bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center text-accent-amber shadow-inner">
                        <BookOpen className="size-4" />
                    </div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-foreground uppercase tracking-tighter leading-none">Libro de Notas</h2>
                        <span className="text-[9px] text-text-muted/50 font-bold uppercase tracking-wider">·</span>
                        <span className="text-[9px] text-text-muted/50 font-bold uppercase tracking-wider">Vista consolidada</span>
                    </div>
                </div>
                <Button
                    variant="outline" size="sm"
                    className="h-8 text-[10px] font-black uppercase border-border-strong hover:bg-white/5 px-4 rounded-xl gap-2"
                    onClick={() => exportGradesAsCSV({
                        unitName: unitId,
                        students,
                        activitiesWithSteps,
                        computeStepGrade,
                        computeActivityGrade: (studentId, actId) => {
                            const act = activitiesWithSteps.find(a => a.id === actId);
                            return act ? computeRetoGrade(studentId, act) : null;
                        },
                        computeTotal,
                    })}
                >
                    <Download className="size-3" />
                    Exportar
                </Button>
            </div>

            {/* Matrix Table */}
            <div className="flex-1 bg-surface border border-border-strong rounded-[2rem] overflow-hidden flex flex-col shadow-xl shadow-black/5">
                <div className="overflow-auto custom-scrollbar flex-1">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="border-b border-border-strong">
                            {/* Row 1: Reto group headers */}
                            {(() => {
                                const retoSum = activitiesWithSteps.reduce((s, a) => s + (weights[a.id] ?? 0), 0);
                                const retoSumValid = Math.abs(retoSum - 100) < 0.5;
                                return (
                            <tr className="text-text-muted font-black uppercase tracking-widest">
                                <th rowSpan={2} className="px-6 py-4 border-r border-border-strong min-w-[220px] w-[220px] align-middle bg-surface rounded-tl-[2rem] text-xs">Alumno</th>
                                {activitiesWithSteps.map((activity, i) => (
                                    <th key={activity.id} colSpan={activity.evaluableSteps.length}
                                        className={cn(
                                            "px-4 py-3 text-center border-b border-border-strong/20",
                                            "border-l-2 border-l-border-strong",
                                            i % 2 === 0 ? "bg-surface" : "bg-white/2",
                                        )}>
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="truncate max-w-[180px] text-foreground/80 uppercase tracking-tight text-[11px]" title={activity.title}>{activity.title}</span>
                                            <PercentageInput
                                                entityId={activity.id}
                                                value={weights[activity.id] ?? 0}
                                                groupSum={retoSum}
                                                onChange={(v) => setWeights(prev => ({ ...prev, [activity.id]: v }))}
                                                onSave={(v) => updateActivityWeight(activity.id, v).catch(() => toast.error("No se pudo guardar el %"))}
                                            />
                                        </div>
                                    </th>
                                ))}
                                <th rowSpan={2} className="px-4 py-4 text-center border-l-2 border-accent-blue/10 bg-accent-blue/3 min-w-[100px] w-[100px] align-middle rounded-tr-[2rem]">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-xs">Promedio</span>
                                        <span className={cn(
                                            "text-[16px] font-mono tabular-nums px-2 py-0.5 rounded-md",
                                            retoSumValid ? "text-emerald-400/60" : "text-red-400 bg-red-500/10"
                                        )}>
                                            {Math.round(retoSum)}%
                                        </span>
                                    </div>
                                </th>
                            </tr>
                                );
                            })()}
                            {/* Row 2: Step sub-headers */}
                            <tr className="text-text-muted/50 font-bold uppercase tracking-widest">
                                {activitiesWithSteps.flatMap((activity, actIdx) => {
                                    const stepSum = activity.evaluableSteps.reduce((s, st) => s + (stepWeights[st.id] ?? 0), 0);
                                    return activity.evaluableSteps.map((step, stepIdx) => (
                                        <th key={step.id} className={cn(
                                            "px-3 py-2.5 text-center border-r border-border-strong/15 min-w-[120px]",
                                            stepIdx === 0 && "border-l-2 border-l-border-strong",
                                            actIdx % 2 === 0 ? "bg-surface-dark/10" : "bg-white/3",
                                        )}>
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className="truncate max-w-[100px] text-[10px] text-text-muted/50 font-black uppercase tracking-widest">{step.title}</span>
                                                <PercentageInput
                                                    entityId={step.id}
                                                    value={stepWeights[step.id] ?? 0}
                                                    groupSum={stepSum}
                                                    onChange={(v) => setStepWeights(prev => ({ ...prev, [step.id]: v }))}
                                                    onSave={(v) => updateStepWeight(step.id, v).catch(() => toast.error("No se pudo guardar el %"))}
                                                    variant="step"
                                                />
                                            </div>
                                        </th>
                                    ));
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student, idx) => {
                                const total = computeTotal(student.student_id);
                                return (
                                    <tr key={student.student_id} className={cn(
                                        "transition-colors group border-b border-border-subtle/30",
                                        idx % 2 === 1 ? "bg-white/1.5" : "",
                                        "hover:bg-accent-blue/3"
                                    )}>
                                        <td className="px-4 py-2.5 border-r border-border-strong/30 bg-surface/40 sticky left-0 z-10 whitespace-nowrap">
                                            <div className="flex items-center gap-2.5">
                                                <div className="size-7 rounded-lg bg-surface-dark border border-border-strong flex items-center justify-center text-[9px] font-black text-text-muted/60 group-hover:text-accent-blue group-hover:border-accent-blue/30 transition-all shrink-0">
                                                    {(student.name || "??").substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-foreground uppercase tracking-tight text-[11px]">{student.name}</span>
                                            </div>
                                        </td>
                                        {activitiesWithSteps.flatMap((activity, actIdx) =>
                                            activity.evaluableSteps.map((step, stepIdx) => {
                                                const { grade, status } = computeStepGrade(student.student_id, step.id);
                                                return (
                                                    <td key={step.id} className={cn(
                                                        "px-3 py-2.5 text-center border-r border-border-strong/15",
                                                        stepIdx === 0 && "border-l-2 border-l-border-strong/40",
                                                        status === 'graded' && "bg-emerald-500/2",
                                                        status !== 'graded' && actIdx % 2 === 1 && "bg-white/1",
                                                    )}>
                                                        {status === 'graded' && grade !== null && (
                                                            <span className="font-mono text-xs font-black text-emerald-400 tabular-nums">{grade.toFixed(1)}</span>
                                                        )}
                                                        {status === 'submitted' && (
                                                            <span className="font-mono text-sm font-black text-amber-400 animate-pulse">!</span>
                                                        )}
                                                        {status === 'none' && (
                                                            <span className="text-border-strong/20 font-mono text-[11px]">−</span>
                                                        )}
                                                    </td>
                                                );
                                            })
                                        )}
                                        <td className="px-4 py-2.5 text-center border-l-2 border-accent-blue/10 bg-accent-blue/2 group-hover:bg-accent-blue/5 transition-colors">
                                            {total !== null ? (
                                                <div className={cn(
                                                    "inline-flex items-center justify-center size-10 rounded-2xl font-mono text-xs font-black border tabular-nums shadow-sm",
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

function PercentageInput({ entityId, value, groupSum, onChange, onSave, variant = "activity" }: {
    entityId: string; value: number; groupSum: number; onChange: (v: number) => void; onSave: (v: number) => void; variant?: "activity" | "step";
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(String(Math.round(value)));
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);
    const isValid = Math.abs(groupSum - 100) < 0.5;
    const isStep = variant === "step";

    function handleBlur() {
        const parsed = parseInt(draft, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
            onChange(parsed);
            onSave(parsed);
        } else {
            setDraft(String(Math.round(value)));
        }
        setEditing(false);
    }

    if (editing) return (
        <input ref={inputRef} type="number" min="0" max="100" step="1" value={draft}
            onChange={e => setDraft(e.target.value)} onBlur={handleBlur}
            onKeyDown={e => { if (e.key === "Enter") handleBlur(); if (e.key === "Escape") { setDraft(String(Math.round(value))); setEditing(false); } }}
            className={cn(
                "text-center bg-background border rounded-lg font-mono font-black outline-none tabular-nums",
                isStep ? "w-14 text-[13px] px-1.5 py-1 border-accent-amber/50 text-accent-amber" : "w-16 text-[14px] px-2 py-1.5 border-accent-blue/50 text-accent-blue"
            )}
        />
    );

    return (
        <button onClick={() => { setDraft(String(Math.round(value))); setEditing(true); }}
            className={cn(
                "font-black font-mono transition-all border bg-surface-dark tabular-nums",
                isStep
                    ? "text-[13px] px-2 py-1 rounded-lg hover:border-accent-amber/30"
                    : "text-[14px] px-2.5 py-1.5 rounded-lg hover:border-accent-blue/30",
                !isValid
                    ? "text-red-400 border-red-500/30 hover:text-red-300"
                    : isStep
                        ? "text-text-muted/40 border-border-strong hover:text-accent-amber"
                        : "text-text-muted/50 border-border-strong hover:text-accent-blue",
            )}
        >
            {Math.round(value)}%
        </button>
    );
}

function SubmissionFileLinks({ row }: { row: StepSubmissionRow }) {
    const files = row.files && row.files.length > 0 ? row.files : row.drive_file_url ? [{ driveFileId: row.drive_file_id ?? "", driveFileUrl: row.drive_file_url, driveFileName: row.drive_file_url, driveMimeType: "application/pdf" }] : [];
    if (files.length === 0) return <span className="text-text-muted/40 text-[11px] uppercase font-bold tracking-tighter">Sin entrega</span>;
    return (
        <div className="flex flex-col gap-1.5">
            {files.map((f, i) => (
                <a key={f.driveFileId || i} href={f.driveFileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-accent-blue hover:text-white transition-colors group/link max-w-[180px]">
                    <div className="size-6 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center shrink-0 group-hover/link:bg-accent-blue group-hover/link:text-white transition-all">
                        {files.length > 1 ? <Paperclip className="size-3" /> : <ExternalLink className="size-3" />}
                    </div>
                    <span className="truncate text-[13px] font-bold tracking-tight">{f.driveFileName || "Archivo"}</span>
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
            className="h-9 text-[10px] font-black uppercase gap-2 border-accent-blue/20 text-accent-blue hover:bg-accent-blue/10"
        >
            <Send className="size-3.5" /> {isPending ? "..." : "Distribuir"}
        </Button>
    );
}

function LockButton({ stepId, deliveryMode, initialLocked }: { stepId: string; deliveryMode?: string; initialLocked?: boolean }) {
    const [isPending, startTransition] = useTransition();
    const [isLocked, setIsLocked] = useState(initialLocked ?? false);

    function handleToggle() {
        startTransition(async () => {
            const nextLocked = !isLocked;
            // Update DB lock flag
            const res = await updateStepLock(stepId, nextLocked);
            if (res.error) { toast.error(res.error); return; }

            // For teacher_copy, also revoke/restore Drive permissions
            if (deliveryMode === 'teacher_copy' && nextLocked) {
                try {
                    await fetch("/api/drive/lock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stepId }) });
                } catch { /* non-critical */ }
            }

            setIsLocked(nextLocked);
            toast.success(nextLocked ? "Entregas cerradas" : "Entregas reabiertas");
        });
    }

    return (
        <Button size="sm" variant="outline" onClick={handleToggle} disabled={isPending}
            className={cn(
                "h-9 text-[10px] font-black uppercase gap-2",
                isLocked
                    ? "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                    : "border-amber-500/20 text-amber-500 hover:bg-amber-500/10"
            )}
        >
            <Lock className="size-3.5" />
            {isPending ? "..." : isLocked ? "Abrir" : "Cerrar"}
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
