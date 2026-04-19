"use client";

import { useEffect } from "react";
import { BookOpen, Map } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useBreadcrumb } from "@/components/dashboard/layout/breadcrumb-context";
import { getStudentUnitNavigationItems } from "./unit-navigation-items";
import { UnitNavigationRail } from "./unit-navigation-rail";
import { cn } from "@/lib/utils";
import { criteriaMaxPoints, type RubricCriteria } from "@/types/activity";

type StudentGradeSubmission = {
    step_id: string;
    status: string;
    score: number | null;
    grading_mode: "score" | "rubric" | "complete" | null;
    rubric_scores: Record<string, number> | null;
};

type StudentGradebookStep = {
    id: string;
    title: string;
    grade_weight: number;
    rubric: RubricCriteria[];
};

type StudentGradebookActivity = {
    id: string;
    title: string;
    order_index: number;
    grade_weight: number;
    evaluableSteps: StudentGradebookStep[];
};

interface StudentUnitGradesPageProps {
    unit: {
        id: string;
        name: string;
        description: string | null;
        status: string | null;
        view_type: string | null;
    };
    module: {
        id: string;
        name: string;
    };
    studentName: string;
    activities: StudentGradebookActivity[];
    submissions: StudentGradeSubmission[];
}

export function StudentUnitGradesPage({ unit, module, studentName, activities, submissions }: StudentUnitGradesPageProps) {
    const { setSegments } = useBreadcrumb();

    useEffect(() => {
        setSegments([
            { label: module.name, href: `/dashboard/modules/${module.id}` },
            { label: unit.name, href: `/dashboard/units/${unit.id}` },
            { label: "Notas" },
        ]);
        return () => setSegments([]);
    }, [module.id, module.name, setSegments, unit.id, unit.name]);

    const items = getStudentUnitNavigationItems({ unitId: unit.id, viewType: unit.view_type });
    const activitiesWithSteps = activities
        .filter((activity) => activity.evaluableSteps.length > 0)
        .sort((a, b) => a.order_index - b.order_index);

    const computeStepGrade = (step: StudentGradebookStep): number | null => {
        const row = submissions.find((submission) => submission.step_id === step.id);
        if (!row || row.status !== "published") return null;
        if (row.grading_mode === "complete") return 10;
        if (row.score != null) return row.score;
        if (row.grading_mode === "rubric" && row.rubric_scores) {
            const total = Object.values(row.rubric_scores).reduce((sum, points) => sum + points, 0);
            const max = step.rubric.reduce((sum, criterion) => sum + criteriaMaxPoints(criterion), 0);
            if (max === 0) return null;
            return Math.round((total / max) * 100) / 10;
        }
        return null;
    };

    const rawStatus = unit.status?.toLowerCase() || "draft";
    const normalizedStatus = (rawStatus === "active" || rawStatus === "activo") ? "published"
        : (rawStatus === "bloqueado" ? "blocked" : (rawStatus === "borrador" ? "draft" : rawStatus));
    const statusConfig = {
        published: {
            color: "text-accent-green",
            bg: "bg-size-[100%_2px,3px_100%]",
            border: "border-accent-green/30",
            label: "PUBLICADO",
            dotBg: "bg-accent-green",
            dotAnim: "animate-pulse",
        },
        blocked: {
            color: "text-accent-red",
            bg: "bg-accent-red/10",
            border: "border-accent-red/30",
            label: "BLOQUEADO",
            dotBg: "bg-accent-red",
            dotAnim: "",
        },
        draft: {
            color: "text-accent-orange",
            bg: "bg-accent-orange/10",
            border: "border-accent-orange/30",
            label: "BORRADOR",
            dotBg: "bg-accent-orange",
            dotAnim: "",
        },
    }[normalizedStatus as "published" | "blocked" | "draft"] ?? {
        color: "text-accent-orange",
        bg: "bg-accent-orange/10",
        border: "border-accent-orange/30",
        label: "BORRADOR",
        dotBg: "bg-accent-orange",
        dotAnim: "",
    };

    return (
        <div className="-mx-24 -my-8 flex min-h-[calc(100vh-68px)] bg-background">
            <UnitNavigationRail items={items} />
            <div className="min-w-0 flex-1 overflow-y-auto px-8 py-8 sm:px-10">
                <div className="mb-8 flex items-start gap-5">
                    <div className="size-14 rounded-xl bg-surface border border-accent-blue/20 shadow-[0_0_15px_rgba(34,211,238,0.1)] flex items-center justify-center text-accent-blue shrink-0">
                        <Map className="size-7" />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">{unit.name}</h1>
                            <Badge variant="outline" className={`${statusConfig.border} ${statusConfig.bg} ${statusConfig.color} gap-1.5 py-1 px-3 shadow-sm`}>
                                <span className={`size-1.5 rounded-full ${statusConfig.dotBg} ${statusConfig.dotAnim}`} />
                                {statusConfig.label}
                            </Badge>
                        </div>
                        <p className="text-sm text-text-muted max-w-xl">
                            {unit.description || "Sin descripción proporcionada para esta unidad."}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between bg-surface border border-border-strong p-4 rounded-2xl shadow-xl shadow-black/5">
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-xl bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center text-accent-amber shadow-inner">
                                <BookOpen className="size-4" />
                            </div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-black text-foreground uppercase tracking-tighter leading-none">Libro de Notas</h2>
                                <span className="text-[9px] text-text-muted/50 font-bold uppercase tracking-wider">·</span>
                                <span className="text-[9px] text-text-muted/50 font-bold uppercase tracking-wider">Vista del alumno</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface border border-border-strong rounded-[2rem] overflow-hidden shadow-xl shadow-black/5">
                        <div className="overflow-auto custom-scrollbar">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="border-b border-border-strong">
                                    <tr className="text-text-muted font-black uppercase tracking-widest">
                                        <th rowSpan={2} className="px-6 py-4 border-r border-border-strong min-w-[220px] w-[220px] align-middle bg-surface rounded-tl-[2rem] text-xs">Alumno</th>
                                        {activitiesWithSteps.map((activity, index) => (
                                            <th
                                                key={activity.id}
                                                colSpan={activity.evaluableSteps.length}
                                                className={cn(
                                                    "px-4 py-3 text-center border-b border-border-strong/20 border-l-2 border-l-border-strong",
                                                    index % 2 === 0 ? "bg-surface" : "bg-white/2",
                                                    index === activitiesWithSteps.length - 1 && "rounded-tr-[2rem]",
                                                )}
                                            >
                                                <span className="truncate max-w-[180px] text-foreground/80 uppercase tracking-tight text-[11px]" title={activity.title}>
                                                    {activity.title}
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                    <tr className="text-text-muted/50 font-bold uppercase tracking-widest">
                                        {activitiesWithSteps.flatMap((activity, activityIndex) => activity.evaluableSteps.map((step, stepIndex) => (
                                            <th
                                                key={step.id}
                                                className={cn(
                                                    "px-3 py-2.5 text-center border-r border-border-strong/15 min-w-[120px]",
                                                    stepIndex === 0 && "border-l-2 border-l-border-strong",
                                                    activityIndex % 2 === 0 ? "bg-surface-dark/10" : "bg-white/3",
                                                )}
                                            >
                                                <span className="truncate max-w-[100px] text-[10px] text-text-muted/50 font-black uppercase tracking-widest">{step.title}</span>
                                            </th>
                                        )))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="transition-colors border-b border-border-subtle/30 hover:bg-accent-blue/3">
                                        <td className="px-4 py-2.5 border-r border-border-strong/30 bg-surface/40 sticky left-0 z-10 whitespace-nowrap">
                                            <div className="flex items-center gap-2.5">
                                                <div className="size-7 rounded-lg bg-surface-dark border border-border-strong flex items-center justify-center text-[9px] font-black text-text-muted/60 transition-all shrink-0">
                                                    {(studentName || "??").substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-foreground uppercase tracking-tight text-[11px]">{studentName}</span>
                                            </div>
                                        </td>
                                        {activitiesWithSteps.flatMap((activity, activityIndex) => activity.evaluableSteps.map((step, stepIndex) => {
                                            const grade = computeStepGrade(step);
                                            return (
                                                <td
                                                    key={step.id}
                                                    className={cn(
                                                        "px-3 py-2.5 text-center border-r border-border-strong/15",
                                                        stepIndex === 0 && "border-l-2 border-l-border-strong/40",
                                                        grade != null && "bg-emerald-500/2",
                                                        grade == null && activityIndex % 2 === 1 && "bg-white/1",
                                                    )}
                                                >
                                                    {grade != null ? (
                                                        <span className="font-mono text-xs font-black text-emerald-400 tabular-nums">{grade.toFixed(1)}</span>
                                                    ) : (
                                                        <span className="text-border-strong/20 font-mono text-[11px]">−</span>
                                                    )}
                                                </td>
                                            );
                                        }))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
